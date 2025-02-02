// import { useState } from "react";
// import ExampleBreakdown from "./ExampleBreakdown";

// const Flashcard = ({ word, meaning, reading, example, audioUrl, breakdown }) => {
//     const [showBreakdown, setShowBreakdown] = useState(false);

//     return (
//       <div className="w-full mx-auto bg-white shadow-md py-6 text-center">
//         {/* Reading */}
//         {reading && <p className="text-2xl text-gray-600 mt-2">{reading}</p>}

//         {/* Word */}
//         <h1 className="text-8xl font-bold text-gray-800">{word}</h1>
  
//         {/* Meaning */}
//         <p className="text-4xl text-gray-700 pt-12 pb-8 font-semibold">{meaning}</p>
  
//         {/* Example Sentence */}
//         {example && (
//           <p className="text-xl pt-6 border-t border-gray-300">
//             <span className="not-italic text-gray-700">Example Sentence:</span> <span className="italic text-gray-500">{example}</span>
//           </p>
//         )}
  
//         {/* Audio Button
//         {audioUrl && (
//           <button
//             onClick={() => new Audio(audioUrl).play()}
//             className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
//           >
//             🔊 Play Audio
//           </button>
//         )} */}

//         {/* Breakdown Section */}
//         {/* Show Breakdown Button */}
//         <div className="w-full bg-gray-100 py-3 mt-6 flex justify-center">
//           <button
//             onClick={() => setShowBreakdown(!showBreakdown)}
//             className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
//           >  
//             {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
//           </button>
//         </div>

//         {/* Breakdown (Only Show When Button is Clicked) */}
//         {showBreakdown && <ExampleBreakdown breakdown={breakdown} />}
        
//       </div>
//     );
//   };
  
//   export default Flashcard;

import { useState } from "react";
import ExampleBreakdown from "./ExampleBreakdown";

const Flashcard = ({ word, meaning, reading, example, audioUrl, breakdown }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="w-full mx-auto bg-white shadow-md py-6 text-center">
      {/* Reading */}
      {reading && <p className="text-2xl text-gray-600 mt-2">{reading}</p>}

      {/* Word */}
      <h1 className="text-8xl font-bold text-gray-800">{word}</h1>

      {/* Meaning */}
      <p className="text-4xl text-gray-700 pt-12 pb-8 font-semibold">{meaning}</p>

      {/* Example Sentence */}
      {example && (
        <p className="text-xl pt-6 border-t border-gray-300">
          <span className="not-italic text-gray-700">Example Sentence:</span>{" "}
          <span className="italic text-gray-500">{example}</span>
        </p>
      )}

      {/* Knowledge Selection Buttons */}
      <div className="flex justify-center space-x-4 mt-6">
        <button
          className="px-6 py-3 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
        >
          ✅ Already Know
        </button>
        <button
          className="px-6 py-3 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
        >
          ❌ Need to Learn
        </button>
      </div>

      {/* Show Breakdown Button */}
      <div className="w-full bg-gray-100 py-3 mt-6 flex justify-center">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
        >
          {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
        </button>
      </div>

      {/* Breakdown (Only Show When Button is Clicked) */}
      {showBreakdown && <ExampleBreakdown breakdown={breakdown} />}
    </div>
  );
};

export default Flashcard;
