const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const redis = require('redis');
const path = require('path');
require('dotenv').config();

const chatRoutes = require('./src/routes/chat');
const userRoutes = require('./src/routes/user');
const logger = require('./src/utils/logger');
const rateLimiter = require('./src/middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
  credentials: true
}));

// Rate limiting
app.use(rateLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connections
async function connectDatabases() {
  // MongoDB connection
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB');
  } catch (error) {
    logger.warn('⚠️  MongoDB connection failed, continuing without persistent storage:', error.message);
  }

  // Redis connection
  try {
    const redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
        reconnectStrategy: false // Disable automatic reconnection
      }
    });
    
    redisClient.on('error', (err) => {
      logger.warn('Redis Client Error:', err.message);
    });
    
    redisClient.on('connect', () => {
      logger.info('✅ Connected to Redis');
    });
    
    await redisClient.connect();
    
    // Make Redis client available globally
    app.locals.redis = redisClient;
    
  } catch (error) {
    logger.warn('⚠️  Redis connection failed, continuing without rate limiting and caching:', error.message);
    app.locals.redis = null;
  }

  // Make sure services are available to routes
  app.locals.redisClient = app.locals.redis;
}

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await mongoose.connection.close();
    await app.locals.redis?.quit();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await connectDatabases();
    
    app.listen(PORT, () => {
      logger.info(`STAN Chatbot server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 Open http://localhost:${PORT} to test the chatbot`);
      
      // Log configuration status
      if (process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'your_gemini_api_key_here') {
        logger.info('✅ Gemini API key configured');
      } else {
        logger.warn('⚠️ Gemini API key not configured - using fallback responses');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    // Don't exit, try to continue with limited functionality
    app.listen(PORT, () => {
      logger.info(`STAN Chatbot server running on port ${PORT} (limited functionality)`);
      logger.info(`🌐 Open http://localhost:${PORT} to test the chatbot`);
    });
  }
}

startServer().catch((error) => {
  logger.error('Critical startup error:', error);
  // Try starting simple mode
  app.listen(PORT, () => {
    logger.info(`STAN Chatbot server running on port ${PORT} (fallback mode)`);
  });
});

module.exports = app;
