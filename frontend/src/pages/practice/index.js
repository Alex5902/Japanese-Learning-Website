// pages/practice/practice.js
import { useState, useEffect } from "react";
import Header from "../../components/Header";
import PracticeQuestion from "../../components/PracticeQuestion";
import { toHiragana } from "wanakana"; 

export default function PracticePage() {
  const [items, setItems]   = useState([]); // question queue
  const [idx, setIdx]       = useState(0);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);
  const [showFuri, setShowFuri] = useState(false);

  const STORAGE_KEY = "practice_questions";

  /* -----------------------------------------------------------
     Fetch a batch once when the page mounts.
  ----------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      // 1) if we've already picked a set this session, reuse it
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
        setLoad(false);
        return;
      }
      try {
        const userId = localStorage.getItem("user_id") || null; // guest => null
        const body = { user_id: userId, mode: "all", limit: 10 };

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/practice/get`,
          {
            method : "POST",
            headers: { "Content-Type": "application/json" },
            body   : JSON.stringify(body)
          }
        );

        if (!res.ok) throw new Error("Failed to fetch practice questions.");

        const { practice: allQs } = await res.json();

        // Group by flashcard_id
        const byFlashcard = allQs.reduce((map, q) => {
          if (!map.has(q.flashcard_id)) map.set(q.flashcard_id, []);
          map.get(q.flashcard_id).push(q);
          return map;
        }, new Map());

        // Pick one random question per flashcard
        const onePerFlashcard = Array.from(byFlashcard.values()).map(
          questions => questions[Math.floor(Math.random() * questions.length)]
        );

        // store it so refreshing won’t re‑pick
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(onePerFlashcard));
        setItems(onePerFlashcard);
      } catch (err) {
        console.error(err);
        setError("Cannot fetch practice questions.");
      } finally {
        setLoad(false);
      }
    })();
  }, []);

  /* -----------------------------------------------------------
     After each question moves on, advance the index.
  ----------------------------------------------------------- */
  const handleNext = () => {
    if (idx + 1 < items.length) {
      setIdx(i => i + 1);
    } else {
      // cleanup our sessionStorage so next time we get fresh picks
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.href = "/";
    }
  };

  return (
    <>
      <Header />

      <div className="min-h-screen flex flex-col items-center bg-gray-100 px-4 pt-10">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">
          Practice – Fill&nbsp;in&nbsp;the&nbsp;Gap
        </h1>

        {/* furigana toggle – identical to immediate‑review page */}
        {items.length > 0 && (
          <label className="flex items-center gap-2 mb-4 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showFuri}
              onChange={() => setShowFuri(v => !v)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            Show Furigana
          </label>
        )}

        {loading ? (
          <p>Loading …</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p>No practice items found.</p>
        ) : (
          <PracticeQuestion
            key={items[idx].practice_id}  /* reset internal state */
            item={items[idx]}
            showFuri={showFuri}         
            onNext={handleNext}
          />
        )}

        {items.length > 0 && (
          <p className="mt-4 text-sm text-gray-500">
            {idx + 1} / {items.length}
          </p>
        )}
      </div>
    </>
  );
}
