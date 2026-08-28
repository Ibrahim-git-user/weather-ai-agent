'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

export default function Home() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();

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

    if (part.type === 'tool-getWeather') {
      const output = part.output;
      console.log('Tool output for getWeather:');
      console.log(message.id + ' - ' + index);
      console.log(output);
      if (output === undefined) {
        return (
        <div key={`${message.id}-tool-${index}`}>
          The weather for this city is unavailable at this moment. try again after sometime.
        </div>
      );
      }
      return (
        <div key={`${message.id}-tool-${index}`}>
          The weather in {output.city} is {output.temperature} and {output.condition.toLowerCase()}.
        </div>
      );
    }

    if (part.type === 'tool-call') {
      return <div key={`${message.id}-call-${index}`}>Calling tool: {part.toolName}</div>;
    }

    return null;
  });
};

  const fun = (messages) => {
    console.log('messages: ');
    console.log(messages);
    return '';
  };

  return (
    <main className="max-w-2xl mx-auto p-4 flex flex-col h-screen">
      <p>{fun(messages)}</p>
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

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent something..."
          className="flex-1 border p-2 rounded text-black"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Send
        </button>
      </form>
    </main>
  );
}