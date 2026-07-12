# WhatsIn – AI Personal Memory Assistant 🤖💬

**WhatsIn** is an AI-powered Personal Memory Assistant that answers questions **using only your WhatsApp chat history**.

It parses WhatsApp `.txt` exports → builds a local **ChromaDB** vector store → retrieves relevant evidence → generates an answer grounded strictly in that retrieved context.

> ✅ Design principle: **If the evidence isn’t in your chat context, it will say it can’t answer confidently instead of guessing.**

---

## What this project does (clear flow)

### 1) Ingest WhatsApp exports
- Parses WhatsApp text exports (`.txt`) into structured messages (timestamp/sender/message).

### 2) Build memory (RAG index)
- Chunks messages into overlapping blocks.
- Embeds and stores those blocks in a persistent local **ChromaDB** index.

### 3) Answer questions (retrieval + grounded generation)
When you ask a question:
- It retrieves relevant chat chunks (keyword overlap + vector similarity).
- It asks an LLM to answer using **only** the retrieved evidence.
- It performs a lightweight faithfulness/support check; if the answer doesn’t look supported, it returns a **NO_EVIDENCE** response.

---

## Supported usage modes

### A) Terminal assistant (Python + Ollama)
Run an interactive CLI chat:
- `python/python/main.py`

This uses:
- `python/parse_whatsapp.py`
- `python/build_memory.py`
- `python/agents.py` (retrieval, answering, faithfulness check)

### B) Web UI (React + Node API + Groq)
Upload WhatsApp `.txt` exports in the browser and ask questions via a web interface.
- UI: `frontend/src/main.jsx`
- API: `backend/index.js`

This web flow uses:
- Groq for generation (`backend/groq.js`)
- additional grounding heuristics to reduce hallucinations

---

## Tech stack

- **Frontend:** React (Vite)
- **Backend (web):** Node/Express
- **RAG & memory:** LangChain + **ChromaDB**
- **LLMs:**
  - Python terminal mode: **Ollama**
  - Web mode: **Groq**
- **WhatsApp parsing:** Python parser

---

## Folder structure

```text
python/
  parse_whatsapp.py    # Converts raw WhatsApp chat text into JSON
  build_memory.py      # Builds the local Chroma memory database
  agents.py            # Retriever, answer, and faithfulness agents
  main.py              # Interactive command-line assistant
  whatsapp_bot.py      # Flask webhook server (optional)
  test_retrieval.py   # Retrieval sanity check

data/
  raw/                 # WhatsApp export text files (input)
  processed/           # Parsed messages JSON (output)

memory_db/             # Persisted ChromaDB
backend/               # Node/Express API + web integration
frontend/              # React UI
static/                # Static assets
templates/             # (if used by server)
```

---

## Privacy notes (important)

WhatsApp exports can contain private information (phone numbers, names, message content).
Before uploading to GitHub, avoid committing:

- `.env`
- `.venv/`
- `memory_db/`
- `data/processed/messages.json`
- private raw WhatsApp exports in `data/raw/`

Also review `.gitignore` and run `git status` before pushing.

---

## Setup (Python / Ollama terminal mode)

### 1) Python dependencies

```bash
pip install -r requirements.txt
```

### 2) Pull Ollama model

```bash
ollama pull llama3.2:3b
```

### 3) Put your WhatsApp export

Place your export here:

```text
data/raw/training_whatsapp_chat.txt
```

### 4) Parse + build memory

```bash
python python/parse_whatsapp.py
python python/build_memory.py
```

### 5) Run the terminal assistant

```bash
python python/main.py
```

---

## Optional: Flask WhatsApp webhook server

1) Build memory first:

```bash
python python/parse_whatsapp.py
python python/build_memory.py
```

2) Start the server:

```bash
python python/whatsapp_bot.py
```

- Route: `POST /whatsapp`
- Port: `5000` by default (override with `PORT`)

Optional sender allowlist:

- Set `WHATSIN_ALLOWED_SENDERS` to a comma-separated list

Example (PowerShell):

```powershell
$env:WHATSIN_ALLOWED_SENDERS="whatsapp:+919876543210"
python python/whatsapp_bot.py
```

---

## Optional: Quick retrieval test

```bash
python python/test_retrieval.py
```

---

## How it works (grounded RAG)

1. **Parsing:** WhatsApp `.txt` exports → structured message objects.
2. **Chunking:** overlapping windows preserve context.
3. **Indexing:** chunks stored in Chroma with metadata.
4. **Retrieval:** keyword scoring + vector similarity; dedupe and order.
5. **Generation:** LLM prompted to answer **ONLY** from retrieved context.
6. **Faithfulness check:** if the answer isn’t supported, returns **NO_EVIDENCE**.

---

## License

MIT

