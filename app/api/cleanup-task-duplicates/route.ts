import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const connection = await db();

    // Récupérer toutes les tâches en double (même dao_id et id_task)
    const [duplicates]: any = await connection.execute(`
      SELECT dao_id, id_task, COUNT(*) as count 
      FROM tasks 
      GROUP BY dao_id, id_task 
      HAVING COUNT(*) > 1
    `);

    let totalDeleted = 0;

    // Pour chaque groupe de doublons, garder le plus récent et supprimer les autres
    for (const dup of duplicates) {
      const [tasksToDelete]: any = await connection.execute(`
        SELECT id FROM tasks 
        WHERE dao_id = ? AND id_task = ? 
        ORDER BY created_at ASC, id ASC
      `, [dup.dao_id, dup.id_task]);

      // Garder le premier (le plus ancien) et supprimer les autres
      for (let i = 1; i < tasksToDelete.length; i++) {
        await connection.execute(
          "DELETE FROM tasks WHERE id = ?",
          [tasksToDelete[i].id]
        );
        totalDeleted++;
        console.log(`Supprimé doublon tâche ID ${tasksToDelete[i].id} pour DAO ${dup.dao_id}, modèle ${dup.id_task}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${totalDeleted} doublons de tâches supprimés`,
      totalDeleted,
      duplicateGroups: duplicates.length
    });
    
  } catch (error: any) {
    console.error("Erreur lors du nettoyage des doublons:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur", error: error.message },
      { status: 500 }
    );
  }
}
