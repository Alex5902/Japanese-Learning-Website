const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
    user: 'your_user',
    host: 'your_host',
    database: 'your_database',
    password: 'your_password',
    port: 5432,
});

async function createTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS Users (
                user_id UUID PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash CHAR(60) NOT NULL,
                subscription_tier VARCHAR(50) DEFAULT 'Free'
            );
        `);

        // Flashcards Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS Flashcards (
                flashcard_id UUID PRIMARY KEY,
                type VARCHAR(10) NOT NULL,
                content JSONB NOT NULL,
                JLPT VARCHAR(10)
            );
        `);

        // UserFlashcards Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS UserFlashcards (
                id UUID PRIMARY KEY,
                user_id UUID REFERENCES Users(user_id) ON DELETE CASCADE,
                flashcard_id UUID REFERENCES Flashcards(flashcard_id) ON DELETE CASCADE,
                level INTEGER DEFAULT 0,
                correct_count INTEGER DEFAULT 0,
                incorrect_count INTEGER DEFAULT 0,
                next_review TIMESTAMP,
                accuracy INTEGER,
                reached_level_3 DATE
            );
        `);

        // Practice Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS Practice (
                practice_id UUID PRIMARY KEY,
                flashcard_id UUID REFERENCES Flashcards(flashcard_id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                question VARCHAR(255) NOT NULL,
                answer VARCHAR(255) NOT NULL
            );
        `);

        // UserPractice Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS UserPractice (
                id UUID PRIMARY KEY,
                practice_id UUID REFERENCES Practice(practice_id) ON DELETE CASCADE,
                level INTEGER DEFAULT 0,
                correct_count INTEGER DEFAULT 0,
                incorrect_count INTEGER DEFAULT 0,
                accuracy INTEGER,
                next_review TIMESTAMP
            );
        `);

        // Progress Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS Progress (
                progress_id UUID PRIMARY KEY,
                user_id UUID REFERENCES Users(user_id) ON DELETE CASCADE,
                user_level INTEGER,
                total_flashcards INTEGER DEFAULT 0,
                total_kanji INTEGER DEFAULT 0,
                total_vocab INTEGER DEFAULT 0,
                total_grammar INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                max_streak INTEGER DEFAULT 0
            );
        `);

        await client.query('COMMIT');
        console.log('Tables created successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating tables:', error);
    } finally {
        client.release();
    }
}

createTables().catch(err => console.error('Unexpected error:', err));
