# Generic AI Proxy Server

A secure, rate-limited proxy server for AI services.

## Features

- 🔒 **Secure API key management**
- ⚡ **Rate limiting** (15 requests/minute)
- 🛡️ **CORS protection**
- 📊 **Usage tracking**
- 🚀 **Multiple AI providers**

## Supported Providers

- Google Gemini
- Groq (coming soon)
- Hugging Face (coming soon)

## Quick Start

```bash
npm install
npm start
```

## Environment Variables

```env
GEMINI_API_KEY=your_gemini_key
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

- `POST /api/ai/gemini` - Gemini AI
- `GET /health` - Health check
- `GET /api/stats` - Usage statistics

## Request Format

```json
{
  "systemPrompt": "You are a helpful assistant",
  "userPrompt": "Hello!",
  "maxTokens": 1000,
  "temperature": 0.7
}
```

## License

MIT
