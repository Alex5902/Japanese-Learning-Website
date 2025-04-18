// components/PracticeQuestion.js
import { useState } from "react";

export default function PracticeQuestion({ item, onNext, showFuri }) {
  const [input, setInput]       = useState("");
  const [checked, setChecked]   = useState(false);
  const [isCorrect, setCorrect] = useState(false);

  const doCheck = async () => {
    if (checked) return;
    const correct = input.trim() === item.answer.trim();
    setCorrect(correct);
    setChecked(true);

    // tell backend (ignore errors for guests/offline)
    try {
      const userId = localStorage.getItem("user_id") || null;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/practice/update`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          user_id     : userId,
          practice_id : item.practice_id,
          correct
        })
      });
    } catch (_) {}
  };

  const handleKey = (e) => {
    if (e.key === "Enter") doCheck();
  };

  return (
    <div className="w-full max-w-2xl bg-white shadow-md rounded-lg p-6">

      {/* optional Hiragana line (appears above the Japanese sentence) */}
      {showFuri && item.question_reading && (
        <p className="text-base text-gray-600 text-center mb-2 tracking-wide">
          {item.question_reading}
        </p>
      )}

      {/* sentence */}
      <div className="text-center mb-6 leading-relaxed">
        <p className="text-xl">{item.question}</p>
      </div>

      {/* input */}
      {!checked ? (
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="w-full border rounded px-4 py-2"
          placeholder="Type the missing part"
        />
      ) : (
        <p className={`text-center text-xl font-semibold ${isCorrect ? "text-green-600" : "text-red-600"}`}>
          {isCorrect ? "Correct ✔︎" : `Wrong ✖︎  (answer: ${item.answer})`}
        </p>
      )}

      {/* buttons */}
      <div className="flex justify-center gap-4 mt-6">
        {!checked ? (
          <button
            onClick={doCheck}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Check
          </button>
        ) : (
          <>
            <button
              onClick={() => window.alert(item.english)}
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Show English
            </button>
            <button
              onClick={onNext}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Next
            </button>
          </>
        )}
      </div>
    </div>
  );
}
