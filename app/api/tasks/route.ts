import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureTaskTables(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dao_id INT NOT NULL,
      titre VARCHAR(255) NOT NULL,
      description TEXT,
      statut ENUM('a_faire', 'en_cours', 'termine') DEFAULT 'a_faire',
      progress INT DEFAULT 0,
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
    const { searchParams } = new URL(req.url);
    const daoId = searchParams.get('daoId');
    
    const connection = await db();
    await ensureTaskTables(connection);

    let query = `
      SELECT
        t.id,
        t.dao_id,
        t.id_task,
        t.titre,
        t.description,
        t.statut,
        t.progress,
        t.date_creation,
        t.date_echeance,
        t.priorite,
        t.assigned_to,
        u.username AS assigned_username
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
    `;
    
    let params: any[] = [];
    
    if (daoId) {
      query += " WHERE t.dao_id = ? ORDER BY t.id";
      params = [daoId];
    } else {
      query += " ORDER BY t.created_at DESC";
    }

    const [rows]: any = await connection.execute(query, params);

    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("API /api/tasks GET error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dao_id,
      titre,
      description,
      statut,
      date_creation,
      date_echeance,
      priorite,
      assigned_to,
    } = body;

    if (!dao_id || !titre) {
      return NextResponse.json(
        { success: false, message: "Champs requis manquants" },
        { status: 400 },
      );
    }

    const connection = await db();
    await ensureTaskTables(connection);

    // Vérifier si c'est la première tâche du DAO
    const [existingTasks]: any = await connection.execute(
      "SELECT COUNT(*) as count FROM tasks WHERE dao_id = ?",
      [dao_id]
    );

    const taskCount = existingTasks[0]?.count || 0;

    // Si ce n'est pas la première tâche, vérifier que la première est terminée
    if (taskCount > 0) {
      const [firstTask]: any = await connection.execute(
        "SELECT id, titre, statut FROM tasks WHERE dao_id = ? ORDER BY id LIMIT 1",
        [dao_id]
      );

      if (firstTask.length > 0 && firstTask[0].statut !== 'termine') {
        return NextResponse.json(
          { 
            success: false, 
            message: `Impossible de créer cette tâche. La première tâche "${firstTask[0].titre}" doit être terminée en premier (100%).` 
          },
          { status: 400 },
        );
      }
    }

    // Limiter à 15 tâches maximum par DAO
    if (taskCount >= 15) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Le nombre maximum de 15 tâches par DAO a été atteint." 
        },
        { status: 400 },
      );
    }

    const [insertRes]: any = await connection.execute(
      `
      INSERT INTO tasks (dao_id, titre, description, statut, date_creation, date_echeance, priorite, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        dao_id,
        titre,
        description || null,
        statut || 'a_faire',
        date_creation || null,
        date_echeance || null,
        priorite || 'moyenne',
        assigned_to || null,
      ],
    );

    const taskId = insertRes?.insertId;

    return NextResponse.json({
      success: true,
      id: taskId,
    });
  } catch (err: any) {
    console.error("API /api/tasks POST error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de la création de la tâche" },
      { status: 500 },
    );
  }
}
