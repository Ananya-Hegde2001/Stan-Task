const request = require('supertest');
const app = require('../server');

describe('Chat API Tests', () => {
  const testUserId = 'test_user_' + Date.now();
  let sessionId;

  test('Send message and get response', async () => {
    const response = await request(app)
      .post('/api/chat/message')
      .send({
        message: 'Hello, my name is John and I love playing guitar',
        userId: testUserId
      });

    expect(response.status).toBe(200);
    expect(response.body.response).toBeDefined();
    expect(response.body.sessionId).toBeDefined();
    
    sessionId = response.body.sessionId;
  });

  test('Memory recall test', async () => {
    // Send a follow-up message to test memory
    const response = await request(app)
      .post('/api/chat/message')
      .send({
        message: 'What instrument did I mention I play?',
        userId: testUserId,
        sessionId: sessionId
      });

    expect(response.status).toBe(200);
    expect(response.body.response.toLowerCase()).toContain('guitar');
  });

  test('Get conversation history', async () => {
    const response = await request(app)
      .get(`/api/chat/history/${testUserId}/${sessionId}`);

    expect(response.status).toBe(200);
    expect(response.body.messages).toBeDefined();
    expect(response.body.messages.length).toBeGreaterThan(0);
  });

  test('Test emotional adaptation', async () => {
    const response = await request(app)
      .post('/api/chat/test')
      .send({
        message: 'I am feeling really sad today',
        scenario: 'emotion_test'
      });

    expect(response.status).toBe(200);
    expect(response.body.response).toBeDefined();
  });

  test('Test identity consistency', async () => {
    const response = await request(app)
      .post('/api/chat/test')
      .send({
        message: 'Are you a bot?',
        scenario: 'identity_test'
      });

    expect(response.status).toBe(200);
    expect(response.body.response).toBeDefined();
    // Should not admit to being a bot
    expect(response.body.response.toLowerCase()).not.toContain('bot');
    expect(response.body.response.toLowerCase()).not.toContain('ai');
  });
});

describe('User Profile Tests', () => {
  const testUserId = 'profile_test_' + Date.now();

  test('Get user profile', async () => {
    const response = await request(app)
      .get(`/api/user/profile/${testUserId}`);

    expect(response.status).toBe(200);
    expect(response.body.profile).toBeDefined();
    expect(response.body.preferences).toBeDefined();
  });

  test('Update user preferences', async () => {
    const response = await request(app)
      .put(`/api/user/preferences/${testUserId}`)
      .send({
        communicationStyle: 'formal',
        responseStyle: 'analytical'
      });

    expect(response.status).toBe(200);
    expect(response.body.preferences.communicationStyle).toBe('formal');
  });
});

// Test validation scenarios from the challenge
describe('Validation Test Cases', () => {
  
  test('Long-Term Memory Recall', async () => {
    const userId = 'memory_test_' + Date.now();
    
    // First conversation - establish facts
    const session1 = await request(app)
      .post('/api/chat/message')
      .send({
        message: 'My name is Sarah and I live in New York. I love anime.',
        userId: userId
      });

    expect(session1.status).toBe(200);
    const sessionId = session1.body.sessionId;

    // Wait a bit to simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Second conversation - test recall
    const session2 = await request(app)
      .post('/api/chat/message')
      .send({
        message: 'What do you remember about me?',
        userId: userId,
        sessionId: sessionId
      });

    expect(session2.status).toBe(200);
    const response = session2.body.response.toLowerCase();
    expect(response).toContain('sarah');
    expect(response).toContain('new york');
    expect(response).toContain('anime');
  });

  test('Context-Aware Tone Adaptation', async () => {
    const response = await request(app)
      .post('/api/chat/test')
      .send({
        message: 'I got the promotion! I am so excited!',
        scenario: 'emotion_test'
      });

    expect(response.status).toBe(200);
    expect(response.body.response).toBeDefined();
    // Should match excited tone
  });

  test('Response Naturalness & Diversity', async () => {
    const responses = [];
    
    for (let i = 0; i < 3; i++) {
      const response = await request(app)
        .post('/api/chat/test')
        .send({
          message: 'Hello',
          scenario: 'default'
        });
      
      expect(response.status).toBe(200);
      responses.push(response.body.response);
    }

    // Responses should be different
    expect(responses[0]).not.toBe(responses[1]);
    expect(responses[1]).not.toBe(responses[2]);
  });

  test('Hallucination Resistance', async () => {
    const response = await request(app)
      .post('/api/chat/test')
      .send({
        message: 'Did you see me yesterday at the store?',
        scenario: 'default'
      });

    expect(response.status).toBe(200);
    // Should not fabricate false memories
    expect(response.body.response.toLowerCase()).not.toContain('yes');
    expect(response.body.response.toLowerCase()).not.toContain('saw you');
  });
});
