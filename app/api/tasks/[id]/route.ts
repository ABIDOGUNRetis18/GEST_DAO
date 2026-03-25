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
      progress INT NOT NULL DEFAULT 0,
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

  // S'assurer que la colonne progress existe
  try {
    await connection.execute(`
      ALTER TABLE tasks ADD COLUMN progress INT NOT NULL DEFAULT 0
    `);
  } catch (err) {
    // Colonne existante, ignorer
  }

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      user_name VARCHAR(255) DEFAULT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_task_comments_task (task_id),
      INDEX idx_task_comments_user (user_id),
      CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      CONSTRAINT fk_task_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  try {
    await connection.execute(`
      ALTER TABLE task_comments ADD COLUMN user_name VARCHAR(255) DEFAULT NULL
    `);
  } catch (err) {
    // Colonne existante, ignorer
  }

  try {
    await connection.execute(`
      ALTER TABLE task_comments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  } catch (err) {
    // Colonne existante, ignorer
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const connection = await db();
    await ensureTaskTables(connection);

    const [rows]: any = await connection.execute(
      `
      SELECT
        t.id,
        t.dao_id,
        t.titre,
        t.description,
        t.statut,
        t.date_creation,
        t.date_echeance,
        t.priorite,
        t.assigned_to,
        u.username AS assigned_username
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
      LIMIT 1
    `,
      [id],
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tache non trouvee" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err: any) {
    console.error("API /api/tasks/[id] GET error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      titre,
      description,
      statut,
      date_creation,
      date_echeance,
      priorite,
      assigned_to,
    } = body || {};

    const updates: string[] = [];
    const values: any[] = [];

    if (titre !== undefined) {
      updates.push("titre = ?");
      values.push(titre);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (statut !== undefined) {
      updates.push("statut = ?");
      values.push(statut);
    }
    if (date_creation !== undefined) {
      updates.push("date_creation = ?");
      values.push(date_creation);
    }
    if (date_echeance !== undefined) {
      updates.push("date_echeance = ?");
      values.push(date_echeance);
    }
    if (priorite !== undefined) {
      updates.push("priorite = ?");
      values.push(priorite);
    }
    if (assigned_to !== undefined) {
      updates.push("assigned_to = ?");
      values.push(assigned_to);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Aucune modification" },
        { status: 400 },
      );
    }

    const connection = await db();
    await ensureTaskTables(connection);

    values.push(id);
    await connection.execute(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API /api/tasks/[id] PUT error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const connection = await db();
    await ensureTaskTables(connection);

    await connection.execute("DELETE FROM tasks WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API /api/tasks/[id] DELETE error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 },
    );
  }
}
