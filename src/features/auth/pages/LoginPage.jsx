import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginAdmin } from "../services/authService";
import "../components/LoginPage.css";

const OFFICIAL_LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage(
        "Please enter your email address and password."
      );
      return;
    }

    try {
      setLoading(true);

      const result = await loginAdmin(
        email.trim(),
        password
      );

      console.log(
        "Admin login successful:",
        result.user.email
      );

      // Successful admin login
      // Go directly to the Dashboard
      navigate("/dashboard", {
        replace: true
      });

    } catch (error) {
      console.error("Login error:", error);

      switch (error.code) {
        case "auth/invalid-email":
          setErrorMessage(
            "Please enter a valid email address."
          );
          break;

        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setErrorMessage(
            "Incorrect email or password."
          );
          break;

        case "auth/user-disabled":
          setErrorMessage(
            "This account has been disabled."
          );
          break;

        case "auth/too-many-requests":
          setErrorMessage(
            "Too many login attempts. Please try again later."
          );
          break;

        case "auth/network-request-failed":
          setErrorMessage(
            "Network error while connecting to Firebase. Please check your internet connection and try again."
          );
          break;

        default:
          setErrorMessage(
            error.message ||
              "Unable to sign in. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-header">

          <div className="login-logo">
            <img
              src={OFFICIAL_LOGO_URL}
              alt="E-ReQuest Logo"
              className="login-logo-img"
            />
          </div>

          <h1>E-ReQuest</h1>

          <p>
            Administrator Portal
          </p>

        </div>

        <form
          className="login-form"
          onSubmit={handleLogin}
        >

          <div className="form-group">

            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              disabled={loading}
              autoComplete="email"
            />

          </div>

          <div className="form-group">

            <label htmlFor="password">
              Password
            </label>

            <div className="password-field">

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                disabled={loading}
                autoComplete="current-password"
              />

              <button
                type="button"
                className="show-password-button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                disabled={loading}
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

          </div>

          {errorMessage && (
            <div className="login-error">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

        </form>

        <div className="login-footer">
          <p>
            Authorized administrators only
          </p>
        </div>

      </div>

    </div>
  );
}

export default LoginPage;
