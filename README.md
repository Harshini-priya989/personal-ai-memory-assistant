# WhatsIn

WhatsIn is a personal memory assistant for WhatsApp chats. It parses WhatsApp text exports, builds a local Chroma memory database, and lets you ask questions through a web app or terminal assistant.

The assistant is designed to answer only from saved chat evidence. If the retrieved chats do not contain enough information, it should say that instead of guessing.

## Features

- Parses WhatsApp `.txt` exports into structured JSON messages
- Groups messages into overlapping memory chunks
- Stores chat memory locally with Chroma
- Retrieves relevant chat evidence with keyword and vector search
- Answers questions using a local Ollama model
- Runs a simple faithfulness check against retrieved evidence
- Provides a local web UI for uploading many personal or group chat exports

## Project Structure

```text
src/
  parse_whatsapp.py   # Converts raw WhatsApp chat text into JSON
  build_memory.py     # Builds the local Chroma memory database
  agents.py           # Retriever, answer, and faithfulness agents
  web_app.py          # Local web app for uploads and chat Q&A
  main.py             # Interactive command-line assistant
  whatsapp_bot.py     # WhatsApp webhook server for Twilio Sandbox
  test_retrieval.py   # Quick retrieval test script

data/
  raw/                # Put WhatsApp export text files here
  processed/          # Generated parsed messages

memory_db/            # Generated local Chroma database
```

## Requirements

- Python 3.10+
- Ollama installed and running
- The `llama3.2:3b` Ollama model

Install the Python packages used by the app:

```bash
pip install -r requirements.txt
```

Pull the Ollama model:

```bash
ollama pull llama3.2:3b
```

## Setup

1. Create and activate a virtual environment:

```bash
python -m venv .venv
.venv\Scripts\activate
```

2. Put your WhatsApp export at:

```text
data/raw/training_whatsapp_chat.txt
```

3. Parse the WhatsApp export:

```bash
python src/parse_whatsapp.py
```

4. Build the local memory database:

```bash
python src/build_memory.py
```

5. Start the web app:

```bash
python src/web_app.py
```

Open:

```text
http://127.0.0.1:5001
```

Upload one or many WhatsApp `.txt` exports, then ask questions in the browser.

6. Or start the terminal assistant:

```bash
python src/main.py
```

Then ask questions in the terminal. Type `exit` or `quit` to stop.

## Later: Attach It To WhatsApp

The simplest development path is Twilio's WhatsApp Sandbox. Your WhatsApp message goes to Twilio, Twilio calls your local webhook, and WhatsIn replies using the local memory database.

1. Build the memory database first:

```bash
python src/parse_whatsapp.py
python src/build_memory.py
```

2. Start the WhatsApp webhook server:

```bash
python src/whatsapp_bot.py
```

3. Expose the local server with a tunnel such as ngrok:

```bash
ngrok http 5000
```

4. In Twilio's WhatsApp Sandbox settings, set the incoming message webhook to:

```text
https://your-ngrok-domain.ngrok-free.app/whatsapp
```

Use `HTTP POST`.

5. Join the Twilio Sandbox from your phone, then send a question like:

```text
Who mentioned the hostel?
```

### Optional Sender Lock

To restrict the bot to your own WhatsApp number, set `WHATSIN_ALLOWED_SENDERS` before starting the server:

```bash
$env:WHATSIN_ALLOWED_SENDERS="whatsapp:+919876543210"
python src/whatsapp_bot.py
```

If this variable is empty, any sender that can reach the webhook can ask questions against your local memory database.

## Quick Retrieval Test

To test whether Chroma is returning relevant chat chunks:

```bash
python src/test_retrieval.py
```

## Privacy Notes

WhatsApp exports can contain private conversations, phone numbers, names, and personal details. Before uploading to GitHub, avoid committing:

- `.env`
- `.venv/`
- `memory_db/`
- `data/processed/messages.json`
- private raw WhatsApp exports in `data/raw/`

The existing `.gitignore` already excludes generated memory files and common local environment files. Double-check `git status` before publishing.

Do not connect the webhook to a public URL unless you understand who can message it. For personal use, prefer a sandbox plus `WHATSIN_ALLOWED_SENDERS`.

## How It Works

1. `parse_whatsapp.py` reads the raw WhatsApp text export and writes structured messages to `data/processed/messages.json`.
2. `build_memory.py` chunks those messages and stores them in a local Chroma collection named `whatsapp_memory`.
3. `web_app.py` accepts uploaded chat exports, rebuilds a web-specific Chroma collection, and answers questions using only the uploaded chats.
4. `main.py` starts an interactive assistant that retrieves relevant memory chunks, asks Ollama to answer using only that context, and prints the retrieved evidence.
5. `whatsapp_bot.py` exposes the same assistant through a Twilio-compatible WhatsApp webhook for the later integration step.
"# whatsin" 
