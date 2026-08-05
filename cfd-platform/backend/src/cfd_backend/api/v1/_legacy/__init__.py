"""Legacy public REST surface (QUARANTINED — not mounted).

The routers in this directory predate the Tauri-managed local-first workflow
contract and are no longer wired into the live FastAPI app. They are kept here
as historical reference for any future public web API rebuild:

  pending   -> broken: reference ORM attributes that do not exist on the
              desiged Project/Mesh/Simulation models (solver, reference_velocity,
              file_size, cpu_hours, ...). Build would raise AttributeError at
              request time.

Do not re-mount any module here without first re-aligning its schemas to the
canonical models in `cfd_backend.models.*` and rebuilding typed services.
"""
