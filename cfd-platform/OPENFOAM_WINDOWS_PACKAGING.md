# OpenFOAM Windows Packaging Strategy for HX CFD

## Overview

OpenFOAM is Linux-native but must run on Windows for HX CFD. Three approaches exist, ranked by preference:

| Approach | Pros | Cons | Status |
|----------|------|------|--------|
| **WSL2 Ubuntu + Prebuilt OpenFOAM** | Native Linux binaries, full solver compatibility, MPI support | Requires WSL2 enablement, ~2GB base image | **Recommended** |
| **Native Windows Build (OpenFOAM v2306+)** | No WSL2 dependency, direct Windows executables | Limited solver subset, complex build, MPI issues | Fallback |
| **Docker + WSL2 Backend** | Consistent environment, isolated | Docker Desktop license, heavy | Not recommended |

---

## Recommended: WSL2 + Ubuntu + Prebuilt OpenFOAM

### Prerequisites (Installer Responsibility)
1. Enable WSL2: `wsl --install -d Ubuntu-22.04`
2. Install OpenFOAM v2306+ inside WSL2
3. Configure Windows-side shims for seamless execution

### Package Structure in Installer
```
Dependencies/
└── OpenFOAM/
    ├── wsl-distribution.tar.gz     # Pre-configured WSL2 Ubuntu + OpenFOAM
    ├── bin/
    │   ├── wsl-openfoam.exe        # Shim: launches OpenFOAM commands in WSL2
    │   ├── foamVersion.exe         # Version query shim
    │   ├── simpleFoam.exe          # Solver shim
    │   ├── pimpleFoam.exe          # Solver shim
    │   ├── blockMesh.exe           # Meshing shim
    │   ├── snappyHexMesh.exe       # Meshing shim
    │   ├── gmshToFoam.exe          # Converter shim
    │   ├── checkMesh.exe           # Validation shim
    │   ├── foamToVTK.exe           # Post-processing shim
    │   ├── decomposePar.exe        # Parallel shim
    │   ├── reconstructPar.exe      # Parallel shim
    │   └── mpirun.exe              # MPI shim
    └── manifest.json               # Version, checksum, WSL distro name
```

### Shim Design (`wsl-openfoam.exe`)

```rust
// bin/wsl-openfoam/src/main.rs
use std::process::Command;
use std::env;

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let openfoam_bin = env::var("OPENFOAM_BIN").unwrap_or_else(|_| "/opt/openfoam2306/bin".to_string());
    
    // Source OpenFOAM bashrc then execute
    let cmd = format!(
        "source /opt/openfoam2306/etc/bashrc && {} {}",
        openfoam_bin,
        args.join(" ")
    );
    
    let status = Command::new("wsl.exe")
        .args(["-d", "HXCFD-OpenFOAM", "-e", "bash", "-c", &cmd])
        .status()
        .expect("Failed to execute wsl command");
    
    std::process::exit(status.code().unwrap_or(1));
}
```

### WSL Distribution Creation (Build-time)

```bash
# 1. Create clean Ubuntu 22.04 WSL
wsl --install -d Ubuntu-22.04
wsl -d Ubuntu-22.04 -- apt-get update && apt-get upgrade -y

# 2. Install OpenFOAM v2306
wsl -d Ubuntu-22.04 -- bash -c "
    apt-get install -y gnupg2 curl
    curl -fsSL https://dl.openfoam.org/gpg.key | gpg --dearmor -o /usr/share/keyrings/openfoam.gpg
    echo 'deb [signed-by=/usr/share/keyrings/openfoam.gpg] https://dl.openfoam.org/ubuntu jammy main' > /etc/apt/sources.list.d/openfoam.list
    apt-get update
    apt-get install -y openfoam2306-default
"

# 3. Install MPI and dependencies
wsl -d Ubuntu-22.04 -- apt-get install -y openmpi-bin libopenmpi-dev

# 4. Configure for HX CFD (non-interactive, no GUI)
wsl -d Ubuntu-22.04 -- bash -c "
    echo 'export OMPI_ALLOW_RUN_AS_ROOT=1' >> /opt/openfoam2306/etc/bashrc
    echo 'export OMPI_ALLOW_RUN_AS_ROOT_CONFIRM=1' >> /opt/openfoam2306/etc/bashrc
"

# 5. Rename distro for HX CFD
wsl --export Ubuntu-22.04 HXCFD-OpenFOAM.tar.gz
wsl --unregister Ubuntu-22.04
wsl --import HXCFD-OpenFOAM ./HXCFD-OpenFOAM HXCFD-OpenFOAM.tar.gz --version 2

# 6. Package for installer
tar -czf Dependencies/OpenFOAM/wsl-distribution.tar.gz -C ./HXCFD-OpenFOAM .
```

### Runtime Behavior

1. **First Launch**: Installer extracts `wsl-distribution.tar.gz`, runs `wsl --import HXCFD-OpenFOAM <path> <tarball>`
2. **Subsequent Launches**: Shims execute `wsl -d HXCFD-OpenFOAM ...` directly
3. **Path Translation**: Windows paths (`C:\Projects\case`) → WSL paths (`/mnt/c/Projects/case`) handled automatically by WSL

### Environment Variables (Set by Installer)

```ini
OPENFOAM_PATH=C:\Program Files\HX CFD\dependencies\OpenFOAM
OPENFOAM_WSL_DISTRO=HXCFD-OpenFOAM
OPENFOAM_BIN=/opt/openfoam2306/bin
```

---

## Fallback: Native Windows OpenFOAM Build

If WSL2 is unavailable (Windows 10 < 19032, Windows Server, restricted environments):

### Build Requirements
- Visual Studio 2022 + Windows SDK
- CMake 3.20+
- MS-MPI v10+
- ThirdParty: CGAL, Scotch, PTScotch, ADIOS2, Kahip

### Build Process (CI/CD)

```bash
# Using OpenFOAM v2306+ native Windows support
git clone -b v2306 https://github.com/OpenFOAM/OpenFOAM-dev.git
cd OpenFOAM-dev
./Allwmake -j %NUMBER_OF_PROCESSORS% 2>&1 | tee build.log
```

### Limitations
- Only `simpleFoam`, `pimpleFoam`, `pisoFoam` tested on Windows
- `snappyHexMesh` has known issues on Windows
- No native MPI (use MS-MPI with limited features)
- Recommended only as last resort

---

## Integration with Engineering Orchestrator

The `EngineeringOrchestrator._openfoam_executable()` method resolves executables in this order:

1. **Configured `openfoam_path`** (from Settings)
2. **Windows shims** in `Dependencies/OpenFOAM/bin/*.exe`
3. **WSL shims** (auto-detected via `wsl-openfoam.exe`)
4. **PATH** (system OpenFOAM if manually installed)

```python
# In engineering_orchestrator.py
def _openfoam_executable(self, name: str) -> str:
    openfoam_path = getattr(self.settings, "openfoam_path", None)
    if openfoam_path:
        for location in (
            openfoam_path / "bin" / f"{name}.exe",
            openfoam_path / "bin" / name,
            openfoam_path / f"{name}.exe",
            openfoam_path / name,
        ):
            if location.exists():
                return str(location)
    executable = shutil.which(f"{name}.exe") or shutil.which(name)
    if not executable:
        raise EngineeringExecutionError(f"OpenFOAM executable '{name}' is not available on the local toolchain.")
    return executable
```

---

## Verification Checklist (Installer Post-Install)

```bash
# 1. WSL distro exists
wsl -l -v | grep HXCFD-OpenFOAM

# 2. OpenFOAM version
wsl -d HXCFD-OpenFOAM -e bash -c "source /opt/openfoam2306/etc/bashrc && foamVersion"

# 3. Solver execution
wsl -d HXCFD-OpenFOAM -e bash -c "source /opt/openfoam2306/etc/bashrc && simpleFoam -help"

# 4. Meshing utilities
wsl -d HXCFD-OpenFOAM -e bash -c "source /opt/openfoam2306/etc/bashrc && blockMesh -help"
wsl -d HXCFD-OpenFOAM -e bash -c "source /opt/openfoam2306/etc/bashrc && snappyHexMesh -help"

# 5. Parallel
wsl -d HXCFD-OpenFOAM -e bash -c "source /opt/openfoam2306/etc/bashrc && mpirun -np 2 simpleFoam -help"

# 6. Post-processing
wsl -d HXCFD-OpenFOAM -e bash -c "source /opt/openfoam2306/etc/bashrc && foamToVTK -help"
wsl -d HXCFD-OpenFOAM -e bash -c "source /opt/openfoam2306/etc/bashrc && checkMesh -help"
```

---

## Size Estimates

| Component | Size |
|-----------|------|
| WSL Ubuntu 22.04 base | ~1.2 GB |
| OpenFOAM v2306 (full) | ~3.5 GB |
| Third-party libs | ~800 MB |
| **Total (compressed)** | **~2.8 GB** (tar.gz) |
| **Total (installed)** | **~5.5 GB** |

---

## License Compliance

- OpenFOAM: GPL-3.0 (source must be available)
- Include `COPYING` in `Dependencies/OpenFOAM/`
- Provide source code offer in installer EULA
- WSL distribution is a *packaging* of Ubuntu + OpenFOAM binaries — not a derived work