# Build System for Equity Analyst

This directory contains the build system for creating distributable packages of the Equity Analyst application for multiple platforms.

## Overview

The build system handles:
- **Backend bundling**: Packages the Python FastAPI server as a standalone executable using PyInstaller
- **Frontend building**: Builds the React/TypeScript frontend with Vite
- **Tauri integration**: Combines everything into native desktop applications
- **Multi-platform distribution**: Creates installers for Linux (deb, rpm, appimage), Windows (exe, msi), and macOS (dmg)

## Prerequisites

### System Requirements

**Linux:**
```bash
sudo apt-get install libssl-dev libglib2.0-dev libdbus-1-dev libgtk-3-dev libappindicator3-dev
```

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`
- Or install via Homebrew

**Windows:**
- Visual Studio with C++ build tools

### Python and Node.js

- Python 3.8+
- Node.js 16+
- npm 8+

## Installation

1. **Clone and setup:**
```bash
cd /path/to/Equity-Analyst
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
npm install
```

2. **Install Rust (required for Tauri):**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Building

### Using Shell Script (Linux/macOS)

```bash
cd build
chmod +x build.sh

# Build for all platforms
./build.sh all

# Build for specific platform
./build.sh linux    # deb, rpm, appimage
./build.sh windows  # exe, msi
./build.sh macos    # dmg

# Build individual components
./build.sh backend-only   # Python backend only
./build.sh frontend-only  # Frontend only

# Clean build artifacts
./build.sh clean
```

### Using Batch Script (Windows)

```bash
cd build

# Build for Windows
build.bat all
build.bat backend-only
build.bat frontend-only
build.bat clean
```

### Using Python Script (Cross-platform)

```bash
cd build
python3 build.py build all      # Build for all platforms
python3 build.py build linux    # Build for Linux
python3 build.py backend        # Backend only
python3 build.py frontend       # Frontend only
python3 build.py clean          # Clean artifacts
```

## Output

All build artifacts are placed in `build/output/` directory:

```
build/output/
├── equity-analyst_0.1.0_amd64.deb        # Debian package
├── equity-analyst-0.1.0-1.x86_64.rpm     # RPM package
├── equity-analyst_0.1.0_amd64.AppImage   # AppImage
├── Equity Analyst_0.1.0_x64_en-US.msi    # Windows installer
├── Equity Analyst_0.1.0_x64_en-US.exe    # Windows executable
└── Equity Analyst_0.1.0.dmg              # macOS installer
```

## Build Process

### 1. Backend Build
- Installs PyInstaller if needed
- Bundles Python dependencies
- Creates standalone FastAPI server executable
- Output: `backend/dist/fastapi-server` (Linux/macOS) or `fastapi-server.exe` (Windows)

### 2. Frontend Build
- Installs npm dependencies
- Compiles TypeScript
- Builds React with Vite
- Output: `dist/` directory

### 3. Tauri Integration
- Bundles frontend into Tauri app
- Includes backend as a sidecar executable
- Compiles Rust code
- Creates platform-specific installers

## Configuration

### Backend Configuration
Edit `backend/main.py` to modify:
- CORS origins
- Ollama settings
- API endpoints

### Tauri Configuration
Edit `src-tauri/tauri.conf.json` to modify:
- App name and version
- Window properties
- Bundle settings
- Permissions

### Frontend Configuration
Edit `src/` files to modify:
- App components
- API endpoints
- Styling

## Advanced Usage

### Rebuild Just the Backend
When only backend Python code changes:
```bash
./build/build.sh backend-only
```

### Rebuild Just the Frontend
When only frontend code changes:
```bash
./build/build.sh frontend-only
```

### Clean and Full Rebuild
```bash
./build/build.sh clean
./build/build.sh all
```

### Build for Specific Architecture
Tauri automatically builds for the host platform. For cross-compilation, you'll need to set up the appropriate toolchain for the target architecture.

## Troubleshooting

### "PyInstaller not found"
```bash
pip install pyinstaller
```

### "Tauri not found"
```bash
npm install
```

### Backend executable not created
- Ensure Python 3.8+
- Check `backend/main.py` for syntax errors
- Try: `pip install -r requirements.txt`

### Frontend build fails
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 16+)

### Tauri build fails
- Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Update dependencies: `cargo update`

## Dependencies

### Python (Backend)
- fastapi
- uvicorn
- yfinance
- pandas
- pandas-ta
- pydantic
- httpx
- pyinstaller (build only)

### Node.js (Frontend)
- react
- typescript
- vite
- tailwindcss
- tauri

### Rust (Tauri)
- tauri
- serde
- tokio

## Project Structure

```
Equity-Analyst/
├── backend/
│   ├── main.py           # FastAPI server
│   └── dist/             # Built backend executable
├── build/
│   ├── build.sh          # Shell build script
│   ├── build.bat         # Windows batch script
│   ├── build.py          # Python build script
│   ├── output/           # Final distribution packages
│   └── README.md         # This file
├── src/
│   ├── App.tsx           # React app
│   ├── main.tsx
│   └── components/
├── src-tauri/
│   ├── tauri.conf.json   # Tauri config
│   ├── src/main.rs       # Rust code
│   └── Cargo.toml
├── package.json          # npm configuration
├── requirements.txt      # Python dependencies
├── tsconfig.json         # TypeScript config
└── vite.config.ts        # Vite config
```

## Distribution

### For End Users

1. **Linux (Debian/Ubuntu):**
   ```bash
   sudo dpkg -i equity-analyst_0.1.0_amd64.deb
   ```

2. **Linux (Fedora/RHEL):**
   ```bash
   sudo rpm -i equity-analyst-0.1.0-1.x86_64.rpm
   ```

3. **Linux (Universal):**
   - Download .AppImage file
   - Make executable: `chmod +x equity-analyst_0.1.0_amd64.AppImage`
   - Run: `./equity-analyst_0.1.0_amd64.AppImage`

4. **Windows:**
   - Run the .exe or .msi installer

5. **macOS:**
   - Mount the .dmg file
   - Drag app to Applications folder

## Versioning

Update the version in:
1. `package.json` - `"version": "0.1.0"`
2. `src-tauri/tauri.conf.json` - `"version": "0.1.0"`

Then rebuild to generate new versioned packages.

## Development vs. Production

### Development Mode
```bash
npm run dev      # Frontend with HMR
python3 backend/main.py  # Backend locally
```

### Production Build
```bash
./build/build.sh all  # Creates optimized, distributable packages
```

## Support

For issues related to:
- **Backend**: Check `backend/main.py` and Python dependencies
- **Frontend**: Check TypeScript types and React components in `src/`
- **Tauri**: Refer to [Tauri documentation](https://tauri.app)
- **Build**: Review logs in build output directory

## License

See LICENSE file in project root.
