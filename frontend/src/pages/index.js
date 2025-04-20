// pages/index.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Header from "../components/Header";

export default function Home() {
  // ---------------------------------
  // Existing states (unchanged)
  // ---------------------------------
  const [userId, setUserId] = useState(null);
  const [nextLesson, setNextLesson] = useState(null);
  const [lessonStatus, setLessonStatus] = useState("loading");
  const [tooltipVisibleButton, setTooltipVisibleButton] = useState(false);
  const [tooltipVisibleCard, setTooltipVisibleCard] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // ---------------------------------
  // New counters (assumes you fetch them somewhere)
  // ---------------------------------
  const [newLessonCardCount, setNewLessonCardCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [practiceCount, setPracticeCount] = useState(0);

  const router = useRouter(); // unchanged

  // ---------------------------------
  // All your existing useEffects
  // ---------------------------------
  useEffect(() => {
    if (router.query.no_flashcards) {
      if (router.query.no_flashcards === "user") {
        setInfoMessage("You have no flashcards available for review right now.");
      } else if (router.query.no_flashcards === "guest") {
        setInfoMessage("Please create an account to review your flashcards!");
      }
      const { no_flashcards, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
  }, [router.query]);

  useEffect(() => {
    if (router.query.logged_out === "true") {
      setInfoMessage("You’ve been logged out successfully.");
      const { logged_out, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
  }, [router.query]);

  useEffect(() => {
    const storedId = localStorage.getItem("user_id");
    if (storedId) {
      setUserId(storedId);
      setInfoMessage("");
    } else {
      setLessonStatus("available");
    }
    setHydrated(true);
  }, []);

  // useEffect(() => {
  //   const storedId = localStorage.getItem("user_id");
  //   if (storedId && infoMessage) {
  //     setInfoMessage("");
  //   }
  // }, [infoMessage]);

  useEffect(() => {
    if (router.query.signup_prompt === "true") {
      localStorage.setItem("open_signup_modal", "true");
    }
  }, [router.query]);

  // ---------------------------------
  // Existing: fetchNextLesson
  // ---------------------------------
  useEffect(() => {
    if (!userId) return;

    async function fetchNextLesson() {
      setLessonStatus("loading");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/flashcards/fetchNextLesson`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        const data = await res.json();

        if (res.ok) {
          if (data.nextLesson !== null && data.nextLesson !== undefined) {
            setNextLesson({ lesson: data.nextLesson });
            setLessonStatus(data.locked ? "locked" : "available");
          } else {
            // No more lessons
            setNextLesson(null);
            setLessonStatus("none");
          }
        } else {
          console.error("Error fetching next lesson:", data.error || data.message);
          setNextLesson(null);
          setLessonStatus("locked");
        }
      } catch (error) {
        console.error("Error in fetchNextLesson:", error);
        setNextLesson(null);
        setLessonStatus("none");
      }
    }

    fetchNextLesson();
  }, [userId]);

  // ---------------------------------
  // If you have code to fetch the counts, you'd put it here,
  // then set newLessonCardCount, reviewCount, practiceCount.
  // ---------------------------------

 // ---------------------------------
 // New: fetch all three counts
 // ---------------------------------
 useEffect(() => {
  if (!hydrated) return;        // ← don’t run until hydration is done
  // (Optionally) if you only want to fetch for logged‑in users:
  // if (!userId) return;

  async function fetchAllCounts() {
    console.log("⏳ fetchAllCounts, userId=", userId);
    try {
      // 1) lesson & review
      const countsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/flashcards/fetchFlashcardCounts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId || "" }),
        }
      );
      const countsJson = await countsRes.json();
      console.log("🔢 fetchFlashcardCounts →", countsJson);
      if (countsRes.ok) {
        setNewLessonCardCount(countsJson.newLessonCardCount);
        setReviewCount(countsJson.reviewCount);
      }

      // 2) practice
      const pracRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/practice/get`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId || "", limit: 1000 }),
        }
      );
      const pracJson = await pracRes.json();
      console.log("✏️ practice/get → length", pracJson.practice?.length);
      if (pracRes.ok) {
        // only count ONE question per flashcard:
        const flashcardIds = pracJson.practice.map((q) => q.flashcard_id);
        const uniqueCount = new Set(flashcardIds).size;
        setPracticeCount(uniqueCount);
      }
    } catch (err) {
      console.error("Error fetching counts:", err);
    }
  }

  fetchAllCounts();
}, [hydrated, userId]);

  // Existing handleLessonClick
  const handleLessonClick = () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      const completedLessonsStr = sessionStorage.getItem("guest_completed_lessons");
      const completedLessons = completedLessonsStr ? JSON.parse(completedLessonsStr) : [];
      if (completedLessons.includes(1)) {
        setInfoMessage("Please create an account to continue learning.");
        return;
      }
    }
    if (lessonStatus === "available") {
      const lessonParam = nextLesson ? nextLesson.lesson : 1;
      const needsRefetch = localStorage.getItem("just_signed_up") === "true";
      const url = `/flashcards/lesson?lesson=${lessonParam}${needsRefetch ? "&refetch=true" : ""}`;
      if (needsRefetch) localStorage.removeItem("just_signed_up");
      window.location.href = url;
    }
  };

  // ---------------------------------
  // The main hero CTA (Lesson) button with bubble
  // ---------------------------------
  const renderLessonButton = () => {
    if (lessonStatus === "loading") {
      return (
        <button className="px-8 py-4 text-lg font-semibold rounded-full shadow-md bg-gray-400 text-gray-200 cursor-wait">
          Loading...
        </button>
      );
    }

    if (lessonStatus === "available" && (nextLesson || !userId)) {
      const lessonNumber = nextLesson ? nextLesson.lesson : 1;
      return (
        <button
          className="px-8 py-4 text-lg font-semibold rounded-full shadow-md bg-white text-blue-600 hover:bg-gray-100 cursor-pointer relative"
          onClick={handleLessonClick}
        >
          {/* Main text */}
          <span>Start Lesson {lessonNumber} 📖</span>

          {/* Bubble for newLessonCardCount */}
          <span
            className={`
              ml-2 inline-flex items-center justify-center
              w-6 h-6 rounded-full text-xs font-bold
              bg-red-600 text-white
              ${newLessonCardCount > 0 ? "opacity-100" : "opacity-0"}
              transition-opacity duration-200
            `}
          >
            {newLessonCardCount}
          </span>
        </button>
      );
    }

    // If locked or none
    return (
      <div className="relative">
        {lessonStatus === "locked" && (
          <div
            className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-md transition-opacity duration-300 ${
              tooltipVisibleButton ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
            style={{ whiteSpace: "nowrap" }}
          >
            🔒 You must master 90% of the previous lesson first!
          </div>
        )}
        <button
          className="px-8 py-4 text-lg font-semibold rounded-full shadow-md bg-white text-blue-600 hover:bg-gray-300 cursor-default"
          onMouseEnter={() => {
            if (lessonStatus === "locked") setTooltipVisibleButton(true);
          }}
          onMouseLeave={() => setTooltipVisibleButton(false)}
        >
          Start Learning 📖
        </button>
      </div>
    );
  };

  // ---------------------------------
  // Feature Card: Lessons (unchanged)
  // ---------------------------------
  const renderLessonCard = () => {
    const isClickable = lessonStatus === "available";
    return (
      <div className="relative flex flex-col h-full">
        {lessonStatus === "locked" && (
          <div
            className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-md transition-opacity duration-300 ${
              tooltipVisibleCard ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
            style={{ whiteSpace: "nowrap" }}
          >
            🔒 You must master 90% of the previous lesson first!
          </div>
        )}
        <button
          onClick={() => {
            if (isClickable) {
              const lessonParam = nextLesson ? nextLesson.lesson : 1;
              window.location.href = `/flashcards/lesson?lesson=${lessonParam}`;
            }
          }}
          onMouseEnter={() => {
            if (lessonStatus === "locked") setTooltipVisibleCard(true);
          }}
          onMouseLeave={() => setTooltipVisibleCard(false)}
          className={`bg-white p-6 rounded-xl shadow w-full text-left transition transform flex flex-col h-full
            ${lessonStatus === "loading" ? "cursor-wait" : ""}
            ${isClickable ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer" : ""}
            ${!isClickable && lessonStatus !== "loading" ? "hover:bg-gray-300 cursor-default" : ""}
          `}
        >
          <div className="text-4xl mb-4 text-blue-500">📖</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Lessons</h3>
          <p className="text-gray-600">
            Dive into structured lessons covering vocab, grammar, and kanji. Perfect for all levels.
          </p>
        </button>
      </div>
    );
  };

  // ---------------------------------
  // Hydration check (unchanged)
  // ---------------------------------
  if (!hydrated) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 transition-opacity duration-500 opacity-0">
        <div className="flex flex-col items-center justify-center flex-grow text-gray-500">
          <svg
            className="animate-spin h-8 w-8 text-blue-500 mb-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------
  // Final return
  // ---------------------------------
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header
        onSignupSuccess={(username) => {
          setWelcomeMessage(`Welcome, ${username}! Let’s learn Japanese together!`);
          setInfoMessage("");
        }}
      />

      {welcomeMessage && (
        <div className="bg-green-200 text-green-800 font-bold p-3 text-center">
          {welcomeMessage}
        </div>
      )}
      {infoMessage && (
        <div className="bg-yellow-100 text-yellow-800 p-3 text-center">
          {infoMessage}
        </div>
      )}

      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-400 text-white">
        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-16 md:py-24">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-lg text-center">
            Welcome to Your Japanese Learning App!
          </h1>
          <p className="max-w-2xl text-center text-lg md:text-xl mb-8">
            Level up your Japanese skills with interactive lessons, flashcards, and more.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            {/* LESSON BUTTON with bubble */}
            {renderLessonButton()}

            {/* REVIEW BUTTON with bubble */}
            <button
              onClick={async () => {
                const userId = localStorage.getItem("user_id");
                if (!userId) {
                  setInfoMessage("Please create an account to review your flashcards!");
                  return;
                }

                try {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/flashcards/review`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: userId, mode: "normal" }),
                  });
                  const data = await res.json();
                  if (!res.ok || !data.flashcards) {
                    throw new Error("Failed to fetch flashcards.");
                  }
                  if (data.flashcards.length > 0) {
                    window.location.href = "/flashcards/review?mode=normal";
                  } else {
                    setInfoMessage("You have no flashcards available for review right now.");
                  }
                } catch (err) {
                  console.error("[Review Button Error]", err);
                  setInfoMessage("An error occurred while checking your flashcards.");
                }
              }}
              className="relative px-8 py-4 text-lg bg-green-500 text-white font-semibold rounded-full shadow-md hover:shadow-lg hover:bg-green-600 transition"
            >
              <span>Review 🎴</span>
              <span
                className={`
                  ml-2 inline-flex items-center justify-center
                  w-6 h-6 rounded-full text-xs font-bold
                  bg-red-600 text-white
                  ${reviewCount > 0 ? "opacity-100" : "opacity-0"}
                  transition-opacity duration-200
                `}
              >
                {reviewCount}
              </span>
            </button>

            {/* PRACTICE LINK with bubble */}
            <Link
              href="/practice"
              className="relative px-8 py-4 text-lg bg-purple-500 text-white font-semibold rounded-full shadow-md hover:shadow-lg hover:bg-purple-600 transition"
            >
              <span>Practice 📝</span>
              <span
                className={`
                  ml-2 inline-flex items-center justify-center
                  w-6 h-6 rounded-full text-xs font-bold
                  bg-red-600 text-white
                  ${practiceCount > 0 ? "opacity-100" : "opacity-0"}
                  transition-opacity duration-200
                `}
              >
                {practiceCount}
              </span>
            </Link>
          </div>
        </div>

        {/* Decorative SVG wave */}
        <div className="absolute bottom-0 w-full overflow-hidden leading-[0]">
          <svg
            className="block w-full h-20 md:h-32"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="white"
              d="M0,224L30,208C60,192,120,160,180,160C240,160,300,192,360,192C420,192,480,160,540,165.3C600,171,660,213,720,224C780,235,840,213,900,197.3C960,181,1020,171,1080,160C1140,149,1200,139,1260,144C1320,149,1380,171,1410,181.3L1440,192L1440,320L1410,320C1380,320,1320,320,1260,320C1200,320,1140,320,1080,320C1020,320,960,320,900,320C840,320,780,320,720,320C660,320,600,320,540,320C480,320,420,320,360,320C300,320,240,320,180,320C120,320,60,320,30,320L0,320Z"
            />
          </svg>
        </div>
      </header>

      {/* Features Section */}
      <main className="flex-grow">
        <section className="bg-white -mt-12 md:-mt-20 pt-12 md:pt-20 pb-12 px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 text-center mb-10">
            Explore Our Features
          </h2>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Feature Card: Lessons */}
            {renderLessonCard()}

            {/* Feature Card: Review */}
            <Link
              href="/flashcards/review?mode=normal"
              className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1 flex flex-col h-full"
            >
              <div className="text-4xl mb-4 text-green-500">🎴</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Review</h3>
              <p className="text-gray-600">
                Practice what you’ve learned with spaced-repetition flashcards for long-term retention.
              </p>
            </Link>

            {/* Feature Card: Practice */}
            <Link
              href="/practice"
              className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1 flex flex-col h-full"
            >
              <div className="text-4xl mb-4 text-purple-500">📝</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Practice</h3>
              <p className="text-gray-600">
                Sharpen your skills with targeted drills and exercises for reading, writing, and listening.
              </p>
            </Link>

            {/* Feature Card: AI Corrector */}
            <Link
              href="/ai-corrector"
              className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1 flex flex-col h-full"
            >
              <div className="text-4xl mb-4 text-pink-500">🤖</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">AI Corrector</h3>
              <p className="text-gray-600">
                Get instant feedback on your Japanese sentences with our AI-based grammar corrector.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
