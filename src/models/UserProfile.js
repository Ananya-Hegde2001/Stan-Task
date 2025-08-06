const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  profile: {
    name: String,
    preferredName: String,
    age: Number,
    location: String,
    occupation: String,
    interests: [String],
    hobbies: [String],
    personalityTraits: [String],
    communicationStyle: {
      type: String,
      enum: ['formal', 'casual', 'playful', 'serious'],
      default: 'casual'
    }
  },
  preferences: {
    topics: [String],
    conversationLength: {
      type: String,
      enum: ['brief', 'moderate', 'detailed'],
      default: 'moderate'
    },
    responseStyle: {
      type: String,
      enum: ['direct', 'empathetic', 'humorous', 'analytical'],
      default: 'empathetic'
    },
    reminderFrequency: {
      type: String,
      enum: ['never', 'occasionally', 'frequently'],
      default: 'occasionally'
    }
  },
  memory: {
    importantFacts: [{
      fact: String,
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 1
      },
      lastMentioned: Date,
      category: String
    }],
    relationships: [{
      name: String,
      relationship: String,
      details: String
    }],
    experiences: [{
      event: String,
      date: Date,
      emotion: String,
      importance: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
      }
    }],
    goals: [{
      goal: String,
      status: {
        type: String,
        enum: ['active', 'completed', 'paused', 'abandoned'],
        default: 'active'
      },
      deadline: Date,
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    }]
  },
  conversationHistory: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    averageSessionLength: {
      type: Number,
      default: 0
    },
    lastActive: Date,
    frequentTopics: [{
      topic: String,
      count: Number
    }],
    emotionalPatterns: [{
      emotion: String,
      frequency: Number,
      contexts: [String]
    }]
  },
  chatbotPersona: {
    name: String,
    personality: String,
    backstory: String,
    relationshipWithUser: String
  }
}, {
  timestamps: true
});

// Methods
userProfileSchema.methods.addImportantFact = function(fact, category = 'general', confidence = 1) {
  const existingFact = this.memory.importantFacts.find(f => 
    f.fact.toLowerCase() === fact.toLowerCase()
  );
  
  if (existingFact) {
    existingFact.lastMentioned = new Date();
    existingFact.confidence = Math.max(existingFact.confidence, confidence);
  } else {
    this.memory.importantFacts.push({
      fact,
      category,
      confidence,
      lastMentioned: new Date()
    });
  }
  
  return this.save();
};

userProfileSchema.methods.addExperience = function(event, emotion = 'neutral', importance = 5) {
  this.memory.experiences.push({
    event,
    date: new Date(),
    emotion,
    importance
  });
  
  return this.save();
};

userProfileSchema.methods.updatePreferences = function(updates) {
  this.preferences = { ...this.preferences, ...updates };
  return this.save();
};

userProfileSchema.methods.incrementConversationStats = function(messageCount) {
  this.conversationHistory.totalSessions += 1;
  this.conversationHistory.totalMessages += messageCount;
  this.conversationHistory.lastActive = new Date();
  
  if (this.conversationHistory.totalSessions > 0) {
    this.conversationHistory.averageSessionLength = 
      this.conversationHistory.totalMessages / this.conversationHistory.totalSessions;
  }
  
  return this.save();
};

userProfileSchema.methods.getPersonalityInsights = function() {
  return {
    communicationStyle: this.profile.communicationStyle,
    interests: this.profile.interests || [],
    recentExperiences: this.memory.experiences
      .sort((a, b) => b.date - a.date)
      .slice(0, 5),
    importantFacts: this.memory.importantFacts
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10),
    emotionalPatterns: this.conversationHistory.emotionalPatterns
  };
};

module.exports = mongoose.model('UserProfile', userProfileSchema);
