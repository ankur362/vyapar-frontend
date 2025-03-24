import axios from "axios"; // Import Axios
import { ArrowRight, DollarSignIcon, Mail, Mic, MicOff, Phone, Send } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/Chatbox.css";


const Chatbox = () => {
    const [messages, setMessages] = useState(() => {
        const savedMessages = localStorage.getItem("chatMessages");
        return savedMessages ? JSON.parse(savedMessages) : [];
    });
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
        localStorage.setItem("chatMessages", JSON.stringify(messages));
    }, [messages]);

    const backendUrl = import.meta.env.VITE_BACKEND_CHAT_URL;
    console.log(backendUrl);

    // Send message using Axios
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

            const userQuery = { user_query: input };
            console.log("Sending to API:", JSON.stringify(userQuery));

            const response = await axios.post(
                `${backendUrl}`,
                userQuery,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log("Response from API:", response.data);

            let botMessage;
            if (response.data.data) {
                botMessage = { sender: "agent", text: response.data.message };
                    console.log("dsfdsfdsgfvsgsfgvsfdgvfgvfgdfg");
                    
                // Handle customer details when show is true
                if (response.data.data.show) {
                    console.log(response.data.data.customers);

                    botMessage.customerDetails = response.data.data.customers.map(({ email, name, phone, outstandingBill, _id,
                        TotalBill }) => ({
                            email,
                            name,
                            phone,
                            outstandingBill,
                            TotalBill,
                            _id
                        }));
                }
                // Handle flow=true scenario with customer array
                else if (response.data.data.flow === true && response.data.data.customers) {
                    console.log("Flow is true, processing customers:", response.data.data.customers);

                    botMessage.flowCustomers = response.data.data.customers.map(({ customer }) => ({
                        name: customer.name,
                        totalBill: customer.totalBill,
                        outstandingBill: customer.outstandingBill
                    }));
                }
                // Handle product details when show is false
                else if (response.data.data.show === false && response.data.data.product) {

                    console.log(response.data.data.product);

                    botMessage.productDetails = response.data.data.product.map(({ name, rate, gstRate }) => ({
                        name,
                        rate,
                        gstRate
                    }));
                }
                // Handle step field with customer array
              
            } 
            else if (response.data.step && response.data.customers) {
                botMessage = { sender: "agent", text: response.data.message };
                console.log("Step field is present, processing customers:", response.data.customers);

                botMessage.stepCustomers = response.data.customers.map((customer) => ({
                    name: customer.name,
                    _id: customer._id,
                    // Include other customer fields that are available
                    ...(customer.email && { email: customer.email }),
                    ...(customer.phone && { phone: customer.phone }),
                    ...(customer.outstandingBill && { outstandingBill: customer.outstandingBill }),
                    ...(customer.totalBill && { totalBill: customer.totalBill })
                }));
            }



            else {
                // Fix: Check if response.data.message is a JSON string before parsing
                try {
                    const parsedMessage = JSON.parse(response.data.message);
                    botMessage = { sender: "agent", text: parsedMessage.message };
                } catch (parseError) {
                    // If parsing fails, use the message as plain text
                    botMessage = { sender: "agent", text: response.data.message || "No response from server" };
                }
            }

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            // Show the error in the chat interface instead of just the console
            setMessages((prev) => [...prev, {
                sender: "agent",
                text: "Sorry, there was an error processing your request. Please try again."
            }]);
        }
    };

    const handleCustomerClick = async (customer) => {
        console.log("Selected customer data being sent by clicking:", customer);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Unauthorized! Please log in.");
                navigate("/");
                return;
            }

            const payload = {
                
                flow_step: "select_customer",
                customerId: customer._id
            };

            // Add optional fields if they exist
            console.log("Sending customer data to API:", JSON.stringify(payload));

            const response = await axios.post(
                `${backendUrl}`,
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            console.log("Customer details sent:", response.data);
            
            // Add the step customer selection as a user message
            setMessages((prev) => [...prev, {
                sender: "user", 
                text: `Selected customer: ${customer.name}`
            }]);
            
            // Add the response as a bot message
            if (response.data) {
                let botMessage = { 
                    sender: "agent", 
                    text: response.data.message || "Processing customer details..." 
                };
                
                // Handle any special data in the response
                if (response.data.data) {
                    // Process response data similar to the sendMessage function
                    // Add customer details, flow customers, etc. as needed
                    if (response.data.data.show && response.data.data.customers) {
                        botMessage.customerDetails = response.data.data.customers.map(({ email, name, phone, outstandingBill, _id, TotalBill }) => ({
                            email, name, phone, outstandingBill, TotalBill, _id
                        }));
                    }
                    // Add other condition handling as needed
                }
                
                setMessages((prev) => [...prev, botMessage]);
            }
        } catch (error) {
            console.error("Error sending customer details:", error);
            // Show error in the chat
            setMessages((prev) => [...prev, {
                sender: "agent",
                text: "Sorry, there was an error processing your customer selection. Please try again."
            }]);
        }
    };

    const handleStepCustomerClick = async (customer) => {
        console.log("Selected step customer data being sent by clicking:", customer);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Unauthorized! Please log in.");
                navigate("/");
                return;
            }

            const payload = {
                user_query: `I want to select customer ${customer.name}`,
                additional_data: {
                    customerId: customer._id,
                    flow_step: "select_customer"
                }
            };

            // Add optional fields if they exist
            console.log("Sending customer data to API:", JSON.stringify(payload));

            const response = await axios.post(
                `${backendUrl}`,
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            console.log("Step customer details sent:", response.data);
            
            // Add the step customer selection as a user message
            setMessages((prev) => [...prev, {
                sender: "user", 
                text: `Selected: ${customer.name}`
            }]);
            
            // Add the response as a bot message
            if (response.data) {
                let botMessage = { 
                    sender: "agent", 
                    text: response.data.message || "Processing customer details..." 
                };
                
                // Handle any special data in the response
                if (response.data.data) {
                    // Process response data similar to the sendMessage function
                    // Add customer details, flow customers, etc. as needed
                    if (response.data.data.show && response.data.data.customers) {
                        botMessage.customerDetails = response.data.data.customers.map(({ email, name, phone, outstandingBill, _id, TotalBill }) => ({
                            email, name, phone, outstandingBill, TotalBill, _id
                        }));
                    }
                    // Add other condition handling as needed
                }
                
                setMessages((prev) => [...prev, botMessage]);
            }
        } catch (error) {
            console.error("Error sending step customer details:", error);
            // Show error in the chat
            setMessages((prev) => [...prev, {
                sender: "agent",
                text: "Sorry, there was an error processing your selection. Please try again."
            }]);
        }
    };

    const handleProductClick = async (product) => {
        console.log("Selected product data being sent by clicking:", product);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Unauthorized! Please log in.");
                navigate("/");
                return;
            }

            const userQuery = {
                user_query: `Product detail with name ${product.name}, rate ${product.rate}, GST rate ${product.gstRate}`
            };
            console.log("Sending product query to API:", JSON.stringify(userQuery));

            const response = await axios.post(
                `${backendUrl}`,
                userQuery,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            console.log("Product details sent:", response.data);
            
            // Add the product selection as a user message
            setMessages((prev) => [...prev, {
                sender: "user", 
                text: `Selected product: ${product.name}`
            }]);
            
            // Add the response as a bot message
            if (response.data) {
                let botMessage = { 
                    sender: "agent", 
                    text: response.data.message || "Processing product details..." 
                };
                
                // Handle any special data in the response if needed
                if (response.data.data) {
                    // Process product data as needed
                }
                
                setMessages((prev) => [...prev, botMessage]);
            }
        } catch (error) {
            console.error("Error sending product details:", error);
            // Show error in the chat
            setMessages((prev) => [...prev, {
                sender: "agent",
                text: "Sorry, there was an error processing your product selection. Please try again."
            }]);
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
        localStorage.removeItem("chatMessages");
        navigate("/");
    };

    // Speak received agent messages
    const speakMessage = (text) => {
        if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "en-GB";
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        } else {
            console.warn("Text-to-Speech is not supported in this browser.");
        }
    };

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.sender === "agent") {
            speakMessage(lastMessage.text);
        }
        
        
        
    }, [messages]);

    return (
        <div className="chat-container">
            <button onClick={handleLogout} className="logout-button">Logout</button>

            <div className="chatbox">
                <div className="chat-header">
                    <h2><img src="../vaypar.png" /> </h2>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`message ${msg.sender === "user" ? "user" : "agent"}`}
                            style={{ cursor: (msg.customerDetails || msg.productDetails || msg.flowCustomers || msg.stepCustomers) ? "pointer" : "default" }}
                        >
                            {msg.text ? (
                                msg.text.split("\n").map((line, i) => (
                                    <span key={i}>
                                        {line}
                                        <br />
                                    </span>
                                ))
                            ) : (
                                <span>Message unavailable</span>
                            )}

                            {msg.customerDetails && (
                                <div className="customer-details">
                                    {msg.customerDetails.map((customer, i) => (
                                        <div className="clickable-option" key={i} onClick={() => handleCustomerClick(customer)}>
                                            <p className="info"><strong><ArrowRight size={14} color="white" /></strong> {customer.name}</p>
                                            <p className="info"><strong><Mail size={14} color="white" /></strong>{customer.email}</p>
                                            <p className="info"><strong><Phone size={14} color="white" /></strong>{customer.phone}</p>
                                            <p className="info"><strong><DollarSignIcon size={14} color="white" /></strong>{customer.outstandingBill}</p>
                                            <p className="info"><strong><DollarSignIcon size={14} color="white" /></strong>{customer.TotalBill}</p>
                                            <p className="info"><strong><Phone size={14} color="white" /></strong>{customer._id}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {msg.flowCustomers && (
                                <div className="customer-details">
                                    {msg.flowCustomers.map((customer, i) => (
                                        <div className="clickable-option" key={i} onClick={() => handleCustomerClick(customer)}>
                                            <p className="info"><strong><ArrowRight size={14} color="white" /></strong> {customer.name}</p>
                                            <p className="info"><strong><DollarSignIcon size={14} color="white" /></strong> Total: {customer.totalBill}</p>
                                            <p className="info"><strong><DollarSignIcon size={14} color="white" /></strong> Outstanding: {customer.outstandingBill}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New stepCustomers handling */}
                            {msg.stepCustomers && (
                                <div className="customer-details">
                                    {msg.stepCustomers.map((customer, i) => (
                                        <div className="clickable-option" key={i} onClick={() => handleStepCustomerClick(customer)}>
                                            <p className="info"><strong><ArrowRight size={14} color="white" /></strong> {customer.name}</p>
                                            {customer.email && <p className="info"><strong><Mail size={14} color="white" /></strong> {customer.email}</p>}
                                            {customer.phone && <p className="info"><strong><Phone size={14} color="white" /></strong> {customer.phone}</p>}
                                            {customer.outstandingBill && <p className="info"><strong><DollarSignIcon size={14} color="white" /></strong> Outstanding: {customer.outstandingBill}</p>}
                                            {customer.totalBill && <p className="info"><strong><DollarSignIcon size={14} color="white" /></strong> Total: {customer.totalBill}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {msg.productDetails && (
                                <div className="product-details">
                                    {msg.productDetails.map((product, i) => (
                                        <div className="clickable-option" key={i} onClick={() => handleProductClick(product)}>
                                            <p className="info"><strong><ArrowRight size={14} color="white" /></strong> {product.name}</p>
                                            <p className="info"><strong>Rate:</strong> {product.rate}</p>
                                            <p className="info"><strong>GST Rate:</strong> {product.gstRate}%</p>
                                        </div>
                                    ))}
                                </div>
                            )}
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