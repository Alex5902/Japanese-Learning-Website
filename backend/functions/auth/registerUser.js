// registerUser.js
const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Create a new PostgreSQL client instance using environment variables
const client = new Client({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
});

// Lambda initialization: connect to the database outside the handler
// to allow connection re-use across Lambda invocations
let isConnected = false;

async function connectToDB() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

/**
 * Handler for user registration.
 *
 * Expected Input:
 * {
 *   "email": "user@example.com",
 *   "username": "username",
 *   "password": "securepassword"
 * }
 *
 * Returns:
 * {
 *   "user_id": "uuid"
 * }
 */
exports.handler = async (event) => {
  try {
    // 1. Parse and validate incoming request data
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email, username, password } = body;

    if (!email || !username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email, username, and password are required.' }),
      };
    }

    // 2. Connect to the database (reuse connection if possible)
    await connectToDB();

    // 3. Check if email or username already exists
    const existingUserQuery = `
      SELECT id FROM Users WHERE email = $1 OR username = $2 LIMIT 1
    `;
    const existingUserResult = await client.query(existingUserQuery, [email, username]);

    if (existingUserResult.rowCount > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'Email or username already exists.' }),
      };
    }

    // 4. Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Insert new user into the database
    const insertUserQuery = `
      INSERT INTO Users (email, username, password)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const insertUserResult = await client.query(insertUserQuery, [email, username, hashedPassword]);

    const userId = insertUserResult.rows[0].id;

    // 6. Return the user's ID
    return {
      statusCode: 201,
      body: JSON.stringify({ user_id: userId }),
    };
  } catch (error) {
    console.error('Error in RegisterUser function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error.' }),
    };
  }
};
