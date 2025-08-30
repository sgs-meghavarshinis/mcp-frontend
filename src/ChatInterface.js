import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(uuidv4());
  const [selectedModel, setSelectedModel] = useState("gpt-4.1");
  const messagesEndRef = useRef(null);

  // User and tenant IDs
  const userId = uuidv4();
  const tenantId = uuidv4();

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    console.log("Messages updated:", messages);
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "https://mcp-backend-one.vercel.app/run-agent/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: input,
            model: selectedModel,
            user_id: userId,
            tenant_id: tenantId,
            session_id: sessionId,
          }),
        }
      );
      console.log("Response :", response);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
let assistantMessageAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());
        console.log("Lines:", lines);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.type === "token") {
              assistantContent += data.content;

              // Add assistant message only once, when the first token arrives
              if (!assistantMessageAdded) {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: assistantContent },
                ]);
                assistantMessageAdded = true;
              } else {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessageIndex = newMessages.length - 1;
                  if (newMessages[lastMessageIndex]?.role === "assistant") {
                    newMessages[lastMessageIndex] = {
                      ...newMessages[lastMessageIndex],
                      content: assistantContent,
                    };
                  }
                  return newMessages;
                });
              }
              await new Promise((resolve) => setTimeout(resolve, 50));
              setIsLoading(false);
            } else if (data.type === "complete") {
            } else if (data.type === "error") {
              throw new Error(data.content);
            }
          } catch (e) {
            console.error("Error parsing JSON:", e, line);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error.message}`,
        },
      ]);
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(uuidv4());
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>AI Assistant</h2>
        <div className="controls">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isLoading}
          >
            <option value="gpt-4.1">GPT-4</option>
            <option value="GOOGLE_API_KEY">Gemini</option>
            <option value="ANTHROPIC_API_KEY">Claude</option>
          </select>
          <button onClick={clearChat} disabled={isLoading}>
            New Chat
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Start a conversation with the AI assistant!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-role">
                {message.role === "user" ? "You" : "Assistant"}
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message assistant">
            <div className="message-role">Assistant</div>
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something about your data..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
