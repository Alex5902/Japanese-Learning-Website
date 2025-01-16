// logoutUser.test.js

// Import the function to test
const { handler } = require('../../backend/functions/auth/logoutUser.js');

// Import dependencies to mock
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

// Mock environment variables used by the Lambda function
process.env.PGHOST = 'dummy-host';
process.env.PGUSER = 'dummy-user';
process.env.PGPASSWORD = 'dummy-pwd';
process.env.PGDATABASE = 'dummy-db';
process.env.PGPORT = 5432;

// Create mocks for the pg Client methods
jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Client: jest.fn(() => mClient) };
});

// Mock jwt.decode
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
}));

describe('LogoutUser Lambda Function', () => {
  let pgClient;

  beforeEach(() => {
    // Reset mocks before each test
    pgClient = new Client();
    pgClient.connect.mockReset();
    pgClient.query.mockReset();
    jwt.decode.mockReset();
  });

  test('returns 400 if Authorization header is missing', async () => {
    const event = { headers: {} };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/Authorization token is required/);
  });

  test('returns 400 if token is invalid', async () => {
    const event = {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    };

    jwt.decode.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/Invalid token format/);
  });

  test('returns 400 if token payload is invalid', async () => {
    const event = {
      headers: {
        Authorization: 'Bearer fake-token',
      },
    };

    jwt.decode.mockReturnValue(null); // Simulate invalid payload

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/Invalid token payload/);
  });

  test('returns 200 on successful logout', async () => {
    const event = {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    };

    const decodedToken = {
      user_id: 'user-uuid',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    };

    jwt.decode.mockReturnValue(decodedToken);
    pgClient.query.mockResolvedValueOnce({});

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/Successfully logged out/);
  });

  test('returns 500 on internal server error', async () => {
    const event = {
      headers: {
        Authorization: 'Bearer valid-token',
      },
    };

    const decodedToken = {
      user_id: 'user-uuid',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    };

    jwt.decode.mockReturnValue(decodedToken);

    // Force an error when querying the database
    pgClient.query.mockRejectedValue(new Error('Database error'));

    const response = await handler(event);
    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/Internal server error/);
  });
});
