// components/PracticeQuestion.js
import { useState, useRef, useEffect } from "react";
import Flashcard from "./Flashcard";
import ExampleBreakdown from "./ExampleBreakdown";

export default function PracticeQuestion({ item, onNext }) {
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef(null);

  // auto‑focus on mount / when question changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [item]);

  const handleSubmit = () => {
    if (showResult) return;
    const correct = userAnswer.trim() === item.answer.trim();
    setIsCorrect(correct);
    setShowResult(true);
  };

  const handleNext = () => {
    setUserAnswer("");
    setShowResult(false);
    setIsCorrect(false);
    setShowDetails(false);
    onNext();
  };

  // allow Enter‑key submit / next
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Enter") {
        if (!showResult) handleSubmit();
        else handleNext();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6">
      {/* sentence */}
      <p className="text-xl text-center font-semibold mb-6">{item.question}</p>

      {/* input */}
      <input
        ref={inputRef}
        type="text"
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        disabled={showResult}
        placeholder="Type the missing word …"
        className={`w-full px-4 py-2 border rounded focus:outline-none ${
          showResult
            ? isCorrect
              ? "border-green-500"
              : "border-red-500"
            : "border-gray-300"
        }`}
      />

      {/* buttons */}
      {!showResult ? (
        <button
          onClick={handleSubmit}
          className="mt-4 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Check
        </button>
      ) : (
        <>
          <div
            className={`mt-4 text-lg font-bold text-center ${
              isCorrect ? "text-green-600" : "text-red-600"
            }`}
          >
            {isCorrect ? "Correct 🎉" : "Wrong 😢"} – answer: {item.answer}
          </div>

          <button
            onClick={() => setShowDetails((p) => !p)}
            className="mt-3 w-full py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {showDetails ? "Hide Flashcard" : "Show Flashcard + Breakdown"}
          </button>

          <button
            onClick={handleNext}
            className="mt-3 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Next
          </button>

          {showDetails && (
            <div className="mt-4 space-y-4">
              <Flashcard flashcard={item.flashcard} hideActions />
              {item.flashcard.content?.breakdown && (
                <ExampleBreakdown breakdown={item.flashcard.content.breakdown} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
