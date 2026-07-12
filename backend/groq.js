const GROQ_URL = process.env.GROQ_URL || "https://api.groq.com/openai/v1";

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

export async function answerWithGroq(question, context) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    console.log("Groq key exists:", !!GROQ_API_KEY);

  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in environment variables.");
  }

  if (!context || !context.trim()) return NO_EVIDENCE_ANSWER;

  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in environment variables.");
  }
  console.log("GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);

  const prompt = buildPrompt(question, context);

  const response = await fetch(`${GROQ_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      // Use OpenAI-compatible chat format
      messages: [
        { role: "system", content: "You answer using only the provided context." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 140,
    }),
  });

  if (!response.ok) {
    const txt = await response.text().catch(() => "");
    throw new Error(`Groq returned ${response.status}${txt ? `: ${txt}` : ""}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return String(content || "").trim() || NO_EVIDENCE_ANSWER;
}

