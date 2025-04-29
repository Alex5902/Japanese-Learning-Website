import React, { useState, useMemo } from "react";
import { toHiragana } from "wanakana";
import Flashcard from "./Flashcard"; // Assuming path is correct
import ExampleBreakdown from "./ExampleBreakdown"; // Assuming path is correct

// --- Furigana Parser for Base[Reading] format ---
// Parses strings like "漢字[かんじ] or 学校[がっこう]" into React elements
function renderFuriganaStructured(textWithReadings) {
    // Return early if input is empty or not a string
    if (!textWithReadings || typeof textWithReadings !== 'string') {
        return <>{textWithReadings || ''}</>; // Return empty fragment or original if not string
    }

    const elements = [];
    // Regex: Matches Kanji[Reading], Kana, lone Kanji, or other characters
    const regex = /([\u4E00-\u9FFF々]+)\[(.+?)\]|([\u3040-\u309F\u30A0-\u30FF]+)|([\u4E00-\u9FFF々]+)|([^\[\]\u4E00-\u9FFF々\u3040-\u309F\u30A0-\u30FF]+)/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(textWithReadings)) !== null) {
        // Capture any plain text between matches (should be rare with this regex)
        if (match.index > lastIndex) {
            elements.push(<span key={`pre-${lastIndex}`}>{textWithReadings.substring(lastIndex, match.index)}</span>);
        }

        const [fullMatch, kanjiGroup, reading, kanaGroup, loneKanjiGroup, otherChars] = match;

        if (kanjiGroup && reading) {
            // Case 1: Kanji with reading (e.g., 学校[がっこう])
            elements.push(
                <ruby key={`ruby-${match.index}`} className="inline-block leading-relaxed"> {/* Style for layout */}
                    <rb>{kanjiGroup}</rb>
                    {/* Style for smaller furigana text */}
                    <rt style={{ fontSize: '0.6em', fontSmooth: 'auto', WebkitFontSmoothing: 'auto', MozOsxFontSmoothing: 'auto', userSelect: 'none', MozUserSelect: 'none', WebkitUserSelect: 'none' }}>{reading}</rt>
                </ruby>
            );
        } else if (kanaGroup) {
            // Case 2: Hiragana/Katakana group
            elements.push(<span key={`kana-${match.index}`}>{kanaGroup}</span>);
        } else if (loneKanjiGroup) {
            // Case 3: Kanji without explicit reading (e.g., if backend missed it)
            elements.push(<span key={`lonekanji-${match.index}`}>{loneKanjiGroup}</span>);
        } else if (otherChars) {
            // Case 4: Punctuation, spaces, etc.
            elements.push(<span key={`other-${match.index}`}>{otherChars}</span>);
        }
        lastIndex = regex.lastIndex;
    }
    // Capture any remaining text after the last match
    if (lastIndex < textWithReadings.length) {
        elements.push(<span key={`post-${lastIndex}`}>{textWithReadings.substring(lastIndex)}</span>);
    }
    // Wrap in a span that allows normal whitespace handling
    return <span className="whitespace-pre-wrap">{elements}</span>;
}


export default function PracticeQuestion({ item, showFuri, onAnswer }) {
    // console.log("PracticeQuestion received item:", item); // Keep for debugging
    // console.log("PracticeQuestion received showFuri:", showFuri); // Keep for debugging

    const [input, setInput] = useState("");
    const [checked, setChecked] = useState(false);
    const [isCorrect, setCorrect] = useState(false);
    const [showEnglish, setShowEng] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showCard, setShowCard] = useState(false);
    const [showCardBreakdown, setShowCardBreakdown] = useState(false);

    /* ------------------------------------------------------------------ */
    /* Input & Check Handlers                                             */
    /* ------------------------------------------------------------------ */
    const handleInput = (e) =>
        setInput(toHiragana(e.target.value, { IMEMode: true }));

    const handleCheck = async () => {
        if (checked) return;
        const correct = input.trim() === item.answer.trim();
        setCorrect(correct);
        setChecked(true);
        setShowEng(true); // Show English hint after checking

        try {
            const userId = localStorage.getItem("user_id") || null;
            if (userId) { // Only update if user is logged in
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/practice/update`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: userId,
                        practice_id: item.practice_id,
                        correct,
                    }),
                });
            }
        } catch (err) {
            console.error("Failed to update practice status:", err);
            // Optionally inform the user about the error
        }
    };

    /* ------------------------------------------------------------------ */
    /* Sentence Rendering Logic (Using Structured Reading)                */
    /* ------------------------------------------------------------------ */
    const sentenceDisplay = useMemo(() => {
        const questionText = item.question || "";
        // *** Use the NEW structured reading prop from the backend ***
        const structuredReadingText = item.question_reading_structured || "";
        // console.log("useMemo Check - showFuri:", showFuri, "Has structuredReading:", !!structuredReadingText); // Debug log

        // Determine the HTML content for the blank based on state
        let blankContentHtml;
        if (!checked) {
            blankContentHtml = input.trim()
                ? `<span class="underline bg-yellow-100 px-1 rounded-sm">${input}</span>`
                : `<span class="underline px-1 text-gray-400">____</span>`;
        } else {
            blankContentHtml = `<span class="text-green-600 font-semibold bg-green-50 px-1 rounded-sm">${item.answer}</span>`;
        }

        // Find where the blank placeholder is in the original question
        const blankIndex = questionText.indexOf("____");

        // Decide whether to render with furigana based on toggle and data availability
        const renderWithFuri = showFuri && structuredReadingText;

        if (blankIndex === -1) {
            // No blank found in the question
            return renderWithFuri
                ? renderFuriganaStructured(structuredReadingText) // Render structured reading directly
                : <>{questionText}</>; // Render plain question text
        }

        // Question has a blank, split the original question text
        const part1 = questionText.substring(0, blankIndex);
        const part2 = questionText.substring(blankIndex + 4); // Length of "____"

        // Render the parts: apply furigana parser if toggled, otherwise use plain text
        const part1Rendered = renderWithFuri ? renderFuriganaStructured(part1) : part1;
        const part2Rendered = renderWithFuri ? renderFuriganaStructured(part2) : part2;

        // Combine the rendered parts with the interactive blank
        return (
            <>
                {part1Rendered}
                <span dangerouslySetInnerHTML={{ __html: blankContentHtml }} />
                {part2Rendered}
            </>
        );

    }, [item.question, item.question_reading_structured, item.answer, checked, input, showFuri]); // Depend on the new structured prop


    /* ------------------------------------------------------------------ */
    /* Toggles & Breakdown Parsing                                        */
    /* ------------------------------------------------------------------ */
    const togglePracticeBreakdown = () => {
        setShowBreakdown((v) => !v);
        if (!showBreakdown) { // If opening practice breakdown
            setShowCard(false);
            setShowCardBreakdown(false);
        }
    };

    const toggleFullFlashcard = () => {
        setShowCard((prev) => {
            const next = !prev;
            if (!next) setShowCardBreakdown(false); // Closing card? Close its breakdown
            if (next) setShowBreakdown(false);      // Opening card? Close practice breakdown
            return next;
        });
    };

    const toggleFlashcardBreakdown = () => {
        setShowCardBreakdown((b) => !b);
    };

    // Safely parse JSON, returning null on error
    const safeParseJson = (jsonStringOrObject) => {
        if (!jsonStringOrObject) return null;
        if (typeof jsonStringOrObject === 'object') return jsonStringOrObject; // Already an object
        try {
            return JSON.parse(jsonStringOrObject);
        } catch (e) {
            console.error("Failed to parse JSON:", e, jsonStringOrObject);
            return null;
        }
    };

    // Use useMemo for potentially expensive parsing
    const practiceBreakdownParsed = useMemo(() => safeParseJson(item.breakdown), [item.breakdown]);
    const flashcardBreakdownParsed = useMemo(() => safeParseJson(item.content?.breakdown), [item.content?.breakdown]);


    /* ------------------------------------------------------------------ */
    /* Render Component JSX                                               */
    /* ------------------------------------------------------------------ */
    return (
        <>
            {/* ─────────────── Question card ─────────────── */}
            <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8">

                {/* Main Sentence Display (uses the 'sentenceDisplay' variable) */}
                <div className="text-center text-2xl sm:text-3xl leading-loose break-words mb-4">
                    {sentenceDisplay}
                </div>

                {/* English Hint */}
                {showEnglish && (
                    <p className="mt-4 text-center text-base text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-3">
                        {item.english}
                    </p>
                )}

                {/* Show/Hide English Button (only before checking) */}
                {!checked && (
                    <button
                        onClick={() => setShowEng((v) => !v)}
                        className="mt-4 block mx-auto text-sm text-blue-600 hover:text-blue-800"
                    >
                        {showEnglish ? "Hide English" : "Need a hint? Show English"}
                    </button>
                )}

                {/* Input / Result Display */}
                <div className="mt-6">
                    {!checked ? (
                        <input
                            autoFocus
                            value={input}
                            onChange={handleInput}
                            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                            placeholder="タイプしてください…" // Type here...
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            lang="ja" // Hint for input method
                        />
                    ) : (
                        <p
                            className={`text-center text-xl font-semibold ${isCorrect ? "text-green-600" : "text-red-600"
                                }`}
                        >
                            {isCorrect ? "Correct ✔︎" : "Wrong ✖︎"}
                        </p>
                    )}
                </div>
            </div>

            {/* ─────────────── Action buttons / toggles (After Check) ─────────────── */}
            {checked && (
                <>
                    <div className="flex flex-wrap justify-center gap-4 mt-6">
                        {/* Practice Sentence Breakdown Button */}
                        {practiceBreakdownParsed && (
                            <button
                                onClick={togglePracticeBreakdown}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
                            >
                                {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
                            </button>
                        )}

                        {/* Full Flashcard Toggle Button */}
                        {item.flashcard_id && ( // Only show if linked to a flashcard
                            <button
                                onClick={toggleFullFlashcard}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-600 transition"
                            >
                                {showCard ? "Hide Flashcard" : "Show Flashcard"}
                            </button>
                        )}
                    </div>

                    {/* ───────── Practice Sentence Breakdown Panel ───────── */}
                    {showBreakdown && practiceBreakdownParsed && (
                        <div className="w-full px-4 md:px-8 lg:px-16 mt-4">
                            <ExampleBreakdown breakdown={practiceBreakdownParsed} />
                        </div>
                    )}
                    {/* Show error if parsing failed but data existed */}
                    {showBreakdown && !practiceBreakdownParsed && item.breakdown && (
                        <p className="text-center text-red-600 mt-4">Could not load breakdown 😢</p>
                    )}


                    {/* ───────── Full Flashcard & Its Own Breakdown ───────── */}
                    {showCard && item.flashcard_id && ( // Check flashcard_id exists
                        <div className="mt-4 w-full max-w-xl mx-auto">
                            <Flashcard
                                flashcard={{
                                    flashcard_id: item.flashcard_id,
                                    type: item.type, // Pass type if available on item
                                    content: item.content, // Pass content if available on item
                                }}
                                hideActions={true}
                                enableInternalBreakdown={false} // Keep this false unless Flashcard component handles the structured reading
                            />
                        </div>
                    )}

                    {/* Button that opens the *Flashcard's* breakdown */}
                    {showCard && flashcardBreakdownParsed && (
                        <div className="w-full bg-gray-100 py-3 mt-4 flex justify-center">
                            <button
                                onClick={toggleFlashcardBreakdown}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
                            >
                                {showCardBreakdown ? "Hide Breakdown" : "Show Breakdown"}
                            </button>
                        </div>
                    )}

                    {/* Wide Flashcard Breakdown Panel */}
                    {showCard && showCardBreakdown && flashcardBreakdownParsed && (
                        <div className="w-screen relative left-1/2 -translate-x-1/2 bg-gray-100 py-6">
                            <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-16">
                                <ExampleBreakdown breakdown={flashcardBreakdownParsed} />
                            </div>
                        </div>
                    )}
                    {/* Show error if parsing failed but data existed */}
                    {showCard && showCardBreakdown && !flashcardBreakdownParsed && item.content?.breakdown && (
                        <p className="text-center text-red-600 mt-4">Could not load flashcard breakdown 😢</p>
                    )}
                </>
            )}

            {/* ─────────────── Navigation Buttons ─────────────── */}
            {checked ? (
                // "Next" button after checking
                <div className="flex justify-center gap-4 mt-8">
                    <button
                        onClick={() => onAnswer(isCorrect)} // Call parent handler
                        className="px-8 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-lg shadow-md transition"
                    >
                        Next
                    </button>
                </div>
            ) : (
                // "Check" button before checking
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