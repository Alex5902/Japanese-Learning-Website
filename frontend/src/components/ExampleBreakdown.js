const ExampleBreakdown = ({ breakdown }) => {
  if (!breakdown) {
    return <p className="text-gray-500 italic text-center">No breakdown available.</p>;
  }

  const { tips, grammar, vocabulary } = breakdown;

  return (
    <div className="w-full max-w-6xl mx-auto bg-white shadow-lg rounded-lg p-6 mt-4 text-left">
      {/* Header */}
      <h2 className="text-2xl font-bold text-gray-800 text-center">Sentence Breakdown</h2>

      {/* Sentence Pattern Example */}
      {grammar?.sentence_pattern && (
        <div className="mt-4 text-center bg-gray-100 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-indigo-600">Sentence Pattern</h3>
          <p className="text-gray-700">{grammar.sentence_pattern}</p>
        </div>
      )}

      {/* Breakdown Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vocabulary Breakdown */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-600 text-center">Vocabulary</h3>
          <ul className="list-disc list-inside text-gray-700">
            {vocabulary?.map((item, index) => (
              <li key={index} className="py-1">
                <strong>{item.word}</strong> - {item.meaning} 
                <span className="text-gray-500"> ({item.role})</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Grammar Explanation */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-green-600 text-center">Grammar Explanation</h3>
          <p className="text-gray-700">{grammar?.context}</p>
          <h4 className="text-lg font-semibold mt-3">Steps</h4>
          <ul className="list-decimal list-inside text-gray-700">
            {grammar?.steps?.map((step, index) => (
              <li key={index} className="py-1">{step}</li>
            ))}
          </ul>
        </div>

        {/* Tips & Common Mistakes */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-purple-600 text-center">Tips</h3>
          <ul className="list-disc list-inside text-gray-700">
            {tips && Object.entries(tips).map(([key, value], index) => (
              key !== "alternative_expression" && key !== "new_words_in_alternative" ? (
                <li key={index} className="py-1">
                  <strong>{key.replace("_", " ").toUpperCase()}:</strong> {value}
                </li>
              ) : null
            ))}
          </ul>

          {/* Alternative Expression Section */}
          {tips?.alternative_expression && (
            <div className="mt-4 bg-white p-3 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-purple-600">Alternative Expression</h3>
              <p className="text-gray-700"><strong>Kanji:</strong> {tips.alternative_expression.kanji}</p>
              <p className="text-gray-700"><strong>Hiragana:</strong> {tips.alternative_expression.hiragana}</p>
              <p className="text-gray-700"><strong>English:</strong> {tips.alternative_expression.english}</p>
            </div>
          )}

          {/* New Words in Alternative Expression */}
          {tips?.new_words_in_alternative?.length > 0 && (
            <div className="mt-4 bg-white p-3 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-purple-600">New Words in Alternative Expression</h3>
              <ul className="list-disc list-inside text-gray-700">
                {tips.new_words_in_alternative.map((wordObj, index) => (
                  <li key={index} className="py-1">
                    <strong>{wordObj.word}</strong> - {wordObj.meaning} 
                    <span className="text-gray-500"> ({wordObj.reading})</span>
                    <br />
                    <span className="text-sm text-gray-400 italic">{wordObj.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExampleBreakdown;
