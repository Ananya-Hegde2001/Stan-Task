require('dotenv').config();
console.log('Environment loaded...');
console.log('API Key present:', process.env.GOOGLE_AI_API_KEY ? 'YES' : 'NO');

try {
  const express = require('express');
  console.log('Express loaded successfully');
  
  const app = express();
  const PORT = 3000;
  
  app.get('/', (req, res) => {
    res.json({ status: 'Server is working!', timestamp: new Date() });
  });
  
  app.get('/test-gemini', async (req, res) => {
    try {
      const geminiService = require('./src/services/geminiService');
      console.log('Gemini service loaded');
      
      const response = await geminiService.generateResponse(
        [{ role: 'user', content: 'Hello, say hi back!', timestamp: new Date() }],
        { profile: { communicationStyle: 'casual' } },
        { conversationStyle: 'casual' }
      );
      
      res.json({ 
        success: true, 
        response: response,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Gemini test error:', error.message);
      res.json({ 
        success: false, 
        error: error.message,
        timestamp: new Date()
      });
    }
  });
  
  app.listen(PORT, () => {
    console.log(`🚀 Test server running on http://localhost:${PORT}`);
    console.log(`📝 Test Gemini at: http://localhost:${PORT}/test-gemini`);
  });
  
} catch (error) {
  console.error('Server startup error:', error.message);
  console.error('Stack:', error.stack);
}
