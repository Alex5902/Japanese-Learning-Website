// components/LoginModal.js
import { useState } from "react";
import Portal from "./Portal";

export default function LoginModal({ open, onClose, onLoginSuccess }) {
  // We'll call it "identifier" (could be either email or username)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  if (!open) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      // Send { identifier, password } to the backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("user_id", data.user_id);
        if (data.username) {
          localStorage.setItem("username", data.username);
        }
        // if parent wants to know about success
        if (onLoginSuccess && data.username) {
          onLoginSuccess(data.username);
        }
        onClose();
      } else {
        setErrorMessage(data.message || "Login failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center z-[9999]">
        <div
          className="absolute inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
        <div className="relative bg-white p-8 rounded shadow-lg w-full max-w-sm z-50">
          <button
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
            onClick={onClose}
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold mb-4">Login</h2>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label
                htmlFor="identifier"
                className="block text-gray-700 font-semibold mb-1"
              >
                Email or Username
              </label>
              <input
                id="identifier"
                type="text"
                className="border w-full p-2 rounded focus:outline-none focus:ring"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-gray-700 font-semibold mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                className="border w-full p-2 rounded focus:outline-none focus:ring"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <p className="text-red-500 mb-3">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
}
