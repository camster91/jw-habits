/**
 * Ollama Cloud / Local API Integration
 *
 * Supports both Ollama Cloud (ollama.com) and local Ollama servers.
 * Uses the native /api/chat endpoint format.
 *
 * Configuration:
 *   VITE_OLLAMA_BASE_URL - Base URL (default: https://ollama.com for cloud, http://localhost:11434 for local)
 *   VITE_OLLAMA_API_KEY  - API key for Ollama Cloud (required for cloud, not needed for local)
 *   VITE_OLLAMA_MODEL    - Default model (default: llama3.2)
 */

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'https://ollama.com';
const OLLAMA_API_KEY = import.meta.env.VITE_OLLAMA_API_KEY || '';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2';

/**
 * Check if Ollama Cloud is configured (has an API key)
 */
export function isOllamaConfigured() {
  return !!OLLAMA_API_KEY || OLLAMA_BASE_URL.includes('localhost');
}

/**
 * Get the list of available models from Ollama
 */
export async function listModels() {
  const headers = { 'Content-Type': 'application/json' };
  if (OLLAMA_API_KEY) {
    headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { headers });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.models || [];
}

/**
 * Send a chat message to Ollama
 *
 * @param {Array} messages - Chat history [{role: 'user'|'assistant'|'system', content: '...'}]
 * @param {string} userMessage - The new user message
 * @param {Object} options - Optional overrides {model, system, stream, format, options}
 * @returns {Promise<string>} The assistant's response text
 */
export async function chatWithOllama(messages, userMessage, options = {}) {
  const model = options.model || OLLAMA_MODEL;
  const headers = { 'Content-Type': 'application/json' };
  if (OLLAMA_API_KEY) {
    headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
  }

  const contents = [];

  // Add system prompt if provided
  if (options.system) {
    contents.push({ role: 'system', content: options.system });
  }

  // Add conversation history
  if (messages && messages.length > 0) {
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'assistant' : msg.role,
        content: msg.content,
      });
    }
  }

  // Add the new user message
  contents.push({ role: 'user', content: userMessage });

  const body = {
    model,
    messages: contents,
    stream: false,
    ...(options.format && { format: options.format }),
    ...(options.options && { options: options.options }),
  };

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Ollama API error ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage += `: ${errorJson.error || errorJson.message || ''}`;
    } catch {
      errorMessage += `: ${errorText.substring(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const text = data.message?.content;
  if (!text) throw new Error('No response from Ollama');

  return text;
}

/**
 * Send a chat message using the OpenAI-compatible endpoint
 * Useful for tools/libraries that expect OpenAI-format responses
 *
 * @param {Array} messages - OpenAI-format messages
 * @param {Object} options - Optional overrides
 * @returns {Promise<Object>} OpenAI-format response
 */
export async function chatWithOllamaOpenAI(messages, options = {}) {
  const model = options.model || OLLAMA_MODEL;
  const headers = { 'Content-Type': 'application/json' };
  if (OLLAMA_API_KEY) {
    headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
  }

  const baseUrl = OLLAMA_BASE_URL.replace('/api', '').replace(':11434', ':11434');

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      ...(options.temperature && { temperature: options.temperature }),
      ...(options.max_tokens && { max_tokens: options.max_tokens }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama OpenAI API error ${response.status}: ${errorText.substring(0, 200)}`);
  }

  return response.json();
}

/**
 * Popular Ollama Cloud models for easy reference
 */
export const OLLAMA_CLOUD_MODELS = {
  // Cloud-optimized models (require API key)
  'llama3.2': { name: 'Llama 3.2', size: '3B', description: 'Fast general-purpose model' },
  'llama3.3': { name: 'Llama 3.3', size: '70B', description: 'Powerful general-purpose model' },
  'llama4-scout': { name: 'Llama 4 Scout', size: '17B/16E', description: 'Multimodal reasoning' },
  'llama4-maverick': { name: 'Llama 4 Maverick', size: '17B/128E', description: 'Advanced reasoning' },
  'mistral-small3.1': { name: 'Mistral Small 3.1', size: '24B', description: 'Efficient and capable' },
  'qwen3': { name: 'Qwen 3', size: '8B', description: 'Multilingual reasoning' },
  'gemma3': { name: 'Gemma 3', size: '4B-27B', description: 'Google lightweight model' },
  'deepseek-r1': { name: 'DeepSeek R1', size: '8B-671B', description: 'Reasoning specialist' },
  'phi4': { name: 'Phi-4', size: '14B', description: 'Microsoft small but mighty' },
  'codellama': { name: 'Code Llama', size: '7B-34B', description: 'Code generation model' },
  // Cloud-only models (-cloud suffix)
  'gpt-oss:120b-cloud': { name: 'GPT-OSS 120B', size: '120B', description: 'Cloud-only flagship' },
  'qwen3-coder:480b-cloud': { name: 'Qwen3 Coder', size: '480B', description: 'Cloud-only code model' },
  'deepseek-v3.1:671b-cloud': { name: 'DeepSeek V3.1', size: '671B', description: 'Cloud-only large model' },
};

export default chatWithOllama;