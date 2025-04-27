import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import Header from "../../components/Header";
import Flashcard from "../../components/Flashcard";
import { toHiragana } from "wanakana";
import damerauLevenshtein from "damerau-levenshtein";
import { getNextReviewDateAndLevel } from "../../../../backend/utils/srs";
import ExampleBreakdown from "../../components/ExampleBreakdown";

// Helper: choose color styles based on flashcard type
function getTypeStyles(type) {
  switch (type) {
    case "vocab":
      return { bg: "bg-blue-200", text: "text-blue-800" };
    case "grammar":
      return { bg: "bg-purple-200", text: "text-purple-800" };
    case "kanji":
      return { bg: "bg-red-200", text: "text-red-800" };
    default:
      return { bg: "bg-gray-200", text: "text-gray-800" };
  }
}

// Helper: remove bracketed text like (xxx)
function removeBrackets(str) {
  return str.replace(/\([^)]*\)/g, "");
}

// Helper: check if string contains Kanji
function containsKanji(str) {
  return /[\u4E00-\u9FFF]/.test(str);
}

/**
 * For guest users:
 * - Read the old level from sessionStorage.
 * - Compute newLevel + nextReview via getNextReviewDateAndLevel.
 * - Update correct_count or incorrect_count.
 * - Save back to sessionStorage.
 */
function localGuestSRSUpdate(flashcardId, bothCorrect) {
  console.log("[DEBUG] localGuestSRSUpdate => flashcardId:", flashcardId, "bothCorrect=", bothCorrect);
  
  const id = String(flashcardId);
  let guestProgressStr = sessionStorage.getItem("guest_progress");
  let guestProgress = guestProgressStr ? JSON.parse(guestProgressStr) : {};

  let entry = guestProgress[id] || {
    level: 0,
    correct_count: 0,
    incorrect_count: 0,
    next_review: null,
    reached_level_3: null,
  };

  const oldLevel = isNaN(entry.level) ? 0 : entry.level;
  console.log("[DEBUG] localGuestSRSUpdate => oldLevel:", oldLevel);

  const { newLevel, nextReview } = getNextReviewDateAndLevel(oldLevel, bothCorrect, "UTC");
  console.log("[DEBUG] localGuestSRSUpdate => newLevel:", newLevel, "nextReview:", nextReview);

  if (bothCorrect) {
    entry.correct_count = (entry.correct_count || 0) + 1;
    console.log("[DEBUG] localGuestSRSUpdate => incrementing correct_count to:", entry.correct_count);
  } else {
    entry.incorrect_count = (entry.incorrect_count || 0) + 1;
    console.log("[DEBUG] localGuestSRSUpdate => incrementing incorrect_count to:", entry.incorrect_count);
  }

  entry.level = newLevel;
  entry.next_review = nextReview;

  if (newLevel >= 3 && !entry.reached_level_3) {
    entry.reached_level_3 = new Date().toISOString();
  }

  console.log("[DEBUG] localGuestSRSUpdate => final entry:", entry);
  
  guestProgress[id] = entry;
  sessionStorage.setItem("guest_progress", JSON.stringify(guestProgress));
}

export default function ReviewPage() {
  const router = useRouter();
  const currentMode = router.query.mode || "normal";

  // State for flashcards
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Two-step flow: "meaning" then "reading" (for kanji)
  const [step, setStep] = useState("meaning");

  // User's typed inputs
  const [userMeaning, setUserMeaning] = useState("");
  const [userReading, setUserReading] = useState("");

  // Correctness states
  const [meaningIsCorrect, setMeaningIsCorrect] = useState(false);
  const [readingIsCorrect, setReadingIsCorrect] = useState(false);

  // Submission flow
  const [showResult, setShowResult] = useState(false);
  const [submittable, setSubmittable] = useState(true);

  // Loading/error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // user_id from localStorage (null if guest)
  const [userId, setUserId] = useState(null);

  // Furigana toggle
  const [showFurigana, setShowFurigana] = useState(false);
  const toggleFurigana = () => setShowFurigana((prev) => !prev);

  // Full flashcard toggle
  const [showFullFlashcard, setShowFullFlashcard] = useState(false);
  const toggleFullFlashcard = () => {
    // always close the breakdown panel when hiding the card
    if (showFullFlashcard) {
      setShowBreakdown(false)
    }
    setShowFullFlashcard(prev => !prev)
  }

  // Refs for auto-focus
  const meaningInputRef = useRef(null);
  const readingInputRef = useRef(null);

  // Breakdown toggle for full-width panel
  const [showBreakdown, setShowBreakdown] = useState(false);

  // On mount: fetch userId
  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    console.log("[DEBUG] on mount => storedUserId:", storedUserId);
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      setUserId(null);
      setLoading(false);
    }
  }, []);

  // Once router is ready, fetch review flashcards
  useEffect(() => {
    if (!router.isReady) return;
    if (userId === undefined) return;

    const fetchFlashcards = async () => {
      setLoading(true);
      try {
        // Redirect guest immediately if attempting normal review
        if (!userId && currentMode === "normal") {
          const reason = userId ? "user" : "guest";
          router.push(`/?no_flashcards=${reason}`);
          return;
        }

        console.log("[DEBUG] fetchFlashcards => userId:", userId, "mode:", currentMode);
        const bodyData = { user_id: userId || "", mode: currentMode };
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/flashcards/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        });
        if (!res.ok) throw new Error("Failed to fetch flashcards.");

        const data = await res.json();
        console.log("[DEBUG] raw data from review endpoint:", data);

        // If guest => filter out level=3
        if (!userId && data.flashcards?.length) {
          const guestProgressStr = sessionStorage.getItem("guest_progress");
          if (guestProgressStr) {
            const guestProgress = JSON.parse(guestProgressStr);
            data.flashcards = data.flashcards.filter((card) => {
              const stringId = String(card.flashcard_id);
              const entry = guestProgress[stringId];
              console.log("[DEBUG] filter => cardID:", card.flashcard_id, "entry:", entry);
              return !entry || entry.level < 3;
            });
          }
        }

        if (!data.flashcards || data.flashcards.length === 0) {
          const reason = userId ? "user" : "guest";
          router.push(`/?no_flashcards=${reason}`);
          return;        
        } else {
          setFlashcards(data.flashcards);
          setCurrentIndex(0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcards();
  }, [router.isReady, currentMode, userId, router]);

  const currentFlashcard = flashcards[currentIndex];

  // parse breakdown JSON into a real object (or null)
  const parsedBreakdown = useMemo(() => {
    const bd = currentFlashcard?.content?.breakdown;
    if (!bd) return null;
    try {
      return typeof bd === "string" ? JSON.parse(bd) : bd;
    } catch {
      return null;
    }
  }, [currentFlashcard]);

  // Input handlers
  const handleMeaningChange = (e) => setUserMeaning(e.target.value);
  const handleReadingChange = (e) => setUserReading(toHiragana(e.target.value, { IMEMode: true }));

  // handleSubmit
  const handleSubmit = useCallback(() => {
    if (!currentFlashcard || !submittable) return;
    setSubmittable(false);

    console.log("[DEBUG] handleSubmit => step:", step, "cardType:", currentFlashcard.type);

    if (step === "meaning") {
      // Evaluate user meaning
      const officialMeaningNoParen = removeBrackets(currentFlashcard.content.meaning || "");
      const possibleMeanings = officialMeaningNoParen
        .split(/[;,]/)
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean);

      const userMeaningNormalized = removeBrackets(userMeaning).trim().toLowerCase();
      let isCorrect = false;

      for (const meaningOption of possibleMeanings) {
        const { steps } = damerauLevenshtein(userMeaningNormalized, meaningOption);
        const threshold = Math.max(
          Math.ceil(Math.max(userMeaningNormalized.length, meaningOption.length) * 0.2),
          1
        );
        if (steps <= threshold) {
          isCorrect = true;
          break;
        }
      }

      console.log("[DEBUG] handleSubmit => meaning => final isCorrect:", isCorrect);
      setMeaningIsCorrect(isCorrect);
      setShowResult(true);

      // If this is a 1-step card
      if (currentFlashcard.type !== "kanji") {
        const bothCorrect = isCorrect;
        console.log("[DEBUG] handleSubmit => single-step => bothCorrect:", bothCorrect);
        if (userId) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/flashcards/updateReviewFlashcard`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              flashcard_id: currentFlashcard.flashcard_id,
              bothCorrect,
            }),
          }).catch((e) => console.error("updateReviewFlashcard failed:", e));
        } else {
          localGuestSRSUpdate(currentFlashcard.flashcard_id, bothCorrect);
        }
      }
    } else {
      // reading step (for kanji)
      const correctReading =
        (userReading.trim() === (currentFlashcard.content.onyomi || "").trim()) ||
        (userReading.trim() === (currentFlashcard.content.kunyomi || "").trim());

      console.log("[DEBUG] handleSubmit => reading => correctReading:", correctReading, " userReading:", userReading);
      setReadingIsCorrect(correctReading);
      setShowResult(true);

      const bothCorrect = meaningIsCorrect && correctReading;
      console.log("[DEBUG] handleSubmit => reading => bothCorrect:", bothCorrect);

      if (userId) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/flashcards/updateReviewFlashcard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            flashcard_id: currentFlashcard.flashcard_id,
            bothCorrect,
          }),
        }).catch((e) => console.error("updateReviewFlashcard (kanji) failed:", e));
      } else {
        localGuestSRSUpdate(currentFlashcard.flashcard_id, bothCorrect);
      }
    }
  }, [
    currentFlashcard,
    step,
    submittable,
    meaningIsCorrect,
    userMeaning,
    userReading,
    userId
  ]);

  // handleNext
  const handleNext = useCallback(() => {
    console.log("[DEBUG] handleNext => step:", step, "cardType:", currentFlashcard?.type);
    setShowResult(false);
    setSubmittable(true);
    setShowFullFlashcard(false);

    const cardType = currentFlashcard?.type || "unknown";

    if (step === "meaning") {
      if (cardType === "kanji") {
        // Keep meaningIsCorrect for the reading step
        console.log("[DEBUG] handleNext => going from meaning to reading => preserve meaningIsCorrect=", meaningIsCorrect);
        setStep("reading");
      } else {
        // single-step
        const newFlashcards = [...flashcards];
        const card = newFlashcards[currentIndex];
        newFlashcards.splice(currentIndex, 1);

        const wasCorrect = meaningIsCorrect;
        console.log("[DEBUG] handleNext => single-step => wasCorrect:", wasCorrect);

        // reset meaningIsCorrect for next card
        setMeaningIsCorrect(false);

        if (!wasCorrect) {
          console.log("[DEBUG] handleNext => re-appending single-step card => incorrect");
          newFlashcards.push(card);
        }
        setFlashcards(newFlashcards);
        setUserMeaning("");

        if (newFlashcards.length === 0) {
          if (!userId) router.push("/?signup_prompt=true");
          else router.push("/");
          return;
        }
        if (currentIndex >= newFlashcards.length) {
          setCurrentIndex(0);
        }
      }
    } else {
      // reading step is done
      const newFlashcards = [...flashcards];
      const card = newFlashcards[currentIndex];
      newFlashcards.splice(currentIndex, 1);

      const wasBothCorrect = meaningIsCorrect && readingIsCorrect;
      console.log("[DEBUG] handleNext => reading => wasBothCorrect:", wasBothCorrect);
      
      // reset states
      setMeaningIsCorrect(false);
      setReadingIsCorrect(false);
      setUserMeaning("");
      setUserReading("");

      if (!wasBothCorrect) {
        console.log("[DEBUG] handleNext => re-appending => was incorrect in reading step");
        newFlashcards.push(card);
      }
      setFlashcards(newFlashcards);
      setStep("meaning");

      if (newFlashcards.length === 0) {
        if (!userId) router.push("/?signup_prompt=true");
        else router.push("/");
        return;
      }
      if (currentIndex >= newFlashcards.length) {
        setCurrentIndex(0);
      }
    }
  }, [
    step,
    meaningIsCorrect,
    readingIsCorrect,
    flashcards,
    currentIndex,
    currentFlashcard,
    userId,
    router
  ]);

  // Global keydown
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Enter") {
        if (!showResult) {
          handleSubmit();
        } else {
          handleNext();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showResult, handleSubmit, handleNext]);

  // Auto-focus
  useEffect(() => {
    if (showResult) return;
    if (step === "meaning") {
      meaningInputRef.current?.focus();
    } else {
      readingInputRef.current?.focus();
    }
  }, [showResult, step, currentIndex]);

  // Determine style
  let cardType = "";
  let jlptLevel = "";
  let styleObj = { bg: "bg-gray-200", text: "text-gray-800" };
  if (currentFlashcard) {
    cardType = currentFlashcard.type || "unknown";
    jlptLevel = currentFlashcard.jlpt_level || "N/A";
    styleObj = getTypeStyles(cardType);
  }

  return (
    <div className="bg-gray-100">
      <Header />
      <div className="w-full min-h-screen bg-gray-100 text-gray-900" tabIndex={0}>
        <div className="flex flex-col items-center pt-4">
          <h1 className="text-xl text-blue-600 font-bold text-center">
            Two-Step Review (Meaning
            {currentFlashcard?.type === "kanji" ? " then Reading" : ""})
          </h1>

          {currentFlashcard &&
            currentFlashcard.type !== "kanji" &&
            currentFlashcard.content?.word &&
            containsKanji(currentFlashcard.content.word) && (
              <div className="flex items-center my-2">
                <label htmlFor="furigana-toggle" className="mr-2 text-sm font-medium text-gray-700">
                  Show Furigana
                </label>
                <input
                  id="furigana-toggle"
                  type="checkbox"
                  checked={showFurigana}
                  onChange={toggleFurigana}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
            )}
        </div>

        {loading ? (
          <p className="text-center mt-6">Loading flashcards...</p>
        ) : error ? (
          <p className="text-center text-red-500 mt-6">{error}</p>
        ) : flashcards.length > 0 && currentFlashcard ? (
          <div className="mx-auto mt-6 w-full max-w-2xl bg-white shadow-md rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className={`inline-block px-2 py-1 rounded ${styleObj.bg} ${styleObj.text} text-xs font-semibold`}>
                {jlptLevel.toUpperCase()} {cardType.toUpperCase()}
              </span>
            </div>

            <div className="bg-gray-300 p-6 text-4xl font-bold text-center rounded-lg">
              {showFurigana &&
                cardType !== "kanji" &&
                currentFlashcard.content?.word &&
                containsKanji(currentFlashcard.content.word) && (
                  <div className="text-sm text-gray-700">
                    {currentFlashcard.content.reading}
                  </div>
                )}
              {cardType === "kanji"
                ? currentFlashcard.content?.kanji
                : currentFlashcard.content?.word || "Flashcard"}
            </div>

            {cardType === "kanji" ? (
              step === "meaning" ? (
                <MeaningStep
                  inputRef={meaningInputRef}
                  userMeaning={userMeaning}
                  onMeaningChange={handleMeaningChange}
                  showResult={showResult}
                  correctMeaning={currentFlashcard.content.meaning || ""}
                  meaningIsCorrect={meaningIsCorrect}
                />
              ) : (
                <ReadingStep
                  inputRef={readingInputRef}
                  userReading={userReading}
                  onReadingChange={handleReadingChange}
                  showResult={showResult}
                  correctReading={`Onyomi: ${currentFlashcard.content.onyomi || ""} / Kunyomi: ${
                    currentFlashcard.content.kunyomi || ""
                  }`}
                  readingIsCorrect={readingIsCorrect}
                />
              )
            ) : (
              <MeaningStep
                inputRef={meaningInputRef}
                userMeaning={userMeaning}
                onMeaningChange={handleMeaningChange}
                showResult={showResult}
                correctMeaning={currentFlashcard.content.meaning || ""}
                meaningIsCorrect={meaningIsCorrect}
              />
            )}

            {!showResult && (
              <button
                onClick={handleSubmit}
                className="mt-4 px-6 py-3 bg-green-500 text-white text-lg rounded-lg shadow-md hover:bg-green-600 transition w-full"
              >
                Submit
              </button>
            )}

            {showResult && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                <ResultDisplay
                  step={step}
                  meaningIsCorrect={meaningIsCorrect}
                  readingIsCorrect={readingIsCorrect}
                />

                <button
                  onClick={toggleFullFlashcard}
                  className="mt-3 px-6 py-3 bg-gray-600 text-white text-lg rounded-lg shadow-md hover:bg-gray-700 transition w-full"
                >
                  {showFullFlashcard ? "Hide Full Flashcard" : "See Full Flashcard"}
                </button>

                <button
                  onClick={handleNext}
                  className="mt-3 px-6 py-3 bg-blue-500 text-white text-lg rounded-lg shadow-md hover:bg-blue-600 transition w-full"
                >
                  {cardType === "kanji"
                    ? step === "meaning"
                      ? "Next (Reading Step)"
                      : "Next Card"
                    : "Next Card"}
                </button>


                

                {showFullFlashcard && (
                  <div className="mt-4">
                    <Flashcard flashcard={currentFlashcard} hideActions={true}/>
                  </div>
                )}
                {/* Breakdown toggle */}
                {showFullFlashcard && parsedBreakdown && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setShowBreakdown(v => !v)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
                    >
                      {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
                    </button>
                  </div>
                )}

            </div>
              )}
          </div>
           ) : (
            <p className="text-center mt-6">No flashcard found.</p>
          )}  
          </div> 

                {/* Full-width breakdown panel */}
                {showFullFlashcard && showBreakdown && parsedBreakdown && (
                <div className="w-screen max-w-6xl mx-auto
                  px-4 md:px-8 lg:px-16 mt-4 mb-6">
                    <ExampleBreakdown breakdown={parsedBreakdown} />
                  </div>
                )}
              {/* </div>
              )}
          </div>
           ) : (
            <p className="text-center mt-6">No flashcard found.</p>
          )}  
          </div>  */}
    </div>
  );
}

// ============ Sub-Components ============ //

function MeaningStep({ inputRef, userMeaning, onMeaningChange, showResult, correctMeaning, meaningIsCorrect }) {
  const displayMeaning = removeBrackets(correctMeaning || "");

  return (
    <div className="mt-4 text-lg text-center">
      <label className="block font-semibold text-gray-700">Meaning</label>
      <input
        ref={inputRef}
        type="text"
        value={userMeaning}
        onChange={onMeaningChange}
        className={`w-full px-4 py-2 mt-2 border rounded-lg shadow-sm focus:outline-none ${
          showResult ? (meaningIsCorrect ? "border-green-500" : "border-red-500") : ""
        }`}
        placeholder="Type meaning"
        disabled={showResult}
      />
      {showResult && !meaningIsCorrect && (
        <p className="mt-2 text-sm text-gray-700">
          Correct meaning:{" "}
          <strong>
            {displayMeaning
              .split(/[;,]/)
              .map((m) => m.trim())
              .filter((m) => m.length > 0)
              .join(", ")}
          </strong>
        </p>
      )}
    </div>
  );
}

function ReadingStep({ inputRef, userReading, onReadingChange, showResult, correctReading, readingIsCorrect }) {
  return (
    <div className="mt-4 text-lg text-center">
      <label className="block font-semibold text-gray-700">Reading</label>
      <input
        ref={inputRef}
        type="text"
        value={userReading}
        onChange={onReadingChange}
        className={`w-full px-4 py-2 mt-2 border rounded-lg shadow-sm focus:outline-none ${
          showResult ? (readingIsCorrect ? "border-green-500" : "border-red-500") : ""
        }`}
        placeholder="Type reading"
        disabled={showResult}
      />
      {showResult && !readingIsCorrect && (
        <p className="mt-2 text-sm text-gray-700">
          Correct reading: <strong>{correctReading}</strong>
        </p>
      )}
    </div>
  );
}

function ResultDisplay({ step, meaningIsCorrect, readingIsCorrect }) {
  if (step === "meaning") {
    return (
      <>
        <h2 className="text-xl font-semibold text-gray-700">Meaning Result</h2>
        {meaningIsCorrect ? (
          <p className="mt-2 text-green-600 font-bold">Correct!</p>
        ) : (
          <p className="mt-2 text-red-600 font-bold">Wrong!</p>
        )}
      </>
    );
  } else {
    return (
      <>
        <h2 className="text-xl font-semibold text-gray-700">Reading Result</h2>
        {readingIsCorrect ? (
          <p className="mt-2 text-green-600 font-bold">Correct!</p>
        ) : (
          <p className="mt-2 text-red-600 font-bold">Wrong!</p>
        )}
      </>
    );
  }
}
