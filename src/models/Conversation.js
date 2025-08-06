const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    emotion: {
      type: String,
      enum: ['happy', 'sad', 'angry', 'excited', 'neutral', 'frustrated', 'curious']
    },
    sentiment: {
      type: Number,
      min: -1,
      max: 1
    }
  }],
  context: {
    currentTopic: String,
    userMood: String,
    conversationStyle: {
      type: String,
      enum: ['formal', 'casual', 'playful', 'serious'],
      default: 'casual'
    },
    lastInteraction: Date
  },
  summary: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, sessionId: 1 },
    { userId: 1, createdAt: -1 },
    { 'messages.timestamp': -1 }
  ]
});

// Add methods
conversationSchema.methods.addMessage = function(role, content, emotion = 'neutral', sentiment = 0) {
  this.messages.push({
    role,
    content,
    emotion,
    sentiment,
    timestamp: new Date()
  });
  
  this.context.lastInteraction = new Date();
  return this.save();
};

conversationSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .reverse();
};

conversationSchema.methods.updateContext = function(updates) {
  this.context = { ...this.context, ...updates };
  return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);
