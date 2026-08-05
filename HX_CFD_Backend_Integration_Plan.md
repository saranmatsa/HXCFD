# HX CFD Backend Integration Plan

**Goal**: Connect the Tauri desktop shell to the FastAPI backend using all 15 cloned repositories for a production-ready local-first CFD platform.

---

## Repository Inventory (16 Total)

| # | Repo | Path | Role | Engine ID |
|---|------|------|------|-----------|
| 1 | cfd-platform | `/c/CFD/cfd-platform/` | Main App (Tauri + React + FastAPI) | — |
| 2 | FreeCAD | `/c/CFD/FreeCAD/` | CAD Kernel (STEP/IGES/BREP) | `freecad` |
| 3 | Gmsh | `/c/CFD/gmsh/` | Meshing Kernel (OCC, boundary layers) | `gmsh` |
| 4 | cfMesh | `/c/CFD/code/` | Cartesian Mesher (OpenFOAM-native) | `cfmesh` |
| 5 | OpenFOAM-dev | `/c/CFD/OpenFOAM-dev/` | CFD Solver (simpleFoam, gmshToFoam) | `openfoam` |
| 6 | OpenMDAO | `/c/CFD/OpenMDAO/` | MDO Framework (optimization) | `openmdao` |
| 7 | Nevergrad | `/c/CFD/nevergrad/` | Derivative-free Opt (CMA, PSO, DE) | `nevergrad` |
| 8 | PhysicsNeMo | `/c/CFD/physicsnemo/` | AI Physics (PINNs, Modulus) | `physicsnemo` |
| 8b | PhysicsNeMo-CFD | `/c/CFD/physicsnemo-cfd/` | CFD Surrogates | `physicsnemo_cfd` |
| 9 | VTK | `/c/CFD/ParaView/VTK/` | Viz Pipeline (data model, filters) | `vtk` |
| 10 | ParaView | `/c/CFD/ParaView/` | Batch Rendering (pvpython) | `paraview` |
| 9b | PyVista | `/c/CFD/pyvista/` | Pythonic VTK Wrapper | `pyvista` |
| 10b | meshio | `/c/CFD/meshio/` | Mesh I/O (20+ formats) | `meshio` |
| 11 | CadQuery (NEW) | `/c/CFD/cadquery/` | **Scriptable CAD (OCP wrapper)** | `cadquery` |
| 12 | drei | `/c/CFD/drei/` | R3F Helpers (controls, effects) | `drei` |
| 13 | react-three-fiber | `/c/CFD/react-three-fiber/` | React 3D Renderer | `react_three_fiber` |
| 14 | three.js | `/c/CFD/three.js/` | Core 3D Library | `three` |

---

## Phase 1: Critical Tauri Backend Launcher Fixes (src/backend.rs)

### BUG-001: Double `self.stop().await` Call (Line 507-508)
```rust
// CURRENT (broken):
let _ = self.stop().await;
let _ = self.stop().await;  // DUPLICATE

// FIX:
let _ = self.stop().await;
```

### BUG-002: Debug Mode Venv Site-Packages Path (Line 327-350)
```rust
// CURRENT: Uses CARGO_MANIFEST_DIR/backend/.venv which may not exist in release
// FIX: Check both debug and release paths
let venv_site_packages = if cfg!(target_os = "windows") {
    // Try release staged runtime first
    let release_venv = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("bin")
        .join("backend-runtime")
        .join("venv")
        .join("Lib")
        .join("site-packages");
    if release_venv.exists() {
        release_venv
    } else {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("backend")
            .join(".venv")
            .join("Lib")
            .join("site-packages")
    }
} else {
    // Linux/macOS similar logic
    let release_venv = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("bin")
        .join("backend-runtime")
        .join("venv")
        .join("lib")
        .join("python3.11")
        .join("site-packages");
    if release_venv.exists() {
        release_venv
    } else {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("backend")
            .join(".venv")
            .join("lib")
            .join("python3.11")
            .join("site-packages")
    }
};
```

### BUG-003: `process_guard` None Check Returns Error (Line 551-554)
```rust
// CURRENT: Returns error if process_guard is None during health check
None => Some(Err(std::io::Error::new(
    std::io::ErrorKind::NotFound,
    "Backend process was not available during startup",
))),

// FIX: Treat None as "process not yet started" not an error
None => None,
```

### BUG-004: `probe_health` Polls Wrong Path (Line 1019-1020)
```rust
// CURRENT: format!("{}/health", endpoint) - endpoint already includes port
// This is actually CORRECT: endpoint = "http://127.0.0.1:PORT"
// Result: "http://127.0.0.1:PORT/health" ✓

// BUT: The health check in wait_for_startup_health polls every 125ms
// FIX: Add exponential backoff
let mut interval = Duration::from_millis(125);
let max_interval = Duration::from_secs(2);
while tokio::time::Instant::now() < deadline {
    if self.probe_health(Duration::from_millis(500)).await {
        return Ok(());
    }
    tokio::time::sleep(interval).await;
    interval = std::cmp::min(interval * 2, max_interval);
}
```

### BUG-005: `command.spawn()` No Error Handling (Line 485)
```rust
// CURRENT:
let mut child = command.spawn().context("Failed to spawn backend process")?;

// FIX: Add Windows-specific error context
let mut child = command.spawn()
    .with_context(|| format!("Failed to spawn backend: program={:?}, args={:?}, cwd={:?}", 
        launch.program, launch.args, launch.working_directory))?;
```

### Additional: Reuse `reqwest::Client` in `probe_health` (Line 1018)
```rust
// CURRENT: Creates new client every call
let client = reqwest::Client::new();

// FIX: Store client in BackendManager or use static
static HEALTH_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
let client = HEALTH_CLIENT.get_or_init(|| {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(2))
        .build()
        .expect("Failed to create health check client")
});
```

---

## Phase 2: Add CadQuery Engine (15th Engine)

### 2.1 Update `engine_registry.py` - Add to ENGINE_DEFINITIONS

```python
EngineDefinition(
    id="cadquery",
    display_name="CadQuery",
    workflow=("geometry", "meshing"),
    runtime="isolated_native_worker",
    optional=True,
    adapter="cadquery_script",
    distribution="cadquery",
    executable_names=("cadquery", "cq-cli"),
),
```

### 2.2 Add Capability Probe in `EngineRegistry`

```python
async def _probe_cadquery(self, definition: EngineDefinition) -> EngineCapability:
    try:
        import cadquery
        import cadquery.cqgi as cqgi
        version = getattr(cadquery, "__version__", "unknown")
        return EngineCapability(
            id=definition.id,
            display_name=definition.display_name,
            workflow=list(definition.workflow),
            runtime=definition.runtime,
            optional=definition.optional,
            adapter=definition.adapter,
            status="ready",
            version=version,
            detail="CadQuery available in managed Python runtime.",
        )
    except ImportError as e:
        return EngineCapability(
            id=definition.id,
            display_name=definition.display_name,
            workflow=list(definition.workflow),
            runtime=definition.runtime,
            optional=definition.optional,
            adapter=definition.adapter,
            status="unavailable",
            version=None,
            detail=f"CadQuery not installed: {e}",
        )
```

### 2.3 Add Orchestrator Method in `engineering_orchestrator.py`

```python
async def _prepare_geometry_with_cadquery(self, run_path: Path, source: Path) -> dict[str, Any]:
    """Prepare geometry using CadQuery (lighter weight than FreeCAD)."""
    await self._require(("cadquery",))
    
    import cadquery.cqgi as cqgi
    
    script = f"""
import cadquery as cq
result = cq.importers.importStep(r"{source}")
# Validate: check for closed solids
solids = result.val().solids()
if len(solids) == 0:
    raise ValueError("No solids found in imported geometry")
for s in solids:
    if not s.isClosed():
        raise ValueError(f"Solid {{s}} is not closed")
result.val().exportStep(r"{run_path / 'prepared.step'}")
"""
    script_path = run_path / "prepare_cq.py"
    script_path.write_text(script)
    
    # Execute via cqgi (no subprocess needed - runs in-process)
    build_result = cqgi.parse(script).build()
    
    output = run_path / "prepared.step"
    report = run_path / "geometry-report.json"
    
    if not output.exists():
        raise EngineeringExecutionError("CadQuery did not produce output STEP file")
    
    # Build report
    report_data = {
        "engine": "cadquery",
        "source": str(source),
        "output": str(output),
        "success": True,
        "solids_count": len(build_result.results[0].shape.solids()) if build_result.success else 0,
    }
    report.write_text(json.dumps(report_data, indent=2))
    
    return {
        "prepared_geometry": output,
        "report": report,
    }
```

### 2.4 Update Geometry Selection Priority in `_prepare_geometry`

```python
async def _prepare_geometry(self, project_path: Path, run_path: Path, configuration: dict) -> dict:
    source = self._resolve_geometry_source(project_path, configuration)
    
    # Priority: FreeCAD (full parametric) > CadQuery (scriptable) > Gmsh (fallback)
    freecad = await self.engines.capability("freecad", refresh=True)
    cadquery = await self.engines.capability("cadquery", refresh=True)
    
    if freecad.status in {"ready", "bundled"}:
        return await self._prepare_geometry_with_freecad(run_path, source)
    elif cadquery.status in {"ready", "bundled"}:
        return await self._prepare_geometry_with_cadquery(run_path, source)
    else:
        # Fallback to Gmsh
        return await self._prepare_geometry_with_gmsh(run_path, source)
```

### 2.5 Update `backend/pyproject.toml`

```toml
[project.optional-dependencies]
cad = ["cadquery>=2.9.0", "cadquery-ocp>=7.9.3.1"]
```

---

## Phase 3: Database & Model Cleanup

### 3.1 Initialize Alembic Migrations
```bash
cd /c/CFD/cfd-platform/backend
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

### 3.2 Remove Duplicate Models
- **Remove**: `backend/src/cfd_backend/models/optimization.py` (legacy `Optimization` class)
- **Keep**: `OptimizationStudy` in same file
- **Remove**: `backend/src/cfd_backend/models/solver.py` (`SolverConfig` model)
- **Use**: `Simulation.solver_settings` JSON field instead

### 3.3 Add FK Constraints to SQLite Schema in `workflow_service.py`

```python
# In _init_db() or migration:
CREATE TABLE workflow_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    stage_name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE workflow_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (stage_id) REFERENCES workflow_stages(id) ON DELETE CASCADE
);
```

---

## Phase 4: Remove Dead Code

### 4.1 Remove from `dependencies.py` (ServiceContainer)
```python
# REMOVE these classes entirely:
class CeleryManager: ...
class RedisManager: ...
class ExternalToolsManager: ...

# REMOVE their initialization in ServiceContainer.initialize():
# - self.celery = CeleryManager(...)
# - self.redis = RedisManager(...)
# - self.external_tools = ExternalToolsManager(...)
```

### 4.2 Remove from `backend/pyproject.toml`
```toml
# REMOVE these dependencies (unused in desktop mode):
celery = ">=5.3.0"
flower = ">=2.0.0"
redis = ">=5.0.0"

# OR gate behind feature flag:
[project.optional-dependencies]
celery = ["celery>=5.3.0", "flower>=2.0.0", "redis>=5.0.0"]
```

---

## Phase 5: WorkflowService Optimizations

### 5.1 Replace Sync `sqlite3` with `aiosqlite`
```python
# CURRENT: Uses sqlite3 in asyncio.to_thread
# FIX: Use aiosqlite for true async
import aiosqlite

async def _connection(self) -> aiosqlite.Connection:
    conn = await aiosqlite.connect(self.db_path)
    conn.row_factory = aiosqlite.Row
    return conn
```

### 5.2 Add Artifact Catalog Cache with Invalidation
```python
# Add to WorkflowService:
_artifact_cache: dict[str, list[ArtifactInfo]] = {}
_artifact_cache_version: dict[str, int] = {}

async def _artifact_catalog(self, project_path: Path) -> list[ArtifactInfo]:
    key = str(project_path)
    version = self._get_catalog_version(project_path)
    
    if key in self._artifact_cache and self._artifact_cache_version.get(key) == version:
        return self._artifact_cache[key]
    
    # Rebuild catalog
    catalog = await self._rebuild_catalog(project_path)
    self._artifact_cache[key] = catalog
    self._artifact_cache_version[key] = version
    return catalog

def _invalidate_catalog(self, project_path: Path):
    key = str(project_path)
    self._artifact_cache.pop(key, None)
    self._artifact_cache_version.pop(key, None)
```

### 5.3 Clean Up Orphaned Artifact Files
```python
async def _invalidate_references(self, project_path: Path, stage: str):
    # ... existing code ...
    # ADD: Delete physical artifact files
    for ref in refs_to_delete:
        artifact_path = project_path / "objects" / ref.artifact_id[:2] / ref.artifact_id
        if artifact_path.exists():
            artifact_path.unlink()
```

---

## Phase 6: Orchestrator Performance Fixes

### 6.1 Stream Solver Output to File (Not Buffer)
```python
# CURRENT: Buffers entire stdout in memory
async def _run_solver(self, ...):
    proc = await asyncio.create_subprocess_exec(
        solver, "-case", str(case_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()  # BUFFERS ALL OUTPUT

# FIX: Stream to file, tail for UI
async def _run_solver(self, case_path: Path, solver: str, run_path: Path):
    log_file = run_path / "solver.log"
    async with aiofiles.open(log_file, "wb") as f:
        proc = await asyncio.create_subprocess_exec(
            solver, "-case", str(case_path),
            stdout=f, stderr=f,
        )
        await proc.wait()
    return log_file
```

### 6.2 Symlink OpenFOAM Case Instead of Copy
```python
# CURRENT: shutil.copytree (slow for large cases)
# FIX: Use symlinks or bind mounts
def _prepare_openfoam_case(self, source: Path, dest: Path):
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Symlink the entire case directory
    os.symlink(source.resolve(), dest, target_is_directory=True)
```

### 6.3 Add Request Timeout Enforcement
```python
# In call_private_api (backend.rs line 726):
# Current: 30s default, 7500s for solver
# FIX: Configurable per-endpoint timeouts
TIMEOUTS = {
    "/health": Duration::from_secs(5),
    "/api/v1/workflow/engines": Duration::from_secs(30),
    "/api/v1/workflow/projects": Duration::from_secs(30),
    "/execute": Duration::from_secs(7500),  # 2 hours for solver
}
```

---

## Phase 7: Engine Integration Matrix

### Complete Engine Capability Coverage

| Workflow Stage | Primary Engine | Fallback | Notes |
|----------------|----------------|----------|-------|
| **Geometry Import** | FreeCAD | CadQuery → Gmsh | STEP/IGES/BREP |
| **Geometry Healing** | Gmsh (OCC) | CadQuery | `healShapes`, `makeSolids` |
| **Volume Meshing** | Gmsh | cfMesh | Tetra/hex, boundary layers |
| **Cartesian Meshing** | cfMesh | — | `cartesianMesh` + `checkMesh` |
| **Mesh Conversion** | meshio | Gmsh `gmshToFoam` | 20+ formats |
| **CFD Solve** | OpenFOAM | — | `simpleFoam`, `pimpleFoam` |
| **Optimization (grad)** | OpenMDAO | — | SLSQP, COBYLA |
| **Optimization (bb)** | Nevergrad | — | CMA, PSO, DE |
| **Surrogate Training** | PhysicsNeMo | — | CUDA required |
| **Surrogate Inference** | PhysicsNeMo-CFD | — | CFD-specific models |
| **Post-Processing** | PyVista | VTK → ParaView | `streamlines`, `contour` |
| **Batch Rendering** | ParaView | PyVista | `pvpython` |
| **Viewport (UI)** | three.js + r3f + drei | — | React Three Fiber |

---

## Phase 8: Verification Checklist

### 8.1 Backend Starts Successfully
```bash
cd /c/CFD/cfd-platform
cargo build --release
./target/release/cfd-platform-tauri.exe
# Should show: "Backend started successfully" in logs
```

### 8.2 Health Endpoint Responds
```bash
curl http://127.0.0.1:<port>/health
# {"status":"healthy","version":"1.0.0"}
```

### 8.3 Engine Inventory Returns 15 Engines
```bash
curl -H "Authorization: Bearer <token>" \
  http://127.0.0.1:<port>/api/v1/workflow/engines?refresh=true
# Should list all 15 engines with status
```

### 8.4 Geometry Workflow (CadQuery → Gmsh)
```python
# Test: Import STEP → heal → mesh
import cadquery as cq
import gmsh

# CadQuery
result = cq.importers.importStep("test.step")
result.val().exportStep("healed.step")

# Gmsh
gmsh.initialize()
gmsh.model.occ.importShapes("healed.step")
gmsh.model.occ.healShapes()
gmsh.model.occ.synchronize()
gmsh.model.mesh.generate(3)
gmsh.write("mesh.msh")
gmsh.finalize()
```

### 8.5 Meshing Workflow (cfMesh)
```bash
# OpenFOAM case setup
cartesianMesh -case <case_dir>
checkMesh -case <case_dir> -allGeometry -allTopology
# Should output: "Mesh OK"
```

### 8.6 Solver Workflow (OpenFOAM)
```bash
simpleFoam -case <case_dir>
foamToVTK -case <case_dir>
# Should produce VTK files in VTK/
```

### 8.7 Post-Processing (PyVista)
```python
import pyvista as pv
dataset = pv.read("VTK/simpleFoam_0.vtk")
plotter = pv.Plotter(off_screen=True)
plotter.add_mesh(dataset, scalars="p", cmap="coolwarm")
plotter.screenshot("preview.png")
```

### 8.8 Optimization Workflow
```python
import nevergrad as ng
import openmdao.api as om

# Nevergrad
optimizer = ng.optimizers.CMA(parametrization=1, budget=20)
recommendation = optimizer.minimize(objective)

# OpenMDAO
prob = om.Problem()
prob.model.add_subsystem("eval", ExternalCodeComp(...))
prob.driver = om.ScipyOptimizeDriver()
prob.run_driver()
```

---

## File Modification Summary

| File | Changes |
|------|---------|
| `src/backend.rs` | Fix BUG-001 through BUG-005 + client reuse |
| `backend/src/cfd_backend/services/engine_registry.py` | Add CadQuery engine + probe |
| `backend/src/cfd_backend/services/engineering_orchestrator.py` | Add CadQuery geometry prep + priority logic |
| `backend/pyproject.toml` | Add CadQuery optional dependency |
| `backend/alembic/` | Initialize migrations |
| `backend/src/cfd_backend/models/optimization.py` | Remove legacy `Optimization` |
| `backend/src/cfd_backend/models/solver.py` | Remove `SolverConfig` |
| `backend/src/cfd_backend/core/dependencies.py` | Remove Celery/Redis/ExternalToolsManager |
| `backend/src/cfd_backend/services/workflow_service.py` | Async SQLite, artifact cache, FK constraints |
| `backend/src/cfd_backend/services/engineering_orchestrator.py` | Stream solver output, symlink case |

---

## Build & Test Commands

```bash
# 1. Fix Rust backend
cd /c/CFD/cfd-platform
cargo build --release 2>&1 | tail -20

# 2. Fix Python backend
cd /c/CFD/cfd-platform/backend
pip install -e ".[cad]"

# 3. Initialize DB
alembic upgrade head

# 4. Run tests
pytest backend/tests/ -v

# 5. Test full workflow manually
./target/release/cfd-platform-tauri.exe
```

---

## Success Criteria

- [ ] Tauri desktop app launches backend without errors
- [ ] All 15 engines report "ready" or "bundled" status
- [ ] Geometry import works via FreeCAD → CadQuery → Gmsh fallback
- [ ] Meshing works via Gmsh and cfMesh routes
- [ ] OpenFOAM solver runs and produces VTK output
- [ ] PyVista/ParaView generate previews and reports
- [ ] Optimization runs with OpenMDAO + Nevergrad
- [ ] Surrogate training works with PhysicsNeMo (if CUDA available)
- [ ] Zero critical bugs in backend.rs
- [ ] All tests pass (32+ existing + new integration tests)