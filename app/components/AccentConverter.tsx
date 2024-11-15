'use client'
import { useState } from 'react';

const texanPatterns = {
  'you all': "y'all",
  'going to': 'gonna',
  'want to': 'wanna',
  'hello': 'howdy',
  'yes': 'yup',
  'my': 'mah',
  'the': 'tha',
  'your': 'yer',
  'you': "y'all",
  'about': "'bout",
  'them': "'em",
  'nothing': "nothin'",
  'something': "somethin'",
  'ing ': "in' ",
  'ing.': "in'.",
  'ing,': "in',",
  'friend': 'pardner',
  'friends': 'pardners',
  'very': 'mighty',
  'really': 'mighty',
  'goodbye': 'see y\'all later',
};

export default function AccentConverter() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');

  const convertToTexan = (text: string) => {
    let result = text.toLowerCase();
    
    // Apply each pattern replacement
    Object.entries(texanPatterns).forEach(([pattern, replacement]) => {
      result = result.replace(new RegExp(pattern, 'gi'), replacement);
    });

    // Add some common Texan phrases randomly
    const texanPhrases = [
      " I reckon",
      " bless your heart",
      " fixin' to",
    ];

    // Randomly add phrases at sentence ends
    result = result.replace(/\./g, (match) => {
      return Math.random() < 0.3 
        ? `, ${texanPhrases[Math.floor(Math.random() * texanPhrases.length)]}${match}`
        : match;
    });

    return result;
  };

  const handleConvert = () => {
    const converted = convertToTexan(inputText);
    setOutputText(converted);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-200 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-brown-900 mb-8 text-center">
          Texan Accent Converter
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Enter your text:
          </label>
          <textarea
            className="w-full h-32 p-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type something here..."
          />
          
          <button
            className="w-full bg-amber-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors"
            onClick={handleConvert}
          >
            Convert to Texan
          </button>
        </div>

        {outputText && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-gray-700 text-sm font-bold mb-2">
              Texan Version:
            </h2>
            <div className="p-3 bg-amber-50 rounded-lg whitespace-pre-wrap">
              {outputText}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Note: This is a fun approximation of a Texan accent in text form.</p>
          <p>Real Texas accents are much more nuanced and varied!</p>
        </div>
      </div>
    </div>
  );
} 