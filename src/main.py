import sys

from agents import MemoryAssistant


def configure_terminal():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")


def print_welcome():
    print("Personal AI Memory Assistant")
    print("Type a question about your WhatsApp chats.")
    print("Type 'exit' or 'quit' to stop.")
    print()


def main():
    configure_terminal()
    print_welcome()
    assistant = MemoryAssistant()

    while True:
        question = input("Ask a question: ").strip()

        if question.lower() in {"exit", "quit"}:
            print("Goodbye.")
            raise SystemExit(0)

        if not question:
            continue

        result = assistant.answer_question(question)

        print()
        print("Answer:")
        print(result["answer"].output)
        print()
        print("Faithfulness Check:")
        print(result["faithfulness"].output)
        print()
        print("Retrieved Evidence:")
        print(result["retrieval"].output)
        print()


if __name__ == "__main__":
    main()
