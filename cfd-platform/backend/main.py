"""Simplified CFD Platform Backend - CAD → Mesh → Optimize Flow"""

from __future__ import annotations
import asyncio
import json
import os
import subprocess
import sys
import tempfile
import uuid
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional, Literal

import yaml
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─── Config ──────────────────────────────────────────────────────────────
CONFIG_PATH = Path(__file__).parent.parent / "config" / "llm_providers.yaml"

def load_config() -> dict:
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)

CONFIG = load_config()

# ─── Data Models ─────────────────────────────────────────────────────────
class ProviderKeys(BaseModel):
    google: Optional[str] = None
    openai: Optional[str] = None
    nvidia: Optional[str] = None
    groq: Optional[str] = None

class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=10, description="Natural language CAD description")
    provider: Literal["google", "openai", "nvidia", "groq"]
    model: Optional[str] = None
    api_key: str = Field(..., description="User's API key for the provider")
    cad_format: Literal["step", "stl", "brep"] = "step"
    run_meshing: bool = True
    run_optimization: bool = False

class LocalCADRequest(BaseModel):
    file_path: str = Field(..., description="Path to local CAD file (STEP/STL/BREP)")
    run_meshing: bool = True
    run_optimization: bool = False

class JobStatus(BaseModel):
    job_id: str
    status: Literal["pending", "generating", "meshing", "optimizing", "completed", "failed"]
    progress: int = 0
    message: str = ""
    cad_path: Optional[str] = None
    mesh_path: Optional[str] = None
    optimization_result: Optional[dict] = None
    error: Optional[str] = None

# ─── LLM Service ─────────────────────────────────────────────────────────
class LLMService:
    def __init__(self):
        self.http_client = None
    
    async def fetch_models(self, provider: str, api_key: str) -> list[str]:
        """Fetch available models from provider's API."""
        import httpx
        cfg = CONFIG["providers"][provider]
        url = cfg["models_url"]
        headers = self._auth_headers(provider, api_key)
        
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return self._parse_models(provider, data)
    
    def _auth_headers(self, provider: str, api_key: str) -> dict:
        if provider == "google":
            return {"x-goog-api-key": api_key}
        return {"Authorization": f"Bearer {api_key}"}
    
    def _parse_models(self, provider: str, data: dict) -> list[str]:
        if provider == "google":
            return [m["name"].split("/")[-1] for m in data.get("models", []) 
                   if "generateContent" in m.get("supportedGenerationMethods", [])]
        return [m["id"] for m in data.get("data", [])]
    
    async def generate_cad_code(self, prompt: str, provider: str, model: str, api_key: str) -> str:
        """Generate CadQuery/FreeCAD Python code from natural language."""
        import httpx
        
        system_prompt = """You are a CAD code generator. Output ONLY valid Python code using CadQuery (preferred) or FreeCAD.
        
Rules:
1. Use CadQuery (import cadquery as cq) when possible
2. Create a function `build()` that returns the final shape
3. Export using `result.val().exportStep("output.step")` for STEP
4. Handle common shapes: boxes, cylinders, holes, fillets, chamfers, patterns
5. NO markdown, NO explanations, ONLY the Python code
6. Validate solids are closed/watertight
"""
        cfg = CONFIG["providers"][provider]
        url = self._completion_url(provider, cfg, model)
        headers = self._auth_headers(provider, api_key)
        headers["Content-Type"] = "application/json"
        
        payload = self._completion_payload(provider, system_prompt, prompt, model)
        
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return self._extract_code(provider, data)
    
    def _completion_url(self, provider: str, cfg: dict, model: str) -> str:
        if provider == "google":
            return f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        base = cfg["models_url"].replace("/models", "")
        return f"{base}/chat/completions"
    
    def _completion_payload(self, provider: str, system: str, prompt: str, model: str) -> dict:
        if provider == "google":
            return {
                "contents": [{"parts": [{"text": system + "\n\nUser: " + prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4000}
            }
        return {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 4000
        }
    
    def _extract_code(self, provider: str, data: dict) -> str:
        if provider == "google":
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            text = data["choices"][0]["message"]["content"]
        # Strip markdown if present
        if "```python" in text:
            text = text.split("```python")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return text.strip()

# ─── CAD Engine ──────────────────────────────────────────────────────────
class CADEngine:
    def __init__(self):
        self.work_dir = Path(tempfile.gettempdir()) / "cfd_cad"
        self.work_dir.mkdir(exist_ok=True)
    
    async def generate_from_code(self, code: str, output_format: str) -> Path:
        """Execute CadQuery/FreeCAD code and return output file."""
        job_dir = self.work_dir / str(uuid.uuid4())
        job_dir.mkdir(parents=True)
        
        script_path = job_dir / "generate.py"
        script_path.write_text(code)
        
        output_file = job_dir / f"output.{output_format}"
        
        # Run in subprocess for isolation
        result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, str(script_path)],
            cwd=job_dir,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"CAD generation failed: {result.stderr}")
        
        if not output_file.exists():
            # Try to find any output file
            candidates = list(job_dir.glob(f"output.*"))
            if candidates:
                output_file = candidates[0]
            else:
                raise RuntimeError("No output file generated")
        
        return output_file
    
    async def import_local(self, file_path: str, output_format: str) -> Path:
        """Import and convert local CAD file."""
        src = Path(file_path)
        if not src.exists():
            raise FileNotFoundError(f"CAD file not found: {file_path}")
        
        job_dir = self.work_dir / str(uuid.uuid4())
        job_dir.mkdir(parents=True)
        output_file = job_dir / f"output.{output_format}"
        
        # Use CadQuery to convert
        code = f"""
import cadquery as cq
result = cq.importers.importStep(r"{src}")
result.val().exportStep(r"{output_file}")
"""
        script_path = job_dir / "convert.py"
        script_path.write_text(code)
        
        result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, str(script_path)],
            cwd=job_dir,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"CAD import failed: {result.stderr}")
        
        return output_file

# ─── Meshing Engine ──────────────────────────────────────────────────────
class MeshingEngine:
    def __init__(self):
        self.work_dir = Path(tempfile.gettempdir()) / "cfd_mesh"
        self.work_dir.mkdir(exist_ok=True)
    
    async def mesh(self, cad_path: Path, algorithm: str = "tetrahedral") -> Path:
        """Generate mesh from CAD using Gmsh."""
        job_dir = self.work_dir / str(uuid.uuid4())
        job_dir.mkdir(parents=True)
        
        mesh_file = job_dir / "mesh.msh"
        vtk_file = job_dir / "mesh.vtk"
        
        code = f"""
import gmsh
import sys

gmsh.initialize()
gmsh.option.setNumber("General.Terminal", 0)

try:
    gmsh.model.add("cad_model")
    gmsh.model.occ.importShapes(r"{cad_path}")
    gmsh.model.occ.synchronize()
    
    # Set mesh algorithm
    if "{algorithm}" == "tetrahedral":
        gmsh.option.setNumber("Mesh.Algorithm", 6)  # Frontal-Delaunay
    elif "{algorithm}" == "hexahedral":
        gmsh.option.setNumber("Mesh.Algorithm", 8)  # Delaunay
    
    gmsh.model.mesh.generate(3)
    gmsh.write(r"{mesh_file}")
    
    # Also export VTK for visualization
    gmsh.write(r"{vtk_file}")
finally:
    gmsh.finalize()
"""
        script_path = job_dir / "mesh.py"
        script_path.write_text(code)
        
        result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, str(script_path)],
            cwd=job_dir,
            capture_output=True,
            text=True,
            timeout=180
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"Meshing failed: {result.stderr}")
        
        return mesh_file

# ─── Optimization Engine ─────────────────────────────────────────────────
class OptimizationEngine:
    def __init__(self):
        self.work_dir = Path(tempfile.gettempdir()) / "cfd_opt"
        self.work_dir.mkdir(exist_ok=True)
    
    async def optimize(self, cad_path: Path, engine: str = "nevergrad", 
                      algorithm: str = "CMA", budget: int = 50) -> dict:
        """Run optimization using Nevergrad or OpenMDAO."""
        job_dir = self.work_dir / str(uuid.uuid4())
        job_dir.mkdir(parents=True)
        
        if engine == "nevergrad":
            return await self._nevergrad_optimize(cad_path, job_dir, algorithm, budget)
        else:
            return await self._openmdao_optimize(cad_path, job_dir, algorithm, budget)
    
    async def _nevergrad_optimize(self, cad_path: Path, job_dir: Path, 
                                  algorithm: str, budget: int) -> dict:
        code = f"""
import nevergrad as ng
import cadquery as cq
import json

# Load base CAD
base = cq.importers.importStep(r"{cad_path}")

# Define parameterization (example: scale factors)
parametrization = ng.p.Array(shape=(3,)).set_bounds(0.5, 2.0)

def objective(x):
    # Scale the model
    scaled = base.val().scale((float(x[0]), float(x[1]), float(x[2])))
    # Example objective: minimize volume while maintaining minimum dimension
    vol = scaled.Volume()
    min_dim = min(scaled.BoundingBox().xlen, scaled.BoundingBox().ylen, scaled.BoundingBox().zlen)
    return vol / max(min_dim, 1e-6)

optimizer = ng.optimizers.{algorithm}(parametrization=parametrization, budget={budget})
recommendation = optimizer.minimize(objective)

result = {{
    "best_params": recommendation.value.tolist(),
    "best_value": float(recommendation.loss),
    "num_evaluations": optimizer.num_ask
}}
with open(r"{job_dir}/opt_result.json", "w") as f:
    json.dump(result, f, indent=2)
"""
        script_path = job_dir / "optimize.py"
        script_path.write_text(code)
        
        result = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, str(script_path)],
            cwd=job_dir,
            capture_output=True,
            text=True,
            timeout=600
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"Optimization failed: {result.stderr}")
        
        with open(job_dir / "opt_result.json") as f:
            return json.load(f)
    
    async def _openmdao_optimize(self, cad_path: Path, job_dir: Path, 
                                 algorithm: str, budget: int) -> dict:
        # Simplified OpenMDAO example
        return {"engine": "openmdao", "status": "not_implemented"}

# ─── Job Manager ─────────────────────────────────────────────────────────
class JobManager:
    def __init__(self):
        self.jobs: dict[str, JobStatus] = {}
        self.llm = LLMService()
        self.cad = CADEngine()
        self.mesh = MeshingEngine()
        self.opt = OptimizationEngine()
    
    def create_job(self, request: GenerateRequest) -> str:
        job_id = str(uuid.uuid4())[:8]
        self.jobs[job_id] = JobStatus(
            job_id=job_id,
            status="pending",
            message="Job created"
        )
        return job_id
    
    def create_local_job(self, request: LocalCADRequest) -> str:
        job_id = str(uuid.uuid4())[:8]
        self.jobs[job_id] = JobStatus(
            job_id=job_id,
            status="pending",
            message="Local CAD job created"
        )
        return job_id
    
    def get_job(self, job_id: str) -> JobStatus:
        if job_id not in self.jobs:
            raise HTTPException(404, "Job not found")
        return self.jobs[job_id]
    
    async def run_generate_job(self, job_id: str, request: GenerateRequest):
        job = self.jobs[job_id]
        try:
            # 1. Generate CAD code via LLM
            job.status = "generating"
            job.progress = 10
            job.message = "Generating CAD code via LLM..."
            
            model = request.model or CONFIG["providers"][request.provider]["default_model"]
            code = await self.llm.generate_cad_code(
                request.prompt, request.provider, model, request.api_key
            )
            
            job.progress = 30
            job.message = "Executing CAD code..."
            cad_path = await self.cad.generate_from_code(code, request.cad_format)
            job.cad_path = str(cad_path)
            
            # 2. Meshing
            if request.run_meshing:
                job.status = "meshing"
                job.progress = 50
                job.message = "Generating mesh..."
                mesh_path = await self.mesh.mesh(cad_path)
                job.mesh_path = str(mesh_path)
            
            # 3. Optimization
            if request.run_optimization:
                job.status = "optimizing"
                job.progress = 80
                job.message = "Running optimization..."
                opt_result = await self.opt.optimize(cad_path)
                job.optimization_result = opt_result
            
            job.status = "completed"
            job.progress = 100
            job.message = "Completed successfully"
            
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            job.message = f"Failed: {e}"
    
    async def run_local_job(self, job_id: str, request: LocalCADRequest):
        job = self.jobs[job_id]
        try:
            job.progress = 10
            job.message = "Importing local CAD..."
            cad_path = await self.cad.import_local(request.file_path, "step")
            job.cad_path = str(cad_path)
            
            if request.run_meshing:
                job.status = "meshing"
                job.progress = 50
                job.message = "Generating mesh..."
                mesh_path = await self.mesh.mesh(cad_path)
                job.mesh_path = str(mesh_path)
            
            if request.run_optimization:
                job.status = "optimizing"
                job.progress = 80
                job.message = "Running optimization..."
                opt_result = await self.opt.optimize(cad_path)
                job.optimization_result = opt_result
            
            job.status = "completed"
            job.progress = 100
            job.message = "Completed successfully"
            
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            job.message = f"Failed: {e}"

# ─── FastAPI App ─────────────────────────────────────────────────────────
app = FastAPI(title="CFD Platform API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

manager = JobManager()

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/providers")
async def list_providers():
    return {
        "providers": [
            {
                "id": k,
                "name": v["name"],
                "default_model": v["default_model"],
                "supports_cad": v.get("supports_cad", True)
            }
            for k, v in CONFIG["providers"].items()
        ]
    }

@app.post("/providers/{provider}/models")
async def fetch_models(provider: str, keys: ProviderKeys):
    if provider not in CONFIG["providers"]:
        raise HTTPException(404, "Provider not found")
    api_key = getattr(keys, provider)
    if not api_key:
        raise HTTPException(400, f"API key required for {provider}")
    models = await manager.llm.fetch_models(provider, api_key)
    return {"provider": provider, "models": models}

@app.post("/generate")
async def generate_cad(request: GenerateRequest):
    job_id = manager.create_job(request)
    asyncio.create_task(manager.run_generate_job(job_id, request))
    return {"job_id": job_id, "status": "pending"}

@app.post("/local-cad")
async def local_cad(request: LocalCADRequest):
    job_id = manager.create_local_job(request)
    asyncio.create_task(manager.run_local_job(job_id, request))
    return {"job_id": job_id, "status": "pending"}

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    return manager.get_job(job_id)

@app.websocket("/ws/{job_id}")
async def job_ws(ws: WebSocket, job_id: str):
    await ws.accept()
    try:
        while True:
            job = manager.get_job(job_id)
            await ws.send_json(job.model_dump())
            if job.status in ("completed", "failed"):
                break
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)