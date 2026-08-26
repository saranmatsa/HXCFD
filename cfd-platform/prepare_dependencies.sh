#!/bin/bash
# Build script to prepare HX CFD installer dependencies
# Run on Linux build machine or WSL2

set -euo pipefail

BUILD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPENDENCIES_DIR="$BUILD_DIR/Dependencies"
PAYLOAD_DIR="$DEPENDENCIES_DIR/payload"

# Version pins (must match engineering_orchestrator.py expectations)
OPENFOAM_VERSION="v2306"
FREECAD_VERSION="1.0.0"
PARAVIEW_VERSION="5.12.0"

echo "=== HX CFD Dependency Preparation ==="
echo "Build directory: $BUILD_DIR"
echo "Dependencies directory: $DEPENDENCIES_DIR"
echo ""

# Clean previous builds
rm -rf "$PAYLOAD_DIR"
mkdir -p "$PAYLOAD_DIR"/{OpenFOAM,FreeCAD,ParaView}

# ============================================================================
# OpenFOAM: WSL2 Distribution
# ============================================================================
echo "=== Preparing OpenFOAM $OPENFOAM_VERSION (WSL2) ==="

WSL_DISTRO_NAME="HXCFD-OpenFOAM"
WSL_TARBALL="$PAYLOAD_DIR/OpenFOAM/wsl-distribution.tar.gz"
WSL_MANIFEST="$PAYLOAD_DIR/OpenFOAM/manifest.json"

# Create temporary WSL distro
TEMP_WSL_DIR=$(mktemp -d)
trap "wsl --unregister $WSL_DISTRO_NAME 2>/dev/null || true; rm -rf $TEMP_WSL_DIR" EXIT

echo "Installing Ubuntu 22.04 base..."
wsl --install -d Ubuntu-22.04 || true
wsl -d Ubuntu-22.04 -- apt-get update && apt-get upgrade -y

echo "Installing OpenFOAM $OPENFOAM_VERSION..."
wsl -d Ubuntu-22.04 -- bash -c "
    apt-get install -y gnupg2 curl lsb-release
    curl -fsSL https://dl.openfoam.org/gpg.key | gpg --dearmor -o /usr/share/keyrings/openfoam.gpg
    echo 'deb [signed-by=/usr/share/keyrings/openfoam.gpg] https://dl.openfoam.org/ubuntu jammy main' > /etc/apt/sources.list.d/openfoam.list
    apt-get update
    apt-get install -y openfoam${OPENFOAM_VERSION}-default
"

echo "Installing MPI and dependencies..."
wsl -d Ubuntu-22.04 -- apt-get install -y openmpi-bin libopenmpi-dev

echo "Configuring for non-interactive HX CFD use..."
wsl -d Ubuntu-22.04 -- bash -c "
    echo 'export OMPI_ALLOW_RUN_AS_ROOT=1' >> /opt/openfoam${OPENFOAM_VERSION}/etc/bashrc
    echo 'export OMPI_ALLOW_RUN_AS_ROOT_CONFIRM=1' >> /opt/openfoam${OPENFOAM_VERSION}/etc/bashrc
    echo 'export FOAM_SIGFPE=false' >> /opt/openfoam${OPENFOAM_VERSION}/etc/bashrc
"

echo "Renaming WSL distro..."
wsl --export Ubuntu-22.04 "$TEMP_WSL_DIR/ubuntu-base.tar.gz"
wsl --unregister Ubuntu-22.04
wsl --import "$WSL_DISTRO_NAME" "$TEMP_WSL_DIR/$WSL_DISTRO_NAME" "$TEMP_WSL_DIR/ubuntu-base.tar.gz" --version 2

echo "Exporting WSL distribution for installer..."
wsl --export "$WSL_DISTRO_NAME" "$WSL_TARBALL"

# Create manifest
cat > "$WSL_MANIFEST" <<EOF
{
  "name": "OpenFOAM",
  "version": "$OPENFOAM_VERSION",
  "type": "wsl-distribution",
  "distro_name": "$WSL_DISTRO_NAME",
  "description": "OpenFOAM $OPENFOAM_VERSION on Ubuntu 22.04 via WSL2",
  "executables": [
    "simpleFoam", "pimpleFoam", "pisoFoam", "interFoam",
    "blockMesh", "snappyHexMesh", "surfaceFeatureExtract",
    "gmshToFoam", "checkMesh", "foamToVTK",
    "decomposePar", "reconstructPar", "mpirun"
  ],
  "sha256": "$(sha256sum "$WSL_TARBALL" | cut -d' ' -f1)",
  "size_bytes": $(stat -c%s "$WSL_TARBALL"),
  "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Create Windows shim executables (PowerShell wrappers)
SHIM_DIR="$PAYLOAD_DIR/OpenFOAM/bin"
mkdir -p "$SHIM_DIR"

cat > "$SHIM_DIR/wsl-openfoam.ps1" <<'EOF'
<# 
.SYNOPSIS
    HX CFD OpenFOAM Shim - Executes OpenFOAM commands in WSL2 HXCFD-OpenFOAM distro
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Command,
    
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

$distroName = "HXCFD-OpenFOAM"
$openfoamBin = "/opt/openfoam2306/bin"

# Build command with bashrc sourcing
$fullArgs = @($Command) + $Args
$cmdString = "source /opt/openfoam2306/etc/bashrc && $openfoamBin/$($fullArgs -join ' ')"

try {
    $process = Start-Process -FilePath "wsl.exe" -ArgumentList "-d", $distroName, "-e", "bash", "-c", $cmdString -Wait -PassThru -NoNewWindow
    exit $process.ExitCode
} catch {
    Write-Error "Failed to execute OpenFOAM command: $_"
    exit 1
}
EOF

# Generate individual solver shims
for solver in simpleFoam pimpleFoam pisoFoam interFoam blockMesh snappyHexMesh surfaceFeatureExtract gmshToFoam checkMesh foamToVTK decomposePar reconstructPar mpirun; do
    cat > "$SHIM_DIR/$solver.ps1" <<EOF
#!/usr/bin/env pwsh
& "$PSScriptRoot/wsl-openfoam.ps1" $solver @args
EOF
done

# Create manifest for shims
cat > "$PAYLOAD_DIR/OpenFOAM/manifest.json" <<EOF
{
  "name": "OpenFOAM",
  "version": "$OPENFOAM_VERSION",
  "type": "wsl-distribution",
  "distro_name": "$WSL_DISTRO_NAME",
  "description": "OpenFOAM $OPENFOAM_VERSION on Ubuntu 22.04 via WSL2",
  "executables": [
    "simpleFoam", "pimpleFoam", "pisoFoam", "interFoam",
    "blockMesh", "snappyHexMesh", "surfaceFeatureExtract",
    "gmshToFoam", "checkMesh", "foamToVTK",
    "decomposePar", "reconstructPar", "mpirun"
  ],
  "shim_type": "powershell",
  "sha256": "$(sha256sum "$WSL_TARBALL" | cut -d' ' -f1)",
  "size_bytes": $(stat -c%s "$WSL_TARBALL"),
  "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "OpenFOAM package ready at $PAYLOAD_DIR/OpenFOAM"
echo ""

# ============================================================================
# FreeCAD: Windows AppImage/Bundle
# ============================================================================
echo "=== Preparing FreeCAD $FREECAD_VERSION ==="

FREECAD_DIR="$PAYLOAD_DIR/FreeCAD"
mkdir -p "$FREECAD_DIR/bin"

# Download FreeCAD AppImage (or use prebuilt)
FREECAD_APPIMAGE_URL="https://github.com/FreeCAD/FreeCAD/releases/download/${FREECAD_VERSION}/FreeCAD-${FREECAD_VERSION}-Linux-x86_64.AppImage"
# For Windows, we'd typically use the Windows installer bundle
# This is a placeholder - actual implementation would download Windows bundle

cat > "$FREECAD_DIR/manifest.json" <<EOF
{
  "name": "FreeCAD",
  "version": "$FREECAD_VERSION",
  "type": "windows-bundle",
  "description": "FreeCAD $FREECAD_VERSION with OpenCASCADE kernel",
  "executables": ["FreeCADCmd.exe"],
  "sha256": "PLACEHOLDER - build script must populate",
  "size_bytes": 0,
  "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "FreeCAD manifest created (Windows bundle download needed)"
echo ""

# ============================================================================
# ParaView: Windows Bundle
# ============================================================================
echo "=== Preparing ParaView $PARAVIEW_VERSION ==="

PARAVIEW_DIR="$PAYLOAD_DIR/ParaView"
mkdir -p "$PARAVIEW_DIR/bin"

cat > "$PARAVIEW_DIR/manifest.json" <<EOF
{
  "name": "ParaView",
  "version": "$PARAVIEW_VERSION",
  "type": "windows-bundle",
  "description": "ParaView $PARAVIEW_VERSION batch engine (pvpython, pvbatch)",
  "executables": ["pvpython.exe", "pvbatch.exe"],
  "sha256": "PLACEHOLDER - build script must populate",
  "size_bytes": 0,
  "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "ParaView manifest created (Windows bundle download needed)"
echo ""

# ============================================================================
# Create payload ZIPs for installer
# ============================================================================
echo "=== Creating installer payload ZIPs ==="

cd "$DEPENDENCIES_DIR"

for dep in OpenFOAM FreeCAD ParaView; do
    if [ -d "payload/$dep" ]; then
        echo "Packaging $dep..."
        # Exclude the manifest from ZIP (it stays alongside)
        # The manifest is copied separately by Inno Setup [Files] section
        (cd "payload/$dep" && zip -r "../$dep.zip" . -x "manifest.json")
    fi
done

echo ""
echo "=== Dependency preparation complete ==="
echo "Payload directory: $DEPENDENCIES_DIR/payload"
echo "Installer ZIPs: $DEPENDENCIES_DIR/*.zip"
ls -lh "$DEPENDENCIES_DIR"/*.zip 2>/dev/null || true