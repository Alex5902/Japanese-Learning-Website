// components/Header.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import SignUpModal from "./SignUpModal";
import LoginModal from "./LoginModal";

export default function Header({ onSignupSuccess }) {
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  const router = useRouter();

  const isLearningPage = router.pathname.includes("/flashcards/lesson") || router.pathname.includes("/flashcards/review");

  // 1) Read localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUsername = localStorage.getItem("username");
    if (storedUserId && storedUsername) {
      setIsLoggedIn(true);
      setLoggedInUsername(storedUsername);
    }
    setIsInitializing(false);
  }, []);

  // 2) If URL has ?signup_prompt=true => auto-open sign-up modal (but only if not logged in)
  useEffect(() => {
    if (!isInitializing) {
      if (!isLoggedIn && router.query.signup_prompt === "true") {
        setShowSignUp(true);
      }
    }
  }, [router.query, isInitializing, isLoggedIn]);

  // Handlers to open/close modals
  const openSignUpModal = () => setShowSignUp(true);
  const closeSignUpModal = () => setShowSignUp(false);

  const openLoginModal = () => setShowLogin(true);
  const closeLoginModal = () => setShowLogin(false);

  // Callback from sign-up success
  const handleSignupSuccess = (username) => {
    setIsLoggedIn(true);
    setLoggedInUsername(username);
    // If parent wants to do something with signup
    onSignupSuccess?.(username);
  };

  // Callback from login success
  const handleLoginSuccess = (username) => {
    setIsLoggedIn(true);
    setLoggedInUsername(username);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setLoggedInUsername("");
    router.push("/?logged_out=true");
  };

  // If still reading localStorage, return null or a minimal placeholder
  if (isInitializing) {
    return (
      <header className="w-full bg-gray-100 shadow-md z-10">
        <div className="max-w-6xl mx-auto p-4" style={{ height: "64px" }} />
      </header>
    );
  }

  return (
    <header className="w-full bg-gray-100 shadow-md z-10">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        {/* Logo */}
        <div className="text-2xl font-bold text-blue-600">
          <Link href="/">KantanJapanese</Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/" className="text-gray-700 hover:text-blue-500">
            Home
          </Link>
          <Link href="/about" className="text-gray-700 hover:text-blue-500">
            About
          </Link>
          <Link href="/" className="text-gray-700 hover:text-blue-500">
            Learn
          </Link>
          <Link href="/" className="text-gray-700 hover:text-blue-500">
            Review
          </Link>
          <Link href="/" className="text-gray-700 hover:text-blue-500">
            Practice
          </Link>
          <Link href="/" className="text-gray-700 hover:text-blue-500">
            Sentence Corrector
          </Link>
          <Link href="/" className="text-gray-700 hover:text-blue-500">
            Dashboard
          </Link>
          <Link href="/contact" className="text-gray-700 hover:text-blue-500">
            Pricing
          </Link>
        </nav>

        {/* Right side: either Sign Up/Login or "Hello, username" + Logout */}
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <div className="flex items-center space-x-4">
              {/* Avatar + greeting */}
              <div className="flex items-center space-x-2">
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.121 17.804A9.004 9.004 0 0112 15c1.832 0 3.532.55 4.879 1.487M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-gray-700 font-semibold">
                  Hello, {loggedInUsername}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          ) : (
            !isLearningPage && (
              <>
                <button
                  onClick={openSignUpModal}
                  className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Sign Up
                </button>
                <button
                  onClick={openLoginModal}
                  className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Login
                </button>
              </>
            )
          )}
        </div>
      </div>

      {/* Sign Up Modal */}
      <SignUpModal
        open={showSignUp}
        onClose={closeSignUpModal}
        onSignupSuccess={handleSignupSuccess}
        // If ?signup_prompt=true is present, show a short message
        promptMessage={
          router.query.signup_prompt === "true"
            ? "Sign up to save your progress and continue learning!"
            : ""
        }
      />

      {/* Login Modal */}
      <LoginModal
        open={showLogin}
        onClose={closeLoginModal}
        onLoginSuccess={handleLoginSuccess}
      />
    </header>
  );
}
