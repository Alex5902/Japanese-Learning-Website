// logoutUser.js
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

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
 * Handler for user logout.
 *
 * Expected:
 * - JWT token in the `Authorization` header (Bearer <token>).
 *
 * Returns:
 * - 200 OK with a success message.
 */
exports.handler = async (event) => {
  try {
    // 1. Parse and validate the JWT token from the Authorization header
    const authHeader = event.headers?.Authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Authorization token is required.' }),
      };
    }

    // Decode the token (but don't verify yet, as the token might be expired)
    let decodedToken;
    try {
      decodedToken = jwt.decode(token);
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid token format.' }),
      };
    }

    if (!decodedToken || !decodedToken.user_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid token payload.' }),
      };
    }

    // 2. Connect to the database
    await connectToDB();

    // 3. Blacklist the token in the database
    const blacklistQuery = `
      INSERT INTO TokenBlacklist (token, user_id, expiration)
      VALUES ($1, $2, $3)
    `;
    const expiration = decodedToken.exp ? new Date(decodedToken.exp * 1000) : null;
    await client.query(blacklistQuery, [token, decodedToken.user_id, expiration]);

    // 4. Return a success response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully logged out.' }),
    };
  } catch (error) {
    console.error('Error in LogoutUser function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error.' }),
    };
  }
};
