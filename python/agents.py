import re
import sys
from dataclasses import dataclass
from pathlib import Path

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_ollama import ChatOllama


CHROMA_PATH = Path("memory_db/chroma")
COLLECTION_NAME = "whatsapp_memory"
OLLAMA_MODEL = "llama3.2:3b"


@dataclass
class AgentResponse:
    agent_name: str
    output: str


NO_EVIDENCE_ANSWER = (
    "I could not find enough evidence in the WhatsApp chats to answer that confidently."
)


class MemoryRetrieverAgent:
    def __init__(self, chroma_path=CHROMA_PATH, collection_name=COLLECTION_NAME):
        self.vector_store = Chroma(
            collection_name=collection_name,
            persist_directory=str(chroma_path),
        )

    def run(self, question, k=4):
        keyword_documents = self._keyword_search(question, k=k)
        vector_documents = self.vector_store.similarity_search(question, k=k)
        documents = self._dedupe_documents(keyword_documents + vector_documents)[:k]
        documents = sorted(
            documents,
            key=lambda document: document.metadata.get("start_index", 0),
        )
        context = "\n\n".join(document.page_content for document in documents)

        return AgentResponse(
            agent_name="Memory Retriever Agent",
            output=context,
        )

    def _keyword_search(self, question, k):
        collection = self.vector_store.get(include=["documents", "metadatas"])
        question_words = self._important_words(question)
        scored_documents = []

        for text, metadata in zip(collection["documents"], collection["metadatas"]):
            text_words = self._important_words(text)
            score = len(question_words.intersection(text_words))

            if score > 0:
                scored_documents.append((score, text, metadata))

        scored_documents.sort(key=lambda item: item[0], reverse=True)

        return [
            Document(page_content=text, metadata=metadata)
            for _, text, metadata in scored_documents[:k]
        ]

    def _dedupe_documents(self, documents):
        deduped = []
        seen_indexes = set()

        for document in documents:
            start_index = document.metadata.get("start_index")
            source_files = document.metadata.get("source_files", "")
            document_key = (start_index, source_files)

            if document_key in seen_indexes:
                continue

            seen_indexes.add(document_key)
            deduped.append(document)

        return deduped

    def _important_words(self, text):
        stop_words = {
            "a",
            "an",
            "and",
            "are",
            "for",
            "from",
            "in",
            "is",
            "it",
            "of",
            "on",
            "the",
            "to",
            "what",
            "when",
            "where",
            "which",
            "who",
            "why",
        }
        words = re.findall(r"[A-Za-z0-9]+", text.lower())
        return {word for word in words if word not in stop_words and len(word) > 2}


class AnswerAgent:
    def __init__(self):
        self.llm = ChatOllama(
            model=OLLAMA_MODEL,
            temperature=0,
            num_predict=120,
        )

    def run(self, question, context):
        prompt = self._build_prompt(question, context)
        if not context.strip():
            return AgentResponse(
                agent_name="LLM Answer Agent",
                output=NO_EVIDENCE_ANSWER,
            )

        response = self.llm.invoke(prompt)

        return AgentResponse(
            agent_name="LLM Answer Agent",
            output=response.content.strip(),
        )

    def _build_prompt(self, question, context):
        return f"""
You are a personal WhatsApp memory assistant.

Answer the user's question using ONLY the WhatsApp chat context below.

Rules:
- If the context contains the answer, answer directly and briefly.
- If the user's wording is slightly imprecise, answer with the closest supported fact and mention the limitation.
  Example: if the question asks for a software company but the chat only says an internship/company name, name the company and say the chat does not confirm it is a software company.
- If the context does not contain enough evidence, say: "{NO_EVIDENCE_ANSWER}"
- Do not use outside knowledge.
- Do not guess.
- Do not mention that you are an AI model.

WhatsApp chat context:
{context}

User question:
{question}

Answer:
""".strip()


class FaithfulnessAgent:
    def run(self, answer, context):
        if answer.startswith("I could not find enough evidence"):
            verdict = "PASS: The answer correctly says there is not enough evidence."
        elif self._has_supporting_words(answer, context):
            verdict = "PASS: The answer appears supported by retrieved chat memory."
        else:
            verdict = "FAIL: The answer may not be supported by retrieved chat memory."

        return AgentResponse(
            agent_name="Faithfulness Agent",
            output=verdict,
        )

    def _has_supporting_words(self, answer, context):
        answer_words = set(re.findall(r"[A-Za-z0-9]+", answer.lower()))
        context_words = set(re.findall(r"[A-Za-z0-9]+", context.lower()))
        meaningful_words = {word for word in answer_words if len(word) > 3}

        return bool(meaningful_words.intersection(context_words))


class MemoryAssistant:
    def __init__(self, chroma_path=CHROMA_PATH, collection_name=COLLECTION_NAME):
        self.retriever = MemoryRetrieverAgent(
            chroma_path=chroma_path,
            collection_name=collection_name,
        )
        self.answerer = AnswerAgent()
        self.checker = FaithfulnessAgent()

    def answer_question(self, question):
        retrieval_result = self.retriever.run(question)
        answer_result = self.answerer.run(question, retrieval_result.output)
        faithfulness_result = self.checker.run(
            answer_result.output,
            retrieval_result.output,
        )

        if faithfulness_result.output.startswith("FAIL"):
            answer_result = AgentResponse(
                agent_name=answer_result.agent_name,
                output=NO_EVIDENCE_ANSWER,
            )
            faithfulness_result = self.checker.run(
                answer_result.output,
                retrieval_result.output,
            )

        return {
            "question": question,
            "retrieval": retrieval_result,
            "answer": answer_result,
            "faithfulness": faithfulness_result,
        }


def answer_question(question):
    assistant = MemoryAssistant()
    return assistant.answer_question(question)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    question = "Which hostel is Kalyani in?"
    result = answer_question(question)

    print(f"Question: {question}")
    print()
    print(f"{result['retrieval'].agent_name}:")
    print(result["retrieval"].output)
    print()
    print(f"{result['answer'].agent_name}:")
    print(result["answer"].output)
    print()
    print(f"{result['faithfulness'].agent_name}:")
    print(result["faithfulness"].output)


if __name__ == "__main__":
    main()
