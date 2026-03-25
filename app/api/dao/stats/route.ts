import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureTables(connection: any) {
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
      statut ENUM('aRisque', 'enCours', 'terminee') DEFAULT 'enCours',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

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
}

export async function GET(req: NextRequest) {
  try {
    const connection = await db();
    await ensureTables(connection);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    let whereClause = "";
    let params: any[] = [];

    // Filtrer selon le rôle de l'utilisateur
    if (userRole === '1' || userRole === '2' || userRole === '3') { // Admin, DG, ou ChefProjet
      whereClause = "WHERE d.chef_id = ?";
      params = [userId];
    } else if (userRole === '4') { // MembreEquipe
      whereClause = "JOIN team_members tm ON d.team_id = tm.team_id WHERE tm.user_id = ?";
      params = [userId];
    }

    const [daos]: any = await connection.execute(`
      SELECT 
        d.id,
        d.numero,
        d.reference,
        d.autorite,
        d.date_depot,
        d.statut,
        d.chef_id,
        u.username as chef_projet
      FROM daos d
      LEFT JOIN users u ON d.chef_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
    `, params);

    console.log(`Requête SQL: ${whereClause}, params: ${params}, résultats: ${daos.length}`);

    // Calculer les statistiques pour chaque DAO
    const stats = {
      total: 0,
      enCours: 0,
      aRisque: 0,
      terminees: 0
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const dao of daos) {
      stats.total++;

      // Règle 1: DAO en cours = date_aujourd'hui > date_depot
      if (dao.date_depot) {
        const dateDepot = new Date(dao.date_depot);
        dateDepot.setHours(0, 0, 0, 0);
        
        if (today > dateDepot) {
          // Vérifier si toutes les tâches sont terminées
          const [tasks]: any = await connection.execute(`
            SELECT statut FROM tasks WHERE dao_id = ?
          `, [dao.id]);

          const allTasksCompleted = tasks.length > 0 && 
            tasks.every((task: any) => task.statut === 'termine');

          if (allTasksCompleted) {
            dao.statut = 'terminee';
            stats.terminees++;
          } else {
            // Règle 3: DAO à risque = date_depot <= 3 jours
            const diffTime = today.getTime() - dateDepot.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 3) {
              dao.statut = 'aRisque';
              stats.aRisque++;
            } else {
              dao.statut = 'enCours';
              stats.enCours++;
            }
          }
        } else {
          dao.statut = 'enCours';
          stats.enCours++;
        }
      } else {
        dao.statut = 'enCours';
        stats.enCours++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        daos,
        stats
      }
    });

  } catch (err: any) {
    console.error("API /api/dao/stats GET error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
