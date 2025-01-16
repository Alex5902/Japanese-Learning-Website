// loginUser.test.js

// Import the function to test.
const { handler } = require('../../backend/functions/auth/loginUser.js');

// Import dependencies that we'll be mocking.
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock environment variables used by the Lambda function.
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '24h';
process.env.PGHOST = 'dummy-host';
process.env.PGUSER = 'dummy-user';
process.env.PGPASSWORD = 'dummy-pwd';
process.env.PGDATABASE = 'dummy-db';
process.env.PGPORT = 5432;

// Create mocks for the pg Client methods.
jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Client: jest.fn(() => mClient) };
});

// Mock bcrypt.compare to control password verification.
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Mock jwt.sign to control token generation.
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

describe('LoginUser Lambda Function', () => {
  let pgClient;

  beforeEach(() => {
    // Clear and reset mocks before each test.
    pgClient = new Client();
    pgClient.connect.mockReset();
    pgClient.query.mockReset();

    bcrypt.compare.mockReset();
    jwt.sign.mockReset();
  });

  test('returns 400 if email/username or password is missing', async () => {
    const event = { body: JSON.stringify({ email: 'user@example.com' }) };
    
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    
    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/required/);
  });

  test('returns 401 if user is not found in the database', async () => {
    // Setup event with email and password.
    const event = { body: JSON.stringify({ email: 'user@example.com', password: 'password123' }) };

    // Configure the mocked query to return an empty result.
    pgClient.query.mockResolvedValue({ rowCount: 0, rows: [] });
    
    const response = await handler(event);
    expect(response.statusCode).toBe(401);
    
    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/Invalid credentials/);
  });

  test('returns 401 if password does not match', async () => {
    // Setup event with email and password.
    const event = {
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123',
      }),
    };

    // Mocked user record from database.
    const fakeUser = { id: 'fake-uuid', email: 'user@example.com', password: 'hashedpassword' };

    // Configure the mocked query to return a user.
    pgClient.query.mockResolvedValue({ rowCount: 1, rows: [fakeUser] });
    // Simulate bcrypt.compare returning false (password does not match).
    bcrypt.compare.mockResolvedValue(false);

    const response = await handler(event);
    expect(response.statusCode).toBe(401);
    
    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/Invalid credentials/);
  });

  test('returns 200 with token and user_id on success', async () => {
    // Setup event with email and password.
    const event = {
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123',
      }),
    };

    // Mocked user record from the database.
    const fakeUser = { id: 'fake-uuid', email: 'user@example.com', password: 'hashedpassword' };

    // Configure the mocked query to return the fake user.
    pgClient.query.mockResolvedValue({ rowCount: 1, rows: [fakeUser] });
    // Simulate bcrypt.compare returning true (password matches).
    bcrypt.compare.mockResolvedValue(true);
    // Simulate jwt.sign returning a test token.
    jwt.sign.mockReturnValue('test-jwt-token');

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.user_id).toBe(fakeUser.id);
    expect(body.token).toBe('test-jwt-token');
  });

  test('returns 500 on internal error', async () => {
    // Setup event with proper input.
    const event = {
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123',
      }),
    };

    // Force an error by making pgClient.query throw an error.
    pgClient.query.mockRejectedValue(new Error('Database error'));

    const response = await handler(event);
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/Internal server error/);
  });
});
