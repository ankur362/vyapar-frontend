import axios from "axios"; // ✅ Import Axios
import { ArrowRight, DollarSignIcon, Download, Mail, Mic, MicOff, Phone, Plus, Send } from "lucide-react";
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
    const [selectedProducts, setSelectedProducts] = useState([]);
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
            processResponse(response.data);
        } catch (error) {
            console.error("Error sending message:", error);
            // Show the error in the chat interface instead of just the console
            setMessages((prev) => [...prev, {
                sender: "agent",
                text: "Sorry, there was an error processing your request. Please try again."
            }]);
        }
    };

    // Process API response based on step parameter
    const processResponse = (data) => {
        console.log("safds", data);
        
        let botMessage = { sender: "agent", text: data.message.message || data.message };
    
        // Handle step completed with invoice in sale_result
        if ( data.sale_result) {
            if (data.sale_result.data && data.sale_result.data.invoiceUrl) {
                botMessage.invoiceUrl = data.sale_result.data.invoiceUrl;
                
                // If there are sale details, include them
                if (data.sale_result.data.newSale) {
                    botMessage.saleDetails = data.sale_result.data.newSale;
                }
            }
        }
        // Handle original invoice URL paths
        else if (data.data && data.data.invoiceUrl) {
            botMessage.invoiceUrl = data.data.invoiceUrl;
        } else if (data.invoiceUrl) {
            botMessage.invoiceUrl = data.invoiceUrl;
        }
    
        // Handle customer selection step
        if ( data.customers) {
            botMessage.customers = data.customers.map(customer => ({
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                outstandingBill: customer.outstandingBill,
                TotalBill: customer.TotalBill
            }));
            botMessage.step = "waiting_for_customer";
        } 
        // Handle product selection step
        else if (data.step === "waiting_for_products" && data.products) {
            botMessage.products = data.products.map(product => ({
                _id: product._id,
                name: product.name,
                rate: product.rate,
                gstRate: product.gstRate
            }));
            botMessage.step = "waiting_for_products";
            // Reset selected products when new product selection starts
            setSelectedProducts([]);
        }
        // Handle sale created success with invoice in original format
        else if (data.statusCode === 201 && data.data && data.data.invoiceUrl) {
            botMessage.invoiceUrl = data.data.invoiceUrl;
            botMessage.saleDetails = data.data.newSale;
        }
        // Handle other data structures from original code
        else if (data.data) {
            if (data.data.show) {
                botMessage.customerDetails = data.data.customers.map(({ email, name, phone, outstandingBill, _id, TotalBill }) => ({
                    email,
                    name,
                    phone,
                    outstandingBill,
                    TotalBill,
                    _id
                }));
            } else if (data.data.flow === true && data.data.customers) {
                botMessage.flowCustomers = data.data.customers.map(({ customer }) => ({
                    name: customer.name,
                    totalBill: customer.totalBill,
                    outstandingBill: customer.outstandingBill
                }));
            } else if (data.data.show === false && data.data.product) {
                botMessage.productDetails = data.data.product.map(({ _id,name, rate, gstRate }) => ({
                    name,
                    rate,
                    gstRate,
                    _id
                }));
            }
        }
    
        setMessages((prev) => [...prev, botMessage]);
    };

    const handleCustomerClick = async (customer) => {
        console.log("Selected customer:", customer);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Unauthorized! Please log in.");
                navigate("/");
                return;
            }

            // Only send the customer ID as requested
            const userQuery = {
                user_query: `${customer._id}`
            };

            console.log("Sending customer ID to API:", JSON.stringify(userQuery));
            
            // Show selection in chat
            setMessages((prev) => [...prev, {
                sender: "user",
                text: `Selected customer: ${customer.name}`
            }]);

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

            console.log("Response after customer selection:", response.data);
            processResponse(response.data);
        } catch (error) {
            console.error("Error sending customer ID:", error);
            setMessages((prev) => [...prev, {
                sender: "agent",
                text: "Sorry, there was an error processing your customer selection. Please try again."
            }]);
        }
    };

    const handleProductClick = async (product) => {
        // Add product to selected products list with default quantity of 1
        const newProduct = {
            productId: product._id,
            name: product.name,
            quantity: 1,
            rate: product.rate,
            gstApplied: product.gstRate
        };
        
        setSelectedProducts(prev => [...prev, newProduct]);
        
        console.log("Added product to selection:", newProduct);
        
        // Show selection in chat
        setMessages((prev) => [...prev, {
            sender: "user",
            text: `Added product: ${product.name}`
        }]);
    };

    const updateProductQuantity = (index, value) => {
        const updatedProducts = [...selectedProducts];
        updatedProducts[index].quantity = parseInt(value) || 1;
        setSelectedProducts(updatedProducts);
    };

    const updateProductRate = (index, value) => {
        const updatedProducts = [...selectedProducts];
        updatedProducts[index].rate = parseFloat(value) || 0;
        setSelectedProducts(updatedProducts);
    };

    const updateProductGst = (index, value) => {
        const updatedProducts = [...selectedProducts];
        updatedProducts[index].gstApplied = parseFloat(value) || 0;
        setSelectedProducts(updatedProducts);
    };

    const removeProduct = (index) => {
        const updatedProducts = [...selectedProducts];
        updatedProducts.splice(index, 1);
        setSelectedProducts(updatedProducts);
    };

    const submitProducts = async () => {
        if (selectedProducts.length === 0) {
            alert("Please select at least one product");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Unauthorized! Please log in.");
                navigate("/");
                return;
            }

            // Format products for submission - remove name as it's not in the expected format
            const formattedProducts = selectedProducts.map(({ productId, quantity, rate, gstApplied }) => ({
                productId,
                quantity,
                rate,
                gstApplied
            }));

            const userQuery = {
                user_query: JSON.stringify(formattedProducts)
            };

            console.log("Submitting products:", JSON.stringify(userQuery));
            
            // Show selection in chat
            setMessages((prev) => [...prev, {
                sender: "user",
                text: `Submitting ${selectedProducts.length} products`
            }]);

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

            console.log("Response after product submission:", response.data);
            processResponse(response.data);
            
            // Clear selected products after submission
            setSelectedProducts([]);
        } catch (error) {
            console.error("Error submitting products:", error);
            setMessages((prev) => [...prev, {
                sender: "agent",
                text: "Sorry, there was an error submitting your product selection. Please try again."
            }]);
        }
    };

    const handleInvoiceDownload = (invoiceUrl) => {
        // Create a hidden anchor element to trigger the download
        const link = document.createElement('a');
        link.href = invoiceUrl;
        link.target = '_blank';
        link.download = 'invoice.pdf'; // Suggest a filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const handleProductSelection = async (product) => {
        console.log("Selected ", product);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("Unauthorized! Please log in.");
                navigate("/");
                return;
            }
    
            const userQuery = {
                user_query: `${product._id}`
            };
    
            console.log("Sending product ID to API:", JSON.stringify(userQuery));
    
            // Show selection in chat
            setMessages((prev) => [...prev, {
                sender: "user",
                text: `Selected product: ${product.name}`
            }]);
    
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
    
            console.log("Response after product selection:", response.data);
            processResponse(response.data);
        } catch (error) {
            console.error("Error sending product ID:", error);
            setMessages((prev) => [...prev, {
                sender: "agent",
                text: "Sorry, there was an error processing your product selection. Please try again."
            }]);
        }
    };

    const handleInvoiceView = (invoiceUrl) => {
        window.open(invoiceUrl, '_blank');
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
                    <h2>BizEase</h2>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`message ${msg.sender === "user" ? "user" : "agent"}`}
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

                            {/* Invoice URL Handler */}
                            {msg.invoiceUrl && (
                                <div className="invoice-container">
                                    <h4>Invoice Generated</h4>
                                    <div className="invoice-actions">
                                        <button 
                                            onClick={() => handleInvoiceView(msg.invoiceUrl)} 
                                            className="invoice-btn view-btn"
                                        >
                                            View Invoice
                                        </button>
                                        <button 
                                            onClick={() => handleInvoiceDownload(msg.invoiceUrl)} 
                                            className="invoice-btn download-btn"
                                        >
                                            <Download size={16} /> Download PDF
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Sale Details when available */}
                            {msg.saleDetails && (
                                <div className="sale-details">
                                    <h4>Sale Completed</h4>
                                    <p><strong>Total Amount:</strong> ₹{msg.saleDetails.totalCost}</p>
                                    <p><strong>Amount Paid:</strong> ₹{msg.saleDetails.paymentDetails.amountPaid}</p>
                                    <p><strong>Remaining:</strong> ₹{msg.saleDetails.paymentDetails.remainingAmount}</p>
                                    <p><strong>Payment Method:</strong> {msg.saleDetails.paymentMethod}</p>
                                </div>
                            )}

                            {/* Handle waiting_for_customer step */}
                            {msg.step === "waiting_for_customer" && msg.customers && (
                                <div className="customer-options">
                                    <h4>Select a customer:</h4>
                                    {msg.customers.map((customer, i) => (
                                        <div className="clickable-option" key={i} onClick={() => handleCustomerClick(customer)}>
                                            <p className="info"><strong><ArrowRight size={14} color="white" /></strong> {customer.name}</p>
                                            <p className="info"><strong><Mail size={14} color="white" /></strong> {customer.email}</p>
                                            <p className="info"><strong><Phone size={14} color="white" /></strong> {customer.phone}</p>
                                            <p className="info"><strong><DollarSignIcon size={14} color="white" /></strong> Outstanding: {customer.outstandingBill}</p>
                                           
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Handle waiting_for_products step */}
                            {msg.step === "waiting_for_products" && msg.products && (
                                <div className="product-options">
                                    <h4>Select products:</h4>
                                    <div className="product-list">
                                        {msg.products.map((product, i) => (
                                            <div className="clickable-option" key={i} onClick={() => handleProductClick(product)}>
                                                <p className="info"><strong><Plus size={14} color="white" /></strong> {product.name}</p>
                                                <p className="info"><strong>Rate:</strong> {product.rate}</p>
                                                <p className="info"><strong>GST Rate:</strong> {product.gstRate}%</p>
                                                
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {selectedProducts.length > 0 && (
                                        <div className="selected-products">
                                            <h4>Selected Products:</h4>
                                            {selectedProducts.map((product, index) => (
                                                <div key={index} className="selected-product">
                                                    <div className="product-header">
                                                        <span>{product.name}</span>
                                                        <button onClick={() => removeProduct(index)} className="remove-button">×</button>
                                                    </div>
                                                    <div className="product-fields">
                                                        <label>
                                                            Quantity:
                                                            <input 
                                                                type="number" 
                                                                value={product.quantity} 
                                                                onChange={(e) => updateProductQuantity(index, e.target.value)}
                                                                
                                                            />
                                                        </label>
                                                        <label>
                                                            Rate:
                                                            <input 
                                                                type="number" 
                                                                value={product.rate} 
                                                                onChange={(e) => updateProductRate(index, e.target.value)}
                                                                
                                                            />
                                                        </label>
                                                        <label>
                                                            GST %:
                                                            <input 
                                                                type="number" 
                                                                value={product.gstApplied} 
                                                                onChange={(e) => updateProductGst(index, e.target.value)}
                                                                
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={submitProducts} className="submit-products">
                                                Submit Products
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Original customer details display */}
                            {msg.customerDetails && (
                                <div className="customer-details">
                                    {msg.customerDetails.map((customer, i) => (
                                        <div className="clickable-option" key={i} onClick={() => handleCustomerClick(customer)}>
                                            <p className="info"><strong><ArrowRight size={14} color="white" /></strong> {customer.name}</p>
                                            <p className="info"><strong><Mail size={14} color="white" /></strong> {customer.email}</p>
                                            <p className="info"><strong><Phone size={14} color="white" /></strong> {customer.phone}</p>
                                            <p className="info"><strong><DollarSignIcon size={14} color="white" /></strong> {customer.outstandingBill}</p>
                                            <p className="info"><strong><DollarSignIcon size={14} color="white" /></strong> {customer.TotalBill}</p>
                                            
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Flow customers display */}
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

                            {/* Original product details display */}
                            {msg.productDetails && (
                                <div className="product-details">
                                    console.log(product);
                                    
                                    {msg.productDetails.map((product, i) => (
                                        <div className="clickable-option" key={i} onClick={() => handleProductSelection(product)}>
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