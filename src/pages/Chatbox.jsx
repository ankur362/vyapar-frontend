import React, { useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./../styles/Chatbox.css";

const Chatbox = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        setupSpeechRecognition();
    }, []);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);
    const backendUrl = import.meta.env.VITE_BACKEND_CHAT_URL;

    const sendMessage = async () => {
        if (input.trim() === "") return;

        const userMessage = { sender: "user", text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Unauthorized! Please log in.");
                navigate("/");
                return;
            }

            const response = await axios.post(`http://localhost:8000/api/v1/chat`, {
                message: input,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const botMessage = { sender: "agent", text: response.data.reply };
            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === "Enter") {
            sendMessage();
        }
    };

    const setupSpeechRecognition = () => {
        if (!("webkitSpeechRecognition" in window)) {
            console.warn("Speech recognition is not supported in this browser.");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
            let finalText = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalText += event.results[i][0].transcript + " ";
                }
            }
            setInput(finalText);
        };

        recognition.onend = () => {
            setIsListening(false);
            if (input.trim() !== "") {
                sendMessage();
            }
        };

        recognition.onerror = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }

        setIsListening(!isListening);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    return (
        <div className="chat-container">
            <button onClick={handleLogout} className="logout-button">Logout</button>

            <div className="chatbox">
                <div className="chat-header">
                    <h2>Gojo Unlimited Void</h2>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender === "user" ? "user" : "agent"}`}>
                            {msg.text}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type or speak your message..."
                    />
                    <div className="button-container">
                        <button onClick={sendMessage} className="send-button">
                            <Send size={20} />
                        </button>
                        <button onClick={toggleListening} className={`mic-button ${isListening ? "active" : ""}`}>
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chatbox;
