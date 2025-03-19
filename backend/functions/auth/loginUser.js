const { Client } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Create a new PostgreSQL client instance using environment variables.
const client = new Client({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
});

// Reuse DB connection across Lambda invocations
let isConnected = false;
async function connectToDB() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

/**
 * Handler for user login with a single "identifier" (email or username) + password.
 *
 * Expected Input:
 * {
 *   "identifier": "someuser OR user@example.com",
 *   "password": "securepassword"
 * }
 *
 * Returns:
 * {
 *   "user_id": "uuid",
 *   "username": "someuser",
 *   "token": "jwt-token"
 * }
 */
exports.handler = async (event) => {
  try {
    // 1. Parse and validate incoming request data
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { identifier, password } = body;

    if (!identifier || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Identifier (email or username) and password are required.",
        }),
      };
    }

    // 2. Connect to DB (reuse if already connected)
    await connectToDB();

    // 3. Determine if identifier is an email or username
    let queryText;
    let queryValues;
    if (identifier.includes("@")) {
      // We assume it's an email
      queryText = `
        SELECT user_id, email, username, password_hash
        FROM Users
        WHERE email = $1
        LIMIT 1;
      `;
      queryValues = [identifier];
    } else {
      // Otherwise, treat it as a username
      queryText = `
        SELECT user_id, email, username, password_hash
        FROM Users
        WHERE username = $1
        LIMIT 1;
      `;
      queryValues = [identifier];
    }

    // 4. Query the database
    const result = await client.query(queryText, queryValues);
    if (result.rowCount === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid credentials." }),
      };
    }

    const user = result.rows[0];

    // 5. Verify the password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid credentials." }),
      };
    }

    // 6. Generate a JWT token if desired
    const tokenPayload = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    });

    // 7. Return the user_id, username, plus JWT
    return {
      statusCode: 200,
      body: JSON.stringify({
        user_id: user.user_id,
        username: user.username,
        token,
      }),
    };
  } catch (error) {
    console.error("Error in loginUser function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error." }),
    };
  }
};
