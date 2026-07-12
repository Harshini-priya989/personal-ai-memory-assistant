import json
from pathlib import Path

from langchain_chroma import Chroma
from langchain_core.documents import Document


MESSAGES_PATH = Path("data/processed/messages.json")
CHROMA_PATH = Path("memory_db/chroma")
COLLECTION_NAME = "whatsapp_memory"

CHUNK_SIZE = 10
CHUNK_OVERLAP = 2


def load_messages():
    if not MESSAGES_PATH.exists():
        raise FileNotFoundError(f"Could not find file: {MESSAGES_PATH}")

    return json.loads(MESSAGES_PATH.read_text(encoding="utf-8"))


def format_message(message):
    source = message.get("source_file")
    source_text = f" ({source})" if source else ""

    return (
        f"[{message['timestamp']}]{source_text} "
        f"{message['sender']}: "
        f"{message['message']}"
    )


def create_chunks(messages):
    documents = []
    step = CHUNK_SIZE - CHUNK_OVERLAP

    for start_index in range(0, len(messages), step):
        chunk_messages = messages[start_index : start_index + CHUNK_SIZE]

        if not chunk_messages:
            continue

        chunk_text = "\n".join(format_message(message) for message in chunk_messages)

        first_message = chunk_messages[0]
        last_message = chunk_messages[-1]

        document = Document(
            page_content=chunk_text,
            metadata={
                "start_index": start_index,
                "end_index": start_index + len(chunk_messages) - 1,
                "start_time": first_message["timestamp"],
                "end_time": last_message["timestamp"],
                "senders": ", ".join(
                    sorted({message["sender"] for message in chunk_messages})
                ),
                "source_files": ", ".join(
                    sorted(
                        {
                            message["source_file"]
                            for message in chunk_messages
                            if message.get("source_file")
                        }
                    )
                ),
            },
        )

        documents.append(document)

    return documents


def rebuild_memory(documents, chroma_path=CHROMA_PATH, collection_name=COLLECTION_NAME):
    existing_store = Chroma(
        collection_name=collection_name,
        persist_directory=str(chroma_path),
    )

    try:
        existing_store.delete_collection()
    except ValueError:
        pass

    vector_store = Chroma(
        collection_name=collection_name,
        persist_directory=str(chroma_path),
    )

    ids = [f"chunk-{index}" for index in range(len(documents))]

    if documents:
        vector_store.add_documents(documents=documents, ids=ids)

    return vector_store


def main():
    messages = load_messages()
    documents = create_chunks(messages)

    rebuild_memory(documents)

    print(f"Loaded {len(messages)} messages")
    print(f"Created {len(documents)} memory chunks")
    print(f"Saved vector memory to {CHROMA_PATH}")


if __name__ == "__main__":
    main()
