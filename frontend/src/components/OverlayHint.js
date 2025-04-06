// File: /components/OverlayHint.js

import React from "react";

function OverlayHint({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      {/* Container for content */}
      <div className="relative w-full max-w-4xl flex items-center justify-center">
        
        {/* Left arrow area */}
        <div className="absolute left-0 flex flex-col items-center text-white animate-pulse cursor-default">
          <div className="text-8xl mb-2">←</div>
        </div>

        {/* Right arrow area */}
        <div className="absolute right-0 flex flex-col items-center text-white animate-pulse cursor-default">
          <div className="text-8xl mb-2">→</div>
        </div>

        {/* Center message box */}
        <div className="bg-white rounded-lg shadow-lg p-6 text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Use your Left or Right Arrow Keys
          </h2>
          <p className="text-gray-700">
            Press <strong>←</strong> for <em>Need to learn</em> 
             or <strong>→</strong> for <em>Already know</em>.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default OverlayHint;
