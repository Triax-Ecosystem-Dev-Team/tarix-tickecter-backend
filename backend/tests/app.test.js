const request = require('supertest');
const app = require('../src/server');

describe('API Endpoints', () => {
  it('GET / should return 200 and success message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('Tarix Ticketer API is running...');
  });

  // We can add more tests for mocked database calls or full integrations here
});
