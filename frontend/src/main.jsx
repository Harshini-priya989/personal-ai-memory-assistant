import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE =
  import.meta.env.VITE_API_URL ;

function App() {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({ fileCount: 0, messageCount: 0, chunkCount: 0 });
  const [indexedFiles, setIndexedFiles] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: "system",
      title: "Ready",
      text: "Upload WhatsApp .txt exports first. Then ask questions from those chats only.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);

  const canAsk = stats.messageCount > 0 && !isAnswering;
  const selectedFileText = useMemo(() => {
    if (!files.length) return "No files selected";
    if (files.length === 1) return files[0].name;
    return `${files.length} files selected`;
  }, [files]);

  function pushMessage(message) {
    setMessages((current) => [...current, message]);
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!files.length) {
      pushMessage({
        role: "error",
        title: "No files",
        text: "Choose one or more WhatsApp .txt exports.",
      });
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("chatFiles", file));

    setIsUploading(true);
    pushMessage({
      role: "system",
      title: "Indexing",
      text: "Reading and indexing uploaded chat exports...",
    });

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setIndexedFiles(data.files || []);
        pushMessage({
          role: "error",
          title: "Upload failed",
          text: data.error || "Could not index chats.",
        });
        return;
      }

      setStats({
        fileCount: data.fileCount,
        messageCount: data.messageCount,
        chunkCount: data.chunkCount,
      });
      setIndexedFiles(data.files);
      pushMessage({
        role: "system",
        title: "Chats indexed",
        text: `Indexed ${data.messageCount} messages from ${data.fileCount} files.`,
      });
    } catch (error) {
      pushMessage({
        role: "error",
        title: "Upload failed",
        text: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAsk(event) {
    event.preventDefault();

    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;

    if (!canAsk) {
      pushMessage({
        role: "error",
        title: "Upload first",
        text: "Index at least one WhatsApp export before asking.",
      });
      return;
    }

    setQuestion("");
    setIsAnswering(true);
    pushMessage({ role: "user", title: "You", text: cleanQuestion });

    try {
      const response = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion }),
      });
      const data = await response.json();

      if (!response.ok) {
        pushMessage({
          role: "error",
          title: "Answer failed",
          text: data.error || "Could not answer.",
        });
        return;
      }

      pushMessage({
        role: "assistant",
        title: "WhatsIn",
        text: data.answer,
        evidence: data.evidence,
        evidenceCount: data.evidenceCount,
      });
    } catch (error) {
      pushMessage({
        role: "error",
        title: "Answer failed",
        text: error.message,
      });
    } finally {
      setIsAnswering(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <h1>WhatsIn</h1>
            <p>MERN chat memory</p>
          </div>
        </div>

        <form className="upload-panel" onSubmit={handleUpload}>
          <label className="dropzone">
            <span>WhatsApp exports</span>
            <strong>{selectedFileText}</strong>
            <input
              type="file"
              accept=".txt"
              multiple
              onChange={(event) => setFiles([...event.target.files])}
            />
          </label>
          <button type="submit" disabled={isUploading}>
            {isUploading ? "Indexing..." : "Index chats"}
          </button>
        </form>

        <div className="stats">
          <div>
            <strong>{stats.fileCount}</strong>
            <span>Files</span>
          </div>
          <div>
            <strong>{stats.messageCount}</strong>
            <span>Messages</span>
          </div>
          <div>
            <strong>{stats.chunkCount}</strong>
            <span>Chunks</span>
          </div>
        </div>

        <div className="file-list">
          {indexedFiles.map((file) => (
            <div className="file-item" key={file.name}>
              <strong>{file.name}</strong>
              <span>
                {file.messages} messages - {file.status}
              </span>
            </div>
          ))}
        </div>
      </aside>

      <section className="chat">
        <div className="thread">
          {messages.map((message, index) => (
            <article className={`bubble ${message.role}`} key={`${message.role}-${index}`}>
              <strong>{message.title}</strong>
              <p>{message.text}</p>
              {message.evidence ? (
                <details>
                  <summary>Retrieved evidence ({message.evidenceCount} chunks)</summary>
                  <pre>{message.evidence}</pre>
                </details>
              ) : null}
            </article>
          ))}
          {isAnswering ? (
            <article className="bubble system">
              <strong>Thinking</strong>
              <p>Searching uploaded chats and checking the answer...</p>
            </article>
          ) : null}
        </div>

        <form className="ask-bar" onSubmit={handleAsk}>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a question about the uploaded chats"
          />
          <button type="submit" disabled={!canAsk}>
            Ask
          </button>
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
