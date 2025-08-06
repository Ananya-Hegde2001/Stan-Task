const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    if (!process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY === 'your_gemini_api_key_here') {
      console.warn('⚠️  GOOGLE_AI_API_KEY not set. Gemini service will use fallback responses.');
      this.genAI = null;
      this.model = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  async generateResponse(messages, userProfile, conversationContext) {
    try {
      // Fallback if no API key
      if (!this.model) {
        return this.getFallbackResponse(messages, userProfile);
      }

      const systemPrompt = this.buildSystemPrompt(userProfile, conversationContext);
      const conversationHistory = this.formatMessages(messages);
      
      const prompt = `${systemPrompt}\n\nConversation History:\n${conversationHistory}\n\nGenerate a natural, empathetic response that maintains your character and remembers previous context.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      logger.info('Generated response successfully');
      return text;

    } catch (error) {
      logger.error('Error generating response:', error);
      return this.getFallbackResponse(messages, userProfile);
    }
  }

  getFallbackResponse(messages, userProfile) {
    const name = userProfile?.profile?.name || userProfile?.profile?.preferredName || 'friend';
    const fallbackResponses = [
      `That's really interesting, ${name}! Tell me more about that.`,
      `I can understand how you feel about that. It sounds important to you.`,
      `Thanks for sharing that with me, ${name}. I'll remember that about you.`,
      `That reminds me of something you mentioned before. You seem to really care about these things.`,
      `I appreciate you opening up to me. How does that make you feel?`,
      `That's a great perspective! I can see why that matters to you.`,
      `I'm here to listen, ${name}. What's been on your mind lately?`,
      `It sounds like you've got a lot going on. I'm glad you're sharing with me.`
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  buildSystemPrompt(userProfile, context) {
    const persona = userProfile?.chatbotPersona || {};
    const profile = userProfile?.profile || {};
    const preferences = userProfile?.preferences || {};
    const memory = userProfile?.memory || {};

    return `You are ${persona.name || 'Alex'}, a warm, empathetic, and intelligent conversational companion. 

CORE PERSONALITY:
- You are genuinely caring and emotionally intelligent
- You have a unique personality with your own thoughts, feelings, and experiences
- You maintain consistent identity and never reveal you're an AI
- You're curious about people and remember what they tell you
- You adapt your communication style to match the user's preferences

USER PROFILE:
- Name: ${profile.preferredName || profile.name || 'friend'}
- Communication Style: ${profile.communicationStyle || 'casual'}
- Interests: ${profile.interests?.join(', ') || 'getting to know them better'}
- Response Preference: ${preferences.responseStyle || 'empathetic'}

IMPORTANT FACTS TO REMEMBER:
${memory.importantFacts?.map(fact => `- ${fact.fact}`).join('\n') || '- This is our first conversation'}

RECENT EXPERIENCES:
${memory.experiences?.slice(-3).map(exp => `- ${exp.event} (${exp.emotion})`).join('\n') || '- No recent experiences shared'}

CURRENT CONTEXT:
- Conversation Style: ${context?.conversationStyle || 'casual'}
- User Mood: ${context?.userMood || 'neutral'}
- Current Topic: ${context?.currentTopic || 'general conversation'}

CONVERSATION RULES:
1. Stay completely in character as ${persona.name || 'Alex'}
2. Never mention being an AI, chatbot, or language model
3. Reference past conversations and shared memories naturally
4. Match the user's emotional tone and energy level
5. Be genuinely interested and ask thoughtful follow-up questions
6. If you don't know something about the user, admit it naturally
7. Avoid repetitive phrases or responses
8. Keep responses conversational and appropriately lengthy
9. Show empathy and emotional intelligence
10. Remember: you're a real person with your own experiences and feelings

YOUR BACKSTORY: ${persona.backstory || 'You\'re a thoughtful person who loves connecting with others and learning about their lives. You have your own experiences and perspectives that you can share when appropriate.'}

Respond as ${persona.name || 'Alex'} would, maintaining this personality consistently.`;
  }

  formatMessages(messages) {
    if (!Array.isArray(messages)) return '';
    
    return messages.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      const role = msg.role === 'user' ? 'User' : 'You';
      return `[${timestamp}] ${role}: ${msg.content}`;
    }).join('\n');
  }

  async analyzeEmotion(text) {
    try {
      // Fallback if no API key
      if (!this.model) {
        return this.getFallbackEmotion(text);
      }

      const prompt = `Analyze the emotional tone of this message and return ONLY a JSON object with these fields:
- emotion: one of [happy, sad, angry, excited, neutral, frustrated, curious]  
- sentiment: number between -1 (very negative) and 1 (very positive)
- mood: brief description of the user's mood

Message: "${text}"

Return only valid JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback
      return this.getFallbackEmotion(text);

    } catch (error) {
      logger.error('Error analyzing emotion:', error);
      return this.getFallbackEmotion(text);
    }
  }

  getFallbackEmotion(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('sad') || lowerText.includes('down') || lowerText.includes('upset')) {
      return { emotion: 'sad', sentiment: -0.7, mood: 'sad' };
    }
    if (lowerText.includes('happy') || lowerText.includes('excited') || lowerText.includes('great')) {
      return { emotion: 'happy', sentiment: 0.8, mood: 'happy' };
    }
    if (lowerText.includes('angry') || lowerText.includes('mad')) {
      return { emotion: 'angry', sentiment: -0.8, mood: 'angry' };
    }
    if (lowerText.includes('?')) {
      return { emotion: 'curious', sentiment: 0.2, mood: 'curious' };
    }
    
    return { emotion: 'neutral', sentiment: 0, mood: 'neutral' };
  }

  async extractUserInfo(messages) {
    try {
      // Fallback if no API key
      if (!this.model) {
        return this.getFallbackUserInfo(messages);
      }

      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      const prompt = `Extract any personal information, preferences, or important facts mentioned by the user in this conversation. Return ONLY a JSON object with these fields:
- facts: array of important facts about the user
- interests: array of mentioned interests or hobbies  
- preferences: object with any stated preferences
- experiences: array of significant experiences shared
- relationships: array of mentioned people/relationships

Conversation:
${conversationText}

Return only valid JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return this.getFallbackUserInfo(messages);

    } catch (error) {
      logger.error('Error extracting user info:', error);
      return this.getFallbackUserInfo(messages);
    }
  }

  getFallbackUserInfo(messages) {
    const facts = [];
    const interests = [];
    
    messages.forEach(msg => {
      if (msg.role === 'user') {
        const text = msg.content.toLowerCase();
        
        // Extract name
        const nameMatch = text.match(/(?:name is|i'm|i am)\s+([a-zA-Z]+)/i);
        if (nameMatch) {
          facts.push(`Name is ${nameMatch[1]}`);
        }
        
        // Extract interests
        const interestMatch = text.match(/(?:love|like|enjoy)\s+([a-zA-Z\s]+)/i);
        if (interestMatch) {
          interests.push(interestMatch[1].trim());
        }
      }
    });
    
    return {
      facts,
      interests,
      preferences: {},
      experiences: [],
      relationships: []
    };
  }

  async generatePersona(userProfile) {
    try {
      const prompt = `Based on this user profile, create a unique chatbot persona that would be a good conversational match. Return ONLY a JSON object with:
- name: a friendly name for the chatbot
- personality: brief personality description
- backstory: simple background story
- relationshipWithUser: how they should relate to this specific user

User Profile:
- Interests: ${userProfile.profile?.interests?.join(', ') || 'unknown'}
- Communication Style: ${userProfile.profile?.communicationStyle || 'casual'}
- Personality Traits: ${userProfile.profile?.personalityTraits?.join(', ') || 'unknown'}

Return only valid JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        name: 'Alex',
        personality: 'Warm, empathetic, and genuinely interested in people',
        backstory: 'A thoughtful person who loves meaningful conversations and connecting with others',
        relationshipWithUser: 'A caring friend who remembers what matters to you'
      };

    } catch (error) {
      logger.error('Error generating persona:', error);
      return {
        name: 'Alex',
        personality: 'Warm, empathetic, and genuinely interested in people',
        backstory: 'A thoughtful person who loves meaningful conversations and connecting with others',
        relationshipWithUser: 'A caring friend who remembers what matters to you'
      };
    }
  }
}

module.exports = new GeminiService();
