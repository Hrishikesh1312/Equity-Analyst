# Quick Reference - Build System

## 🚀 First Time Setup

```bash
cd build
./setup.sh
```

## 📦 Build Commands

### Quick Build (All Platforms)
```bash
./build.sh all
```

### Linux Only
```bash
./build.sh linux
# Creates: .deb, .rpm, .AppImage
```

### Windows Only
```bash
# On Linux/macOS:
./build.sh windows

# On Windows:
build.bat all
```

### macOS Only
```bash
./build.sh macos
```

### Component Builds
```bash
./build.sh backend-only    # Only Python executable
./build.sh frontend-only   # Only React/Vite
```

### Using Make (Linux/macOS)
```bash
cd build
make build           # All platforms
make build-linux     # Linux packages
make backend         # Backend only
make clean          # Clean artifacts
```

### Using Python (Cross-Platform)
```bash
python3 build.py build all     # All platforms
python3 build.py backend       # Backend only
python3 build.py frontend      # Frontend only
python3 build.py clean         # Clean
```

## 📁 Build Output

```bash
# Built packages (before distribution):
build/output/
├── equity-analyst_0.1.0_amd64.deb
├── equity-analyst-0.1.0-1.x86_64.rpm
├── equity-analyst_0.1.0_amd64.AppImage
├── Equity Analyst_0.1.0_x64_en-US.exe
└── Equity Analyst_0.1.0.dmg

# Organized distribution (after distribute.sh):
build/dist/
├── linux/          # .deb, .rpm, .AppImage
├── windows/        # .exe, .msi
└── macos/          # .dmg
```

## 🎁 Distribution Management

```bash
cd build

# Full distribution setup
./distribute.sh all

# Individual commands
./distribute.sh organize      # Organize by platform
./distribute.sh checksums     # Generate SHA256 sums
./distribute.sh manifest      # Create manifest
./distribute.sh release-notes  # Release notes template
./distribute.sh list          # List contents
```

## ⚙️ Configuration Files

| File | Purpose |
|------|---------|
| `build/config.json` | Build settings (targets, versions, etc.) |
| `src-tauri/tauri.conf.json` | Desktop app config (window, permissions) |
| `backend/main.py` | Backend API settings (CORS, endpoints) |
| `requirements.txt` | Python dependencies |
| `package.json` | Node.js dependencies |

## 🔧 Typical Workflow

```bash
# 1. Setup (first time only)
./build/setup.sh

# 2. Make changes to code
# ... edit backend/main.py, src/App.tsx, etc ...

# 3. Build everything
./build/build.sh all

# 4. Test packages
# Install from build/output/

# 5. Organize for distribution
./build/distribute.sh all

# 6. Release
# Upload from build/dist/
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `command not found: python3` | Install Python 3.8+ |
| `command not found: node` | Install Node.js 16+ |
| `command not found: rustc` | Run: `./build/setup.sh` |
| `PyInstaller not found` | `pip install pyinstaller` |
| Build fails on Windows | Use `build.bat` instead of `.sh` |
| No output files | Check `build/output/` directory |

## 📋 What's Included

```
build/
├── build.sh              # Linux/macOS main build script
├── build.bat             # Windows batch build script
├── build.py              # Python cross-platform builder
├── setup.sh              # Dependency setup & checker
├── distribute.sh         # Distribution organization
├── Makefile              # Make targets
├── config.json           # Build configuration
├── README.md             # Full documentation
└── QUICK_REFERENCE.md    # This file
```

## 📖 Documentation

- **Full Guide**: `BUILD_GUIDE.md` (project root)
- **Build Docs**: `build/README.md`
- **This File**: `QUICK_REFERENCE.md`

## 💡 Tips

- **Faster rebuilds**: Only rebuild what changed (backend-only, frontend-only)
- **Clean rebuilds**: Use `./build.sh clean` before building
- **Testing**: Install and run each package type before distribution
- **Versioning**: Update version in `package.json` and `tauri.conf.json`
- **Distribution**: Always run `distribute.sh` before final release

## 🎯 Common Scenarios

### Just rebuilt backend code
```bash
./build.sh backend-only
./build.sh all  # Then rebuild everything
```

### Just updated frontend
```bash
./build.sh frontend-only
./build.sh all  # Then rebuild everything
```

### Need Windows .exe from Linux
```bash
./build.sh windows
# (requires cross-compilation setup)
```

### Ready to distribute
```bash
./build.sh all
./distribute.sh all
# Find packages in: build/dist/
```

---

**For detailed information, see `BUILD_GUIDE.md` in project root or `build/README.md`**
