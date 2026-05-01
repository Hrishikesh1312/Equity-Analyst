@echo off
REM Build script for Windows
setlocal enabledelayedexpansion

REM Colors and variables
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "OUTPUT_DIR=%PROJECT_ROOT%\build\output"
set "TARGET=all"

if not "%1"=="" set "TARGET=%1"

REM Create output directory
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo.
echo ======================================
echo Equity Analyst Build System (Windows)
echo ======================================
echo Target: %TARGET%
echo.

REM Clean build artifacts
if "%TARGET%"=="clean" (
    echo Cleaning previous builds...
    rmdir /s /q "%PROJECT_ROOT%\dist" 2>nul
    rmdir /s /q "%PROJECT_ROOT%\src-tauri\target" 2>nul
    rmdir /s /q "%BACKEND_DIR%\dist" 2>nul
    rmdir /s /q "%BACKEND_DIR%\build" 2>nul
    echo Build artifacts cleaned
    exit /b 0
)

REM Build Python backend
if "%TARGET%"=="all" or "%TARGET%"=="backend-only" (
    echo.
    echo ======================================
    echo Building Python Backend
    echo ======================================
    
    cd /d "%PROJECT_ROOT%"
    echo Installing PyInstaller...
    pip install -q pyinstaller
    
    echo Building FastAPI backend...
    pyinstaller ^
        --onefile ^
        --name "fastapi-server" ^
        --distpath "%BACKEND_DIR%\dist" ^
        --buildpath "%BACKEND_DIR%\build" ^
        --specpath "%BACKEND_DIR%" ^
        "%BACKEND_DIR%\main.py" ^
        --hidden-import=uvicorn ^
        --hidden-import=uvicorn.protocols ^
        --hidden-import=uvicorn.protocols.http ^
        --hidden-import=uvicorn.protocols.websockets ^
        --hidden-import=yfinance ^
        --hidden-import=pandas_ta
    
    if exist "%BACKEND_DIR%\dist\fastapi-server.exe" (
        echo Backend executable created successfully
    ) else (
        echo ERROR: Failed to build backend
        exit /b 1
    )
)

if "%TARGET%"=="backend-only" exit /b 0

REM Build Tauri app
if "%TARGET%"=="all" or "%TARGET%"=="frontend-only" or "%TARGET%"=="windows" (
    echo.
    echo ======================================
    echo Building Tauri Application
    echo ======================================
    
    cd /d "%PROJECT_ROOT%"
    echo Installing npm dependencies...
    call npm install >nul 2>&1
    
    echo Building frontend...
    call npm run build >nul 2>&1
    
    echo Building Tauri bundle...
    call npx tauri build -b nsis
    
    echo.
    echo ======================================
    echo Build Complete!
    echo ======================================
    echo Build artifacts are in: %OUTPUT_DIR%
    echo.
    
    REM Copy outputs to build/output directory
    if exist "%PROJECT_ROOT%\src-tauri\target\release\bundle\nsis" (
        xcopy "%PROJECT_ROOT%\src-tauri\target\release\bundle\nsis\*" "%OUTPUT_DIR%\" /i /y
    )
    
    dir "%OUTPUT_DIR%"
)

if "%TARGET%"=="frontend-only" (
    echo Frontend built successfully
    exit /b 0
)
