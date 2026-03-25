import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureCommentsTable(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      user_name VARCHAR(255) DEFAULT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_comments_task (task_id),
      INDEX idx_comments_user (user_id),
      INDEX idx_comments_created (created_at),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
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

// GET - Récupérer les commentaires d'une tâche
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    
    if (!taskId) {
      return NextResponse.json(
        { error: "ID de tâche requis" },
        { status: 400 }
      );
    }

    const connection = await db();
    await ensureCommentsTable(connection);

    const [comments] = await connection.execute(`
      SELECT 
        tc.id,
        tc.task_id,
        tc.user_id,
        tc.user_name,
        tc.text,
        tc.created_at,
        u.username as user_username
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `, [taskId]);


    return NextResponse.json({
      success: true,
      data: comments
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des commentaires:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Ajouter un commentaire à une tâche
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { text, user_id, user_name } = body;

    if (!taskId || !text) {
      return NextResponse.json(
        { error: "ID de tâche et texte requis" },
        { status: 400 }
      );
    }

    const connection = await db();
    await ensureCommentsTable(connection);

    // Pour l'instant, on utilise un user_id par défaut (à remplacer par l'utilisateur authentifié)
    const userId = user_id || 1; // TODO: Récupérer l'utilisateur authentifié
    const userName = user_name || "Utilisateur";

    const [result] = await connection.execute(`
      INSERT INTO task_comments (task_id, user_id, user_name, text)
      VALUES (?, ?, ?, ?)
    `, [taskId, userId, userName, text]);

    // Notifier les membres de la tâche
    try {
      const [taskMembers] = await connection.execute(
        "SELECT DISTINCT ta.user_id FROM task_assignment ta WHERE ta.task_id = ? AND ta.user_id != ?",
        [taskId, userId]
      ) as any[];
      for (const member of taskMembers as any[]) {
        await connection.execute(
          "INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'comment', ?, ?)",
          [
            member.user_id,
            "Nouveau commentaire de " + userName,
            userName + " a commenté la tâche #" + taskId + " : " + text.substring(0, 100) + (text.length > 100 ? "..." : "")
          ]
        );
      }
    } catch (notifError) {
      console.error("Erreur notification commentaire:", notifError);
    }

    // Récupérer le commentaire créé
    const newComment = {
      id: (result as any).insertId,
      task_id: parseInt(taskId),
      user_id: userId,
      user_name: userName,
      text,
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: newComment,
      message: "Commentaire ajouté avec succès"
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout du commentaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un commentaire
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { commentId, text } = body;

    if (!taskId || !commentId || !text) {
      return NextResponse.json(
        { error: "ID de tâche, ID de commentaire et texte requis" },
        { status: 400 }
      );
    }

    const connection = await db();
    await ensureCommentsTable(connection);

    await connection.execute(`
      UPDATE task_comments 
      SET text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND task_id = ?
    `, [text, commentId, taskId]);


    return NextResponse.json({
      success: true,
      message: "Commentaire mis à jour avec succès"
    });

  } catch (error) {
    console.error("Erreur lors de la mise à jour du commentaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un commentaire
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!taskId || !commentId) {
      return NextResponse.json(
        { error: "ID de tâche et ID de commentaire requis" },
        { status: 400 }
      );
    }

    const connection = await db();
    await ensureCommentsTable(connection);

    await connection.execute(`
      DELETE FROM task_comments 
      WHERE id = ? AND task_id = ?
    `, [commentId, taskId]);


    return NextResponse.json({
      success: true,
      message: "Commentaire supprimé avec succès"
    });

  } catch (error) {
    console.error("Erreur lors de la suppression du commentaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
