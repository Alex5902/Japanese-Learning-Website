const { Client } = require("pg");
const bcrypt = require("bcrypt");

// Create a new PostgreSQL client instance using environment variables
const client = new Client({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
});

// Lambda initialization: connect once, then reuse
let isConnected = false;

async function connectToDB() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

exports.handler = async (event) => {
  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { username, email, password } = body;

    if (!email || !username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Email, username, and password are required.",
        }),
      };
    }

    // Connect to the database
    await connectToDB();

    // Check if email or username already exists
    const existingUserQuery = `
      SELECT user_id
      FROM Users
      WHERE email = $1 OR username = $2
      LIMIT 1;
    `;
    const existingUserResult = await client.query(existingUserQuery, [
      email,
      username,
    ]);

    if (existingUserResult.rowCount > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: "Email or username already exists.",
        }),
      };
    }

    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Ensure `user_id` is generated
    const insertUserQuery = `
      INSERT INTO Users (user_id, email, username, password_hash)
      VALUES (gen_random_uuid(), $1, $2, $3)
      RETURNING user_id;
    `;

    const insertUserResult = await client.query(insertUserQuery, [
      email,
      username,
      hashedPassword,
    ]);

    const userId = insertUserResult.rows[0].user_id;
    return {
      statusCode: 201,
      body: JSON.stringify({ user_id: userId }),
    };
  } catch (error) {
    console.error("Error in registerUser function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error." }),
    };
  }
};
