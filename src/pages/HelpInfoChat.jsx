import React, { useEffect, useState } from "react";
import "./HelpInfoChat.css";

const HelpInfoChat = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Simulated initial messages from server
    setMessages([
      { id: 1, type: "welcome", text: "Hi there! Welcome to our support chat." },
      { id: 2, type: "info", text: "I can help you with orders, refunds, or technical issues." },
      {
        id: 3,
        type: "normal",
        text: "How can we help you today?",
        options: [
          "Track my order",
          "Cancel my order",
          "Return/Exchange",
          "Talk to human agent"
        ]
      }
    ]);
  }, []);

  const handleOptionClick = (option) => {
    const newMsg = {
      id: Date.now(),
      type: "user",
      text: option
    };
    setMessages((prev) => [...prev, newMsg]);

    // Simulated server reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "info",
          text: `We are looking into: "${option}". Please wait...`
        }
      ]);
    }, 800);
  };

  return (
    <div className="helpchat-container">
      <div className="helpchat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`helpchat-message ${msg.type}`}>
            <div className="helpchat-bubble">{msg.text}</div>
            {msg.options && (
              <div className="helpchat-options">
                {msg.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(opt)}
                    className="helpchat-option-btn"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HelpInfoChat;