import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    console.log("=== MISE À JOUR DE LA STRUCTURE DE LA TABLE DAOS ===");
    
    const connection = await db();
    
    // 1. Modifier la colonne statut pour accepter plus de valeurs
    try {
      console.log("Modification de la colonne statut...");
      await connection.execute(`
        ALTER TABLE daos 
        MODIFY COLUMN statut ENUM('EN_ATTENTE', 'EN_COURS', 'A_RISQUE', 'TERMINEE') 
        DEFAULT 'EN_ATTENTE'
      `);
      console.log("✅ Colonne statut modifiée avec succès");
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('already exists')) {
        console.log("ℹ️ La colonne a déjà la bonne structure");
      } else {
        console.error("Erreur lors de la modification de la colonne:", error);
        throw error;
      }
    }
    
    // 2. Mettre à jour tous les statuts vides ou NULL
    console.log("Mise à jour des statuts existants...");
    
    // D'abord, récupérer tous les DAOs avec leurs tâches
    const [daosWithTasks] = await connection.execute(`
      SELECT 
        d.id,
        d.numero,
        d.statut as current_statut,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.progress = 100 THEN 1 ELSE 0 END) as completed_tasks,
        SUM(t.progress) as total_progress
      FROM daos d
      LEFT JOIN tasks t ON d.id = t.dao_id
      GROUP BY d.id, d.numero, d.statut
      ORDER BY d.id
    `) as any[];
    
    let updatedCount = 0;
    
    for (const dao of daosWithTasks) {
      const totalTasks = parseInt(dao.total_tasks || "0");
      const completedTasks = parseInt(dao.completed_tasks || "0");
      const totalProgress = parseInt(dao.total_progress || "0");
      const avgProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;
      
      // Calculer le bon statut
      let newStatut;
      if (totalTasks === 0) {
        newStatut = 'EN_ATTENTE';
      } else if (completedTasks === totalTasks && avgProgress === 100) {
        newStatut = 'TERMINEE';
      } else if (avgProgress > 0) {
        newStatut = 'EN_COURS';
      } else {
        newStatut = 'EN_ATTENTE';
      }
      
      // Mettre à jour si le statut est vide, NULL ou incorrect
      if (!dao.current_statut || dao.current_statut === '') {
        await connection.execute(
          "UPDATE daos SET statut = ? WHERE id = ?",
          [newStatut, dao.id]
        );
        
        console.log(`DAO ${dao.numero}: vide → ${newStatut} (${completedTasks}/${totalTasks} tâches, ${avgProgress}%)`);
        updatedCount++;
      }
    }
    
    console.log(`✅ ${updatedCount} DAOs mis à jour`);
    
    return NextResponse.json({
      success: true,
      message: "Structure de la table et statuts mis à jour avec succès",
      data: {
        updated_count: updatedCount,
        total_daos: daosWithTasks.length
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
