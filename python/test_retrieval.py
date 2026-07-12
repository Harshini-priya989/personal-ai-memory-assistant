from pathlib import Path

from langchain_chroma import Chroma


CHROMA_PATH = Path("memory_db/chroma")
COLLECTION_NAME = "whatsapp_memory"


def main():
    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_PATH),
    )

    question = "Which hostel is Kalyani in?"

    results = vector_store.similarity_search(question, k=2)

    print(f"Question: {question}")
    print()

    for index, document in enumerate(results, start=1):
        print(f"Result {index}")
        print(document.page_content)
        print("-" * 60)


if __name__ == "__main__":
    main()
