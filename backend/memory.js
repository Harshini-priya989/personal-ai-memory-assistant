const CHUNK_SIZE = 10;
const CHUNK_OVERLAP = 2;

const stopWords = new Set([
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
  "did",
  "does",
  "do",
  "got",
  "get",
  "with",
]);

let state = {
  messages: [],
  chunks: [],
  files: [],
};

function tokenize(text) {
  const matches = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  return matches.filter((word) => word.length > 2 && !stopWords.has(word));
}

function formatMessage(message) {
  return `[${message.timestamp}] (${message.sourceFile}) ${message.sender}: ${message.message}`;
}

function createChunks(messages) {
  const chunks = [];
  const step = CHUNK_SIZE - CHUNK_OVERLAP;

  for (let startIndex = 0; startIndex < messages.length; startIndex += step) {
    const chunkMessages = messages.slice(startIndex, startIndex + CHUNK_SIZE);
    if (!chunkMessages.length) continue;

    const text = chunkMessages.map(formatMessage).join("\n");
    const sourceFiles = [...new Set(chunkMessages.map((message) => message.sourceFile))];

    chunks.push({
      id: `chunk-${chunks.length}`,
      startIndex,
      endIndex: startIndex + chunkMessages.length - 1,
      text,
      sourceFiles,
      tokens: tokenize(text),
    });
  }

  return chunks;
}

function scoreChunk(chunk, questionTokens) {
  if (!questionTokens.length) return 0;

  const chunkTokenSet = new Set(chunk.tokens);
  const exactMatches = questionTokens.filter((token) => chunkTokenSet.has(token)).length;
  const partialMatches = questionTokens.filter((token) =>
    chunk.tokens.some((chunkToken) => chunkToken.includes(token) || token.includes(chunkToken)),
  ).length;

  return exactMatches * 3 + partialMatches;
}

export function rebuildMemory(messages, files) {
  const sortedMessages = [...messages].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  );

  state = {
    messages: sortedMessages,
    chunks: createChunks(sortedMessages),
    files,
  };

  return getStats();
}

export function retrieveContext(question, limit = 6) {
  const questionTokens = tokenize(question);

  const scoredChunks = state.chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk, questionTokens),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .sort((left, right) => left.startIndex - right.startIndex);

  return {
    chunks: scoredChunks,
    context: scoredChunks.map((chunk) => chunk.text).join("\n\n"),
  };
}

export function getStats() {
  return {
    fileCount: state.files.filter((file) => file.messages > 0).length,
    messageCount: state.messages.length,
    chunkCount: state.chunks.length,
    files: state.files,
  };
}

export function hasMemory() {
  return state.messages.length > 0 && state.chunks.length > 0;
}
