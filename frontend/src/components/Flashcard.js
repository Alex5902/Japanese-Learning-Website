// File: /components/Flashcard.js

import { useState, useEffect } from "react";
// import ExampleBreakdown from "./ExampleBreakdown";
import OverlayHint from "./OverlayHint";

// Helper function to check if a string contains Kanji
function containsKanji(str) {
  return /[\u4E00-\u9FFF]/.test(str);
}

function getBaseAudioPath(cardType) {
  switch (cardType) {
    case "grammar":
      return "/N5_Grammar/audio";
    case "vocab":
      return "/N5_Vocab/audio";
    case "kanji":
      return "/N5_Kanji/audio";
    default:
      return "/N5_Vocab/audio";
  }
}

/**
 * Checks file existence with a HEAD request.
 */
async function getAudioUrl(cardType, fileName, gender, audioType) {
  if (!fileName) return "";
  const basePath = getBaseAudioPath(cardType);
  const finalPath = `${basePath}/${audioType}/${gender}/${fileName}`;
  try {
    const response = await fetch(finalPath, { method: "HEAD" });
    return response.ok ? finalPath : "";
  } catch {
    return "";
  }
}

export default function Flashcard({
  flashcard,
  hideActions = false,
  onNextFlashcard,
  onNeedToLearn,
  highlightDirection,
}) {
  // const [showBreakdown, setShowBreakdown] = useState(false);

  // 1) Big overlay - only once per session
  const [showOverlayHint, setShowOverlayHint] = useState(false);

  useEffect(() => {
    if (hideActions) return;

    // Check localStorage
    if (typeof window !== "undefined") {
      const hasSeenOverlay = sessionStorage.getItem("has_seen_overlay");
      if (!hasSeenOverlay) {
        setShowOverlayHint(true);
        sessionStorage.setItem("has_seen_overlay", "true");
      }
    }    
  }, [hideActions]);

  // 2) Keyboard logic
  useEffect(() => {
    if (hideActions) return;

    function handleKeyDown(e) {
      if (!flashcard) return;

      if (showOverlayHint) {
        // If overlay is up, arrow keys also dismiss overlay
        if (e.key === "ArrowLeft") {
          onNeedToLearn?.();
          setShowOverlayHint(false);
        } else if (e.key === "ArrowRight") {
          onNextFlashcard?.();
          setShowOverlayHint(false);
        }
      } else {
        // Overlay not showing => normal arrow logic
        if (e.key === "ArrowLeft") {
          onNeedToLearn?.();
        } else if (e.key === "ArrowRight") {
          onNextFlashcard?.();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hideActions, showOverlayHint, flashcard, onNeedToLearn, onNextFlashcard]);

  if (!flashcard) {
    return <p className="text-gray-500 italic text-center">Loading flashcard...</p>;
  }

  const { type: cardType, content } = flashcard;

  // =============== KANJI FLASHCARD ===============
  if (cardType === "kanji") {
    const exampleWords = Array.isArray(content.example_words) ? content.example_words : [];
    const formattedExamples = exampleWords
      .filter((ex) => ex.includes(": "))
      .map((ex) => {
        const [word, readingMeaning] = ex.split(": ");
        return { word, readingMeaning };
      });

    const playExampleAudio = async (kanji, exampleIndex, gender) => {
      const trimmedKanji = kanji.trim();
      const fileName = `${trimmedKanji}_example_${exampleIndex + 1}.mp3`;
      const url = await getAudioUrl("kanji", fileName, gender, "words");
      if (url) {
        new Audio(url).play();
      }
    };

    return (
      <>
        {showOverlayHint && !hideActions && (
          <OverlayHint onClose={() => setShowOverlayHint(false)} />
        )}

        <div className="w-full mx-auto bg-white shadow-md py-6 text-center rounded-lg">
          {/* Kanji */}
          <h1 className="text-8xl font-bold text-gray-800">
            {content.kanji || "Unknown Kanji"}
          </h1>

          {/* Onyomi/Kunyomi */}
          <div className="flex justify-center space-x-6 mt-4 text-xl">
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <strong>Onyomi:</strong> {content.onyomi || "N/A"}
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
              <strong>Kunyomi:</strong> {content.kunyomi || "N/A"}
            </div>
          </div>

          {/* Meaning */}
          <p className="text-4xl text-gray-700 pt-12 pb-8 font-semibold">
            {content.meaning || "No meaning available"}
          </p>

          {/* Examples */}
          {formattedExamples.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
              <p className="text-xl font-semibold text-gray-700">Example Words:</p>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {formattedExamples.map((ex, index) => (
                  <div
                    key={index}
                    className="bg-gray-200 px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <span className="font-bold">{ex.word}</span> - {ex.readingMeaning}
                    <button
                      onClick={() => playExampleAudio(content.kanji, index, "male")}
                      className="px-2 py-1 bg-gray-300 text-gray-800 rounded-md shadow hover:bg-gray-400 transition cursor-pointer"
                    >
                      🔊 Male
                    </button>
                    <button
                      onClick={() => playExampleAudio(content.kanji, index, "female")}
                      className="px-2 py-1 bg-gray-300 text-gray-800 rounded-md shadow hover:bg-gray-400 transition cursor-pointer"
                    >
                      🔊 Female
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!hideActions && (
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={onNextFlashcard}
                className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
              >
                ✅ I already know this
              </button>
              <button
                onClick={onNeedToLearn}
                className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
              >
                ❌ I need to learn this
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // =============== VOCAB or GRAMMAR FLASHCARD ===============
  const { word, meaning, reading, example_sentence, breakdown } = content || {};

  const fallbackWordAudio = word ? `${word}.mp3` : "";
  const fallbackExampleAudio = word ? `${word}_example.mp3` : "";

  const playAudio = async (fileName, gender, audioType) => {
    const url = await getAudioUrl(cardType, fileName, gender, audioType);
    if (url) {
      new Audio(url).play();
    }
  };

  return (
    <>
      {showOverlayHint && !hideActions && (
        <OverlayHint onClose={() => setShowOverlayHint(false)} />
      )}

      <div className="w-full mx-auto bg-white shadow-md py-6 text-center rounded-lg">
        {/* Word Reading if has Kanji */}
        <div className="h-[36px] mt-2 flex items-center justify-center">
          {word && containsKanji(word) && reading ? (
            <p className="text-2xl text-gray-600">{reading}</p>
          ) : null}
        </div>

        <h1 className="text-8xl font-bold text-gray-800">{word || "Unknown Word"}</h1>
        <p className="text-4xl text-gray-700 pt-12 pb-8 font-semibold">
          {meaning || "No meaning available"}
        </p>

        {/* Example Sentence */}
        {example_sentence && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
            <p className="text-xl font-semibold text-gray-700">Example Sentence:</p>
            <p className="italic text-gray-500 text-lg">{example_sentence.jp}</p>
            <p className="text-gray-600 text-lg">{example_sentence.en}</p>
            <div className="flex justify-center space-x-4 mt-2">
              <button
                onClick={() => playAudio(fallbackExampleAudio, "male", "examples")}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md shadow hover:bg-gray-300 transition cursor-pointer"
              >
                🔊 Male (Sentence)
              </button>
              <button
                onClick={() => playAudio(fallbackExampleAudio, "female", "examples")}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md shadow hover:bg-gray-300 transition cursor-pointer"
              >
                🔊 Female (Sentence)
              </button>
            </div>
          </div>
        )}

        {/* Word Audio */}
        <div className="flex justify-center space-x-4 mt-4">
          <button
            onClick={() => playAudio(fallbackWordAudio, "male", "words")}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md shadow hover:bg-gray-300 transition cursor-pointer"
          >
            🔊 Male (Word)
          </button>
          <button
            onClick={() => playAudio(fallbackWordAudio, "female", "words")}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md shadow hover:bg-gray-300 transition cursor-pointer"
          >
            🔊 Female (Word)
          </button>
        </div>

        {/* Action Buttons */}
        {!hideActions && (
          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={onNextFlashcard}
              className={`px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition ${
                highlightDirection === "left" ? "ring-4 ring-green-300" : ""
              }`}
            >
              ✅ I already know this
            </button>
            <button
              onClick={onNeedToLearn}
              className={`px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition ${
                highlightDirection === "right" ? "ring-4 ring-red-300" : ""
              }`}
            >
              ❌ I need to learn this
            </button>
          </div>
        )}
      </div>
      {/* Breakdown */}
      {/* {breakdown && (
        <div className="w-full bg-gray-100 py-3 mt-4 flex justify-center">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
          >
            {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
          </button>
        </div>
      )}
      {showBreakdown && breakdown && (
        <div className="w-full mx-auto px-4 md:px-8 lg:px-16 mt-6">
          <ExampleBreakdown breakdown={breakdown} />
        </div>
      )} */}
      {/* </div> */}
    </>
  );
}
