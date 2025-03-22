const ExampleBreakdown = ({ breakdown }) => {
  if (!breakdown) {
    return <p className="text-gray-500 italic text-center">No breakdown available.</p>;
  }

  const { tips, grammar, vocabulary } = breakdown;

  return (
    <div className="w-full max-w-6xl mx-auto bg-white shadow-lg rounded-lg p-6 mt-4 text-left">
      {/* Header */}
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Sentence Breakdown</h2>

      {/* Breakdown Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vocabulary */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-600 text-center mb-2">Vocabulary</h3>
          <ul className="space-y-2 text-gray-700">
            {vocabulary?.map((item, index) => (
              <li key={index}>
                <strong>{item.word}</strong>
                {item.reading && item.reading !== item.word && (
                  <span className="ml-2 text-sm text-gray-500">({item.reading})</span>
                )}
                {" "}- {item.meaning}
                {item.role && (
                  <span className="ml-2 inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {item.role}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Grammar */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-green-600 text-center mb-2">Grammar Explanation</h3>
          {grammar?.context && (
            <p className="text-gray-700 mb-3">{grammar.context}</p>
          )}
          {grammar?.steps?.length > 0 && (
            <>
              <h4 className="text-lg font-semibold mb-2">Steps</h4>
              <ul className="space-y-2 text-gray-700">
                {grammar.steps.map((step, index) => {
                  // Replace **word** with highlighted styled spans
                  const formattedStep = step.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
                    return `<span class="inline-block bg-green-200 text-green-800 font-semibold px-2 py-0.5 rounded-md mr-1">${p1}</span>`;
                  });

                  return (
                    <li
                      key={index}
                      className="border-l-4 border-green-400 pl-3 bg-green-100 rounded p-2 shadow-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formattedStep }}
                    />
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Tips */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-purple-600 text-center mb-2">Tips</h3>

          {tips?.tip && (
            <div className="mb-2">
              <span className="font-semibold text-purple-500">💡 TIP:</span> {tips.tip}
            </div>
          )}
          {tips?.common_mistake && (
            <div className="mb-4">
              <span className="font-semibold text-red-500">⚠️ COMMON MISTAKE:</span> {tips.common_mistake}
            </div>
          )}

          {/* Alternative Expression */}
          {tips?.alternative_expression && (
            <div className="mt-4 bg-white p-3 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-purple-600 mb-2">Alternative Expression</h3>
              <p className="text-gray-700"><strong>Kanji:</strong> {tips.alternative_expression.kanji}</p>
              <p className="text-gray-700"><strong>Hiragana:</strong> {tips.alternative_expression.hiragana}</p>
              <p className="text-gray-700"><strong>English:</strong> {tips.alternative_expression.english}</p>
            </div>
          )}

          {/* New Words in Alternative */}
          {tips?.new_words_in_alternative?.length > 0 && (
            <div className="mt-4 bg-white p-3 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-purple-600 mb-2">New Words in Alternative Expression</h3>
              <ul className="space-y-2 text-gray-700">
                {tips.new_words_in_alternative.map((wordObj, index) => (
                  <li key={index}>
                    <span className="font-semibold">{wordObj.word}</span> - {wordObj.meaning}
                    {wordObj.reading && (
                      <span className="ml-1 text-gray-500">({wordObj.reading})</span>
                    )}
                    {wordObj.description && (
                      <span className="ml-2 inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {wordObj.description}
                      </span>
                    )}
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
