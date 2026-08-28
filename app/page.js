'use client';

import { useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';



export default function Home() {
  const { status, messages, sendMessage } = useChat();
  const [input, setInput] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage({ text: input.trim() });
    setInput('');
  };

  const renderMessageText = (message) => {
  return message.parts?.map((part, index) => {
    if (part.type === 'text') {
      return <div key={`${message.id}-text-${index}`}>{part.text}</div>;
    }

    // for the reply from the assistant, we are using the result from the tool execution. Do not know why the model is not giving a human
    // readable sentence using the tool's output.

    if (part.type === 'tool-getWeather') {
      const output = part.output;
      if (output === undefined) {
        // populating output field in message.parts is taking sometime. it can be undefined for a moment. so we can return null here and wait for the next render.
        return null;
      }
      return (
        <div key={`${message.id}-tool-${index}`}>
          The weather in {output.city} is {output.temperature === 'N/A' ? 'unavailable' : `${output.temperature} and ${output.condition.toLowerCase()}`}.
        </div>
      );
    }

    return null;
  });
};

  return (
    <main className="max-w-2xl mx-auto p-4 flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg ${
              m.role === 'user'
                ? 'bg-blue-100 text-blue-900 ml-auto max-w-xs'
                : 'bg-gray-100 text-gray-900 mr-auto max-w-md'
            }`}
          >
            <span className="font-bold capitalize">{m.role}: </span>
            {renderMessageText(m)}
          </div>
        ))}
      </div>
      
      {(status === 'submitted' || status === 'streaming') && (
        <div className="text-sm text-gray-600 italic">
            fetching the weather...
        </div>
      )}

      {status === 'error' && (
        <div className="text-sm text-red-600 italic">
          facing some issue. reload this page and ask again!
        </div>
      )}


      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the weather of a city!..."
          className="flex-1 border p-2 rounded text-black"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Send
        </button>
      </form>
    </main>
  );
}