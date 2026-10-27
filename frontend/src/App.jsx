import React from "react";

import { useEffect, useRef, useState } from "react";
import {
  Bot, Plus, Send, PanelLeft, Sparkles, Trash2, UserRound,
  AlertCircle, CheckCircle2, X, LoaderCircle
} from "lucide-react";

const MAX_LENGTH = 100;
const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const starters = [
  { title: "Explain a concept", prompt: "Explain artificial intelligence in simple words." },
  { title: "Help with Python", prompt: "What is Python used for?" },
  { title: "Write some code", prompt: "Write a Python program to add two numbers." },
  { title: "Study assistant", prompt: "Give me three tips for preparing for an exam." },
];

function validateInput(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Please enter a question.";
  if (trimmed.length > MAX_LENGTH) return `Input is too long. Maximum allowed length is ${MAX_LENGTH} characters.`;
  if (!/[a-z0-9]/i.test(trimmed)) return "Please enter meaningful text using letters or numbers.";
  return "";
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiError, setApiError] = useState("");
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const startNewChat = () => {
    setMessages([]);
    setInput("");
    setNotice(null);
    setApiError("");
    setSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    const validation = validateInput(text);
    if (validation) {
      setNotice({ type: "error", text: validation });
      return;
    }
    if (loading) return;

    setNotice({ type: "success", text: "Input validated successfully." });
    setApiError("");
    const userMessage = { role: "user", content: text };
    const previous = messages.slice(-12);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: previous }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || `Request failed (${response.status}).`);
      }
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
      setNotice(null);
    } catch (error) {
      const message = error.message || "Could not connect to the AI service.";
      setApiError(message);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `Sorry, I couldn't complete that request. ${message}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const onInputChange = (event) => {
    setInput(event.target.value);
    if (notice) setNotice(null);
  };

  const hasConversation = messages.length > 0;

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
            <span className="brand-mark"><Bot size={21} /></span>
            <span>AI Agent</span>
          </a>
          <button className="icon-button sidebar-close" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <button className="new-chat-button" onClick={startNewChat}>
          <Plus size={17} /> <span>New chat</span>
        </button>
        <div className="sidebar-label">YOUR ASSISTANT</div>
        <div className="sidebar-note">
          <Sparkles size={16} />
          <span>Ask questions, learn concepts, and get help with code.</span>
        </div>
        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div><strong>AI Agent</strong><span>Powered by Groq</span></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><PanelLeft size={19} /></button>
            <span className="mobile-brand"><Bot size={19} /> AI Agent</span>
            <span className="model-label">AI Assistant <span className="model-caret">▾</span></span>
          </div>
          <div className="topbar-right">
            <span className="online-indicator"><span /> Ready to help</span>
          </div>
        </header>

        <section className={`conversation ${hasConversation ? "conversation-active" : ""}`}>
          {!hasConversation ? (
            <div className="welcome">
              <div className="welcome-icon"><Sparkles size={25} /></div>
              <h1>What can I help you with?</h1>
              <p>Ask a question, explore an idea, or get help with your next project.</p>
              <div className="starter-grid">
                {starters.map((item) => (
                  <button className="starter-card" key={item.title} onClick={() => sendMessage(item.prompt)}>
                    <span>{item.title}</span>
                    <small>{item.prompt}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message, index) => (
                <article className={`message-row ${message.role}`} key={`${index}-${message.role}`}>
                  <div className={`avatar ${message.role}`}>
                    {message.role === "assistant" ? <Bot size={18} /> : <UserRound size={17} />}
                  </div>
                  <div className="message-content">
                    <div className="message-author">{message.role === "assistant" ? "AI Agent" : "You"}</div>
                    <div className="message-text">{message.content}</div>
                  </div>
                </article>
              ))}
              {loading && (
                <article className="message-row assistant">
                  <div className="avatar assistant"><Bot size={18} /></div>
                  <div className="message-content">
                    <div className="message-author">AI Agent</div>
                    <div className="typing"><LoaderCircle size={16} className="spin" /> Thinking...</div>
                  </div>
                </article>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <footer className="composer-area">
          {notice && (
            <div className={`notice ${notice.type}`}>
              {notice.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{notice.text}</span>
              <button aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={15} /></button>
            </div>
          )}
          {apiError && (
            <div className="api-hint">
              <AlertCircle size={15} /> Check your connection or the server's Groq API configuration.
              <button onClick={() => setApiError("")} aria-label="Dismiss error"><X size={14} /></button>
            </div>
          )}
          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInputChange}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              placeholder="Message AI Agent..."
              rows={1}
              maxLength={500}
              aria-label="Message AI Agent"
            />
            <div className="composer-bottom">
              <span className={`char-count ${input.length > MAX_LENGTH ? "over-limit" : ""}`}>
                {input.length}/{MAX_LENGTH}
              </span>
              <button className="send-button" type="submit" disabled={loading || !input.trim()} aria-label="Send message">
                {loading ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}
              </button>
            </div>
          </form>
          <div className="composer-help">Maximum 100 characters per question · Enter to send · Shift + Enter for a new line</div>
          <div className="footer-actions">
            <span>AI can make mistakes. Check important information.</span>
            {hasConversation && <button className="clear-button" onClick={startNewChat}><Trash2 size={14} /> Clear chat</button>}
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
