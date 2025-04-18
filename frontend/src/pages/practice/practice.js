// pages/practice/index.js
import { useState, useEffect } from "react";
import Header from "../../components/Header";
import PracticeQuestion from "../../components/PracticeQuestion";

export default function PracticePage() {
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // fetch on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/practice/fetch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "all" }), // or "missed"
        });
        const data = await res.json();
        setQueue(data.items || []);
      } catch (e) {
        setErr("Cannot fetch practice questions.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleNext = () => {
    if (idx + 1 < queue.length) setIdx((i) => i + 1);
    else window.location.href = "/"; // finished
  };

  return (
    <>
      <Header />

      <div className="min-h-screen flex flex-col items-center bg-gray-100 px-4 pt-10">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">Practice – Fill in the Gap</h1>

        {loading ? (
          <p>Loading…</p>
        ) : err ? (
          <p className="text-red-600">{err}</p>
        ) : queue.length === 0 ? (
          <p>No practice items found.</p>
        ) : (
          <PracticeQuestion item={queue[idx]} onNext={handleNext} />
        )}

        <p className="mt-4 text-sm text-gray-500">
          {queue.length > 0 && `${idx + 1} / ${queue.length}`}
        </p>
      </div>
    </>
  );
}
