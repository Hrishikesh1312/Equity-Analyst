# Equity Analyst

A professional desktop equity research application for Indian stock market analysis. Powered by Tauri, React, FastAPI, and Ollama for real-time stock data visualization and AI-driven insights.

## Features

- Real-time NSE/BSE stock data via yfinance
- Interactive price charts with technical indicators (RSI, MACD, Bollinger Bands)
- AI-powered SWOT analysis and valuation insights using Ollama
- Follow-up chat interface for contextual investment questions
- Indian market localization (₹ pricing, Crore/Lakh formatting, NSE/BSE focus)
- Dark theme optimized for extended analysis sessions
- Responsive zoom controls (85% - 130%)
- Cross-platform desktop deployment (Windows, macOS, Linux)

## System Requirements

### Windows

- Windows 10 or later (x64)
- Microsoft Visual C++ Redistributable
- WebView2 Runtime (auto-installed)
- 4 GB RAM minimum, 8 GB recommended

### macOS

- macOS 11 or later
- Xcode Command Line Tools
- 4 GB RAM minimum, 8 GB recommended

### Linux

- Ubuntu 20.04 LTS or later (or equivalent distribution)
- GTK 3 development libraries
- 4 GB RAM minimum, 8 GB recommended

## Prerequisites Installation

### Windows

1. Install Node.js v18+
   - Download from https://nodejs.org/
   - Run installer and add to PATH

2. Install Python 3.11+
   - Download from https://www.python.org/
   - Check "Add Python to PATH" during installation

3. Install Rust
   - Open PowerShell as Administrator
   - Run: `irm https://win.rustup.rs -outfile rustup-init.exe; .\rustup-init.exe`
   - Follow prompts to complete installation

4. Install Ollama
   - Download from https://ollama.com/download/windows
   - Run installer
   - Open Command Prompt and run:
     ```
     ollama pull llama3.2:3b
     ```

### macOS

1. Install Homebrew (if not already installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install Node.js
   ```bash
   brew install node@20
   ```

3. Install Python
   ```bash
   brew install python@3.11
   ```

4. Install Rust
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

5. Install Ollama
   ```bash
   brew install ollama
   ollama pull llama3.2:3b
   ```

### Linux (Ubuntu/Debian)

1. Update package manager
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Install system dependencies
   ```bash
   sudo apt install -y \
     build-essential \
     curl \
     wget \
     file \
     libxdo-dev \
     libssl-dev \
     libgtk-3-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev \
     libwebkit2gtk-4.1-dev
   ```

3. Install Node.js
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. Install Python
   ```bash
   sudo apt install -y python3.11 python3-pip python3-venv
   ```

5. Install Rust
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

6. Install Ollama
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3.2:3b
   ```

## Project Setup

### Step 1: Clone or Extract Project

```bash
cd Equity-Analyst
```

### Step 2: Install Backend Dependencies

```bash
cd backend
python3 -m venv venv
```

**On Windows:**
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

**On macOS/Linux:**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Install Frontend Dependencies

```bash
cd ..
npm install
```

## Running the Application

The application requires three services running simultaneously. Open three separate terminal windows:

### Terminal 1: Start Ollama Server

**Windows:**
```bash
ollama serve
```

**macOS/Linux:**
```bash
ollama serve
```

Ollama will start on `http://localhost:11434`

### Terminal 2: Start FastAPI Backend

```bash
cd backend
```

**On Windows:**
```bash
venv\Scripts\activate
python main.py
```

**On macOS/Linux:**
```bash
source venv/bin/activate
python main.py
```

Backend will start on `http://localhost:8000`

### Terminal 3: Start Tauri Development Server

```bash
npm run tauri dev
```

The desktop application window will open automatically.

### Alternative: Browser-Only Development (No Tauri)

To run the React frontend in a browser without the Tauri desktop shell:

```bash
npm run dev
```

Open `http://localhost:1420` in your web browser.

## Building for Production

### Desktop Application

```bash
npm run tauri build
```

Platform-specific installers will be created in `src-tauri/target/release/bundle/`

- Windows: `.msi` installer
- macOS: `.dmg` installer
- Linux: `.AppImage` or `.deb` package

### Web Frontend Only

```bash
npm run build
```

Outputs optimized build to `dist/` directory, ready for static hosting.

## API Reference

### Stock Data Endpoints

#### Search Stocks
```
GET /search?q=RELIANCE
Response: [{ ticker, name, exchange, type }]
```

#### Get Stock Information
```
GET /stock/RELIANCE.NS
Response: StockInfo object with current price, metrics, analyst consensus
```

#### Get Price History
```
GET /stock/RELIANCE.NS/history?period=1mo
Parameters: period = 1d, 1mo, 6mo, 1y, 5y
Response: HistoryResponse with OHLCV data + technical indicators
```

### AI Analysis Endpoints

#### Analyze Stock (SWOT + Valuation)
```
GET /ai/analyze?ticker=RELIANCE.NS
Response: AnalysisResponse with strengths, weaknesses, opportunities, threats, insights, recommendation, valuation
```

#### Chat with Analysis Context
```
POST /ai/chat
Request Body: {
  "ticker": "RELIANCE.NS",
  "question": "Compare this to TCS",
  "history": [{ role, content }],
  "analysis": { analysis object }
}
Response: { "answer": "..." }
```

### System Endpoints

#### Health Check
```
GET /health
Response: { "status": "ok" }
```

#### Ollama Status
```
GET /ollama/status
Response: { "ready": boolean, "model": string, "message": string }
```

## Project Structure

```
Equity-Analyst/
├── backend/
│   ├── main.py                 FastAPI application with all endpoints
│   └── requirements.txt         Python dependencies
│
├── src/
│   ├── api/
│   │   └── stock.ts           API client and data formatting
│   ├── components/
│   │   ├── Navbar.tsx         Top navigation bar
│   │   ├── SearchBar.tsx       Stock search and zoom controls
│   │   ├── StockHeader.tsx     Ticker info and time range selector
│   │   ├── MetricsBar.tsx      Key financial metrics display
│   │   └── AiPanel.tsx         AI analysis and chat interface
│   ├── App.tsx                 Root application component
│   ├── index.css               Global styles and design tokens
│   ├── main.tsx                React entry point
│   └── vite-env.d.ts          Vite type declarations
│
├── src-tauri/
│   ├── src/
│   │   └── main.rs            Tauri application entry point
│   ├── tauri.conf.json         Tauri configuration
│   ├── build.rs               Tauri build script
│   └── Cargo.toml             Rust dependencies
│
├── index.html                  HTML entry point
├── package.json               Node.js dependencies and scripts
├── vite.config.ts             Vite build configuration
├── tailwind.config.ts         Tailwind CSS configuration
├── tsconfig.json              TypeScript configuration
└── tailwind.config.ts         Tailwind CSS theme configuration
```

## Configuration

### Changing the Ollama Model

Edit `backend/main.py` line ~25:

```python
OLLAMA_MODEL = "llama3.2:3b"  # Change to another model
```

Then pull the model:
```bash
ollama pull <model-name>
```

### Adjusting API Port

Edit `backend/main.py` bottom line:

```python
uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)  # Change 8000 to 8001
```

Also update frontend `src/api/stock.ts`:
```typescript
const BASE = "http://localhost:8001";
```

### Customizing Design Tokens

All colors and spacing are defined in `src/index.css` in the `:root` CSS variables section. Modify the following:

```css
:root {
  --bg-base:     #131F26;      /* Main background */
  --accent:      #241623;      /* Navbar background */
  --gold:        #C9A84C;      /* Primary accent color */
  --green:       #2ECC8A;      /* Positive/gain color */
  --red:         #E85D4A;      /* Negative/loss color */
  --text-primary: #E8EEF2;     /* Main text color */
}
```

## Troubleshooting

### "Ollama is not running" Error

Ensure Ollama server is started:
```bash
ollama serve
```

If using a different port, update `OLLAMA_BASE` in `backend/main.py`.

### Stock Data Not Loading

1. Verify backend is running: `http://localhost:8000/health`
2. Check internet connection for yfinance data
3. Verify ticker symbol (e.g., `RELIANCE.NS` not just `RELIANCE`)

### AI Analysis Takes Too Long

Smaller Ollama models are faster:
```bash
ollama pull mistral:7b
```

Then update `backend/main.py`:
```python
OLLAMA_MODEL = "mistral:7b"
```

### "Module not found" Errors

Reinstall dependencies:

**Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt --force-reinstall
```

**Frontend:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

If port 8000, 11434, or 1420 is occupied:

**Find process using port (macOS/Linux):**
```bash
lsof -i :8000
```

**Kill process:**
```bash
kill -9 <PID>
```

**Or change the port in configuration.**

## Development Workflow

### Running Tests

Backend unit tests (when implemented):
```bash
cd backend
pytest tests/
```

Frontend component tests (when implemented):
```bash
npm run test
```

### Code Formatting

Frontend code formatting:
```bash
npm run format
```

Backend code formatting:
```bash
cd backend
pip install black
black main.py
```

### Building for Release

Desktop application for all platforms:
```bash
npm run tauri build
```

Installers will be in `src-tauri/target/release/bundle/`

## Performance Optimization

- Chart rendering uses Recharts with animation. Disable animations in `src/components/StockHeader.tsx` if performance is slow
- Large portfolios may be slow in AI analysis. Limit analysis scope or use a faster Ollama model

## Security Considerations

- All API calls are local (localhost only). For remote deployment:
  - Set proper CORS origins in `backend/main.py`
  - Add authentication middleware
  - Use HTTPS/TLS
  - Never expose API keys in client-side code

- Sensitive data:
  - No user accounts or authentication implemented
  - All data is ephemeral (not persisted to disk)
  - Clear browser cache if sharing device

## Dependencies

### Frontend
- React 18.3
- Tauri 2.0
- Vite 5.2
- Tailwind CSS 3.4
- Framer Motion 11.0
- Recharts 2.12
- Axios 1.7

### Backend
- FastAPI 0.111
- Uvicorn 0.30
- yfinance 0.2.40
- pandas 2.2.2
- pandas-ta (optional, for technical indicators)
- httpx 0.27
- Pydantic 2.7

### Desktop
- Tauri 2.0
- Rust 1.75+
- WebKit 4.1 (Linux) / WKWebView (macOS) / WebView2 (Windows)

## Contributing

1. Create a feature branch: `git checkout -b feature/name`
2. Make changes and commit: `git commit -m "Description"`
3. Push to branch: `git push origin feature/name`
4. Open a pull request

Last Updated: May 2026
