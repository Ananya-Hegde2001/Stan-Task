const UserProfile = require('../models/UserProfile');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

class MemoryService {
  constructor(redisClient) {
    this.redis = redisClient;
    this.CACHE_TTL = 3600; // 1 hour
  }

  async getUserProfile(userId) {
    try {
      // Try cache first if Redis is available
      if (this.redis) {
        try {
          const cacheKey = `user_profile:${userId}`;
          const cached = await this.redis.get(cacheKey);
          
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (redisError) {
          logger.warn('Redis cache read failed:', redisError.message);
        }
      }

      // Get from database if MongoDB is connected
      let profile;
      try {
        profile = await UserProfile.findOne({ userId });
        
        if (!profile) {
          profile = await this.createUserProfile(userId);
        }

        // Cache the result if Redis is available
        if (this.redis) {
          try {
            const cacheKey = `user_profile:${userId}`;
            await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(profile));
          } catch (redisError) {
            logger.warn('Redis cache write failed:', redisError.message);
          }
        }
        
        return profile;
      } catch (dbError) {
        logger.warn('Database query failed, creating temporary profile:', dbError.message);
        return this.createTemporaryProfile(userId);
      }
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  async createUserProfile(userId) {
    const profile = new UserProfile({
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
      }
    });

    await profile.save();
    logger.info(`Created new user profile for ${userId}`);
    
    return profile;
  }

  createTemporaryProfile(userId) {
    // Return a temporary profile when database is not available
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

  async updateUserProfile(userId, updates) {
    try {
      let profile;
      try {
        profile = await UserProfile.findOneAndUpdate(
          { userId },
          { $set: updates },
          { new: true, upsert: true }
        );
      } catch (dbError) {
        logger.warn('Database update failed, returning temporary profile:', dbError.message);
        return this.createTemporaryProfile(userId);
      }

      // Update cache if Redis is available
      if (this.redis) {
        try {
          const cacheKey = `user_profile:${userId}`;
          await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(profile));
        } catch (redisError) {
          logger.warn('Redis cache update failed:', redisError.message);
        }
      }
      
      return profile;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  async addUserMemory(userId, facts = [], interests = [], experiences = [], relationships = []) {
    try {
      const profile = await this.getUserProfile(userId);
      
      // Add new facts
      for (const fact of facts) {
        await profile.addImportantFact(fact);
      }

      // Add interests
      if (interests.length > 0) {
        const existingInterests = profile.profile.interests || [];
        const newInterests = [...new Set([...existingInterests, ...interests])];
        profile.profile.interests = newInterests;
      }

      // Add experiences
      for (const experience of experiences) {
        await profile.addExperience(experience);
      }

      // Add relationships
      for (const relationship of relationships) {
        const existing = profile.memory.relationships.find(r => 
          r.name.toLowerCase() === relationship.name?.toLowerCase()
        );
        
        if (!existing && relationship.name) {
          profile.memory.relationships.push(relationship);
        }
      }

      await profile.save();
      
      // Clear cache to force refresh
      const cacheKey = `user_profile:${userId}`;
      await this.redis.del(cacheKey);
      
      return profile;
    } catch (error) {
      logger.error('Error adding user memory:', error);
      throw error;
    }
  }

  async getConversationHistory(userId, sessionId) {
    try {
      const cacheKey = `conversation:${userId}:${sessionId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const conversation = await Conversation.findOne({ userId, sessionId });
      
      if (conversation) {
        await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(conversation));
      }
      
      return conversation;
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      throw error;
    }
  }

  async saveMessage(userId, sessionId, role, content, emotion = 'neutral', sentiment = 0) {
    try {
      let conversation = await Conversation.findOne({ userId, sessionId });
      
      if (!conversation) {
        conversation = new Conversation({
          userId,
          sessionId,
          messages: [],
          context: {
            conversationStyle: 'casual',
            lastInteraction: new Date()
          }
        });
      }

      await conversation.addMessage(role, content, emotion, sentiment);
      
      // Update cache
      const cacheKey = `conversation:${userId}:${sessionId}`;
      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(conversation));
      
      return conversation;
    } catch (error) {
      logger.error('Error saving message:', error);
      throw error;
    }
  }

  async updateConversationContext(userId, sessionId, context) {
    try {
      const conversation = await Conversation.findOne({ userId, sessionId });
      
      if (conversation) {
        await conversation.updateContext(context);
        
        // Update cache
        const cacheKey = `conversation:${userId}:${sessionId}`;
        await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(conversation));
      }
      
      return conversation;
    } catch (error) {
      logger.error('Error updating conversation context:', error);
      throw error;
    }
  }

  async getRecentConversations(userId, limit = 5) {
    try {
      const conversations = await Conversation.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('sessionId context messages summary createdAt');
      
      return conversations;
    } catch (error) {
      logger.error('Error getting recent conversations:', error);
      throw error;
    }
  }

  async generateConversationSummary(userId, sessionId) {
    try {
      const conversation = await Conversation.findOne({ userId, sessionId });
      
      if (!conversation || conversation.messages.length === 0) {
        return null;
      }

      // Simple summary generation (could be enhanced with AI)
      const messageCount = conversation.messages.length;
      const topics = conversation.context.currentTopic || 'general conversation';
      const duration = conversation.updatedAt - conversation.createdAt;
      
      const summary = `Conversation with ${messageCount} messages about ${topics}. Duration: ${Math.round(duration / 60000)} minutes.`;
      
      conversation.summary = summary;
      await conversation.save();
      
      return summary;
    } catch (error) {
      logger.error('Error generating conversation summary:', error);
      throw error;
    }
  }

  async getContextualMemory(userId, currentMessage, limit = 10) {
    try {
      const profile = await this.getUserProfile(userId);
      
      // Get relevant facts based on current message keywords
      const messageWords = currentMessage.toLowerCase().split(/\s+/);
      const relevantFacts = profile.memory.importantFacts.filter(fact => {
        return messageWords.some(word => 
          fact.fact.toLowerCase().includes(word) || 
          fact.category?.toLowerCase().includes(word)
        );
      });

      // Get recent experiences
      const recentExperiences = profile.memory.experiences
        .sort((a, b) => b.date - a.date)
        .slice(0, 3);

      // Get interests that might be relevant
      const relevantInterests = profile.profile.interests?.filter(interest => {
        return messageWords.some(word => 
          interest.toLowerCase().includes(word)
        );
      }) || [];

      return {
        facts: relevantFacts.slice(0, limit),
        experiences: recentExperiences,
        interests: relevantInterests,
        relationships: profile.memory.relationships.slice(0, 5)
      };
    } catch (error) {
      logger.error('Error getting contextual memory:', error);
      return {
        facts: [],
        experiences: [],
        interests: [],
        relationships: []
      };
    }
  }

  async cleanupOldData(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Remove old inactive conversations
      const result = await Conversation.deleteMany({
        isActive: false,
        updatedAt: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} old conversations`);
      
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
      throw error;
    }
  }

  async getRecentMessages(userId, sessionId, limit = 10) {
    try {
      // Try to get from database
      const conversation = await Conversation.findOne({ 
        userId, 
        sessionId 
      }).sort({ createdAt: -1 });

      if (conversation && conversation.messages) {
        // Return the most recent messages
        return conversation.messages
          .slice(-limit)
          .map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            emotion: msg.emotion
          }));
      }

      return [];
    } catch (error) {
      logger.warn('Could not retrieve recent messages:', error.message);
      return [];
    }
  }

  async saveMessage(userId, sessionId, message) {
    try {
      // Try to save to database
      let conversation = await Conversation.findOne({ userId, sessionId });
      
      if (!conversation) {
        conversation = new Conversation({
          userId,
          sessionId,
          messages: []
        });
      }

      conversation.messages.push({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date(),
        emotion: message.emotion
      });

      conversation.isActive = true;
      conversation.updatedAt = new Date();

      await conversation.save();
      
      return conversation;
    } catch (error) {
      logger.warn('Could not save message:', error.message);
      return null;
    }
  }

  async updateUserMemory(userId, extractedInfo, emotionAnalysis) {
    try {
      const updates = {};
      
      if (extractedInfo.facts && extractedInfo.facts.length > 0) {
        updates['memory.importantFacts'] = extractedInfo.facts.map(fact => ({
          fact,
          timestamp: new Date(),
          confidence: 0.8
        }));
      }

      if (extractedInfo.interests && extractedInfo.interests.length > 0) {
        updates['profile.interests'] = extractedInfo.interests;
      }

      if (Object.keys(extractedInfo.preferences).length > 0) {
        updates['preferences'] = { ...updates['preferences'], ...extractedInfo.preferences };
      }

      if (emotionAnalysis && emotionAnalysis.emotion) {
        updates['memory.experiences'] = [{
          event: 'Recent conversation',
          emotion: emotionAnalysis.emotion,
          timestamp: new Date()
        }];
      }

      if (Object.keys(updates).length > 0) {
        await this.updateUserProfile(userId, updates);
      }

      return true;
    } catch (error) {
      logger.warn('Could not update user memory:', error.message);
      return false;
    }
  }

  async clearConversation(userId, sessionId) {
    try {
      if (sessionId) {
        await Conversation.deleteOne({ userId, sessionId });
      } else {
        await Conversation.deleteMany({ userId });
      }
      
      // Clear from cache if Redis is available
      if (this.redis) {
        try {
          const cacheKey = sessionId ? `conversation:${userId}:${sessionId}` : `conversation:${userId}:*`;
          await this.redis.del(cacheKey);
        } catch (redisError) {
          logger.warn('Redis cache clear failed:', redisError.message);
        }
      }

      return true;
    } catch (error) {
      logger.warn('Could not clear conversation:', error.message);
      return false;
    }
  }

  async getConversationHistory(userId, sessionId, limit = 50) {
    try {
      const query = { userId };
      if (sessionId) {
        query.sessionId = sessionId;
      }

      const conversations = await Conversation.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit);

      const messages = [];
      conversations.forEach(conv => {
        if (conv.messages) {
          messages.push(...conv.messages);
        }
      });

      return messages
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(-limit);
    } catch (error) {
      logger.warn('Could not get conversation history:', error.message);
      return [];
    }
  }

  async getConversationAnalytics(userId, timeRange = '7d') {
    try {
      const days = parseInt(timeRange.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const conversations = await Conversation.find({
        userId,
        updatedAt: { $gte: startDate }
      });

      let totalMessages = 0;
      const emotionalTrends = {};
      const topics = [];

      conversations.forEach(conv => {
        totalMessages += conv.messages?.length || 0;
        
        conv.messages?.forEach(msg => {
          if (msg.emotion?.emotion) {
            emotionalTrends[msg.emotion.emotion] = (emotionalTrends[msg.emotion.emotion] || 0) + 1;
          }
        });
      });

      return {
        totalSessions: conversations.length,
        totalMessages,
        averageSessionLength: conversations.length ? Math.round(totalMessages / conversations.length) : 0,
        emotionalTrends: Object.entries(emotionalTrends).map(([emotion, count]) => ({ emotion, count })),
        frequentTopics: topics
      };
    } catch (error) {
      logger.warn('Could not get analytics:', error.message);
      return {
        totalSessions: 0,
        totalMessages: 0,
        averageSessionLength: 0,
        emotionalTrends: [],
        frequentTopics: []
      };
    }
  }
}

module.exports = MemoryService;
