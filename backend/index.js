import cors from "cors";
import express from "express";
import multer from "multer";

import { answerWithGroq, NO_EVIDENCE_ANSWER } from "./groq.js";
import { getStats, hasMemory, rebuildMemory, retrieveContext } from "./memory.js";
import { parseWhatsAppChat } from "./whatsappParser.js";

const PORT = process.env.PORT || 5002;
const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function decodeBuffer(buffer) {
  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

function isAnswerGrounded(answer, context) {
  const trimmedAnswer = String(answer || "").trim();
  const trimmedContext = String(context || "").trim();

  if (!trimmedAnswer || !trimmedContext) {
    return false;
  }

  if (trimmedAnswer.startsWith(NO_EVIDENCE_ANSWER)) {
    return true;
  }

  // Stricter grounding heuristic:
  // - require a minimum overlap between answer tokens and context tokens
  // - avoid accepting very short/weak overlaps
  const answerTokens = new Set((trimmedAnswer.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 3));
  const contextTokens = new Set((trimmedContext.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 3));

  if (answerTokens.size === 0 || contextTokens.size === 0) return false;

  let overlap = 0;
  for (const t of answerTokens) {
    if (contextTokens.has(t)) overlap += 1;
  }

  const overlapRatio = overlap / answerTokens.size;

  // Tuneable thresholds to reduce hallucination acceptance.
  // If the answer is very short (e.g., a single name like "Sumathi ma'am"),
  // require only 1 overlapping token with a decent ratio.
  if (answerTokens.size <= 5) {
    return overlap >= 1 && overlapRatio >= 0.2;
  }

  return overlap >= 4 && overlapRatio >= 0.08;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, stats: getStats() });
});

app.post("/api/upload", upload.array("chatFiles"), (request, response) => {
  const files = request.files || [];

  if (!files.length) {
    return response.status(400).json({ error: "Upload at least one WhatsApp .txt export." });
  }

  const allMessages = [];
  const fileSummaries = [];

  files.forEach((file) => {
    const filename = file.originalname || "whatsapp-chat.txt";

    if (!filename.toLowerCase().endsWith(".txt")) {
      fileSummaries.push({
        name: filename,
        messages: 0,
        status: "Skipped: only .txt files are supported",
      });
      return;
    }

    const rawText = decodeBuffer(file.buffer);
    const messages = parseWhatsAppChat(rawText, filename);

    allMessages.push(...messages);
    fileSummaries.push({
      name: filename,
      messages: messages.length,
      status: messages.length ? "Indexed" : "No messages found",
    });
  });

  if (!allMessages.length) {
    return response.status(400).json({
      error: "No WhatsApp messages could be parsed from those files.",
      files: fileSummaries,
    });
  }

  const stats = rebuildMemory(allMessages, fileSummaries);
  return response.json({ status: "ready", ...stats });
});

app.post("/api/ask", async (request, response) => {
  const question = String(request.body?.question || "").trim();

  if (!question) {
    return response.status(400).json({ error: "Enter a question." });
  }

  if (!hasMemory()) {
    return response.status(400).json({ error: "Upload WhatsApp chat exports first." });
  }

  const retrieval = retrieveContext(question);

  try {
    // If retrieval has little/no evidence, skip generation to avoid hallucinations.
    // A very low-score retrieval likely means the context doesn't contain the answer.
    const evidenceText = retrieval.context || "";
    const evidenceChunkCount = retrieval.chunks?.length || 0;

    let answer = NO_EVIDENCE_ANSWER;

    if (evidenceChunkCount > 0 && evidenceText.trim().length > 0) {
      answer = await answerWithGroq(question, evidenceText);


      if (!isAnswerGrounded(answer, evidenceText)) {
        answer = NO_EVIDENCE_ANSWER;
      }
    }

    return response.json({
      answer,
      evidence: evidenceText,
      evidenceCount: evidenceChunkCount,
      stats: getStats(),
    });
  } catch (error) {
    return response.status(503).json({
      error: "Could not reach Groq. Make sure GROQ_API_KEY is set and the model is available.",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsIn API running on http://127.0.0.1:${PORT}`);
});
