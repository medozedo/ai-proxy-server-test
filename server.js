/**
 * Generic AI Proxy Server
 * 
 * Secure backend proxy for AI services with rate limiting
 * No project-specific data or references
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration for multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  process.env.FRONTEND_URL,
  // Add more origins as needed
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  message: { error: 'AI rate limit exceeded, please wait.' }
});

app.use(globalRateLimit);

// Usage tracking (in-memory)
let usage = {
  totalRequests: 0,
  activeIPs: new Set(),
  errors: 0,
  startTime: new Date()
};

// Middleware to track usage
const trackUsage = (provider) => (req, res, next) => {
  usage.totalRequests++;
  usage.activeIPs.add(req.ip);
  req.provider = provider;
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  const uptime = Math.floor((Date.now() - usage.startTime.getTime()) / 1000);
  res.json({
    status: 'healthy',
    uptime: `${Math.floor(uptime / 60)} minutes`,
    usage: {
      totalRequests: usage.totalRequests,
      activeIPs: usage.activeIPs.size,
      errors: usage.errors
    },
    providers: {
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
      groq: process.env.GROQ_API_KEY ? 'configured' : 'not configured',
      huggingface: process.env.HUGGINGFACE_API_KEY ? 'configured' : 'not configured'
    }
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    usage: {
      totalRequests: usage.totalRequests,
      activeIPs: usage.activeIPs.size,
      errors: usage.errors
    },
    rateLimit: {
      global: '100 requests per 15 minutes',
      ai: '15 requests per minute'
    },
    providers: {
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
      groq: process.env.GROQ_API_KEY ? 'configured' : 'not configured',
      huggingface: process.env.HUGGINGFACE_API_KEY ? 'configured' : 'not configured'
    }
  });
});

// Generic AI proxy function
async function callAIProvider(provider, request) {
  const { systemPrompt, userPrompt, maxTokens = 1000, temperature = 0.7 } = request;

  try {
    let response;
    
    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `${systemPrompt}\n\nUser: ${userPrompt}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      response = {
        answer: text,
        provider: 'Google Gemini',
        model: 'gemini-1.5-flash',
        usage: {
          promptTokens: prompt.length / 4,
          completionTokens: text.length / 4,
          totalTokens: (prompt.length + text.length) / 4
        },
        timestamp: new Date().toISOString()
      };
    } else if (provider === 'groq' && process.env.GROQ_API_KEY) {
      // Groq implementation would go here
      throw new Error('Groq provider not implemented yet');
    } else if (provider === 'huggingface' && process.env.HUGGINGFACE_API_KEY) {
      // Hugging Face implementation would go here
      throw new Error('Hugging Face provider not implemented yet');
    } else {
      throw new Error(`Provider ${provider} not configured or not supported`);
    }

    return response;
  } catch (error) {
    usage.errors++;
    throw error;
  }
}

// AI endpoints
app.post('/api/ai/gemini', aiRateLimit, trackUsage('gemini'), async (req, res) => {
  try {
    const response = await callAIProvider('gemini', req.body);
    res.json(response);
  } catch (error) {
    console.error('Gemini API error:', error.message);
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      details: error.message,
      provider: 'gemini'
    });
  }
});

app.post('/api/ai/groq', aiRateLimit, trackUsage('groq'), async (req, res) => {
  try {
    const response = await callAIProvider('groq', req.body);
    res.json(response);
  } catch (error) {
    console.error('Groq API error:', error.message);
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      details: error.message,
      provider: 'groq'
    });
  }
});

app.post('/api/ai/huggingface', aiRateLimit, trackUsage('huggingface'), async (req, res) => {
  try {
    const response = await callAIProvider('huggingface', req.body);
    res.json(response);
  } catch (error) {
    console.error('Hugging Face API error:', error.message);
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      details: error.message,
      provider: 'huggingface'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  usage.errors++;
  console.error('Server error:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Proxy Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`🔒 Security: Rate limiting and CORS enabled`);
  
  const configuredProviders = [];
  if (process.env.GEMINI_API_KEY) configuredProviders.push('Gemini');
  if (process.env.GROQ_API_KEY) configuredProviders.push('Groq');
  if (process.env.HUGGINGFACE_API_KEY) configuredProviders.push('Hugging Face');
  
  console.log(`🤖 Configured AI providers: ${configuredProviders.join(', ') || 'None'}`);
});
