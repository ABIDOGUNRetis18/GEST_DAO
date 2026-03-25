import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTaskAssignmentEmail } from "@/lib/task-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daoId = searchParams.get("daoId");

    if (!daoId) {
      return NextResponse.json(
        { success: false, message: "daoId requis" },
        { status: 400 },
      );
    }

    const connection = await db();
    const [rows]: any = await connection.execute(
      "SELECT id, dao_id, id_task, titre, description, assigned_to FROM tasks WHERE dao_id = ?",
      [Number(daoId)],
    );

    return NextResponse.json({ success: true, data: rows || [] });
  } catch (err: any) {
    console.error("API /api/task-assignment GET error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== ASSIGNATION DE TÂCHE - DÉBUT ===");
    
    const body = await req.json();
    const { dao_id, id_task, assigned_to, description } = body || {};

    console.log("Données reçues:", JSON.stringify(body, null, 2));
    console.log("dao_id:", dao_id);
    console.log("id_task:", id_task);
    console.log("assigned_to:", assigned_to);

    if (!dao_id || !id_task || !assigned_to) {
      return NextResponse.json(
        { success: false, message: "dao_id, id_task et assigned_to sont requis" },
        { status: 400 },
      );
    }

    const connection = await db();

    // Récupérer le nom de la tâche
    const [taskRows]: any = await connection.execute(
      "SELECT nom FROM task WHERE id = ?",
      [Number(id_task)],
    );

    const taskName = taskRows.length > 0 ? taskRows[0].nom : `Tâche ${id_task}`;
    console.log("Nom de la tâche:", taskName);

    // Récupérer les informations de l'utilisateur assigné et du DAO
    const [userInfo]: any = await connection.execute(
      `SELECT u.username, u.email, d.objet as dao_name 
       FROM users u 
       JOIN daos d ON d.id = ? 
       WHERE u.id = ?`,
      [Number(dao_id), Number(assigned_to)],
    );

    console.log("Informations utilisateur:", JSON.stringify(userInfo, null, 2));

    // Vérifier si une tâche existe déjà pour ce DAO et ce modèle
    const [existingTasks]: any = await connection.execute(
      "SELECT id FROM tasks WHERE dao_id = ? AND id_task = ?",
      [Number(dao_id), Number(id_task)],
    );

    if (existingTasks.length > 0) {
      // Mettre à jour la tâche existante
      await connection.execute(
        "UPDATE tasks SET assigned_to = ?, updated_at = NOW() WHERE dao_id = ? AND id_task = ?",
        [Number(assigned_to), Number(dao_id), Number(id_task)],
      );
      console.log(`Tâche existante mise à jour: dao_id=${dao_id}, id_task=${id_task}, assigned_to=${assigned_to}`);
    } else {
      // Créer une nouvelle tâche seulement si elle n'existe pas
      await connection.execute(
        `INSERT INTO tasks (dao_id, id_task, titre, description, assigned_to, progress, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [Number(dao_id), Number(id_task), taskName, description ?? null, Number(assigned_to), 0],
      );
      console.log(`Nouvelle tâche créée: dao_id=${dao_id}, id_task=${id_task}, assigned_to=${assigned_to}`);
    }

    // Envoyer un email de notification à l'utilisateur assigné
    if (Array.isArray(userInfo) && userInfo.length > 0) {
      const user = userInfo[0];
      console.log("Envoi de l'email de notification de tâche assignée...");
      
      try {
        const emailResult = await sendTaskAssignmentEmail(
          taskName,
          description || 'Non spécifiée',
          user.username || 'Non spécifié',
          user.email || 'Non spécifié',
          user.dao_name || 'Non spécifié',
          'moyenne', // priorité par défaut
          undefined // pas de date d'échéance
        );
        
        console.log("Résultat de l'envoi d'email:", JSON.stringify(emailResult, null, 2));
        
        if (emailResult.success) {
          console.log("✅ Email de notification de tâche assignée envoyé avec succès");
        } else {
          console.error("❌ Erreur lors de l'envoi de l'email de notification de tâche:", emailResult.error);
        }
      } catch (emailError) {
        console.error("❌ Exception lors de l'envoi de l'email de notification de tâche:", emailError);
      }
    } else {
      console.log("❌ Aucune information utilisateur trouvée pour l'ID:", assigned_to);
    }

    console.log("=== ASSIGNATION DE TÂCHE - TERMINÉE ===");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API /api/task-assignment POST error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 },
    );
  }
}
