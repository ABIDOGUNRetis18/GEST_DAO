import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDaoCreationEmail } from "@/lib/email";
import { withRetry } from "@/utils/db-retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureTables(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS teams (
      id VARCHAR(100) PRIMARY KEY,
      team_code VARCHAR(100) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS daos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero VARCHAR(100) UNIQUE,
      date_depot DATE,
      objet TEXT,
      description TEXT,
      reference VARCHAR(255),
      autorite VARCHAR(255),
      chef_id BIGINT UNSIGNED,
      team_id VARCHAR(100),
      statut ENUM('EN_ATTENTE', 'EN_COURS', 'A_RISQUE', 'TERMINEE', 'ARCHIVE') DEFAULT 'EN_ATTENTE',
      type_dao VARCHAR(20) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Ajouter la colonne statut si elle n'existe pas
  try {
    await connection.execute(`
      ALTER TABLE daos ADD COLUMN statut ENUM('EN_ATTENTE', 'EN_COURS', 'A_RISQUE', 'TERMINEE', 'ARCHIVE') DEFAULT 'EN_ATTENTE'
    `);
  } catch (err) {
    // Colonne existe déjà, ignorer l'erreur
  }

  // Ajouter la colonne type_dao si elle n'existe pas
  try {
    await connection.execute(`
      ALTER TABLE daos ADD COLUMN type_dao VARCHAR(20) NULL
    `);
  } catch (err) {
    // Colonne existe déjà, ignorer l'erreur
  }

  // Corriger d'éventuelles valeurs de statut héritées de versions antérieures
  try {
    await connection.execute(`
      UPDATE daos SET statut = 'EN_ATTENTE' WHERE statut IN ('enAttente', 'EN_ATTENTE', 'EN_ATTENTE');
    `);
    await connection.execute(`
      UPDATE daos SET statut = 'EN_COURS' WHERE statut IN ('enCours', 'EN_COURS', 'EN_COURS');
    `);
    await connection.execute(`
      UPDATE daos SET statut = 'A_RISQUE' WHERE statut IN ('aRisque', 'A_RISQUE', 'A_RISQUE');
    `);
    await connection.execute(`
      UPDATE daos SET statut = 'TERMINEE' WHERE statut IN ('termine', 'TERMINEE', 'TERMINEE');
    `);
    await connection.execute(`
      UPDATE daos SET statut = 'ARCHIVE' WHERE statut IN ('archive', 'ARCHIVE', 'ARCHIVE');
    `);
  } catch (err) {
    console.warn('Mise à jour des statuts daos (normalisation) a échoué :', err);
  }

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id VARCHAR(100),
      user_id BIGINT UNSIGNED,
      PRIMARY KEY (team_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS dao_sequences (
      year INT PRIMARY KEY,
      seq INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Table pour les types de DAO
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS dao_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(20) NOT NULL,
      libelle VARCHAR(100) NOT NULL,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_dao_types_code (code),
      INDEX idx_dao_types_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  try {
    await connection.execute(`
      ALTER TABLE dao_types
      ADD UNIQUE KEY uk_dao_types_code (code)
    `);
  } catch (err) {
    // L'index existe déjà.
  }

  // Insérer les types de DAO par défaut s'ils n'existent pas
  await connection.execute(`
    INSERT IGNORE INTO dao_types (code, libelle, description) VALUES
    ('AMI', 'AMI', 'Appel à manifestation d''intérêt'),
    ('DP', 'DP', 'Dialogue compétitif'),
    ('DC', 'DC', 'Demande de concurrence'),
    ('AAO', 'AAO', 'Appel d''offres ouvert')
  `);
}

/**
 * Génère un numéro DAO-YYYY-XXX de façon atomique (safe en concurrence)
 */
async function getNextDaoNumero(connection: any) {
  const year = new Date().getFullYear();

  // Atomique: insert si absent sinon incrémente, et on récupère la nouvelle valeur via LAST_INSERT_ID
  await connection.execute(
    `
    INSERT INTO dao_sequences (year, seq)
    VALUES (?, 1)
    ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)
  `,
    [year],
  );

  const [seqRows]: any = await connection.execute(
    `SELECT LAST_INSERT_ID() AS seq`,
  );

  const seq = Number(seqRows?.[0]?.seq || 1);
  const generatedNumero = `DAO-${year}-${String(seq).padStart(3, "0")}`;

  return generatedNumero;
}

export async function GET(req: NextRequest) {
  try {
    const connection = await db();

    // crée les tables si besoin avec retry pour éviter les deadlocks
    await withRetry(() => ensureTables(connection));

    const { searchParams } = new URL(req.url);
    const chefId = searchParams.get("chefId");

    let query = `
      SELECT 
        d.id,
        d.numero,
        d.reference,
        d.autorite,
        d.date_depot,
        d.statut,
        d.chef_id,
        d.groupement,
        d.nom_partenaire,
        d.type_dao,
        u.username as chef_projet
      FROM daos d
      LEFT JOIN users u ON d.chef_id = u.id
    `;

    const params: any[] = [];

    if (chefId) {
      query += " WHERE d.chef_id = ?";
      params.push(Number(chefId));
    }

    query += " ORDER BY d.numero ASC";

    const [rows]: any = await withRetry(() => connection.execute(query, params));

    // Garder le statut réel de la base de données, ne pas l'écraser
    // Le statut est maintenant géré automatiquement par la progression des tâches
    const daosWithStatus = rows.map((dao: any) => {
      // Si le statut est NULL ou vide, utiliser une logique par défaut
      if (!dao.statut || dao.statut === '') {
        const updatedDao = { ...dao };
        
        if (updatedDao.date_depot) {
          const dateDepot = new Date(updatedDao.date_depot);
          const today = new Date();
          const diffTime = today.getTime() - dateDepot.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Logique par défaut seulement si le statut n'est pas défini
          updatedDao.statut = diffDays >= 3 ? 'A_RISQUE' : 'EN_COURS';
        } else {
          updatedDao.statut = 'EN_COURS';
        }
        return updatedDao;
      }
      
      // Sinon, garder le statut réel de la base de données (y compris ARCHIVE)
      return dao;
    });

    return NextResponse.json({ success: true, data: daosWithStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('API /api/dao GET error:', message);
    return NextResponse.json(
      { success: false, message: message || "Erreur serveur" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date_depot,
      objet,
      description,
      reference,
      autorite,
      chefEquipe,
      membres,
      groupement,
      nomPartenaire,
      typeDao,
    } = body;

    const year = new Date().getFullYear();

    // numero n'est plus requis côté client (car généré côté serveur)
    if (!date_depot || !objet || !description || !reference || !autorite) {
      return NextResponse.json(
        { success: false, message: "Champs requis manquants" },
        { status: 400 },
      );
    }

    const connection = await db();

    // crée les tables si besoin
    await ensureTables(connection);

    // Ajouter les colonnes groupement et nom_partenaire si elles n'existent pas
    try {
      const [existingColumns]: any = await connection.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daos' AND COLUMN_NAME IN ('groupement','nom_partenaire')"
      );

      const existing = new Set((existingColumns || []).map((row: any) => row.COLUMN_NAME));
      if (!existing.has('groupement')) {
        await connection.execute("ALTER TABLE daos ADD COLUMN groupement VARCHAR(10000) NULL");
      }
      if (!existing.has('nom_partenaire')) {
        await connection.execute("ALTER TABLE daos ADD COLUMN nom_partenaire VARCHAR(255) NULL");
      }
    } catch (err) {
      console.log("Mise à jour table daos (colonnes groupement/nom_partenaire):", err);
    }

    // Vérifier que le chef et les membres existent et ont les bons rôles
    const userIds: number[] = [];
    if (chefEquipe) userIds.push(Number(chefEquipe));
    if (Array.isArray(membres)) membres.forEach((m: any) => userIds.push(Number(m)));

    if (userIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Chef et membres requis" },
        { status: 400 },
      );
    }

    const placeholders = userIds.map(() => "?").join(",");
    const [usersRows]: any = await connection.execute(
      `SELECT id, role_id FROM users WHERE id IN (${placeholders})`,
      userIds,
    );

    const idToRole: Record<number, string> = {};
    (usersRows || []).forEach((r: any) => {
      idToRole[Number(r.id)] = String(r.role_id);
    });

    // Vérification du rôle ChefProjet supprimée pour permettre à n'importe quel utilisateur d'être chef d'équipe

    // Members can be any user (no role restriction)
    // La vérification de rôle est supprimée pour permettre à tous les utilisateurs d'être membres

    // Créer une équipe unique
    const teamId = crypto.randomUUID();
    const teamCode = `TEAM-${Date.now()}`;

    await connection.execute(
      "INSERT INTO teams (id, team_code) VALUES (?, ?)",
      [teamId, teamCode],
    );

    // Générer le numéro DAO côté serveur (atomique) - basé sur le dernier ID
    const [lastDaoRows]: any = await connection.execute(
      `SELECT id, numero FROM daos 
       WHERE numero LIKE ? 
       ORDER BY id DESC 
       LIMIT 1`,
      [`DAO-${year}-%`]
    );
    
    let nextSeq = 1;
    if (Array.isArray(lastDaoRows) && lastDaoRows.length > 0) {
      const lastNumero = lastDaoRows[0].numero;
      console.log("Dernier numéro trouvé:", lastNumero);
      
      // Extraire le numéro séquentiel du dernier numéro
      const match = lastNumero.match(new RegExp(`DAO-${year}-(\\d+)`));
      if (match && match[1]) {
        nextSeq = parseInt(match[1]) + 1;
      }
    }
    
    const generatedNumero = `DAO-${year}-${String(nextSeq).padStart(3, "0")}`;
    console.log("Numéro DAO généré lors de l'insertion:", generatedNumero);

    // Insérer DAO avec retry pour éviter les deadlocks
    const [insertRes]: any = await withRetry(() =>
      connection.execute(`
      INSERT INTO daos (numero, date_depot, objet, description, reference, autorite, statut, chef_id, team_id, groupement, nom_partenaire, type_dao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        generatedNumero,
        date_depot,
        objet,
        description,
        reference,
        autorite,
        'EN_COURS',
        Number(chefEquipe),
        teamId,
        groupement || null,
        groupement === "oui" ? nomPartenaire : null,
        typeDao || null,
      ])
    );

    const daoId = insertRes?.insertId;

    // Insérer membres
    for (const m of membres || []) {
      await connection.execute(
        "INSERT INTO team_members (team_id, user_id) VALUES (?, ?)",
        [teamId, Number(m)],
      );
    }

    // Créer automatiquement la première tâche assignée au chef de projet
    // Vérifier et mettre à jour la structure de la table tasks
    try {
      const [existingTaskCols]: any = await connection.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME IN ('titre','description','statut','date_creation','date_echeance','priorite','assigned_to','created_at','updated_at')"
      );

      const existing = new Set((existingTaskCols || []).map((row: any) => row.COLUMN_NAME));

      if (!existing.has('titre')) {
        await connection.execute("ALTER TABLE tasks ADD COLUMN titre VARCHAR(255) NOT NULL DEFAULT ''");
      }
      if (!existing.has('description')) {
        await connection.execute("ALTER TABLE tasks ADD COLUMN description TEXT");
      }
      if (!existing.has('statut')) {
        await connection.execute("ALTER TABLE tasks ADD COLUMN statut ENUM('a_faire', 'en_cours', 'termine') DEFAULT 'a_faire'");
      }
      if (!existing.has('date_creation')) {
        await connection.execute("ALTER TABLE tasks ADD COLUMN date_creation DATE");
      }
      if (!existing.has('date_echeance')) {
        await connection.execute("ALTER TABLE tasks ADD COLUMN date_echeance DATE");
      }
      if (!existing.has('priorite')) {
        await connection.execute("ALTER TABLE tasks ADD COLUMN priorite ENUM('basse', 'moyenne', 'haute') DEFAULT 'moyenne'");
      }
      if (!existing.has('assigned_to')) {
        await connection.execute("ALTER TABLE tasks ADD COLUMN assigned_to BIGINT UNSIGNED");
      }
      if (!existing.has('created_at')) {
        await connection.execute("ALTER TABLE tasks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      }
      if (!existing.has('updated_at')) {
        await connection.execute("ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
      }
    } catch (err) {
      console.log("Mise à jour table tasks (colonnes) :", err);
    }

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dao_id INT NOT NULL,
        titre VARCHAR(255) NOT NULL,
        description TEXT,
        statut ENUM('a_faire', 'en_cours', 'termine') DEFAULT 'a_faire',
        date_creation DATE,
        date_echeance DATE,
        priorite ENUM('basse', 'moyenne', 'haute') DEFAULT 'moyenne',
        assigned_to BIGINT UNSIGNED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tasks_dao (dao_id),
        INDEX idx_tasks_assigned (assigned_to),
        CONSTRAINT fk_tasks_dao FOREIGN KEY (dao_id) REFERENCES daos(id) ON DELETE CASCADE,
        CONSTRAINT fk_tasks_user FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Récupérer les informations du chef de projet pour l'email
    let chefProjetInfo = { name: "Non spécifié", email: "Non spécifié" };
    if (chefEquipe) {
      try {
        const [chefRows] = await connection.execute(
          "SELECT username, email FROM users WHERE id = ?",
          [Number(chefEquipe)]
        );
        
        if (Array.isArray(chefRows) && chefRows.length > 0) {
          const chef = chefRows[0] as any;
          chefProjetInfo = {
            name: chef.username || "Non spécifié",
            email: chef.email || "Non spécifié"
          };
        }
      } catch (chefError) {
        console.error("Erreur lors de la récupération du chef de projet:", chefError);
      }
    }

    // Envoyer un email de notification à l'admin
    try {
      console.log("Envoi de l'email de création de DAO...");
      const emailResult = await sendDaoCreationEmail(
        objet,
        chefProjetInfo.name,
        chefProjetInfo.email
      );
      
      if (emailResult.success) {
        console.log("✅ Email de création de DAO envoyé avec succès");
      } else {
        console.error("❌ Erreur lors de l'envoi de l'email de création de DAO:", emailResult.error);
      }
    } catch (emailError) {
      console.error("❌ Exception lors de l'envoi de l'email de création de DAO:", emailError);
    }

    return NextResponse.json({
      success: true,
      id: daoId,
      numero: generatedNumero,
      teamId,
      teamCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('API /api/dao POST error:', message);
    return NextResponse.json(
      { success: false, message: message || "Erreur serveur lors de la création du DAO" },
      { status: 500 },
    );
  }
}
