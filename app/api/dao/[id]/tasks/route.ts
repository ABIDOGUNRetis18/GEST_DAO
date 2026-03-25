import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTaskAssignmentEmail } from "@/lib/task-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureTaskTables(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dao_id INT NOT NULL,
      id_task INT NOT NULL,
      titre VARCHAR(255) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      statut ENUM('a_faire', 'en_cours', 'termine') DEFAULT 'a_faire',
      progress INT DEFAULT 0,
      date_creation DATE DEFAULT NULL,
      date_echeance DATE DEFAULT NULL,
      priorite ENUM('basse', 'moyenne', 'haute') DEFAULT 'moyenne',
      assigned_to INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tasks_dao (dao_id),
      INDEX idx_tasks_assigned (assigned_to),
      INDEX idx_tasks_progress (progress),
      INDEX idx_tasks_statut (statut),
      FOREIGN KEY (dao_id) REFERENCES daos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// GET - Récupérer les tâches d'un DAO spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: daoId } = await params;
    
    if (!daoId) {
      return NextResponse.json(
        { error: "ID de DAO requis" },
        { status: 400 }
      );
    }

    const connection = await db();
    await ensureTaskTables(connection);

    const [tasks] = await connection.execute(`
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
        u.username as assigned_username
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.dao_id = ?
      ORDER BY t.id_task ASC
    `, [daoId]);

    await connection.end();

    return NextResponse.json({
      success: true,
      data: tasks
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des tâches:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour une tâche
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { titre, description, statut, progress, date_echeance, priorite, assigned_to } = body;

    console.log("=== MISE À JOUR TÂCHE - DÉBUT ===");
    console.log("Task ID:", taskId);
    console.log("Données reçues:", JSON.stringify(body, null, 2));
    console.log("assigned_to:", assigned_to);
    console.log("assigned_to type:", typeof assigned_to);
    console.log("assigned_to !== undefined:", assigned_to !== undefined);
    console.log("assigned_to !== null:", assigned_to !== null);
    console.log("Condition d'envoi email:", assigned_to !== undefined && assigned_to !== null);

    if (!taskId) {
      return NextResponse.json(
        { error: "ID de tâche requis" },
        { status: 400 }
      );
    }

    const connection = await db();
    await ensureTaskTables(connection);

    // Construire la requête de mise à jour dynamique
    const updateFields = [];
    const updateValues = [];
    
    if (titre !== undefined) {
      updateFields.push("titre = ?");
      updateValues.push(titre);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(description);
    }
    if (statut !== undefined) {
      updateFields.push("statut = ?");
      updateValues.push(statut);
    }
    if (progress !== undefined) {
      updateFields.push("progress = ?");
      updateValues.push(progress);
    }
    if (date_echeance !== undefined) {
      updateFields.push("date_echeance = ?");
      updateValues.push(date_echeance);
    }
    if (priorite !== undefined) {
      updateFields.push("priorite = ?");
      updateValues.push(priorite);
    }
    if (assigned_to !== undefined) {
      updateFields.push("assigned_to = ?");
      updateValues.push(assigned_to);
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "Aucun champ à mettre à jour" },
        { status: 400 }
      );
    }
    
    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(taskId);
    
    const updateQuery = `
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    
    await connection.execute(updateQuery, updateValues);
    
    // Envoyer un email de notification si la tâche est assignée à un utilisateur
    if (assigned_to !== undefined && assigned_to !== null) {
      console.log(" DÉCLENCHEMENT DE L'ENVOI D'EMAIL - DÉBUT");
      console.log("assigned_to condition remplie, tentative d'envoi d'email...");
      
      try {
        // Récupérer les informations de la tâche et de l'utilisateur
        console.log("Récupération des informations de la tâche et de l'utilisateur...");
        const [taskInfo] = await connection.execute(`
          SELECT 
            t.titre,
            t.description,
            t.priorite,
            t.date_echeance,
            u.username as assigned_username,
            u.email as assigned_email,
            d.objet as dao_name
          FROM tasks t
          LEFT JOIN users u ON t.assigned_to = u.id
          LEFT JOIN daos d ON t.dao_id = d.id
          WHERE t.id = ?
        `, [taskId]);
        
        console.log("Résultat de la requête taskInfo:", JSON.stringify(taskInfo, null, 2));
        
        if (Array.isArray(taskInfo) && taskInfo.length > 0) {
          const task = taskInfo[0] as any;
          console.log("Informations de la tâche trouvées:", JSON.stringify(task, null, 2));
          
          console.log("Envoi de l'email de notification de tâche assignée...");
          const emailResult = await sendTaskAssignmentEmail(
            task.titre || `Tâche ${taskId}`,
            task.description || 'Non spécifiée',
            task.assigned_username || 'Non spécifié',
            task.assigned_email || 'Non spécifié',
            task.dao_name || 'Non spécifié',
            task.priorite || 'Non spécifiée',
            task.date_echeance ? new Date(task.date_echeance).toLocaleDateString('fr-FR') : undefined
          );
          
          console.log("Résultat de l'envoi d'email:", JSON.stringify(emailResult, null, 2));
          
          if (emailResult.success) {
            console.log(" Email de notification de tâche assignée envoyé avec succès");
          } else {
            console.error(" Erreur lors de l'envoi de l'email de notification de tâche:", emailResult.error);
          }
        } else {
          console.log(" Aucune information de tâche trouvée pour l'ID:", taskId);
        }
      } catch (emailError) {
        console.error(" Exception lors de l'envoi de l'email de notification de tâche:", emailError);
      }
      
      console.log("📧 DÉCLENCHEMENT DE L'ENVOI D'EMAIL - FIN");
    } else {
      console.log("📧 PAS D'ENVOI D'EMAIL - Condition non remplie");
      console.log("assigned_to est undefined ou null, pas d'envoi d'email");
    }
    
    await connection.end();

    return NextResponse.json({
      success: true,
      message: "Tâche mise à jour avec succès"
    });

  } catch (error) {
    console.error("Erreur lors de la mise à jour de la tâche:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une tâche
export async function DELETE(
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
    await ensureTaskTables(connection);

    await connection.execute(`
      DELETE FROM tasks WHERE id = ?
    `, [taskId]);

    await connection.end();

    return NextResponse.json({
      success: true,
      message: "Tâche supprimée avec succès"
    });

  } catch (error) {
    console.error("Erreur lors de la suppression de la tâche:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
