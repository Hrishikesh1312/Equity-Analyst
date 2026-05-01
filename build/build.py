#!/usr/bin/env python3
"""
Build helper script for Equity Analyst
Manages backend bundling and distribution packaging
"""

import os
import sys
import shutil
import subprocess
import json
from pathlib import Path
from typing import Optional

class EquityAnalystBuilder:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent
        self.backend_dir = self.project_root / "backend"
        self.output_dir = self.script_dir / "output"
        self.tauri_config = self.project_root / "src-tauri" / "tauri.conf.json"
        
    def log(self, level: str, message: str):
        """Print colored log messages"""
        colors = {
            "info": "\033[94m",
            "success": "\033[92m",
            "warning": "\033[93m",
            "error": "\033[91m",
        }
        reset = "\033[0m"
        color = colors.get(level, "")
        prefix = {
            "info": "ℹ",
            "success": "✓",
            "warning": "⚠",
            "error": "✗",
        }
        print(f"{color}{prefix[level]} {message}{reset}")
    
    def run_command(self, cmd, cwd: Optional[Path] = None, silent: bool = False):
        """Execute a shell command"""
        try:
            if silent:
                subprocess.run(cmd, shell=True, cwd=cwd, check=True, 
                             capture_output=True, text=True)
            else:
                subprocess.run(cmd, shell=True, cwd=cwd, check=True)
            return True
        except subprocess.CalledProcessError as e:
            self.log("error", f"Command failed: {cmd}")
            if not silent:
                print(e.stderr)
            return False
    
    def setup_backend_sidecar(self):
        """Configure Tauri to use backend as sidecar"""
        self.log("info", "Setting up backend sidecar configuration...")
        
        try:
            with open(self.tauri_config, 'r') as f:
                config = json.load(f)
            
            # Add sidecar configuration
            if "app" not in config:
                config["app"] = {}
            
            config["app"]["systemTray"] = {
                "iconPath": "icons/icon.png",
                "menuOnLeftClick": False
            }
            
            with open(self.tauri_config, 'w') as f:
                json.dump(config, f, indent=2)
            
            self.log("success", "Backend sidecar configuration ready")
            return True
        except Exception as e:
            self.log("error", f"Failed to configure sidecar: {e}")
            return False
    
    def build_backend(self):
        """Build Python backend with PyInstaller"""
        self.log("info", "Building Python backend...")
        
        # Ensure PyInstaller is installed
        self.run_command("pip install -q pyinstaller", cwd=self.project_root, silent=True)
        
        # Run PyInstaller
        cmd = (
            "pyinstaller "
            "--onefile "
            "--name fastapi-server "
            f"--distpath {self.backend_dir / 'dist'} "
            f"--buildpath {self.backend_dir / 'build'} "
            f"--specpath {self.backend_dir} "
            f"{self.backend_dir / 'main.py'} "
            "--hidden-import=uvicorn "
            "--hidden-import=uvicorn.protocols "
            "--hidden-import=uvicorn.protocols.http "
            "--hidden-import=uvicorn.protocols.websockets "
            "--hidden-import=yfinance "
            "--hidden-import=pandas_ta"
        )
        
        if self.run_command(cmd, cwd=self.project_root):
            self.log("success", "Backend executable created")
            return True
        else:
            self.log("error", "Failed to build backend")
            return False
    
    def build_frontend(self):
        """Build frontend with Vite"""
        self.log("info", "Building frontend...")
        
        if not self.run_command("npm install", cwd=self.project_root, silent=True):
            self.log("error", "Failed to install npm dependencies")
            return False
        
        if self.run_command("npm run build", cwd=self.project_root, silent=True):
            self.log("success", "Frontend built")
            return True
        else:
            self.log("error", "Failed to build frontend")
            return False
    
    def build_tauri(self, target: str = "all"):
        """Build Tauri application"""
        self.log("info", f"Building Tauri application (target: {target})...")
        
        cmd = f"npx tauri build -b {target}"
        
        if self.run_command(cmd, cwd=self.project_root):
            self.log("success", "Tauri build completed")
            return True
        else:
            self.log("error", "Failed to build Tauri")
            return False
    
    def collect_artifacts(self, target: str = "all"):
        """Collect build artifacts to output directory"""
        self.log("info", "Collecting build artifacts...")
        
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        bundle_dir = self.project_root / "src-tauri" / "target" / "release" / "bundle"
        
        artifacts_found = False
        
        # Copy Linux artifacts
        if target in ["all", "linux"]:
            for dist_type in ["deb", "rpm", "appimage"]:
                src = bundle_dir / dist_type
                if src.exists():
                    for item in src.iterdir():
                        shutil.copy2(item, self.output_dir)
                        self.log("success", f"{dist_type.upper()} artifact collected")
                        artifacts_found = True
        
        # Copy Windows artifacts
        if target in ["all", "windows"]:
            for dist_type in ["msi", "nsis"]:
                src = bundle_dir / dist_type
                if src.exists():
                    for item in src.iterdir():
                        if item.is_file():
                            shutil.copy2(item, self.output_dir)
                            self.log("success", f"{dist_type.upper()} artifact collected")
                            artifacts_found = True
        
        # Copy macOS artifacts
        if target in ["all", "macos"]:
            src = bundle_dir / "dmg"
            if src.exists():
                for item in src.iterdir():
                    shutil.copy2(item, self.output_dir)
                    self.log("success", "DMG artifact collected")
                    artifacts_found = True
        
        if artifacts_found:
            self.log("success", f"Artifacts collected to {self.output_dir}")
        else:
            self.log("warning", "No artifacts found to collect")
        
        return artifacts_found
    
    def clean(self):
        """Clean build artifacts"""
        self.log("info", "Cleaning build artifacts...")
        
        dirs_to_clean = [
            self.project_root / "dist",
            self.project_root / "src-tauri" / "target",
            self.backend_dir / "dist",
            self.backend_dir / "build",
            self.backend_dir / "__pycache__",
        ]
        
        for dir_path in dirs_to_clean:
            if dir_path.exists():
                shutil.rmtree(dir_path)
                self.log("info", f"Removed {dir_path}")
        
        self.log("success", "Cleanup complete")
    
    def build(self, target: str = "all", backend_only: bool = False, frontend_only: bool = False):
        """Main build orchestration"""
        self.log("info", f"Starting build (target: {target})")
        self.log("info", f"Project root: {self.project_root}")
        
        # Change to project root
        os.chdir(self.project_root)
        
        try:
            if backend_only:
                return self.build_backend()
            
            if frontend_only:
                return self.build_frontend()
            
            # Full build
            if not self.build_backend():
                return False
            
            if not self.build_frontend():
                return False
            
            if not self.setup_backend_sidecar():
                return False
            
            if not self.build_tauri(target):
                return False
            
            if not self.collect_artifacts(target):
                self.log("warning", "Build completed but no artifacts were collected")
            
            self.log("success", "Build completed successfully!")
            self.log("info", f"Output directory: {self.output_dir}")
            
            return True
        
        except Exception as e:
            self.log("error", f"Build failed: {e}")
            return False

def main():
    if len(sys.argv) < 2:
        target = "all"
        command = "build"
    else:
        command = sys.argv[1]
        target = sys.argv[2] if len(sys.argv) > 2 else "all"
    
    builder = EquityAnalystBuilder()
    
    if command == "clean":
        builder.clean()
    elif command == "build":
        builder.build(target)
    elif command == "backend":
        builder.build(backend_only=True)
    elif command == "frontend":
        builder.build(frontend_only=True)
    else:
        print("Usage: python3 build.py <command> [target]")
        print("\nCommands:")
        print("  build      - Full build (default target: all)")
        print("  backend    - Build backend only")
        print("  frontend   - Build frontend only")
        print("  clean      - Clean build artifacts")
        print("\nTargets:")
        print("  all        - Build for all platforms")
        print("  linux      - Build for Linux (deb, rpm, appimage)")
        print("  windows    - Build for Windows (exe, msi)")
        print("  macos      - Build for macOS (dmg)")
        sys.exit(1)

if __name__ == "__main__":
    main()
