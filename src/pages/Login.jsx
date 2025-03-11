import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./../styles/Login.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        try {
            const response = await axios.post(
                `${backendUrl}/login`,
                { email, password }
            );

            if (response.status === 200) {
                const token = response.data.data.token;
                console.log(token);
                 // Get token from response

                // Store token in localStorage
                localStorage.setItem("token", token);

                // Redirect to chat page after successful login
                navigate("/chat");
            }
        } catch (err) {
            setError("Invalid email or password.");
        }
    };

    return (
        <div className="login-container">
            <h2>Login</h2>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleLogin}>
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
                <button type="submit">Login</button>
            </form>
            <p>
                Don't have an account? <a href="/register">Register</a>
            </p>
        </div>
    );
};

export default Login;
