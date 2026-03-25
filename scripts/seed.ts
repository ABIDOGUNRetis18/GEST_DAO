import dotenv from "dotenv";
import { db, verifyDatabaseStructure } from "../lib/db";
import bcrypt from "bcrypt";
import { RowDataPacket } from "mysql2";

dotenv.config({ path: ".env.local" });
interface User {
  username: string;
  email: string;
  password: string;
  role_id: number; // Corrigé : doit être un entier correspondant à la table roles
}

async function seedDatabase() {
  await verifyDatabaseStructure();
  const connection = await db();

  try {
    // Vérifier si la table users existe
    const [tables] = await connection.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [process.env.DB_NAME || "dao"],
    );

    if (tables.length === 0) {
      console.error(
        "La table 'users' n'existe pas. Veuillez d'abord exécuter les migrations.",
      );
      process.exit(1);
    }

    // Vérifier si des utilisateurs existent déjà
    const [existingUsers] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM users",
    );

    if (existingUsers[0].count > 0) {
      console.log(
        "Ajout de nouveaux utilisateurs à la base de données existante...",
      );
    }

    // Données des utilisateurs avec role_id correct
    const users: User[] = [
      {
        username: "admin",
        email: "admin@dao.com",
        password: await bcrypt.hash("admin123", 10),
        role_id: 2, // Administrateur
      },
      {
        username: "superadmin",
        email: "superadmin@dao.com",
        password: await bcrypt.hash("superadmin123", 10),
        role_id: 2, // Super Administrateur
      },
      {
        username: "lio",
        email: "lio@dao.com",
        password: await bcrypt.hash("lio123", 10),
        role_id: 2, // Administrateur
      },
      {
        username: "directeur",
        email: "directeur@dao.com",
        password: await bcrypt.hash("directeur123", 10),
        role_id: 1, // Directeur General
      },
      {
        username: "user1",
        email: "user1@dao.com",
        password: await bcrypt.hash("user1123", 10),
        role_id: 4, // MembreEquipe
      },
      {
        username: "user2",
        email: "use@example.com",
        password: await bcrypt.hash("user2123", 10),
        role_id: 2,
      },
      {
        username: "manager1",
        email: "manager@dao.com",
        password: await bcrypt.hash("manager123", 10),
        role_id: 3, // ChefProjet
      },
      {
        username: "chef_projet1",
        email: "chef1@dao.com",
        password: await bcrypt.hash("chef123", 10),
        role_id: 3, // ChefProjet
      },
      {
        username: "dev1",
        email: "dev1@dao.com",
        password: await bcrypt.hash("dev1234", 10),
        role_id: 4, // MembreEquipe
      },
      {
        username: "membre1",
        email: "membre1@dao.com",
        password: await bcrypt.hash("membre123", 10),
        role_id: 4, // MembreEquipe
      },
    ];

    // Insérer les utilisateurs
    let addedUsers = 0;
    for (const user of users) {
      try {
        const [existing] = await connection.execute<RowDataPacket[]>(
          "SELECT id FROM users WHERE email = ?",
          [user.email],
        );

        if (existing.length === 0) {
          await connection.execute(
            "INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)",
            [user.username, user.email, user.password, user.role_id],
          );
          console.log(
            `Utilisateur créé : ${user.email} (role_id: ${user.role_id})`,
          );
          addedUsers++;
        } else {
          console.log(`L'utilisateur ${user.email} existe déjà, ignoré.`);
        }
      } catch (error) {
        console.error(`Erreur avec l'utilisateur ${user.email}:`, error);
      }
    }

    console.log(`\n${addedUsers} nouveaux utilisateurs ont été ajoutés.`);

    // Vérifier si la table purchases existe et ajouter des données
    const [purchasesTables] = await connection.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchases'`,
      [process.env.DB_NAME || "dao"],
    );

    if (purchasesTables.length > 0) {
      const [existingPurchases] = await connection.execute<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM purchases",
      );

      if (existingPurchases[0].count === 0) {
        const purchases = [
          {
            name: "Jeremy Ortega",
            status_report: "Levelled up",
            office: "Catalinaborough",
            price: 790,
            date: "2018-01-06",
            gross_amount: 2274253,
          },
          {
            name: "Alvin Fisher",
            status_report: "Ui design completed",
            office: "East Mayra",
            price: 23230,
            date: "2018-07-18",
            gross_amount: 83127,
          },
          {
            name: "John Doe",
            status_report: "Project completed",
            office: "New York",
            price: 1234,
            date: "2018-12-01",
            gross_amount: 567890,
          },
        ];

        for (const purchase of purchases) {
          await connection.execute(
            "INSERT INTO purchases (name, status_report, office, price, date, gross_amount) VALUES (?, ?, ?, ?, ?, ?)",
            [
              purchase.name,
              purchase.status_report,
              purchase.office,
              purchase.price,
              purchase.date,
              purchase.gross_amount,
            ],
          );
        }
        console.log("Données de test ajoutées à la table purchases.");
      }
    }
  } catch (error) {
    console.error("Erreur lors du peuplement de la base de données :", error);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

seedDatabase();
