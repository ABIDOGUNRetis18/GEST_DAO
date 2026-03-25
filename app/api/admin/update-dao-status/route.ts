import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    console.log("=== MISE À JOUR AUTOMATIQUE DES STATUTS DES DAOs ===");
    
    const connection = await db();
    
    // Récupérer tous les DAOs avec leurs tâches
    const [daosWithTasks] = await connection.execute(`
      SELECT 
        d.id as dao_id,
        d.numero,
        d.objet,
        d.statut as current_statut,
        COUNT(t.id) as total_tasks,
        SUM(t.progress) as total_progress,
        SUM(CASE WHEN t.progress = 100 THEN 1 ELSE 0 END) as completed_tasks
      FROM daos d
      LEFT JOIN tasks t ON d.id = t.dao_id
      GROUP BY d.id, d.numero, d.objet, d.statut
      ORDER BY d.id
    `) as any[];
    
    console.log("DAOs analysés:", daosWithTasks.length);
    
    let updatedCount = 0;
    
    for (const dao of daosWithTasks) {
      const totalTasks = parseInt((dao as any).total_tasks || "0");
      const completedTasks = parseInt((dao as any).completed_tasks || "0");
      const totalProgress = parseInt((dao as any).total_progress || "0");
      
      // Calculer la progression moyenne correctement
      const avgProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;
      
      console.log(`DAO ${(dao as any).numero}: total=${totalTasks}, completed=${completedTasks}, total_progress=${totalProgress}, avg=${avgProgress}%`);
      
      let newStatut: string;
      if (totalTasks === 0) {
        newStatut = 'EN_ATTENTE'; // DAO sans tâches
      } else if (completedTasks === totalTasks && avgProgress === 100) {
        newStatut = 'TERMINEE'; // Toutes les tâches terminées
      } else if (avgProgress > 0) {
        newStatut = 'EN_COURS'; // Au moins une tâche en progression
      } else {
        newStatut = 'EN_ATTENTE'; // Aucune progression
      }
      
      // Mettre à jour si le statut a changé
      if ((dao as any).current_statut !== newStatut) {
        await connection.execute(
          "UPDATE daos SET statut = ? WHERE id = ?",
          [newStatut, (dao as any).dao_id]
        );
        
        console.log(`DAO ${(dao as any).numero} (${(dao as any).dao_id}): ${(dao as any).current_statut} → ${newStatut}`);
        console.log(`  - Tâches: ${completedTasks}/${totalTasks} terminées`);
        console.log(`  - Progression moyenne: ${avgProgress}%`);
        
        updatedCount++;
      }
    }
    
    console.log(`✅ ${updatedCount} DAOs mis à jour sur ${daosWithTasks.length} analysés`);
    
    return NextResponse.json({
      success: true,
      message: `Statuts des DAOs mis à jour automatiquement`,
      data: {
        total_analyzed: daosWithTasks.length,
        updated: updatedCount,
        details: daosWithTasks.map((dao: any) => {
          const totalTasks = parseInt(dao.total_tasks || "0");
          const completedTasks = parseInt(dao.completed_tasks || "0");
          const totalProgress = parseInt(dao.total_progress || "0");
          const avgProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;
          
          let calculatedStatut: string;
          if (totalTasks === 0) {
            calculatedStatut = 'EN_ATTENTE';
          } else if (completedTasks === totalTasks && avgProgress === 100) {
            calculatedStatut = 'TERMINEE';
          } else if (avgProgress > 0) {
            calculatedStatut = 'EN_COURS';
          } else {
            calculatedStatut = 'EN_ATTENTE';
          }
          
          return {
            dao_id: dao.dao_id,
            numero: dao.numero,
            objet: dao.objet,
            old_statut: dao.current_statut,
            new_statut: calculatedStatut,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            avg_progress: avgProgress
          };
        })
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour des statuts:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
