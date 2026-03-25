import dotenv from "dotenv";
import { db, verifyDatabaseStructure } from "../lib/db-postgres";
import bcrypt from "bcrypt";

dotenv.config({ path: ".env.local" });

interface User {
  username: string;
  email: string;
  password: string;
  role_id: number;
}

async function seedDatabase() {
  await verifyDatabaseStructure();
  const connection = await db();

  try {
    // Vérifier si la table users existe
    const tablesResult = await connection.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'users'`
    );

    if (tablesResult.rows.length === 0) {
      console.error(
        "La table 'users' n'existe pas. Veuillez d'abord exécuter les migrations.",
      );
      return;
    }

    // Vérifier si des utilisateurs existent déjà
    const existingUsers = await connection.query(
      "SELECT COUNT(*) as count FROM users"
    );

    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log("La base de données contient déjà des utilisateurs. Arrêt du seed.");
      return;
    }

    // Créer les rôles s'ils n'existent pas
    await connection.query(`
      INSERT INTO roles (name) VALUES ('admin'), ('user')
      ON CONFLICT (name) DO NOTHING
    `);

    // Utilisateurs à insérer
    const users: User[] = [
      {
        username: "admin",
        email: "admin@dao.com",
        password: "admin123",
        role_id: 1, // admin
      },
      {
        username: "user1",
        email: "user1@dao.com",
        password: "user123",
        role_id: 2, // user
      },
      {
        username: "user2",
        email: "user2@dao.com",
        password: "user123",
        role_id: 2, // user
      },
    ];

    // Insérer les utilisateurs
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await connection.query(
        `INSERT INTO users (username, email, password, role_id) 
         VALUES ($1, $2, $3, $4)`,
        [user.username, user.email, hashedPassword, user.role_id]
      );
      
      console.log(`Utilisateur ${user.username} créé avec succès`);
    }

    // Créer quelques teams par défaut
    await connection.query(`
      INSERT INTO teams (id, team_code) VALUES 
      ('team1', 'TEAM001'),
      ('team2', 'TEAM002')
      ON CONFLICT (id) DO NOTHING
    `);

    // Associer quelques utilisateurs aux teams
    const usersResult = await connection.query("SELECT id, username FROM users");
    const teamsResult = await connection.query("SELECT id FROM teams");

    if (usersResult.rows.length > 0 && teamsResult.rows.length > 0) {
      const adminUser = usersResult.rows.find(u => u.username === 'admin');
      const team1 = teamsResult.rows[0];
      
      if (adminUser && team1) {
        await connection.query(
          `INSERT INTO team_members (team_id, user_id) 
           VALUES ($1, $2) 
           ON CONFLICT (team_id, user_id) DO NOTHING`,
          [team1.id, adminUser.id]
        );
      }
    }

    console.log("Seed de la base de données terminé avec succès !");
  } catch (error) {
    console.error("Erreur lors du seed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Exécuter le seed
seedDatabase()
  .then(() => {
    console.log("Seed terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed échoué:", error);
    process.exit(1);
  });
