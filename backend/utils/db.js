const { Pool } = require("pg");
require("dotenv").config(); // Load environment variables

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Log database connection status
pool.connect()
  .then(() => console.log("Connected to PostgreSQL database"))
  .catch((err) => console.error("Database connection error:", err));

module.exports = {
  query: (text, params) => pool.query(text, params),
};
