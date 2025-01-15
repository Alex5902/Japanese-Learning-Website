// loginUser.js
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Create a new PostgreSQL client instance using environment variables.
const client = new Client({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
});

// Lambda initialization: connect to the database outside the handler
// to allow connection re-use across Lambda invocations.
let isConnected = false;

async function connectToDB() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

/**
 * Handler for user login.
 *
 * Expected Input:
 * {
 *   "email": "user@example.com",
 *   "username": "someusername", // username can be provided instead of email
 *   "password": "securepassword"
 * }
 *
 * Returns:
 * {
 *   "user_id": "uuid",
 *   "token": "jwt-token"
 * }
 */

exports.handler = async (event) => {
  try {
    // 1. Parse and validate incoming request data
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email, username, password } = body;
    
    if ((!email && !username) || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email/username and password are required.' }),
      };
    }
    
    // 2. Connect to the database (reuse connection if possible)
    await connectToDB();

    // 3. Query the Users table based on email or username.
    // Adjust the query based on the field provided.
    let queryText = '';
    let queryValues = [];
    if (email) {
      queryText = 'SELECT id, email, password FROM Users WHERE email = $1 LIMIT 1';
      queryValues = [email];
    } else {
      queryText = 'SELECT id, email, password FROM Users WHERE username = $1 LIMIT 1';
      queryValues = [username];
    }
    
    const result = await client.query(queryText, queryValues);

    // 4. Check if user exists
    if (result.rowCount === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid credentials.' }),
      };
    }
    
    const user = result.rows[0];

    // 5. Verify the password using bcrypt.
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid credentials.' }),
      };
    }
    
    // 6. Generate JWT token containing the user's ID and email.
    // Use environment variable for secret and expiry.
    const tokenPayload = {
      user_id: user.id,
      email: user.email,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });
    
    // 7. Return the JWT token and the user's ID.
    return {
      statusCode: 200,
      body: JSON.stringify({
        user_id: user.id,
        token,
      }),
    };
  } catch (error) {
    console.error('Error in LoginUser function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error.' }),
    };
  }
};
