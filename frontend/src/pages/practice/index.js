import { useState, useEffect } from "react";
import Header from "../../components/Header";
import PracticeQuestion from "../../components/PracticeQuestion";

export default function PracticePage() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [showFuri, setShowFuri] = useState(false);

  const STORAGE_KEY = "practice_questions";

  useEffect(() => {
    (async () => {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
        setLoading(false);
        return;
      }
      try {
        const userId = localStorage.getItem("user_id") || null;
        const body = { user_id: userId, mode: "all", limit: 10 };
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/practice/get`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) throw new Error("Failed to fetch practice questions.");
        const { practice: allQs } = await res.json();

        const byFlashcard = allQs.reduce((m, q) => {
          (m.get(q.flashcard_id) || m.set(q.flashcard_id, [])).get(q.flashcard_id).push(q);
          return m;
        }, new Map());

        const onePerFlashcard = Array.from(byFlashcard.values()).map(
          qs => qs[Math.floor(Math.random() * qs.length)]
        );

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(onePerFlashcard));
        setItems(onePerFlashcard);
      } catch (err) {
        console.error(err);
        setError("Cannot fetch practice questions.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAnswer = correct => {
    setItems(curr => {
      const queue = curr.slice();
      const current = queue.shift();
      if (!correct) {
        const pos = Math.floor(Math.random() * (queue.length + 1));
        queue.splice(pos, 0, current);
      }
      if (queue.length === 0) {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      }
      return queue;
    });
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex flex-col items-center bg-gray-100 px-4 pt-10">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">
          Practice – Fill in the Gap
        </h1>

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
            key={items[0].practice_id}
            item={items[0]}
            showFuri={showFuri}
            onAnswer={handleAnswer}
          />
        )}

        {!loading && items.length > 0 && (
          <p className="mt-4 text-sm text-gray-500">
            {items.length} remaining
          </p>
        )}
      </div>
    </>
  );
}
