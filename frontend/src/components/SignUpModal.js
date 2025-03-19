import { useState } from "react";
import { useRouter } from "next/router";
import Portal from "./Portal";

const SignUpModal = ({ open, onClose, onSignupSuccess, promptMessage }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  if (!open) return null;

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        // [DEBUG] to confirm we got a user_id from the server
        console.log("[DEBUG] handleSignUp => user_id from server:", data.user_id);

        // 1) Save user_id and username
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("username", username);

        // 2) Attempt to sync any guest progress
        await syncGuestProgressToDB(data.user_id);

        // 3) Let parent know we successfully signed up
        if (onSignupSuccess) {
          onSignupSuccess(username);
        }

        // 4) Close modal
        onClose();

        // 5) Navigate to "/"
        localStorage.setItem("just_signed_up", "true");
        router.push("/"); // Clean redirect back to home

      } else {
        setErrorMessage(data.message || "Signup failed.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  /**
   * Sync guest progress
   */
  const syncGuestProgressToDB = async (newUserId) => {
    try {
      const guestProgressStr = sessionStorage.getItem("guest_progress");
      if (!guestProgressStr) return;

      const guestProgress = JSON.parse(guestProgressStr);
      const progressArray = Object.entries(guestProgress).map(([flashcard_id, obj]) => ({
        flashcard_id, // if your DB uses integers, do Number(flashcard_id)
        level: obj.level || 0,
        correct_count: obj.correct_count || 0,
        incorrect_count: obj.incorrect_count || 0,
        next_review: obj.next_review || null,
        reached_level_3: obj.level >= 3 ? obj.reached_level_3 || new Date().toISOString() : null
      }));

      if (!progressArray.length) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/flashcards/bulkSyncGuestProgress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: newUserId,
          progress: progressArray
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Failed to bulk sync guest progress:", errorData);
      } else {
        console.log("Guest progress synced successfully!");
        // optional: sessionStorage.removeItem("guest_progress");
      }
    } catch (err) {
      console.error("Error syncing guest progress:", err);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center z-[9999]">
        {/* backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
        <div className="relative bg-white w-full max-w-sm mx-auto p-8 rounded shadow-lg z-50">
          <button
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
            onClick={onClose}
          >
            ✕
          </button>

          <h2 className="text-2xl font-bold mb-4">Sign Up</h2>

          {promptMessage && (
            <p className="text-gray-700 text-sm mb-4 font-semibold">
              {promptMessage}
            </p>
          )}

          <form onSubmit={handleSignUp}>
            <div className="mb-4">
              <label className="block font-medium mb-1" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="w-full p-2 border rounded focus:outline-none focus:ring"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full p-2 border rounded focus:outline-none focus:ring"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full p-2 border rounded focus:outline-none focus:ring"
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
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Create Account
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default SignUpModal;
