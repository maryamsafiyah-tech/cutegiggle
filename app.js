const MODELS = [
  "gpt-4.1-mini",
  "gpt-4.1",
  "claude-3-5-sonnet",
  "gemini-2.0-flash",
];

const selectedModels = new Set();

const pickerEl = document.getElementById("model-picker");
const hintEl = document.getElementById("selection-hint");
const columnsEl = document.getElementById("chat-columns");
const columnTemplate = document.getElementById("chat-column-template");
const composerEl = document.getElementById("composer");
const inputEl = document.getElementById("prompt-input");

renderModelPicker();
renderColumns();

composerEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const prompt = inputEl.value.trim();
  if (!prompt || selectedModels.size === 0) {
    return;
  }

  const targets = [...selectedModels];
  inputEl.value = "";
  setComposerState(true);

  try {
    await Promise.all(targets.map((model) => submitToModel(model, prompt)));
  } finally {
    setComposerState(false);
    inputEl.focus();
  }
});

function renderModelPicker() {
  pickerEl.innerHTML = "";

  MODELS.forEach((model) => {
    const label = document.createElement("label");
    label.className = "model-pill";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = model;

    checkbox.addEventListener("change", (event) => {
      const checked = event.target.checked;
      if (checked && selectedModels.size >= 2) {
        event.target.checked = false;
        hintEl.textContent = "You can compare up to 2 models at once.";
        return;
      }

      if (checked) {
        selectedModels.add(model);
      } else {
        selectedModels.delete(model);
      }

      updateHint();
      renderColumns();
    });

    const text = document.createElement("span");
    text.textContent = model;

    label.append(checkbox, text);
    pickerEl.append(label);
  });
}

function updateHint() {
  const count = selectedModels.size;
  if (count === 0) {
    hintEl.textContent = "No models selected.";
  } else if (count === 1) {
    hintEl.textContent = "1 model selected. Select one more for split-screen comparison.";
  } else {
    hintEl.textContent = "2 models selected. Prompt will be sent to both models.";
  }
}

function renderColumns() {
  columnsEl.innerHTML = "";

  const models = [...selectedModels];
  columnsEl.classList.toggle("dual", models.length === 2);
  columnsEl.classList.toggle("single", models.length !== 2);

  if (models.length === 0) {
    const empty = document.createElement("article");
    empty.className = "chat-column";
    empty.innerHTML = '<h2 class="model-name">No model selected</h2><div class="messages"><p class="hint">Choose one or two models to start chatting.</p></div>';
    columnsEl.append(empty);
    return;
  }

  models.forEach((model) => {
    const fragment = columnTemplate.content.cloneNode(true);
    fragment.querySelector(".model-name").textContent = model;
    fragment.querySelector(".messages").dataset.model = model;
    columnsEl.append(fragment);
  });
}

async function submitToModel(model, prompt) {
  const messagesEl = columnsEl.querySelector(`.messages[data-model="${model}"]`);
  if (!messagesEl) return;

  appendMessage(messagesEl, "user", prompt);
  const pendingMessage = appendMessage(messagesEl, "assistant pending", "Thinking…");

  try {
    const responseText = await getModelResponse(model, prompt);
    pendingMessage.classList.remove("pending");
    pendingMessage.textContent = responseText;
  } catch (error) {
    pendingMessage.classList.remove("pending");
    pendingMessage.textContent = `Error from ${model}: ${error.message}`;
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage(messagesEl, roleClasses, text) {
  const bubble = document.createElement("div");
  bubble.className = `message ${roleClasses}`;
  bubble.textContent = text;
  messagesEl.append(bubble);
  return bubble;
}

async function getModelResponse(model, prompt) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt }),
  });

  if (!response.ok) {
    return fallbackStub(model, prompt);
  }

  const data = await response.json();
  if (!data?.text) {
    return fallbackStub(model, prompt);
  }

  return data.text;
}

async function fallbackStub(model, prompt) {
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 800));
  return `(${model}) Demo response for:\n${prompt}\n\nWire /api/chat to your backend to replace this stub.`;
}

function setComposerState(isBusy) {
  const button = composerEl.querySelector("button");
  inputEl.disabled = isBusy;
  button.disabled = isBusy;
}
