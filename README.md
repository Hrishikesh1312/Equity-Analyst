# Equity Analyst

A professional desktop equity research tool built with Tauri + React + FastAPI + Ollama.

## Prerequisites (Linux)

### 1. System dependencies (Tauri)
```bash
sudo apt update
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### 2. Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 3. Node.js (v18+)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 4. Python 3.11+
```bash
sudo apt install -y python3 python3-pip python3-venv
```

### 5. Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:3b
```

---

## Project Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend
```bash
cd ..               # back to project root
npm install
```

---

## Running in Development

You need **three terminals**:

**Terminal 1 — FastAPI backend**
```bash
cd backend
source venv/bin/activate
python main.py
# Runs on http://localhost:8000
```

**Terminal 2 — Ollama**
```bash
ollama serve
# Runs on http://localhost:11434
```

**Terminal 3 — Tauri dev**
```bash
npm run tauri dev
# Opens the desktop window
```

### Frontend-only (no Tauri, just browser)
```bash
npm run dev
# Open http://localhost:1420
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/search?q=AAPL` | Search tickers |
| GET | `/stock/{ticker}` | Full stock info |
| GET | `/stock/{ticker}/history?period=1mo` | Price history |
| GET | `/ollama/status` | Ollama health check |

Period values: `1d`, `1mo`, `6mo`, `1y`, `5y`

---

## Project Structure

```
equity-analyst/
├── src-tauri/          Rust/Tauri desktop shell
├── src/                React frontend
│   ├── api/            API client layer
│   ├── components/     UI components
│   ├── App.tsx         Root component
│   ├── theme.tsx       Dark/light theme context
│   └── index.css       Design tokens + global styles
├── backend/            FastAPI Python server
│   ├── main.py         All routes
│   └── requirements.txt
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Sprint Roadmap

| Sprint | Focus | Status |
|--------|-------|--------|
| 1 | Scaffold + data layer | ✅ Done |
| 2 | Charts + technical indicators | 🔜 Next |
| 3 | AI analysis + chat | 🔜 |
| 4 | Portfolio tab | 🔜 |
