import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./../styles/Register.css";


const Register = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();
    const backendUrl =import.meta.env.VITE_BACKEND_URL

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        
        try {
            const response = await axios.post(`${backendUrl}/register`, { email, password });

            if (response.status === 201) {
                setSuccess("Registration successful! Redirecting to login...");
                setTimeout(() => navigate("/"), 2000);
            }
        } catch (err) {
            setError("Registration failed. Email may already exist.");
        }
    };

    return (
        <div className="register-container">
            <h2>Register</h2>
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}
            <form onSubmit={handleRegister}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Register</button>
            </form>
            <p>
                Already have an account? <a href="/">Login</a>
            </p>
        </div>
    );
};

export default Register;
