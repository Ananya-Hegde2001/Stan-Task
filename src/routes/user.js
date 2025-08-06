const express = require('express');
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

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    const memoryService = getMemoryService(req.app.locals.redis);
    if (!memoryService) {
      return res.json(createTemporaryProfile(userId));
    }

    const profile = await memoryService.getUserProfile(userId);
    res.json(profile);

  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve user profile' 
    });
  }
});

// Update user preferences
router.put('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    const memoryService = getMemoryService(req.app.locals.redis);
    if (!memoryService) {
      return res.json({
        ...createTemporaryProfile(userId),
        note: 'Profile update not saved - memory service not available'
      });
    }

    const updatedProfile = await memoryService.updateUserProfile(userId, updates);
    res.json(updatedProfile);

  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ 
      error: 'Failed to update user profile' 
    });
  }
});

// Get analytics
router.get('/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange = '7d' } = req.query;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    const memoryService = getMemoryService(req.app.locals.redis);
    if (!memoryService) {
      return res.json({
        analytics: {
          totalSessions: 0,
          totalMessages: 0,
          averageSessionLength: 0,
          emotionalTrends: [],
          frequentTopics: []
        },
        note: 'Analytics not available - memory service not available'
      });
    }

    const analytics = await memoryService.getConversationAnalytics(userId, timeRange);

    res.json({
      analytics,
      timeRange,
      userId
    });

  } catch (error) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve analytics' 
    });
  }
});

// Generate persona
router.post('/persona/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    const memoryService = getMemoryService(req.app.locals.redis);
    let userProfile;
    if (memoryService) {
      userProfile = await memoryService.getUserProfile(userId);
    } else {
      userProfile = createTemporaryProfile(userId);
    }

    const persona = await geminiService.generatePersona(userProfile);

    // Update user profile with new persona if memory service is available
    if (memoryService && !userProfile.isTemporary) {
      try {
        await memoryService.updateUserProfile(userId, {
          'chatbotPersona': persona
        });
      } catch (error) {
        logger.warn('Could not save persona to profile:', error.message);
      }
    }

    res.json({
      persona,
      userId,
      generated: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error generating persona:', error);
    res.status(500).json({ 
      error: 'Failed to generate persona' 
    });
  }
});

module.exports = router;
