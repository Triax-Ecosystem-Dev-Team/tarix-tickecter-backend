const request = require('supertest');
const app = require('../src/server');
const prisma = require('../src/config/db');

jest.mock('../src/config/db', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 if required fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test',
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Please provide all required fields');
    });

    it('should return 400 if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@test.com' });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Test',
        email: 'test@test.com',
        password: 'password123',
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('User already exists');
    });

    it('should register a new user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 1,
        name: 'Test',
        email: 'test@test.com',
        role: 'Passenger',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Test',
        email: 'test@test.com',
        password: 'password123',
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('User registered successfully');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.email).toEqual('test@test.com');
    });
  });
});
