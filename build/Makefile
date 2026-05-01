.PHONY: help build build-linux build-windows build-macos clean backend frontend backend-only frontend-only

# Colors for output
YELLOW := \033[1;33m
GREEN := \033[0;32m
NC := \033[0m # No Color

help:
	@echo "$(YELLOW)Equity Analyst Build System$(NC)"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@echo "  make build             - Build for all platforms (default)"
	@echo "  make build-linux       - Build for Linux (deb, rpm, appimage)"
	@echo "  make build-windows     - Build for Windows (exe, msi)"
	@echo "  make build-macos       - Build for macOS (dmg)"
	@echo "  make backend           - Build Python backend only"
	@echo "  make frontend          - Build frontend only"
	@echo "  make clean             - Clean all build artifacts"
	@echo "  make install-deps      - Install build dependencies"
	@echo "  make help              - Show this help message"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make build              # Full build"
	@echo "  make build-linux        # Linux packages"
	@echo "  make clean && make build  # Clean rebuild"

build:
	@./build.sh all

build-linux:
	@./build.sh linux

build-windows:
	@./build.sh windows

build-macos:
	@./build.sh macos

backend-only:
	@./build.sh backend-only

frontend-only:
	@./build.sh frontend-only

install-deps:
	@echo "Installing Python dependencies..."
	@pip install -q -r ../requirements.txt
	@echo "Installing Node.js dependencies..."
	@cd .. && npm install > /dev/null 2>&1
	@echo "✓ Dependencies installed"

clean:
	@./build.sh clean

# Alias for backend-only and frontend-only
backend: backend-only
frontend: frontend-only
