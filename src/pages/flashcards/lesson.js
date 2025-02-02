import Header from "../../components/Header";
import Flashcard from "../../components/Flashcard";
import "../../styles/globals.css";

const FlashcardLesson = () => {
  // Example flashcard data 
  const flashcardData = {
    word: "猫",
    meaning: "Cat",
    reading: "ねこ",
    example: "猫がいます。",
    audioUrl: "/audio/neko.mp3",
  };

  const exampleBreakdown = {
    exampleTranslation: "10 years have passed since then.",
    vocabulary: [
      { word: "それから", meaning: "since then", description: "Phrase indicating a time reference" },
      { word: "10年", meaning: "10 years", description: "Noun, indicating a duration of time" },
      { word: "が", meaning: "(ga)", description: "Particle indicating the subject of the sentence" },
      { word: "経った", meaning: "have passed", description: "Verb, past tense of '経つ' (tatsu), meaning to pass or elapse" }
    ],
    grammar: {
      context: "The sentence 'それから10年が経った' expresses that a duration of 10 years has elapsed since a specific point in time.",
      steps: [
        "それから (sore kara): Introduces a temporal context, indicating what follows is related to time after a previously mentioned point.",
        "10年 (juu nen): Specifies the duration of time that has passed, functioning as the subject.",
        "が (ga): Marks '10年' as the subject, clarifying what is being discussed in relation to the verb.",
        "経った (tatta): The verb indicating the action of passing time, in the past tense."
      ]
    },
    tips: [
      "Think of 'それから' as a marker that points to a starting point in time, followed by the duration.",
      "A common mistake is misplacing 'が' or confusing it with 'は'. Remember, 'が' marks the subject of the sentence."
    ]
  };
  
  

  return (
    <div className="lesson-page flex flex-col items-center min-h-screen bg-gray-100">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="content flex justify-center w-full">
        <Flashcard {...flashcardData} breakdown={exampleBreakdown} />
      </main>
    </div>
  );
};

export default FlashcardLesson;

// import { useState, useEffect } from "react";
// import Header from "../../components/Header";
// import Flashcard from "../../components/Flashcard";
// import "../../styles/globals.css";

// const FlashcardLesson = () => {
//   const [flashcard, setFlashcard] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     // Fetch flashcards from API
//     fetch("/api/flashcards/lesson") // Replace with your actual API endpoint
//       .then((res) => {
//         if (!res.ok) throw new Error("Failed to fetch flashcards");
//         return res.json();
//       })
//       .then((data) => {
//         setFlashcard(data.flashcards[0]); // Get the first flashcard
//         setLoading(false);
//       })
//       .catch((err) => {
//         setError(err.message);
//         setLoading(false);
//       });
//   }, []);

//   return (
//     <div className="lesson-page flex flex-col items-center min-h-screen bg-gray-100">
//       {/* Header */}
//       <Header />

//       {/* Main Content */}
//       <main className="content flex justify-center w-full">
//         {loading ? (
//           <p className="text-gray-600">Loading flashcards...</p>
//         ) : error ? (
//           <p className="text-red-600">{error}</p>
//         ) : (
//           <Flashcard {...flashcard} />
//         )}
//       </main>
//     </div>
//   );
// };

// export default FlashcardLesson;
