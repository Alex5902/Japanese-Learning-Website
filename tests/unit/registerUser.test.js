// registerUser.test.js

// Import the function to test
const { handler } = require('../../backend/functions/auth/registerUser.js');

// Import dependencies to mock
const { Client } = require('pg');
const bcrypt = require('bcrypt');

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

// Mock bcrypt.hash to control password hashing
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('RegisterUser Lambda Function', () => {
  let pgClient;

  beforeEach(() => {
    // Reset mocks before each test
    pgClient = new Client();
    pgClient.connect.mockReset();
    pgClient.query.mockReset();
    bcrypt.hash.mockReset();
  });

  test('returns 400 if required fields are missing', async () => {
    const event = { body: JSON.stringify({ email: 'user@example.com' }) };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/required/);
  });

  test('returns 409 if email or username already exists', async () => {
    const event = {
      body: JSON.stringify({
        email: 'user@example.com',
        username: 'username',
        password: 'password123',
      }),
    };

    // Mock a query result indicating an existing user
    pgClient.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 'fake-id' }] });

    const response = await handler(event);
    expect(response.statusCode).toBe(409);

    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/already exists/);
  });

  test('returns 201 with user_id on successful registration', async () => {
    const event = {
      body: JSON.stringify({
        email: 'user@example.com',
        username: 'username',
        password: 'password123',
      }),
    };

    // Mock no existing user
    pgClient.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // First query: check for existing user
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'new-uuid' }] }); // Second query: insert user

    // Mock bcrypt.hash to return a test hashed password
    bcrypt.hash.mockResolvedValue('hashedpassword');

    const response = await handler(event);
    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    expect(body.user_id).toBe('new-uuid');
  });

  test('returns 500 on internal error', async () => {
    const event = {
      body: JSON.stringify({
        email: 'user@example.com',
        username: 'username',
        password: 'password123',
      }),
    };

    // Force an error by making pgClient.query throw an error
    pgClient.query.mockRejectedValue(new Error('Database error'));

    const response = await handler(event);
    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body);
    expect(body.message).toMatch(/Internal server error/);
  });
});
