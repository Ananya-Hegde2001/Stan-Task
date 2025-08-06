const { v4: uuidv4 } = require('uuid');
const geminiService = require('../services/geminiService');
const MemoryService = require('../services/memoryService');
const logger = require('../utils/logger');

class ChatController {
  constructor() {
    this.memoryService = null;
  }

  initialize(redisClient) {
    this.memoryService = new MemoryService(redisClient);
  }

  createTemporaryProfile(userId) {
    return {
      userId,
      profile: {
        communicationStyle: 'casual'
      },
      preferences: {
        responseStyle: 'empathetic',
        conversationLength: 'moderate'
      },
      memory: {
        importantFacts: [],
        relationships: [],
        experiences: [],
        goals: []
      },
      conversationHistory: {
        totalSessions: 0,
        totalMessages: 0,
        averageSessionLength: 0,
        frequentTopics: [],
        emotionalPatterns: []
      },
      isTemporary: true
    };
  }

  async sendMessage(req, res) {
    try {
      const { message, userId, sessionId } = req.body;

      if (!message || !userId) {
        return res.status(400).json({ 
          error: 'Message and userId are required' 
        });
      }

      // Generate session ID if not provided
      const currentSessionId = sessionId || uuidv4();

      // Analyze user's message emotion
      const emotionAnalysis = await geminiService.analyzeEmotion(message);

      // Get user profile (with fallback if memory service not available)
      let userProfile;
      if (this.memoryService) {
        userProfile = await this.memoryService.getUserProfile(userId);
      } else {
        logger.warn('Memory service not available, using temporary profile');
        userProfile = this.createTemporaryProfile(userId);
      }

      // Get recent conversation history
      let recentMessages = [];
      if (this.memoryService) {
        try {
          recentMessages = await this.memoryService.getRecentMessages(userId, currentSessionId, 10);
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
      if (this.memoryService) {
        try {
          await this.memoryService.saveMessage(userId, currentSessionId, userMessage);
          await this.memoryService.saveMessage(userId, currentSessionId, assistantMessage);
          
          // Update user profile with new information
          const extractedInfo = await geminiService.extractUserInfo(recentMessages);
          await this.memoryService.updateUserMemory(userId, extractedInfo, emotionAnalysis);
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
  }

  async getConversationHistory(req, res) {
    try {
      const { userId, sessionId, limit = 50 } = req.query;

      if (!userId) {
        return res.status(400).json({ 
          error: 'userId is required' 
        });
      }

      if (!this.memoryService) {
        return res.json({
          messages: [],
          note: 'Memory service not available'
        });
      }

      const messages = await this.memoryService.getConversationHistory(
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
  }

  async getUserProfile(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ 
          error: 'userId is required' 
        });
      }

      if (!this.memoryService) {
        return res.json(this.createTemporaryProfile(userId));
      }

      const profile = await this.memoryService.getUserProfile(userId);

      res.json(profile);

    } catch (error) {
      logger.error('Error getting user profile:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve user profile' 
      });
    }
  }

  async updateUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const updates = req.body;

      if (!userId) {
        return res.status(400).json({ 
          error: 'userId is required' 
        });
      }

      if (!this.memoryService) {
        return res.json({
          ...this.createTemporaryProfile(userId),
          note: 'Profile update not saved - memory service not available'
        });
      }

      const updatedProfile = await this.memoryService.updateUserProfile(userId, updates);

      res.json(updatedProfile);

    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ 
        error: 'Failed to update user profile' 
      });
    }
  }

  async clearConversation(req, res) {
    try {
      const { userId, sessionId } = req.body;

      if (!userId) {
        return res.status(400).json({ 
          error: 'userId is required' 
        });
      }

      if (!this.memoryService) {
        return res.json({
          message: 'Conversation cleared (memory service not available)',
          cleared: false
        });
      }

      await this.memoryService.clearConversation(userId, sessionId);

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
  }

  async getAnalytics(req, res) {
    try {
      const { userId } = req.params;
      const { timeRange = '7d' } = req.query;

      if (!userId) {
        return res.status(400).json({ 
          error: 'userId is required' 
        });
      }

      if (!this.memoryService) {
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

      const analytics = await this.memoryService.getConversationAnalytics(userId, timeRange);

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
  }

  async generatePersona(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ 
          error: 'userId is required' 
        });
      }

      let userProfile;
      if (this.memoryService) {
        userProfile = await this.memoryService.getUserProfile(userId);
      } else {
        userProfile = this.createTemporaryProfile(userId);
      }

      const persona = await geminiService.generatePersona(userProfile);

      // Update user profile with new persona if memory service is available
      if (this.memoryService && !userProfile.isTemporary) {
        try {
          await this.memoryService.updateUserProfile(userId, {
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
  }
}

module.exports = new ChatController();
