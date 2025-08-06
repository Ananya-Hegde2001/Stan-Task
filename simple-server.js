const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Test the Gemini service
async function testGemini(message) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      return 'Hello! I am STAN, your AI assistant. However, I am currently running without my full AI capabilities. How can I help you today?';
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `You are STAN, a friendly AI chatbot assistant. Respond naturally to this message: "${message}"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error('Gemini error:', error.message);
    return `Hello! I'm STAN, your AI assistant. I encountered a technical issue, but I'm here to help. You said: "${message}". How can I assist you today?`;
  }
}

// Simple chat endpoint
app.post('/api/chat/message', async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log('Received message:', message);
    
    const response = await testGemini(message);
    
    res.json({
      message: response,
      sessionId: 'simple-session',
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous'
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'I apologize, but I encountered an error. Please try again.'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    apiKey: process.env.GOOGLE_AI_API_KEY ? 'Present' : 'Missing'
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 STAN Chatbot (Simple) running on http://localhost:${PORT}`);
  console.log(`📝 API Key: ${process.env.GOOGLE_AI_API_KEY ? 'Loaded' : 'Missing'}`);
  console.log(`🌐 Open http://localhost:${PORT} to test the chatbot`);
});

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
