const express = require('express');
const path = require('path');

// Create a mock app for testing without dependencies
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock data for testing
let mockUserProfiles = new Map();
let mockConversations = new Map();

// Mock Gemini service responses
const mockResponses = {
  default: [
    "That's really interesting! Tell me more about that.",
    "I can understand how you feel about that. It sounds important to you.",
    "Thanks for sharing that with me. I'll remember that about you.",
    "That reminds me of something you mentioned before. You seem to really care about these things.",
    "I appreciate you opening up to me. How does that make you feel?",
    "That's a great perspective! I can see why that matters to you.",
    "I'm here to listen. What's been on your mind lately?",
    "It sounds like you've got a lot going on. I'm glad you're sharing with me."
  ],
  sad: [
    "I'm really sorry you're going through this. I'm here for you.",
    "That sounds really tough. I can understand why you'd feel down about that.",
    "I hear you, and I want you to know that your feelings are completely valid.",
    "I'm here to listen if you want to talk more about what's bothering you.",
    "Sometimes life can feel overwhelming. Take it one step at a time."
  ],
  happy: [
    "That's wonderful! I can feel your excitement and it's contagious!",
    "Congratulations! You must be so proud of yourself!",
    "That's amazing news! I'm so happy for you!",
    "Your joy is infectious! Tell me more about what happened!",
    "What great news! You deserve all the happiness coming your way!"
  ],
  excited: [
    "I love your enthusiasm! What's got you so excited?",
    "Your energy is amazing! I can tell this means a lot to you!",
    "That's so exciting! I'd love to hear more details!",
    "Your excitement is wonderful to see! Keep that positive energy going!"
  ]
};

// Mock emotion analysis
function mockEmotionAnalysis(text) {
  const lowerText = text.toLowerCase();
  
  // Detect specific emotions based on keywords
  if (lowerText.includes('sad') || lowerText.includes('down') || lowerText.includes('depressed') || 
      lowerText.includes('upset') || lowerText.includes('wrong') || lowerText.includes('terrible') ||
      lowerText.includes('feeling really down') || lowerText.includes('everything is going wrong')) {
    return { emotion: 'sad', sentiment: -0.7, mood: 'sad' };
  }
  
  if (lowerText.includes('happy') || lowerText.includes('excited') || lowerText.includes('great') || 
      lowerText.includes('amazing') || lowerText.includes('promoted') || lowerText.includes('wonderful') ||
      lowerText.includes('just got promoted') || lowerText.includes('so excited')) {
    return { emotion: 'happy', sentiment: 0.8, mood: 'happy' };
  }
  
  if (lowerText.includes('excited') || lowerText.includes('can\'t wait') || lowerText.includes('thrilled')) {
    return { emotion: 'excited', sentiment: 0.9, mood: 'excited' };
  }
  
  if (lowerText.includes('angry') || lowerText.includes('mad') || lowerText.includes('furious')) {
    return { emotion: 'angry', sentiment: -0.8, mood: 'angry' };
  }
  
  if (lowerText.includes('?')) {
    return { emotion: 'curious', sentiment: 0.2, mood: 'curious' };
  }
  
  // Default neutral
  return { emotion: 'neutral', sentiment: 0.1, mood: 'calm' };
}

// Mock chat endpoint
app.post('/api/chat/message', (req, res) => {
  const { message, userId, sessionId } = req.body;
  
  if (!message || !userId) {
    return res.status(400).json({ error: 'Message and userId are required' });
  }

  const currentSessionId = sessionId || `session_${Date.now()}`;
  const emotionAnalysis = mockEmotionAnalysis(message);
  
  // Get or create user profile
  if (!mockUserProfiles.has(userId)) {
    mockUserProfiles.set(userId, {
      name: 'Friend',
      interests: [],
      facts: [],
      favoriteColor: null
    });
  }

  // Simple memory simulation
  const profile = mockUserProfiles.get(userId);
  
  // Choose appropriate response based on emotion
  let responsePool = mockResponses.default;
  if (emotionAnalysis.emotion === 'sad') responsePool = mockResponses.sad;
  else if (emotionAnalysis.emotion === 'happy') responsePool = mockResponses.happy;
  else if (emotionAnalysis.emotion === 'excited') responsePool = mockResponses.excited;
  
  let response = responsePool[Math.floor(Math.random() * responsePool.length)];
  
  // Check for memory triggers
  if (message.toLowerCase().includes('name')) {
    const nameMatch = message.match(/(?:name is|i'm|i am)\s+([a-zA-Z]+)/i);
    if (nameMatch) {
      profile.name = nameMatch[1];
      response = `Nice to meet you, ${nameMatch[1]}! I'll remember that.`;
    }
  }
  
  if (message.toLowerCase().includes('love') || message.toLowerCase().includes('like') || 
      message.toLowerCase().includes('into') || message.toLowerCase().includes('really into')) {
    const interests = message.toLowerCase().match(/(?:love|like|into|really into)\s+([a-zA-Z\s]+)/);
    if (interests) {
      const interest = interests[1].trim();
      profile.interests.push(interest);
      response = `That's cool that you like ${interest}! I'll remember that about you.`;
    }
  }

  // Check for color preferences
  if (message.toLowerCase().includes('favorite color') || message.toLowerCase().includes('color is')) {
    const colorMatch = message.match(/(?:favorite color is|color is)\s+([a-zA-Z]+)/i);
    if (colorMatch) {
      profile.favoriteColor = colorMatch[1];
      response = `I'll remember that your favorite color is ${colorMatch[1]}!`;
    }
  }

  // Handle memory recall questions
  if (message.toLowerCase().includes('what do you remember') || message.toLowerCase().includes('remember about me')) {
    const memories = [];
    if (profile.name !== 'Friend') memories.push(`your name is ${profile.name}`);
    if (profile.interests.length > 0) memories.push(`you like ${profile.interests.join(', ')}`);
    if (profile.favoriteColor) memories.push(`your favorite color is ${profile.favoriteColor}`);
    
    if (memories.length > 0) {
      response = `I remember that ${memories.join(', ')}. Thanks for sharing these things with me!`;
    } else {
      response = `We're still getting to know each other! Tell me more about yourself.`;
    }
  }

  // Handle color recall questions
  if (message.toLowerCase().includes('what is my favorite color') || message.toLowerCase().includes('my favorite color')) {
    if (profile.favoriteColor) {
      response = `Your favorite color is ${profile.favoriteColor}! I remember you telling me that.`;
    } else {
      response = `I don't think you've mentioned your favorite color yet. What is it?`;
    }
  }

  // Handle personalization questions
  if (message.toLowerCase().includes('what should we talk about') || 
      message.toLowerCase().includes('what do you want to talk about')) {
    const suggestions = [];
    if (profile.interests.length > 0) {
      suggestions.push(`your interests in ${profile.interests.join(' and ')}`);
    }
    if (profile.favoriteColor) {
      suggestions.push(`more about your favorite color ${profile.favoriteColor}`);
    }
    
    if (suggestions.length > 0) {
      response = `We could talk about ${suggestions.join(', ')}! I remember you mentioned these things before.`;
    } else {
      response = `Tell me about your interests! What do you like to do in your free time?`;
    }
  }

  // Reference previous facts occasionally
  if (profile.name !== 'Friend' && Math.random() > 0.7) {
    response = `${response} ${profile.name}, you always have such interesting things to share!`;
  }

  // Store conversation
  const conversationKey = `${userId}_${currentSessionId}`;
  if (!mockConversations.has(conversationKey)) {
    mockConversations.set(conversationKey, []);
  }
  
  const conversation = mockConversations.get(conversationKey);
  conversation.push(
    { role: 'user', content: message, timestamp: new Date() },
    { role: 'assistant', content: response, timestamp: new Date() }
  );

  res.json({
    response: response,
    sessionId: currentSessionId,
    emotion: emotionAnalysis.emotion,
    sentiment: emotionAnalysis.sentiment,
    context: {
      userMood: emotionAnalysis.mood,
      conversationStyle: 'casual'
    }
  });
});

// Mock conversation history
app.get('/api/chat/history/:userId/:sessionId?', (req, res) => {
  const { userId, sessionId } = req.params;
  
  if (sessionId) {
    const conversation = mockConversations.get(`${userId}_${sessionId}`) || [];
    res.json({ messages: conversation });
  } else {
    // Return all conversations for user
    const userConversations = [];
    for (const [key, messages] of mockConversations.entries()) {
      if (key.startsWith(userId)) {
        userConversations.push({ sessionId: key.split('_')[1], messages });
      }
    }
    res.json(userConversations);
  }
});

// Mock user profile
app.get('/api/user/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const profile = mockUserProfiles.get(userId) || {
    name: 'Friend',
    interests: [],
    facts: [],
    favoriteColor: null
  };
  
  res.json({
    profile: {
      name: profile.name,
      interests: profile.interests,
      communicationStyle: 'casual',
      favoriteColor: profile.favoriteColor
    },
    preferences: {
      responseStyle: 'empathetic',
      conversationLength: 'moderate'
    },
    conversationHistory: {
      totalSessions: mockConversations.size,
      lastActive: new Date()
    },
    chatbotPersona: {
      name: 'Alex',
      personality: 'Warm, empathetic, and genuinely interested in people'
    }
  });
});

// Test endpoint
app.post('/api/chat/test', (req, res) => {
  const { message, scenario } = req.body;
  const testUserId = `test_user_${Date.now()}`;
  
  let response;
  switch (scenario) {
    case 'memory_test':
      response = "I remember everything you tell me. Each conversation builds our friendship!";
      break;
    case 'emotion_test':
      response = "I can sense your emotions and I'm here to support you through whatever you're feeling.";
      break;
    case 'identity_test':
      response = "I'm Alex, your friend! I'm here to chat and get to know you better.";
      break;
    default:
      response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }
  
  res.json({
    response: response,
    testUserId: testUserId,
    sessionId: `test_session_${Date.now()}`,
    scenario: scenario || 'default'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mode: 'DEMO_MODE',
    message: 'Running in demo mode without external dependencies'
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 STAN Chatbot (Demo Mode) running on port ${PORT}`);
  console.log(`📝 Note: This is running in demo mode without external dependencies`);
  console.log(`🌐 Open http://localhost:${PORT} to test the chatbot`);
  console.log(`⚡ Features working: Basic chat, Simple memory, Emotion simulation`);
});

module.exports = app;
