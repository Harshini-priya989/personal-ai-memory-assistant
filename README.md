# WhatsIn

WhatsIn is a local personal memory assistant for WhatsApp chat exports. It parses a WhatsApp text export, builds a local Chroma memory database, and lets you ask questions about the chat through an Ollama-powered assistant.

## Features

- Parses WhatsApp `.txt` exports into structured JSON messages
- Groups messages into overlapping memory chunks
- Stores chat memory locally with Chroma
- Retrieves relevant chat evidence with keyword and vector search
- Answers questions using a local Ollama model
- Runs a simple faithfulness check against retrieved evidence

## Project Structure

```text
src/
  parse_whatsapp.py   # Converts raw WhatsApp chat text into JSON
  build_memory.py     # Builds the local Chroma memory database
  agents.py           # Retriever, answer, and faithfulness agents
  main.py             # Interactive command-line assistant
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
pip install langchain-chroma langchain-core langchain-ollama
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

5. Start the assistant:

```bash
python src/main.py
```

Then ask questions in the terminal. Type `exit` or `quit` to stop.

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

## How It Works

1. `parse_whatsapp.py` reads the raw WhatsApp text export and writes structured messages to `data/processed/messages.json`.
2. `build_memory.py` chunks those messages and stores them in a local Chroma collection named `whatsapp_memory`.
3. `main.py` starts an interactive assistant that retrieves relevant memory chunks, asks Ollama to answer using only that context, and prints the retrieved evidence.

