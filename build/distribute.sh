#!/bin/bash
# Distribution script for Equity Analyst builds
# Helps manage, organize, and distribute built packages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
DIST_DIR="$SCRIPT_DIR/dist"
CHECKSUMS_FILE="$DIST_DIR/CHECKSUMS.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}======================================${NC}"
}

print_step() {
    echo -e "${YELLOW}→ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Create distribution folder
setup_dist() {
    print_header "Setting up Distribution"
    
    mkdir -p "$DIST_DIR"
    mkdir -p "$DIST_DIR/linux"
    mkdir -p "$DIST_DIR/windows"
    mkdir -p "$DIST_DIR/macos"
    
    print_success "Distribution folders created"
}

# Calculate checksums
calculate_checksums() {
    print_header "Calculating Checksums"
    
    > "$CHECKSUMS_FILE"  # Clear file
    
    for file in "$OUTPUT_DIR"/*; do
        if [ -f "$file" ]; then
            print_step "Checksumming $(basename "$file")..."
            sha256sum "$file" >> "$CHECKSUMS_FILE"
            print_success "Done"
        fi
    done
    
    print_success "Checksums saved to $CHECKSUMS_FILE"
}

# Organize by platform
organize_artifacts() {
    print_header "Organizing Artifacts by Platform"
    
    # Copy to distribution folders
    for file in "$OUTPUT_DIR"/*; do
        if [ ! -f "$file" ]; then continue; fi
        
        filename=$(basename "$file")
        
        if [[ "$filename" == *.deb || "$filename" == *.rpm || "$filename" == *.AppImage ]]; then
            print_step "Moving $filename to linux/"
            cp "$file" "$DIST_DIR/linux/"
        elif [[ "$filename" == *.exe || "$filename" == *.msi ]]; then
            print_step "Moving $filename to windows/"
            cp "$file" "$DIST_DIR/windows/"
        elif [[ "$filename" == *.dmg ]]; then
            print_step "Moving $filename to macos/"
            cp "$file" "$DIST_DIR/macos/"
        fi
    done
    
    print_success "Artifacts organized"
}

# Create manifest
create_manifest() {
    print_header "Creating Distribution Manifest"
    
    MANIFEST="$DIST_DIR/MANIFEST.txt"
    > "$MANIFEST"
    
    echo "Equity Analyst Distribution Manifest" >> "$MANIFEST"
    echo "Version: $(grep '"version"' ../package.json | head -1 | cut -d'"' -f4)" >> "$MANIFEST"
    echo "Build Date: $(date)" >> "$MANIFEST"
    echo "" >> "$MANIFEST"
    
    echo "=== Linux Packages ===" >> "$MANIFEST"
    ls -lh "$DIST_DIR/linux" 2>/dev/null | tail -n +2 | awk '{print $9, "(" $5 ")"}' >> "$MANIFEST" || echo "None" >> "$MANIFEST"
    echo "" >> "$MANIFEST"
    
    echo "=== Windows Packages ===" >> "$MANIFEST"
    ls -lh "$DIST_DIR/windows" 2>/dev/null | tail -n +2 | awk '{print $9, "(" $5 ")"}' >> "$MANIFEST" || echo "None" >> "$MANIFEST"
    echo "" >> "$MANIFEST"
    
    echo "=== macOS Packages ===" >> "$MANIFEST"
    ls -lh "$DIST_DIR/macos" 2>/dev/null | tail -n +2 | awk '{print $9, "(" $5 ")"}' >> "$MANIFEST" || echo "None" >> "$MANIFEST"
    echo "" >> "$MANIFEST"
    
    echo "=== Installation Instructions ===" >> "$MANIFEST"
    echo "" >> "$MANIFEST"
    echo "Linux (Debian/Ubuntu):" >> "$MANIFEST"
    echo "  sudo dpkg -i *.deb" >> "$MANIFEST"
    echo "" >> "$MANIFEST"
    echo "Linux (Fedora/RHEL):" >> "$MANIFEST"
    echo "  sudo rpm -i *.rpm" >> "$MANIFEST"
    echo "" >> "$MANIFEST"
    echo "Linux (Universal AppImage):" >> "$MANIFEST"
    echo "  chmod +x *.AppImage && ./equity-analyst_*.AppImage" >> "$MANIFEST"
    echo "" >> "$MANIFEST"
    echo "Windows:" >> "$MANIFEST"
    echo "  Run the .exe or .msi installer" >> "$MANIFEST"
    echo "" >> "$MANIFEST"
    echo "macOS:" >> "$MANIFEST"
    echo "  Open the .dmg file and drag app to Applications" >> "$MANIFEST"
    
    print_success "Manifest created: $MANIFEST"
}

# Generate release notes template
create_release_notes() {
    print_header "Creating Release Notes Template"
    
    NOTES="$DIST_DIR/RELEASE_NOTES.md"
    > "$NOTES"
    
    cat > "$NOTES" << 'EOF'
# Equity Analyst Release Notes

## Version 0.1.0

### New Features
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

### Improvements
- [ ] Improvement 1
- [ ] Improvement 2

### Bug Fixes
- [ ] Bug fix 1
- [ ] Bug fix 2

### Known Issues
- [ ] Known issue 1

### System Requirements

**Linux:**
- Ubuntu 20.04+ or Fedora 33+
- 4GB RAM minimum
- 500MB disk space

**Windows:**
- Windows 10 or later
- 4GB RAM minimum
- 500MB disk space

**macOS:**
- macOS 10.13 or later
- 4GB RAM minimum
- 500MB disk space

### Installation

See MANIFEST.txt for platform-specific installation instructions.

### Upgrade Instructions

If upgrading from a previous version:

1. Uninstall the previous version
2. Download the new installer
3. Run the installer
4. Your data will be preserved

### Support

For issues or feature requests, visit:
- GitHub Issues: [Link to issues]
- Documentation: [Link to docs]

### Contributors

Thanks to all contributors!

---

Generated on: $(date)
EOF
    
    print_success "Release notes template created: $NOTES"
}

# Create installation guide
create_install_guide() {
    print_header "Creating Installation Guide"
    
    GUIDE="$DIST_DIR/INSTALL_GUIDE.md"
    > "$GUIDE"
    
    cat > "$GUIDE" << 'EOF'
# Equity Analyst Installation Guide

## Quick Start

### Linux (Debian/Ubuntu)
```bash
sudo dpkg -i equity-analyst_0.1.0_amd64.deb
equity-analyst
```

### Linux (Fedora/RHEL)
```bash
sudo rpm -i equity-analyst-0.1.0-1.x86_64.rpm
equity-analyst
```

### Linux (AppImage)
```bash
chmod +x equity-analyst_0.1.0_amd64.AppImage
./equity-analyst_0.1.0_amd64.AppImage
```

### Windows
1. Download the installer (.exe or .msi)
2. Double-click to run
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### macOS
1. Download the .dmg file
2. Double-click to mount
3. Drag Equity Analyst to Applications
4. Open Applications folder and launch Equity Analyst

## Verification

### Verify Downloads (Optional but Recommended)
```bash
sha256sum -c CHECKSUMS.txt
```

## System Requirements

- **CPU**: 2+ cores (Intel/AMD/ARM64)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space
- **Network**: Internet connection required for stock data

## Troubleshooting

### Application won't start
- Ensure you have Python 3.8+ installed
- Check system requirements above
- Try reinstalling

### No stock data loading
- Verify internet connection
- Check firewall settings
- Restart the application

### Performance issues
- Close other applications
- Clear application cache
- Upgrade to recommended specs

## Uninstallation

**Linux (Debian):**
```bash
sudo apt remove equity-analyst
```

**Linux (Fedora):**
```bash
sudo rpm -e equity-analyst
```

**Windows:**
- Control Panel → Programs → Uninstall a program
- Select Equity Analyst and click Uninstall

**macOS:**
- Drag Equity Analyst from Applications to Trash
- Empty Trash

## Advanced Configuration

See the [Configuration Guide](../README.md) for advanced options.

---

For support, visit the project repository or documentation.
EOF
    
    print_success "Installation guide created: $GUIDE"
}

# List distribution
list_distribution() {
    print_header "Distribution Contents"
    
    echo "Total size: $(du -sh "$DIST_DIR" | cut -f1)"
    echo ""
    
    if [ -d "$DIST_DIR/linux" ] && [ "$(ls -A "$DIST_DIR/linux")" ]; then
        echo "Linux packages:"
        ls -lh "$DIST_DIR/linux" | tail -n +2 | awk '{printf "  %s (%s)\n", $9, $5}'
        echo ""
    fi
    
    if [ -d "$DIST_DIR/windows" ] && [ "$(ls -A "$DIST_DIR/windows")" ]; then
        echo "Windows packages:"
        ls -lh "$DIST_DIR/windows" | tail -n +2 | awk '{printf "  %s (%s)\n", $9, $5}'
        echo ""
    fi
    
    if [ -d "$DIST_DIR/macos" ] && [ "$(ls -A "$DIST_DIR/macos")" ]; then
        echo "macOS packages:"
        ls -lh "$DIST_DIR/macos" | tail -n +2 | awk '{printf "  %s (%s)\n", $9, $5}'
        echo ""
    fi
    
    if [ -f "$MANIFEST" ]; then
        echo "Documentation:"
        echo "  $(basename $MANIFEST)"
        echo "  $(basename $CHECKSUMS_FILE)"
        echo "  $(basename $NOTES)"
        echo "  $(basename $GUIDE)"
    fi
}

# Main menu
main() {
    print_header "Equity Analyst Distribution Manager"
    
    if [ ! -d "$OUTPUT_DIR" ] || [ -z "$(ls -A "$OUTPUT_DIR" 2>/dev/null)" ]; then
        echo -e "${RED}No build artifacts found in $OUTPUT_DIR${NC}"
        echo "Please run build first: ./build.sh all"
        exit 1
    fi
    
    case "${1:-all}" in
        all)
            setup_dist
            organize_artifacts
            calculate_checksums
            create_manifest
            create_release_notes
            create_install_guide
            list_distribution
            echo ""
            print_header "Distribution Ready"
            echo "Location: $DIST_DIR"
            ;;
        organize)
            setup_dist
            organize_artifacts
            ;;
        checksums)
            calculate_checksums
            ;;
        manifest)
            create_manifest
            ;;
        release-notes)
            create_release_notes
            ;;
        install-guide)
            create_install_guide
            ;;
        list)
            list_distribution
            ;;
        clean)
            print_header "Cleaning Distribution"
            rm -rf "$DIST_DIR"
            print_success "Cleaned"
            ;;
        *)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  all              - Full distribution setup (default)"
            echo "  organize         - Organize artifacts by platform"
            echo "  checksums        - Generate SHA256 checksums"
            echo "  manifest         - Create distribution manifest"
            echo "  release-notes    - Create release notes template"
            echo "  install-guide    - Create installation guide"
            echo "  list             - List distribution contents"
            echo "  clean            - Remove distribution folder"
            exit 1
            ;;
    esac
}

main "$@"
