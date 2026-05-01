# Equity Analyst - Build System Guide

## Overview

This project uses a **unified build system** that packages both the Python backend (FastAPI) and React frontend into standalone, distributable desktop applications for Windows, macOS, and Linux.

**Key Features:**
- ✓ Single command builds for multiple platforms
- ✓ Automatic backend bundling with PyInstaller
- ✓ Frontend compilation with Vite
- ✓ Tauri desktop app integration
- ✓ Support for exe, deb, rpm, appimage, msi, dmg formats
- ✓ Cross-platform build scripts (Shell, Batch, Python)

## Quick Start

### 1. Initial Setup

```bash
cd build
chmod +x *.sh
./setup.sh
```

This will:
- Check for Python 3, Node.js, npm, and Rust
- Install Python virtual environment
- Download dependencies
- Prepare for building

### 2. Build Everything

```bash
./build.sh all
```

Or using Make (Linux/macOS):
```bash
make build
```

Or using Python (cross-platform):
```bash
python3 build.py build all
```

### 3. Find Your Packages

Built packages are in: `build/output/`

- **Linux**: `.deb`, `.rpm`, `.AppImage`
- **Windows**: `.exe`, `.msi`
- **macOS**: `.dmg`

## Build System Structure

```
build/
├── build.sh           # Main build script (Linux/macOS)
├── build.bat          # Build script for Windows
├── build.py           # Cross-platform Python build script
├── setup.sh           # Initial setup and dependency checker
├── distribute.sh      # Distribution management
├── Makefile           # Convenience targets (Linux/macOS)
├── config.json        # Build configuration
├── output/            # Generated packages (created after build)
├── dist/              # Distribution folder (created by distribute.sh)
└── README.md          # Detailed build documentation
```

## Platform-Specific Building

### Linux/macOS (using Shell)

```bash
cd build

# Build for all platforms
./build.sh all

# Build for specific platform
./build.sh linux        # deb, rpm, appimage
./build.sh windows      # exe, msi (cross-compile from Linux)
./build.sh macos        # dmg (cross-compile from Linux)

# Component builds
./build.sh backend-only   # Just Python backend
./build.sh frontend-only  # Just React frontend

# Clean
./build.sh clean
```

### Windows (using Batch)

```bash
cd build

# Build for Windows (recommended on Windows)
build.bat all
build.bat backend-only
build.bat clean
```

### Cross-Platform (using Python)

```bash
cd build

python3 build.py build all       # All platforms
python3 build.py build linux     # Linux only
python3 build.py backend         # Backend only
python3 build.py frontend        # Frontend only
python3 build.py clean           # Clean artifacts
```

### Using Make (Linux/macOS)

```bash
cd build

make help             # Show all targets
make build            # Build all platforms
make build-linux      # Linux packages
make backend          # Backend only
make clean            # Clean build
make install-deps     # Install dependencies
```

## Build Process Explained

### Step 1: Backend Build (Python)
```
backend/main.py
    ↓
[PyInstaller]
    ↓
backend/dist/fastapi-server (or .exe on Windows)
```

The Python FastAPI server is bundled as a standalone executable with all dependencies included.

### Step 2: Frontend Build (React/TypeScript)
```
src/App.tsx + components/
    ↓
[Vite + TypeScript compiler]
    ↓
dist/
```

React app is compiled, optimized, and bundled.

### Step 3: Tauri Integration
```
dist/ (frontend)
backend/dist/fastapi-server (sidecar)
    ↓
[Tauri compiler]
    ↓
src-tauri/target/release/bundle/
```

Tauri wraps everything into native apps and creates installers.

### Step 4: Distribution (Optional)
```
build/output/
    ↓
[distribute.sh]
    ↓
build/dist/
├── linux/
├── windows/
└── macos/
```

## Configuration

### Build Config (`build/config.json`)

Customize build behavior:
```json
{
  "app": {
    "name": "Equity Analyst",
    "version": "0.1.0"
  },
  "build": {
    "targets": ["linux", "windows", "macos"],
    "parallelBuilds": true
  }
}
```

### Backend Settings (`backend/main.py`)

Configure API:
- CORS origins
- Ollama server address
- Data endpoints

### Frontend Settings (`src/` and `vite.config.ts`)

Configure app:
- API endpoints
- Window size and behavior
- Theme and styling

### Tauri Settings (`src-tauri/tauri.conf.json`)

Configure desktop:
- App name and version
- Window properties
- Permissions and security
- Bundle options

## Distribution Management

After building, organize and document your releases:

```bash
cd build

# Full setup: organize, checksum, create docs
./distribute.sh all

# Individual operations
./distribute.sh organize      # Organize by platform
./distribute.sh checksums     # Generate SHA256 sums
./distribute.sh manifest      # Create manifest
./distribute.sh release-notes  # Release notes template
./distribute.sh list          # List contents
./distribute.sh clean         # Clean dist folder
```

This creates:
- `dist/linux/`, `dist/windows/`, `dist/macos/` - organized packages
- `CHECKSUMS.txt` - SHA256 hashes for verification
- `MANIFEST.txt` - List of files and installation instructions
- `RELEASE_NOTES.md` - Template for release notes
- `INSTALL_GUIDE.md` - Installation instructions for users

## Troubleshooting

### Build Fails: "PyInstaller not found"
```bash
pip install pyinstaller
```

### Build Fails: "Rust not found"
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Build Fails: "npm command not found"
- Install Node.js from https://nodejs.org/
- Verify: `node --version` (should be 16+)

### Build Fails: "Tauri command not found"
```bash
npm install
npx tauri --version
```

### Frontend not loading in built app
- Check `src-tauri/tauri.conf.json` - `frontendDist` path
- Ensure `npm run build` completed successfully
- Check browser console for errors

### Backend not starting
- Verify backend executable exists: `ls backend/dist/`
- Test backend directly: `backend/dist/fastapi-server`
- Check port 8000 is available

### Can't run `.sh` scripts on Windows
- Use `build.bat` instead, or
- Use PowerShell: `powershell -ExecutionPolicy Bypass -File build.bat`, or
- Use WSL (Windows Subsystem for Linux)

## Development vs. Production

### Development Workflow
```bash
# Terminal 1: Frontend with hot reload
npm run dev

# Terminal 2: Backend development
source .venv/bin/activate
python backend/main.py

# Terminal 3: Live Tauri development (optional)
npm run tauri dev
```

### Production Build
```bash
./build/build.sh all
# Output in build/output/
```

## Performance Tips

- **Parallel builds**: Edit `config.json` to enable `"parallelBuilds": true`
- **Incremental builds**: Clean only what changed
- **Cache management**: Configure npm and pip caching
- **Binary stripping**: Enable `"stripBinaries": true` to reduce size

## Advanced Topics

### Adding Dependencies

**Python backend:**
```bash
source .venv/bin/activate
pip install <package>
pip freeze > requirements.txt
```

**Frontend:**
```bash
npm install <package>
npm run build  # Test build
```

### Signing and Distribution

For production releases:
1. Enable code signing in `config.json`
2. Add certificates
3. Configure upload endpoints
4. Run build and distribute

### Cross-Compilation

To build for other platforms from your current OS:
- Linux → Windows: Requires Windows cross-compiler
- macOS → other: Requires target SDKs
- Check Tauri docs for details

### Custom Build Targets

Edit `build.sh` or `tauri.conf.json` to:
- Change bundle types
- Add custom build steps
- Modify installer options

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build
on: [push]
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - uses: actions/setup-node@v2
      - run: cd build && ./build.sh all
      - uses: actions/upload-artifact@v2
        with:
          path: build/output
```

## Support & Resources

- **Tauri Docs**: https://tauri.app
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **PyInstaller Docs**: https://pyinstaller.org

## Next Steps

1. **Setup**: Run `./build/setup.sh` to install dependencies
2. **Build**: Run `./build/build.sh all` to create packages
3. **Test**: Install and test each package
4. **Distribute**: Run `./build/distribute.sh` to organize and document
5. **Release**: Upload to GitHub, website, or app stores

---

**Last Updated**: 2024
**Build System Version**: 1.0
