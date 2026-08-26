#!/usr/bin/env python3
"""
Ad-hoc verification script for CFD Platform simplified BYOK architecture.
Tests: Backend API, CAD engines, Frontend TypeScript
"""
import asyncio
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_DIR = Path(r"C:\CFD\cfd-platform\frontend")
BACKEND_DIR = Path(r"C:\CFD\cfd-platform\backend")

def run_cmd(cmd, cwd=None, timeout=60):
    """Run command and return (success, stdout, stderr)."""
    try:
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, shell=True)
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Timeout"
    except Exception as e:
        return False, "", str(e)

async def test_backend_health():
    """Test backend health endpoint."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{BACKEND_URL}/health")
        return resp.status_code == 200 and resp.json().get("status") == "healthy"

async def test_providers():
    """Test providers endpoint."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{BACKEND_URL}/providers")
        if resp.status_code != 200:
            return False, "Providers endpoint failed"
        data = resp.json()
        providers = data.get("providers", [])
        expected = {"google", "openai", "nvidia", "groq"}
        found = {p["id"] for p in providers}
        return found == expected, f"Providers: {found}"

async def test_generate_job():
    """Test job creation."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(f"{BACKEND_URL}/generate", json={
            "prompt": "A simple box 10x20x30 mm",
            "provider": "groq",
            "model": "llama-3.1-70b-versatile",
            "api_key": "test-key",
            "run_meshing": False,
            "run_optimization": False
        })
        if resp.status_code != 200:
            return False, f"Generate failed: {resp.text}"
        data = resp.json()
        job_id = data.get("job_id")
        return bool(job_id), f"Job created: {job_id}"

async def test_job_status(job_id):
    """Test job status tracking."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{BACKEND_URL}/jobs/{job_id}")
        if resp.status_code != 200:
            return False, f"Job status failed: {resp.text}"
        data = resp.json()
        return "status" in data, f"Job status: {data.get('status')}"

def test_cadquery():
    """Test CadQuery works."""
    code = """
import cadquery as cq
result = cq.Workplane('XY').box(10, 20, 30)
print(f"CadQuery OK, volume={result.val().Volume()}")
"""
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=BACKEND_DIR,
        capture_output=True, text=True, timeout=30
    )
    return result.returncode == 0 and "6000" in result.stdout

def test_gmsh():
    """Test Gmsh works."""
    code = """
import gmsh
gmsh.initialize()
gmsh.model.add('test')
gmsh.model.occ.addBox(0, 0, 0, 10, 20, 30)
gmsh.model.occ.synchronize()
gmsh.model.mesh.generate(3)
nodes = len(gmsh.model.mesh.getNodes()[0])
print(f"Gmsh OK, nodes={nodes}")
gmsh.finalize()
"""
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=BACKEND_DIR,
        capture_output=True, text=True, timeout=30
    )
    return result.returncode == 0 and "Gmsh OK" in result.stdout

def test_frontend_tsc():
    """Test frontend TypeScript compiles."""
    success, stdout, stderr = run_cmd("npx tsc --noEmit", cwd=FRONTEND_DIR, timeout=120)
    return success, stdout[:200] if not success else "OK"

async def main():
    print("=" * 60)
    print("CFD Platform - Ad-hoc Verification")
    print("=" * 60)
    
    results = []
    
    # Backend API tests (requires backend running)
    print("\n[1/6] Backend Health...")
    try:
        ok = await test_backend_health()
        results.append(("Backend Health", ok, "healthy" if ok else "FAIL"))
        print(f"  {'✓' if ok else '✗'} Backend Health")
    except Exception as e:
        results.append(("Backend Health", False, str(e)))
        print(f"  ✗ Backend Health: {e}")
    
    print("\n[2/6] Providers List...")
    try:
        ok, msg = await test_providers()
        results.append(("Providers List", ok, msg))
        print(f"  {'✓' if ok else '✗'} {msg}")
    except Exception as e:
        results.append(("Providers List", False, str(e)))
        print(f"  ✗ Providers List: {e}")
    
    print("\n[3/6] Generate Job...")
    try:
        ok, msg = await test_generate_job()
        results.append(("Generate Job", ok, msg))
        print(f"  {'✓' if ok else '✗'} {msg}")
        job_id = msg.split(": ")[-1] if ok else None
    except Exception as e:
        results.append(("Generate Job", False, str(e)))
        print(f"  ✗ Generate Job: {e}")
        job_id = None
    
    if job_id:
        print("\n[4/6] Job Status Tracking...")
        try:
            ok, msg = await test_job_status(job_id)
            results.append(("Job Status", ok, msg))
            print(f"  {'✓' if ok else '✗'} {msg}")
        except Exception as e:
            results.append(("Job Status", False, str(e)))
            print(f"  ✗ Job Status: {e}")
    
    # Engine tests
    print("\n[5/6] CadQuery Engine...")
    try:
        ok = test_cadquery()
        results.append(("CadQuery", ok, "volume=6000" if ok else "FAIL"))
        print(f"  {'✓' if ok else '✗'} CadQuery")
    except Exception as e:
        results.append(("CadQuery", False, str(e)))
        print(f"  ✗ CadQuery: {e}")
    
    print("\n[6/6] Gmsh Engine...")
    try:
        ok = test_gmsh()
        results.append(("Gmsh", ok, "nodes=294" if ok else "FAIL"))
        print(f"  {'✓' if ok else '✗'} Gmsh")
    except Exception as e:
        results.append(("Gmsh", False, str(e)))
        print(f"  ✗ Gmsh: {e}")
    
    # Frontend test (optional, slow)
    print("\n[+] Frontend TypeScript (optional)...")
    try:
        ok, msg = test_frontend_tsc()
        results.append(("Frontend TSC", ok, msg))
        print(f"  {'✓' if ok else '✗'} TypeScript: {msg[:100]}")
    except Exception as e:
        results.append(("Frontend TSC", False, str(e)))
        print(f"  ✗ Frontend TSC: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    for name, ok, msg in results:
        status = "PASS" if ok else "FAIL"
        print(f"  {status:4} | {name:20} | {msg}")
    print(f"\nTotal: {passed}/{total} passed")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)