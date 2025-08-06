# STAN Chatbot - Setup and Deployment Guide

## Quick Start (Demo Mode)

To test the chatbot immediately without external dependencies:

```bash
# 1. Navigate to project directory
cd Stan-Chatbot

# 2. Install dependencies (already done)
npm install

# 3. Run demo mode
npm run demo

# 4. Open browser and go to http://localhost:3000
```

## Full Production Setup

### Prerequisites

1. **Google AI API Key**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create an API key for Gemini
   - Copy the key for environment configuration

2. **MongoDB Database**
   - Local: Install MongoDB Community Edition
   - Cloud: Use MongoDB Atlas (free tier available)

3. **Redis Cache**
   - Local: Install Redis
   - Cloud: Use Redis Cloud or AWS ElastiCache

### Installation Steps

1. **Clone and Install**
```bash
git clone <repository-url>
cd stan-chatbot
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
```

Edit `.env` file with your credentials:
```env
GOOGLE_AI_API_KEY=your_actual_gemini_api_key
MONGODB_URI=mongodb://localhost:27017/stan-chatbot
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
```

3. **Start Services**

**Option A: Using Docker**
```bash
docker-compose up -d
```

**Option B: Manual Setup**
```bash
# Start MongoDB (if local)
mongod

# Start Redis (if local)
redis-server

# Start the application
npm start
```

4. **Verify Installation**
```bash
# Run validation tests
npm run validate

# Check health endpoint
curl http://localhost:3000/health
```

## Testing the Chatbot

### Manual Testing
1. Open `http://localhost:3000` in your browser
2. Try these test scenarios:

**Memory Test:**
- "Hi, my name is John and I love guitar"
- (wait a moment)
- "What do you remember about me?"

**Emotion Test:**
- "I'm feeling sad today"
- "I just got promoted!"

**Identity Test:**
- "Are you a bot?"
- "What are you?"

### Automated Testing
```bash
# Run validation suite
npm run validate

# Run unit tests
npm test
```

## Deployment Options

### 1. Vercel (Recommended for Demo)
```bash
npm install -g vercel
vercel --prod
```

### 2. Render
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### 3. AWS/GCP/Azure
- Use container deployment
- Set up managed databases
- Configure environment variables

## API Usage

### Send Message
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "userId": "user123"}'
```

### Get User Profile
```bash
curl http://localhost:3000/api/user/profile/user123
```

### Get Conversation History
```bash
curl http://localhost:3000/api/chat/history/user123/session456
```

## Performance Optimization

### Production Settings
```env
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW=900000
```

### Scaling Tips
1. Use Redis cluster for multiple instances
2. Implement database read replicas
3. Add load balancer for high traffic
4. Monitor API usage and costs

## Troubleshooting

### Common Issues

**1. "No matching version found for rate-limiter-flexible"**
- Fixed in package.json (using v2.4.2)

**2. "Redis connection failed"**
- Check Redis is running: `redis-cli ping`
- Verify REDIS_URL in .env

**3. "MongoDB connection failed"**
- Check MongoDB is running: `mongosh`
- Verify MONGODB_URI in .env

**4. "Google AI API error"**
- Verify API key is correct
- Check API quotas and billing
- Ensure Gemini API is enabled

### Debug Mode
```bash
DEBUG=* npm start
```

## Cost Management

### API Usage Optimization
- Context window management
- Response caching
- Rate limiting per user
- Monitor token usage

### Resource Management
- Use database connection pooling
- Implement Redis expiration
- Regular data cleanup
- Monitor memory usage

## Security Checklist

- [ ] Environment variables secured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages sanitized
- [ ] HTTPS enabled in production
- [ ] Database access restricted
- [ ] API keys rotated regularly

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in `logs/` directory
3. Test with validation script
4. Contact: s.roy@getstan.app

## License

MIT License - See LICENSE file for details.
