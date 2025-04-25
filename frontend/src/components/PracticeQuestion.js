import { useState } from "react";
import { toHiragana } from "wanakana";
import Flashcard from "./Flashcard";
import ExampleBreakdown from "./ExampleBreakdown";

export default function PracticeQuestion({ item, showFuri, onAnswer }) {
  const [input, setInput]         = useState("");
  const [checked, setChecked]     = useState(false);
  const [isCorrect, setCorrect]   = useState(false);
  const [showEnglish, setShowEng] = useState(false);

  /* extra toggles */
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showCard, setShowCard]           = useState(false);

  const fillBlank = (sentence, html) =>
    sentence.replace("____", html);

  const buildSentenceHTML = () => {
    if (!checked) {
      const filled = input.trim()
        ? `<span class="underline bg-yellow-100 px-1 rounded-sm">${input}</span>`
        : `<span class="underline px-1 text-gray-400">____</span>`;
      return fillBlank(item.question, filled);
    }

    return fillBlank(
      item.question,
      `<span class="text-green-600 font-semibold bg-green-50 px-1 rounded-sm">${item.answer}</span>`
    );
  };

  const handleInput = e =>
    setInput(toHiragana(e.target.value, { IMEMode: true }));

  const handleCheck = async () => {
    if (checked) return;
    const correct = input.trim() === item.answer.trim();
    setCorrect(correct);
    setChecked(true);
    setShowEng(true);

    // send result to backend
    try {
      const userId = localStorage.getItem("user_id") || null;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/practice/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          practice_id: item.practice_id,
          correct
        })
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        {showFuri && item.question_reading && (
          <p className="text-center text-gray-500 mb-2 tracking-wide">
            {item.question_reading}
          </p>
        )}

        <p
          className="text-center text-2xl sm:text-3xl leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: buildSentenceHTML() }}
        />

        {showEnglish && (
          <p className="mt-4 text-center text-base text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-3">
            {item.english}
          </p>
        )}

        {!checked && (
          <button
            onClick={() => setShowEng(v => !v)}
            className="mt-4 block mx-auto text-sm text-blue-600 hover:text-blue-800"
          >
            {showEnglish ? "Hide English" : "Need a hint? Show English"}
          </button>
        )}

        <div className="mt-6">
          {!checked ? (
            <input
              autoFocus
              value={input}
              onChange={handleInput}
              onKeyDown={e => e.key === "Enter" && handleCheck()}
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
      </div>

      {checked && (
        <>
          <div className="flex justify-center gap-4 mt-6">
            {item.breakdown && (
              <button
                onClick={() => {
                  setShowBreakdown(v => !v);
                  if (!showBreakdown) setShowCard(false);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
              >
                {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
              </button>
            )}
            <button
              onClick={() => {
                setShowCard(v => !v);
                if (!showCard) setShowBreakdown(false);
              }}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-600 transition"
            >
              {showCard ? "Hide Flashcard" : "Show Flashcard"}
            </button>
          </div>

          {showBreakdown && (() => {
            try {
                console.log("🔍 Breakdown:", JSON.stringify(item.breakdown, null, 2));
                const parsed = typeof item.breakdown === "string"
                ? JSON.parse(item.breakdown)
                : item.breakdown;

                return <div className="w-full px-4 md:px-8 lg:px-16">
                <ExampleBreakdown breakdown={parsed} />
                </div>;
            } catch (e) {
                console.error("❌ Breakdown parse error:", e, item.breakdown);
                return <p className="text-center text-red-600 mt-4">Could not load breakdown 😢</p>;
            }
            })()}

          {showCard && (
            <div className="mt-4">
              <Flashcard
                flashcard={{
                  flashcard_id: item.flashcard_id,
                  type: item.type,
                  content: item.content,
                }}
                hideActions
              />
            </div>
          )}
        </>
      )}

      {checked && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => onAnswer(isCorrect)}
            className="px-8 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-lg shadow-md transition"
          >
            Next
          </button>
        </div>
      )}

      {!checked && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={handleCheck}
            className="px-8 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-lg shadow-md transition"
          >
            Check
          </button>
        </div>
      )}
    </>
  );
}
