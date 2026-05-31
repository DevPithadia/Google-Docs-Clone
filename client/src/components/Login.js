import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css"; // Assuming we want a separate CSS for login styling

const Login = () => {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/google`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    idToken: credentialResponse.credential,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            // data should contain { token, user }
            login(data.user, data.token);

            // Redirect to home/dashboard
            navigate("/");
        } catch (err) {
            console.error("Login error:", err);
            setError(err.message || "An error occurred during login. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleError = () => {
        setError("Google Sign-In was unsuccessful. Please try again.");
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="app-title">Google Docs Clone</h1>
                <p className="app-subtitle">Sign in to manage your documents</p>

                {error && <div className="error-message">{error}</div>}

                <div className="google-btn-wrapper">
                    {loading ? (
                        <div className="loading-spinner">Authenticating...</div>
                    ) : (
                        <GoogleLogin
                            onSuccess={handleSuccess}
                            onError={handleError}
                            useOneTap
                            theme="filled_blue"
                            shape="pill"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
