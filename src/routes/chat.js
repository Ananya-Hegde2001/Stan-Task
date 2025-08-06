const express = require('express');
const { v4: uuidv4 } = require('uuid');
const geminiService = require('../services/geminiService');
const MemoryService = require('../services/memoryService');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to get memory service
function getMemoryService(redisClient) {
  return redisClient ? new MemoryService(redisClient) : null;
}

// Helper function for temporary profile
function createTemporaryProfile(userId) {
  return {
    userId,
    profile: { communicationStyle: 'casual' },
    preferences: { responseStyle: 'empathetic', conversationLength: 'moderate' },
    memory: { importantFacts: [], relationships: [], experiences: [], goals: [] },
    conversationHistory: { totalSessions: 0, totalMessages: 0, averageSessionLength: 0, frequentTopics: [], emotionalPatterns: [] },
    isTemporary: true
  };
}

// Send message and get response
router.post('/message', async (req, res) => {
  try {
    const { message, userId, sessionId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ 
        error: 'Message and userId are required' 
      });
    }

    const currentSessionId = sessionId || uuidv4();
    const memoryService = getMemoryService(req.app.locals.redis);

    // Analyze user's message emotion
    const emotionAnalysis = await geminiService.analyzeEmotion(message);

    // Get user profile
    let userProfile;
    if (memoryService) {
      userProfile = await memoryService.getUserProfile(userId);
    } else {
      userProfile = createTemporaryProfile(userId);
    }

    // Get recent conversation history
    let recentMessages = [];
    if (memoryService) {
      try {
        recentMessages = await memoryService.getRecentMessages(userId, currentSessionId, 10);
      } catch (error) {
        logger.warn('Could not retrieve conversation history:', error.message);
      }
    }

    // Add current message to conversation
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      emotion: emotionAnalysis
    };

    recentMessages.push(userMessage);

    // Prepare conversation context
    const conversationContext = {
      sessionId: currentSessionId,
      messageCount: recentMessages.length,
      userMood: emotionAnalysis.emotion,
      conversationStyle: userProfile.profile?.communicationStyle || 'casual'
    };

    // Generate AI response
    const aiResponse = await geminiService.generateResponse(
      recentMessages, 
      userProfile, 
      conversationContext
    );

    // Create assistant message
    const assistantMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      sessionId: currentSessionId
    };

    // Store conversation if memory service is available
    if (memoryService) {
      try {
        await memoryService.saveMessage(userId, currentSessionId, userMessage);
        await memoryService.saveMessage(userId, currentSessionId, assistantMessage);
        
        // Update user profile with new information
        const extractedInfo = await geminiService.extractUserInfo(recentMessages);
        await memoryService.updateUserMemory(userId, extractedInfo, emotionAnalysis);
      } catch (error) {
        logger.warn('Could not save conversation:', error.message);
      }
    }

    // Send response
    res.json({
      message: aiResponse,
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
      emotionAnalysis,
      context: {
        userMood: emotionAnalysis.emotion,
        conversationLength: recentMessages.length
      }
    });

  } catch (error) {
    logger.error('Error in sendMessage:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      message: 'I apologize, but I encountered an error. Please try again.'
    });
  }
});

// Get conversation history
router.get('/history/:userId/:sessionId?', async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    const { limit = 50 } = req.query;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    const memoryService = getMemoryService(req.app.locals.redis);
    if (!memoryService) {
      return res.json({
        messages: [],
        note: 'Memory service not available'
      });
    }

    const messages = await memoryService.getConversationHistory(
      userId, 
      sessionId, 
      parseInt(limit)
    );

    res.json({
      messages,
      count: messages.length,
      sessionId
    });

  } catch (error) {
    logger.error('Error getting conversation history:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve conversation history' 
    });
  }
});

// Delete conversation
router.delete('/conversation/:userId/:sessionId', async (req, res) => {
  try {
    const { userId, sessionId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    const memoryService = getMemoryService(req.app.locals.redis);
    if (!memoryService) {
      return res.json({
        message: 'Conversation cleared (memory service not available)',
        cleared: false
      });
    }

    await memoryService.clearConversation(userId, sessionId);

    res.json({
      message: 'Conversation cleared successfully',
      cleared: true,
      sessionId
    });

  } catch (error) {
    logger.error('Error clearing conversation:', error);
    res.status(500).json({ 
      error: 'Failed to clear conversation' 
    });
  }
});

// Test endpoint for validation  
router.post('/test', (req, res) => {
  res.json({ 
    message: 'Chat API is working!',
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;
