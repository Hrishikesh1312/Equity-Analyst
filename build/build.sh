#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
OUTPUT_DIR="$PROJECT_ROOT/build/output"
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')

# Default target (build for current platform if not specified)
TARGET="${1:-all}"
ARGS="${@:2}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Functions
print_header() {
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}======================================${NC}"
}

print_step() {
    echo -e "${YELLOW}→ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Clean build artifacts
clean_build() {
    print_step "Cleaning previous builds..."
    rm -rf "$PROJECT_ROOT/dist"
    rm -rf "$PROJECT_ROOT/src-tauri/target"
    rm -rf "$BACKEND_DIR/dist"
    rm -rf "$BACKEND_DIR/build"
    rm -rf "$BACKEND_DIR/__pycache__"
    rm -f "$BACKEND_DIR/*.spec"
    print_success "Cleaned"
}

# Build Python backend
build_python_backend() {
    print_header "Building Python Backend"
    
    cd "$PROJECT_ROOT"
    
    # Ensure PyInstaller is installed
    print_step "Installing build dependencies..."
    pip install -q pyinstaller
    
    # Build backend executable
    print_step "Building FastAPI backend with PyInstaller..."
    
    # Create a temporary build script
    BACKEND_BUILD_SPEC="$BACKEND_DIR/backend.spec"
    
    # Generate spec file using pyinstaller
    pyinstaller \
        --onefile \
        --name "fastapi-server" \
        --distpath "$BACKEND_DIR/dist" \
        --buildpath "$BACKEND_DIR/build" \
        --specpath "$BACKEND_DIR" \
        "$BACKEND_DIR/main.py" \
        --hidden-import=uvicorn \
        --hidden-import=uvicorn.protocols \
        --hidden-import=uvicorn.protocols.http \
        --hidden-import=uvicorn.protocols.websockets \
        --hidden-import=yfinance \
        --hidden-import=pandas_ta \
        > /dev/null 2>&1
    
    if [ -f "$BACKEND_DIR/dist/fastapi-server" ]; then
        print_success "Backend executable created"
        chmod +x "$BACKEND_DIR/dist/fastapi-server"
    else
        print_error "Failed to build backend"
        exit 1
    fi
}

# Build frontend and Tauri app
build_tauri_app() {
    print_header "Building Tauri Application"
    
    cd "$PROJECT_ROOT"
    
    # Ensure all npm dependencies are installed
    print_step "Installing npm dependencies..."
    npm install > /dev/null 2>&1
    
    # Build frontend
    print_step "Building frontend with Vite..."
    npm run build > /dev/null 2>&1
    print_success "Frontend built"
    
    # Build Tauri for specified target(s)
    print_step "Building Tauri bundle..."
    npx tauri build -b "$TARGET" 2>&1 | grep -v "^warning" || true
    print_success "Tauri built"
}

# Create distribution packages
create_distributions() {
    print_header "Creating Distribution Packages"
    
    # Find built binaries
    TAURI_DIST="$PROJECT_ROOT/src-tauri/target/release/bundle"
    
    if [ ! -d "$TAURI_DIST" ]; then
        print_error "Tauri build output not found"
        return 1
    fi
    
    # Copy distributions to output folder
    if [ "$TARGET" = "all" ] || [ "$TARGET" = "linux" ]; then
        print_step "Packaging Linux distributions..."
        
        if [ -d "$TAURI_DIST/deb" ]; then
            cp -r "$TAURI_DIST/deb"/* "$OUTPUT_DIR/" 2>/dev/null || true
            print_success "DEB package ready"
        fi
        
        if [ -d "$TAURI_DIST/rpm" ]; then
            cp -r "$TAURI_DIST/rpm"/* "$OUTPUT_DIR/" 2>/dev/null || true
            print_success "RPM package ready"
        fi
        
        if [ -d "$TAURI_DIST/appimage" ]; then
            cp -r "$TAURI_DIST/appimage"/* "$OUTPUT_DIR/" 2>/dev/null || true
            print_success "AppImage package ready"
        fi
    fi
    
    if [ "$TARGET" = "all" ] || [ "$TARGET" = "windows" ]; then
        print_step "Packaging Windows distributions..."
        
        if [ -d "$TAURI_DIST/msi" ]; then
            cp -r "$TAURI_DIST/msi"/* "$OUTPUT_DIR/" 2>/dev/null || true
            print_success "MSI installer ready"
        fi
        
        if [ -d "$TAURI_DIST/nsis" ]; then
            cp -r "$TAURI_DIST/nsis"/* "$OUTPUT_DIR/" 2>/dev/null || true
            print_success "NSIS executable ready"
        fi
    fi
    
    # List output files
    echo ""
    print_step "Build artifacts:"
    ls -lah "$OUTPUT_DIR"
}

# Main workflow
main() {
    print_header "Equity Analyst Build System"
    echo "Target: $TARGET"
    echo "Python: $PYTHON_VERSION"
    echo ""
    
    case "$TARGET" in
        clean)
            clean_build
            ;;
        backend-only)
            build_python_backend
            ;;
        frontend-only)
            print_header "Building Frontend Only"
            cd "$PROJECT_ROOT"
            npm install > /dev/null 2>&1
            npm run build > /dev/null 2>&1
            print_success "Frontend built"
            ;;
        all|linux|windows|macos)
            clean_build
            build_python_backend
            build_tauri_app
            create_distributions
            echo ""
            print_header "Build Complete!"
            echo "Output directory: $OUTPUT_DIR"
            ;;
        *)
            print_error "Unknown target: $TARGET"
            echo ""
            echo "Usage: $0 <target> [options]"
            echo ""
            echo "Targets:"
            echo "  all           - Build for all platforms (default)"
            echo "  linux         - Build for Linux (deb, rpm, appimage)"
            echo "  windows       - Build for Windows (exe, msi)"
            echo "  macos         - Build for macOS (dmg)"
            echo "  backend-only  - Build only Python backend"
            echo "  frontend-only - Build only frontend"
            echo "  clean         - Clean all build artifacts"
            echo ""
            exit 1
            ;;
    esac
}

main "$@"
