// const ExampleBreakdown = ({ breakdown }) => {
//     if (!breakdown) {
//       return <p className="text-gray-500 italic">No breakdown available.</p>;
//     }
  
//     return (
//       <div className="flex justify-center">
//         <div className="w-full max-w-6xl bg-white shadow-lg rounded-lg p-6 mt-4 text-left">
//           <h2 className="text-2xl font-bold text-gray-800">Sentence Breakdown</h2>
          
//           {/* Example Sentence Translation */}
//           {breakdown.exampleTranslation && (
//             <div className="mt-4">
//               <h3 className="text-xl font-semibold text-indigo-600">Sentence Translation</h3>
//               <p className="text-gray-700">{breakdown.exampleTranslation}</p>
//             </div>
//           )}
  
//           {/* Vocabulary Breakdown */}
//           <div className="mt-4">
//             <h3 className="text-xl font-semibold text-blue-600">Vocabulary</h3>
//             <ul className="list-disc list-inside text-gray-700">
//               {breakdown.vocabulary.map((item, index) => (
//                 <li key={index} className="py-1">
//                   <strong>{item.word}</strong> - {item.meaning} 
//                   <span className="text-gray-500"> ({item.description})</span>
//                 </li>
//               ))}
//             </ul>
//           </div>
  
//           {/* Grammar Explanation */}
//           <div className="mt-4">
//             <h3 className="text-xl font-semibold text-green-600">Grammar Explanation</h3>
//             <p className="text-gray-700">{breakdown.grammar.context}</p>
  
//             <h4 className="text-lg font-semibold mt-3">Steps</h4>
//             <ul className="list-decimal list-inside text-gray-700">
//               {breakdown.grammar.steps.map((step, index) => (
//                 <li key={index} className="py-1">{step}</li>
//               ))}
//             </ul>
//           </div>
  
//           {/* Beginner Tips */}
//           <div className="mt-4">
//             <h3 className="text-xl font-semibold text-purple-600">Beginner Tips</h3>
//             <ul className="list-disc list-inside text-gray-700">
//               {breakdown.tips.map((tip, index) => (
//                 <li key={index} className="py-1">{tip}</li>
//               ))}
//             </ul>
//           </div>
//         </div>
//       </div>
//     );
//   };
  
//   export default ExampleBreakdown;  

const ExampleBreakdown = ({ breakdown }) => {
    if (!breakdown) {
      return <p className="text-gray-500 italic">No breakdown available.</p>;
    }
  
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-6xl bg-white shadow-lg rounded-lg p-6 mt-4 text-left">
          {/* Centered Header */}
          <h2 className="text-2xl font-bold text-gray-800 text-center">
            Sentence Breakdown
          </h2>
  
          {/* Centered Example Sentence Translation */}
          {breakdown.exampleTranslation && (
            <div className="mt-4 text-center">
              <h3 className="text-xl font-semibold text-indigo-600">
                Sentence Translation
              </h3>
              <p className="text-gray-700">{breakdown.exampleTranslation}</p>
            </div>
          )}
  
          {/* Grid for Vocabulary, Grammar, and Tips */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vocabulary Breakdown */}
            <div>
              <h3 className="text-xl font-semibold text-blue-600 text-center">Vocabulary</h3>
              <ul className="list-disc list-inside text-gray-700">
                {breakdown.vocabulary.map((item, index) => (
                  <li key={index} className="py-1">
                    <strong>{item.word}</strong> - {item.meaning}{" "}
                    <span className="text-gray-500">({item.description})</span>
                  </li>
                ))}
              </ul>
            </div>
  
            {/* Grammar Explanation */}
            <div>
              <h3 className="text-xl font-semibold text-green-600 text-center">
                Grammar Explanation
              </h3>
              <p className="text-gray-700">{breakdown.grammar.context}</p>
  
              <h4 className="text-lg font-semibold mt-3">Steps</h4>
              <ul className="list-decimal list-inside text-gray-700">
                {breakdown.grammar.steps.map((step, index) => (
                  <li key={index} className="py-1">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
  
            {/* Beginner Tips */}
            <div>
              <h3 className="text-xl font-semibold text-purple-600 text-center">
                Beginner Tips
              </h3>
              <ul className="list-disc list-inside text-gray-700">
                {breakdown.tips.map((tip, index) => (
                  <li key={index} className="py-1">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default ExampleBreakdown;
  