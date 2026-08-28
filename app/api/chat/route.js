import { createOpenAI } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  tool,
} from 'ai';
import { z } from 'zod';

const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
});

function weatherConditon(code) {
  if (code >= 0 && code <= 19) {
    return 'No precipitation, general cloud changes, or haze';
  } else if (code >= 50 && code <= 59) {
    return 'Drizzle or ice buildup';
  } else if (code >= 60 && code <= 69) {
    return 'Rain (slight, moderate, or heavy)';
  } else if (code >= 70 && code <= 79) {
    return 'Snow or ice pellets';
  } else if (code >= 80 && code <= 99) {
    return 'Showers, thunderstorms, or severe weather';
  }
  return 'Unknown weather condition';
}


export async function POST(req) {
  console.log('=== CHAT API POST START ===');

  try {
    const body = await req.json();
    const { messages } = body;

    console.log('Incoming request messages:', JSON.stringify(messages, null, 2));

    if (!Array.isArray(messages)) {
      console.error('Invalid request payload: messages is not an array', body);
      return Response.json({ error: 'messages must be an array' }, { status: 400 });
    }

    // Filter and validate messages - remove unsupported content types
    const cleanedMessages = messages.map(msg => ({
      ...msg,
      content: Array.isArray(msg.content) 
        ? msg.content.filter(item => {
            // Only allow text content for Ollama compatibility
            if (typeof item === 'string') return true;
            if (item.type === 'text') return true;
            // Warn about unsupported types
            if (item.type && item.type !== 'text') {
              console.warn(`Filtering out unsupported content type: ${item.type}`);
            }
            return false;
          })
        : msg.content
    }));

    console.log('Cleaned messages:', JSON.stringify(cleanedMessages, null, 2));

    const modelMessages = await convertToModelMessages(cleanedMessages);
    console.log('Model messages prepared:', JSON.stringify(modelMessages, null, 2));

    const result = streamText({
      model: ollama('qwen2.5:3b'),
      messages: modelMessages,
      system:
        'You are a chat AI agent. You are going to assist real humans. Use the tool if needed to get some information and then provide the answer in a human-readable sentence.',
      tools: {
        getWeather: tool({
          description: 'Get the weather for a city',
          parameters: z.object({ city: z.string() }),
          execute: async ({ city }) => {

            const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}`, { method: 'GET' });
            const payload = await response.json();
            console.log('getting longitude and latitude for city:', city);
            console.log(payload.results[0]);
            const { latitude, longitude } = payload.results[0];
            const response2 = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            const weatherData = await response2.json();
            console.log('getting weather for city:', city);
            console.log(weatherData);
            return {
              city: city,
              temperature: String(weatherData.current_weather.temperature) + " " + String(weatherData.current_weather_units.temperature),
              condition: weatherConditon(weatherData.current_weather.weathercode),
            };
          },
        }),
      },
      onStepFinish({ steps, text }) {
        console.log('MODEL STEP FINISHED');
        console.log('Step text:', text);
        console.log('Step details:', steps);
      },
      onChunk({ chunk }) {
        console.log('STREAM CHUNK:', chunk.type, chunk);
      },
      onError(error) {
        console.error('STREAM TEXT ERROR:', {
          message: error.message,
          name: error.name,
          code: error.code,
          status: error.status,
          fullError: error
        });
        throw error; // Re-throw so it gets caught by the outer catch
      },
    });

    console.log('StreamText created successfully with local Ollama model qwen2.5:3b');

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: messages,
      }),
    });
  } catch (error) {
    console.error('CHAT API POST FATAL ERROR:', error);
    return Response.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}