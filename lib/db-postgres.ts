import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "dao";
const DB_PORT = Number(process.env.DB_PORT || 5432);

if (!DB_USER) {
  throw new Error(
    `DB_USER manquant. Vérifie .env.local (DB_USER). Actuel: "${process.env.DB_USER ?? ""}"`
  );
}

export const pool = new Pool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function db() {
  return pool;
}

export async function verifyDatabaseStructure() {
  await _verifyDatabaseStructure(pool);
}

async function tableExists(connection: Pool, table: string) {
  const result = await connection.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return result.rows.length > 0;
}

async function _verifyDatabaseStructure(connection: Pool) {
  // 1) ROLES d'abord
  const rolesExists = await tableExists(connection, "roles");
  if (!rolesExists) {
    console.log("Création de la table roles...");
    await connection.query(`
      CREATE TABLE roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE
      );
    `);
    await connection.query(`
      INSERT INTO roles (name) VALUES ('admin'), ('user');
    `);
    console.log("Table roles créée avec succès");
  }

  // 2) USERS
  const usersExists = await tableExists(connection, "users");
  if (!usersExists) {
    console.log("Création de la table users...");
    await connection.query(`
      CREATE TABLE users (
        id BIGSERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role_id INTEGER NOT NULL REFERENCES roles(id),
        url_photo VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_role_id ON users(role_id);
    `);
    console.log("Table users créée avec succès");
  }

  // 3) NextAuth tables
  const sessionsExists = await tableExists(connection, "sessions");
  if (!sessionsExists) {
    console.log("Création de la table sessions pour NextAuth...");
    await connection.query(`
      CREATE TABLE sessions (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL
      );
    `);
    await connection.query(`
      CREATE INDEX idx_sessions_token ON sessions(session_token);
      CREATE INDEX idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
    `);
    console.log("Table sessions créée avec succès");
  }

  const accountsExists = await tableExists(connection, "accounts");
  if (!accountsExists) {
    console.log("Création de la table accounts pour NextAuth...");
    await connection.query(`
      CREATE TABLE accounts (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        provider_account_id VARCHAR(255) NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        token_type VARCHAR(255),
        scope VARCHAR(255),
        id_token TEXT,
        session_state TEXT,
        UNIQUE(provider, provider_account_id)
      );
    `);
    await connection.query(`
      CREATE INDEX idx_accounts_user_id ON accounts(user_id);
    `);
    console.log("Table accounts créée avec succès");
  }

  // 4) TEAMS
  await connection.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id VARCHAR(100) PRIMARY KEY,
      team_code VARCHAR(100) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5) DAOS
  await connection.query(`
    CREATE TABLE IF NOT EXISTS daos (
      id SERIAL PRIMARY KEY,
      numero VARCHAR(100) UNIQUE,
      date_depot DATE,
      objet TEXT,
      description TEXT,
      reference VARCHAR(255),
      autorite VARCHAR(255),
      chef_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      team_id VARCHAR(100) REFERENCES teams(id) ON DELETE SET NULL,
      statut VARCHAR(50) NOT NULL DEFAULT 'EN_COURS',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await connection.query(`
    CREATE INDEX IF NOT EXISTS idx_daos_created_at ON daos(created_at);
    CREATE INDEX IF NOT EXISTS idx_daos_chef_id ON daos(chef_id);
    CREATE INDEX IF NOT EXISTS idx_daos_team_id ON daos(team_id);
  `);

  // 6) TEAM_MEMBERS
  await connection.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id VARCHAR(100) REFERENCES teams(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (team_id, user_id)
    );
  `);
  await connection.query(`
    CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
  `);

  // 7) DAO_SEQUENCES
  await connection.query(`
    CREATE TABLE IF NOT EXISTS dao_sequences (
      year INTEGER PRIMARY KEY,
      seq INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 8) PURCHASES
  const purchasesExists = await tableExists(connection, "purchases");
  if (!purchasesExists) {
    console.log("Création de la table purchases...");
    await connection.query(`
      CREATE TABLE purchases (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status_report VARCHAR(255) NOT NULL,
        office VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        date DATE NOT NULL,
        gross_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table purchases créée avec succès");
  }

  // 9) MESSAGES
  const messagesExists = await tableExists(connection, "messages");
  if (!messagesExists) {
    console.log("Création de la table messages...");
    await connection.query(`
      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        mentioned_user_id INTEGER NULL,
        mentioned_user_name VARCHAR(255) NULL,
        is_public BOOLEAN DEFAULT true
      );
    `);
    await connection.query(`
      CREATE INDEX idx_messages_task_id ON messages(task_id);
      CREATE INDEX idx_messages_user_id ON messages(user_id);
      CREATE INDEX idx_messages_created_at ON messages(created_at);
    `);
    console.log("Table messages créée avec succès");
  }

  // 10) NOTIFICATIONS
  const notificationsExists = await tableExists(connection, "notifications");
  if (!notificationsExists) {
    console.log("Création de la table notifications...");
    await connection.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE INDEX idx_notifications_user ON notifications(user_id);
      CREATE INDEX idx_notifications_created_at ON notifications(created_at);
    `);
    console.log("Table notifications créée avec succès");
  }

  // 11) HIDDEN_MESSAGES
  await connection.query(`
    CREATE TABLE IF NOT EXISTS hidden_messages (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id)
    );
  `);

  // 12) COMMENTS
  await connection.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await connection.query(`
    CREATE INDEX IF NOT EXISTS idx_comments_message_id ON comments(message_id);
    CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
  `);

  console.log("Vérification DB terminée");
}
