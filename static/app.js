const uploadForm = document.querySelector("#upload-form");
const questionForm = document.querySelector("#question-form");
const conversation = document.querySelector("#conversation");
const fileList = document.querySelector("#file-list");
const fileCount = document.querySelector("#file-count");
const messageCount = document.querySelector("#message-count");
const chunkCount = document.querySelector("#chunk-count");
const questionInput = document.querySelector("#question");

let hasMemory = false;

function clearEmptyState() {
  const empty = conversation.querySelector(".empty-state");
  if (empty) {
    empty.remove();
  }
}

function addMessage(kind, title, text, evidence) {
  clearEmptyState();

  const message = document.createElement("article");
  message.className = `message ${kind}`;

  const heading = document.createElement("h3");
  heading.textContent = title;
  message.appendChild(heading);

  const body = document.createElement("p");
  body.textContent = text;
  message.appendChild(body);

  if (evidence) {
    const details = document.createElement("details");
    details.className = "evidence";

    const summary = document.createElement("summary");
    summary.textContent = "Retrieved evidence";

    const pre = document.createElement("pre");
    pre.textContent = evidence;

    details.appendChild(summary);
    details.appendChild(pre);
    message.appendChild(details);
  }

  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
}

function setBusy(form, busy) {
  form.querySelectorAll("button, input").forEach((element) => {
    element.disabled = busy;
  });
}

function renderFiles(files) {
  fileList.replaceChildren();

  files.forEach((file) => {
    const item = document.createElement("div");
    item.className = "file-item";

    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = file.name;

    const status = document.createElement("div");
    status.className = "file-status";
    status.textContent = `${file.messages} messages - ${file.status}`;

    item.appendChild(name);
    item.appendChild(status);
    fileList.appendChild(item);
  });
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(uploadForm);
  setBusy(uploadForm, true);
  addMessage("system", "Indexing", "Reading uploaded chat exports...");

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      renderFiles(data.files || []);
      addMessage("error", "Upload failed", data.error || "Could not index chats.");
      return;
    }

    hasMemory = true;
    fileCount.textContent = data.file_count;
    messageCount.textContent = data.message_count;
    chunkCount.textContent = data.chunk_count;
    renderFiles(data.files);
    addMessage(
      "system",
      "Ready",
      `Indexed ${data.message_count} messages from ${data.file_count} files.`
    );
  } catch (error) {
    addMessage("error", "Upload failed", error.message);
  } finally {
    setBusy(uploadForm, false);
  }
});

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  if (!question) {
    return;
  }

  if (!hasMemory) {
    addMessage("error", "No chats indexed", "Upload WhatsApp exports first.");
    return;
  }

  questionInput.value = "";
  addMessage("user", "You", question);
  setBusy(questionForm, true);

  try {
    const response = await fetch("/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();

    if (!response.ok) {
      addMessage("error", "Answer failed", data.error || "Could not answer.");
      return;
    }

    addMessage("assistant", "WhatsIn", data.answer, data.evidence);
  } catch (error) {
    addMessage("error", "Answer failed", error.message);
  } finally {
    setBusy(questionForm, false);
    questionInput.focus();
  }
});
