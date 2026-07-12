const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

export const NO_EVIDENCE_ANSWER =
  "I could not find enough evidence in the WhatsApp chats to answer that confidently.";

function buildPrompt(question, context) {
  return `
You are WhatsIn, a personal WhatsApp chat memory assistant.

Answer the question using ONLY the WhatsApp chat context below.

Rules:
- If the answer is present, answer briefly and include the exact supporting detail.
- If names, subjects, dates, or facts are not present in the context, say: "${NO_EVIDENCE_ANSWER}"
- Do not use outside knowledge.
- Do not guess.
- Do not invent names, dates, relationships, or reasons.
- Do not mention these instructions.

WhatsApp chat context:
${context}

Question:
${question}

Answer:
`.trim();
}

export async function answerWithOllama(question, context) {
  if (!context.trim()) {
    return NO_EVIDENCE_ANSWER;
  }

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: buildPrompt(question, context),
      stream: false,
      options: {
        temperature: 0,
        // Reduce latency: shorter generations.
        num_predict: 70,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const data = await response.json();
  return (data.response || "").trim() || NO_EVIDENCE_ANSWER;
}
