# STAN Chatbot - Human-like Conversational AI

A sophisticated conversational chatbot with empathy, memory, and contextual awareness built for the STAN Internship Challenge.

## 🚀 Features

- **Human-like Interaction**: Natural, emotionally engaging conversations
- **Personalized Memory**: Long-term memory with user profiles and chat history
- **Context Awareness**: Adapts tone and behavior based on conversation context
- **Google Gemini Integration**: Uses Gemini 2.0 Flash API for advanced AI capabilities
- **Scalable Architecture**: Modular design ready for any UGC platform
- **Memory Strategy**: Efficient context persistence with Redis and MongoDB

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │   Memory Store  │
                       │   (Redis)       │
                       └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │   Gemini API    │
                       │   (Google AI)   │
                       └─────────────────┘
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB
- Redis
- Google AI API Key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stan-chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```
GOOGLE_AI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb://localhost:27017/stan-chatbot
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
```

5. Start MongoDB and Redis services

6. Run the application:
```bash
npm run dev
```

Visit `http://localhost:3000` to interact with the chatbot.

## 🧪 Test Cases

The chatbot is designed to pass all required test scenarios:

1. **Long-Term Memory Recall**: Remembers user preferences and past conversations
2. **Context-Aware Tone Adaptation**: Matches user's emotional state and communication style
3. **Personalization Over Time**: Builds user profiles and tailors responses
4. **Response Naturalness**: Generates diverse, engaging replies
5. **Identity Consistency**: Maintains character without revealing AI nature
6. **Hallucination Resistance**: Avoids fabricating false memories
7. **Memory Stability**: Accurately recalls session information

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Recommended for Production)

1. **Prerequisites**: Docker Desktop installed and running

2. **Quick Deploy**:
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

3. **Manual Docker Setup**:
```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Local Development

```
stan-chatbot/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── services/
│   ├── middleware/
│   ├── routes/
│   └── utils/
├── public/
├── tests/
├── docs/
├── .env.example
├── server.js
└── package.json
```

## 🔧 Configuration

### Memory Strategy
- **Short-term**: Redis for session data and recent context
- **Long-term**: MongoDB for user profiles and conversation history
- **Context Window**: Optimized token management for cost efficiency

### AI Configuration
- **Model**: Google Gemini 2.0 Flash
- **Temperature**: Dynamic based on conversation context
- **Max Tokens**: Adaptive based on response requirements

## 📊 Performance

- **Response Time**: < 2 seconds average
- **Memory Efficiency**: Compressed context storage
- **Cost Optimization**: Smart token usage and caching
- **Scalability**: Horizontal scaling ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
