#!/bin/bash
# Quick start guide for building Equity Analyst

set -e

echo "=================================================="
echo "Equity Analyst - Quick Start Build Setup"
echo "=================================================="
echo ""

# Check for required tools
echo "Checking prerequisites..."

# Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8 or higher."
    exit 1
fi
echo "✓ Python 3 found: $(python3 --version)"

# Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16 or higher."
    exit 1
fi
echo "✓ Node.js found: $(node --version)"

# npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm."
    exit 1
fi
echo "✓ npm found: $(npm --version)"

# Rust (for Tauri)
if ! command -v rustc &> /dev/null; then
    echo "⚠ Rust not found. Tauri requires Rust."
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    echo "✓ Rust installed"
else
    echo "✓ Rust found: $(rustc --version)"
fi

echo ""
echo "Installing dependencies..."

# Create virtual environment
if [ ! -d "../.venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv ../.venv
fi

# Activate virtual environment
source ../.venv/bin/activate || source ../.venv/Scripts/activate

# Install Python packages
echo "Installing Python packages..."
pip install -q -r ../requirements.txt

# Install Node packages
cd ..
echo "Installing Node packages..."
npm install > /dev/null 2>&1

cd build

echo ""
echo "=================================================="
echo "✓ Setup complete!"
echo "=================================================="
echo ""
echo "You can now build the project:"
echo ""
echo "  Linux/macOS:"
echo "    ./build.sh all              # Build for all platforms"
echo "    ./build.sh linux            # Build for Linux"
echo "    make build                  # Using Makefile"
echo ""
echo "  Windows:"
echo "    build.bat all"
echo ""
echo "  Python (cross-platform):"
echo "    python3 build.py build all"
echo ""
echo "For more information, see README.md"
echo ""
