const $ = (sel) => document.querySelector(sel);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

let currentUser = null;
let conversationId = null;
let isStreaming = false;

const loginScreen = $("#login-screen");
const chatScreen = $("#chat-screen");
const loadingScreen = $("#loading-screen");
const messagesEl = $("#messages");
const emptyState = $("#empty-state");
const input = $("#message-input");
const sendBtn = $("#send-btn");
const newChatBtn = $("#new-chat-btn");
const loginBtn = $("#login-btn");
const userAvatar = $("#user-avatar");

async function checkAuth() {
  try {
    const res = await fetch("/api/auth/user");
    if (res.ok) {
      currentUser = await res.json();
      return true;
    }
  } catch {}
  return false;
}

function renderAvatar() {
  if (!currentUser) return;
  if (currentUser.profileImage) {
    const img = document.createElement('img');
    img.src = currentUser.profileImage;
    img.alt = currentUser.name;
    userAvatar.innerHTML = '';
    userAvatar.appendChild(img);
  } else {
    userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  }
}

async function init() {
  const authed = await checkAuth();
  hide(loadingScreen);

  if (authed) {
    renderAvatar();
    show(chatScreen);
    await createConversation();
  } else {
    show(loginScreen);
  }
}

loginBtn.addEventListener("click", () => {
  window.location.href = `https://replit.com/auth_with_repl_site?domain=${window.location.host}`;
});

async function handleUnauthorized() {
  currentUser = null;
  conversationId = null;
  hide(chatScreen);
  show(loginScreen);
}

async function createConversation() {
  try {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" }),
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await res.json();
    conversationId = data.id;
  } catch (err) {
    console.error("Failed to create conversation:", err);
  }
}

function addMessage(role, content) {
  hide(emptyState);
  const msg = document.createElement("div");
  msg.className = `message ${role}`;

  if (role === "assistant") {
    msg.innerHTML = `
      <div class="message-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </div>
      <div class="message-bubble">${escapeHtml(content)}</div>
    `;
  } else {
    msg.innerHTML = `<div class="message-bubble">${escapeHtml(content)}</div>`;
  }

  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

function addTypingIndicator() {
  hide(emptyState);
  const msg = document.createElement("div");
  msg.className = "message assistant";
  msg.id = "typing";
  msg.innerHTML = `
    <div class="message-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
    </div>
    <div class="message-bubble">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById("typing");
  if (el) el.remove();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text || isStreaming || !conversationId) return;

  input.value = "";
  autoResize();
  updateSendButton();
  addMessage("user", text);
  addTypingIndicator();

  isStreaming = true;
  updateSendButton();

  let assistantEl = null;
  let fullContent = "";

  try {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content: text }),
    });

    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error("Failed to get response");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.done) continue;
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.content) {
            fullContent += parsed.content;
            removeTypingIndicator();
            if (!assistantEl) {
              assistantEl = addMessage("assistant", fullContent);
            } else {
              assistantEl.querySelector(".message-bubble").textContent = fullContent;
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    removeTypingIndicator();
    if (!assistantEl) {
      addMessage("assistant", "Sorry, something went wrong. Please try again.");
    }
  } finally {
    isStreaming = false;
    updateSendButton();
    input.focus();
  }
}

newChatBtn.addEventListener("click", async () => {
  messagesEl.innerHTML = "";
  messagesEl.appendChild(emptyState);
  show(emptyState);
  conversationId = null;
  await createConversation();
});

function updateSendButton() {
  sendBtn.disabled = !input.value.trim() || isStreaming;
}

function autoResize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
}

input.addEventListener("input", () => {
  updateSendButton();
  autoResize();
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

init();
