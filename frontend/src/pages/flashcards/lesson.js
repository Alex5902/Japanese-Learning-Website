import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import Header from "../../components/Header";
import Flashcard from "../../components/Flashcard";

export default function FlashcardLesson() {
  const [hideHeader, setHideHeader] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  const [clickCount, setClickCount] = useState(0);
  const headerRef = useRef(null);
  const router = useRouter();

  const { lesson } = router.query;
  const lessonNum = parseInt(lesson) || 1; // fallback to 1 if not provided

  const [readyToFetch, setReadyToFetch] = useState(false);
  const [lastKeyPressed, setLastKeyPressed] = useState(null); // "left" or "right"

  /**
   * storeGuestProgress:
   * If known => level=3, set reached_level_3 if not set
   * If not known => level=0
   */
  const storeGuestProgress = (flashcardId, known) => {
    try {
      let guestProgressStr = sessionStorage.getItem("guest_progress");
      let guestProgress = guestProgressStr ? JSON.parse(guestProgressStr) : {};

      let existingEntry = guestProgress[flashcardId] || {
        level: 0,
        correct_count: 0,
        incorrect_count: 0,
        next_review: null,
        reached_level_3: null,
      };

      if (known) {
        existingEntry.level = 3;
        existingEntry.next_review = null;
        if (!existingEntry.reached_level_3) {
          existingEntry.reached_level_3 = new Date().toISOString();
        }
      } else {
        existingEntry.level = 0;
        existingEntry.next_review = null;
      }

      guestProgress[flashcardId] = existingEntry;
      sessionStorage.setItem("guest_progress", JSON.stringify(guestProgress));
    } catch (err) {
      console.warn("Could not store guest progress:", err);
    }
  };

  // On mount, see if there's a logged-in user
  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    console.log("[DEBUG] lesson.js => found stored userId:", storedUserId);

    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      setUserId(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return; // Wait for router.query to populate properly

    if (router.query.refetch) {
      const { refetch, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true })
        .then(() => setReadyToFetch(true));
    } else {
      setReadyToFetch(true);
    }
  }, [router.query, router.isReady]);

  // Once userId is known (or null), fetch the flashcards
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!readyToFetch) return;
    if (lessonNum < 1) {
      setError("Invalid lesson number.");
      setLoading(false);
      return;
    }

    if (userId === undefined) return; // wait until we've checked localStorage

    const fetchFlashcards = async () => {
      setLoading(true);
      setError(null);

      try {
        // If user is not logged in => userId is null => pass empty string
        const body = { user_id: userId || "", lesson: lessonNum };
        console.log("[DEBUG] Fetching lesson flashcards with body:", body);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/flashcards/lesson`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch flashcards.");
        }

        const data = await response.json();
        if (data.flashcards && data.flashcards.length > 0) {
          setFlashcards(data.flashcards);
          setCurrentIndex(0);
        } else {
          setError("No flashcards available for this lesson.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcards();
  }, [readyToFetch, lessonNum, userId]);

  // When user clicks "already know" or "need to learn," update accordingly
  const handleFlashcardAction = async (known) => {
    if (!flashcards[currentIndex]) return;

    const flashcard_id = flashcards[currentIndex].flashcard_id;
    setClickCount((prev) => prev + 1);
    setCurrentIndex((prev) => prev + 1);

    if (!userId) {
      // Guest => store in session
      storeGuestProgress(flashcard_id, known);
      return;
    }

    // Logged in => call backend
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/flashcards/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          flashcard_id,
          known,
          next_review: null,
        }),
      });
    } catch (error) {
      console.error("Error updating flashcard status:", error);
    }
  };

  // After 15 clicks or no more cards, go to immediate review
  useEffect(() => {
    // Block redirect if still loading or before flashcards are actually loaded
    if (loading || error || flashcards.length === 0 || clickCount === 0) return;

    const outOfCards = currentIndex >= flashcards.length;
    const reachedLimit = clickCount >= 15;

    if ((outOfCards || reachedLimit) && !loading && !error) {
      // If user is guest => show immediate review, else DB-based review
      if (!userId) {
        // 🚨 Store guest lesson completion
        const completedLessonsStr = sessionStorage.getItem("guest_completed_lessons");
        const completedLessons = completedLessonsStr ? JSON.parse(completedLessonsStr) : [];
        if (!completedLessons.includes(lessonNum)) {
          completedLessons.push(lessonNum);
          sessionStorage.setItem("guest_completed_lessons", JSON.stringify(completedLessons));
        }
        router.push("/flashcards/review?mode=immediate");
      } else {
        router.push("/flashcards/review?mode=immediate");
      }
    }
  }, [clickCount, currentIndex, flashcards, loading, error, router, userId]);

  useEffect(() => {
    if (!lastKeyPressed) return;
  
    const timeout = setTimeout(() => setLastKeyPressed(null), 150);
    return () => clearTimeout(timeout);
  }, [lastKeyPressed]);  

  return (
    <div className="lesson-page flex flex-col items-center min-h-screen bg-gray-100 relative">
      {/* Optional hide/show header */}
      <div style={{ overflow: "hidden" }} className="w-full">
        {!hideHeader && (
          <div ref={headerRef}>
            <Header />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setHideHeader(!hideHeader)}
        className="fixed top-4 right-4 bg-gray-700 text-white px-4 py-2 rounded-full shadow-lg hover:bg-gray-900 transition z-50"
      >
        {hideHeader ? "↓ Show Header" : "↑ Hide Header"}
      </button>

      {/* Flashcard Display */}
      <main className="content flex justify-center w-full p-4">
        {loading ? (
          <p>Loading flashcards...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : flashcards[currentIndex] ? (
          <Flashcard
            flashcard={flashcards[currentIndex]}
            onNextFlashcard={() => handleFlashcardAction(true)}
            onNeedToLearn={() => handleFlashcardAction(false)}
            highlightDirection={lastKeyPressed}
          />
        ) : (
          <p className="text-gray-500 italic">No more lesson flashcards.</p>
        )}
      </main>
    </div>
  );
}
