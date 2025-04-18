// components/PracticeQuestion.js
import { useState } from "react";
import { toHiragana } from "wanakana";

export default function PracticeQuestion({ item, onNext, showFuri }) {
  const [input, setInput]         = useState("");
  const [checked, setChecked]     = useState(false);
  const [isCorrect, setCorrect]   = useState(false);
  const [showEnglish, setShowEng] = useState(false);

  /* --------------------------- helpers -------------------- */

  // Replace the first “____” placeholder in `sentence`
  const fillBlank = (sentence, html) => sentence.replace("____", html);

  // Build the sentence HTML that will be injected into the DOM
  const buildSentenceHTML = () => {
    if (!checked) {
      // learner is still typing
      const filled =
        input.trim().length > 0
          ? `<span class="underline bg-yellow-100 px-1 rounded-sm">${input}</span>`
          : `<span class="underline px-1 text-gray-400">____</span>`;
      return fillBlank(item.question, filled);
    }

    // after “Check” – always show the official answer
    const answer =
      `<span class="text-green-600 font-semibold bg-green-50 px-1 rounded-sm">${item.answer}</span>`;
    return fillBlank(item.question, answer);
  };

  /* --------------------------- events --------------------- */

  const handleInput = (e) => {
    // convert everything to hiragana as they type
    const hira = toHiragana(e.target.value, { IMEMode: true });
    setInput(hira);
  };

  const handleCheck = async () => {
    if (checked) return;

    const correct = input.trim() === item.answer.trim();
    setCorrect(correct);
    setChecked(true);
    setShowEng(true);         // always reveal English afterwards

    // fire‑and‑forget update to backend
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
    if (e.key === "Enter") handleCheck();
  };

  /* --------------------------- render --------------------- */

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8">

      {/* reading line (if enabled) */}
      {showFuri && item.question_reading && (
        <p className="text-center text-gray-500 mb-2 tracking-wide">
          {item.question_reading}
        </p>
      )}

      {/* Japanese sentence */}
      <p
        className="text-center text-2xl sm:text-3xl leading-relaxed break-words"
        dangerouslySetInnerHTML={{ __html: buildSentenceHTML() }}
      />

      {/* English hint / answer */}
      {showEnglish && (
        <p className="mt-4 text-center text-base text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-3">
          {item.english}
        </p>
      )}

      {/* hint button (only before checking) */}
      {!checked && (
        <button
          onClick={() => setShowEng((v) => !v)}
          className="mt-4 block mx-auto text-sm text-blue-600 hover:text-blue-800"
        >
          {showEnglish ? "Hide English" : "Need a hint? Show English"}
        </button>
      )}

      {/* answer input / result */}
      <div className="mt-6">
        {!checked ? (
          <input
            autoFocus
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder="タイプしてください…"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        ) : (
          <p
            className={`text-center text-xl font-semibold ${
              isCorrect ? "text-green-600" : "text-red-600"
            }`}
          >
            {isCorrect ? "Correct ✔︎" : "Wrong ✖︎"}
          </p>
        )}
      </div>

      {/* action buttons */}
      <div className="flex justify-center gap-4 mt-8">
        {!checked ? (
          <button
            onClick={handleCheck}
            className="px-8 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-lg shadow-md transition"
          >
            Check
          </button>
        ) : (
          <button
            onClick={onNext}
            className="px-8 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-lg shadow-md transition"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
