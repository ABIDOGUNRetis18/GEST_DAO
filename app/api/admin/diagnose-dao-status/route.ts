import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    console.log("=== DIAGNOSTIC DES STATUTS DAO ===");
    
    const connection = await db();
    
    // Vérifier l'état réel de chaque DAO avec ses tâches
    const [diagnostic] = await connection.execute(`
      SELECT 
        d.id as dao_id,
        d.numero,
        d.objet,
        d.statut as current_statut,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.progress = 100 THEN 1 ELSE 0 END) as completed_tasks,
        SUM(t.progress) as total_progress,
        ROUND(SUM(t.progress) / COUNT(t.id)) as avg_progress_calculated,
        GROUP_CONCAT(CONCAT(t.id, ':', COALESCE(t.progress, 0)) ORDER BY t.id) as tasks_progress
      FROM daos d
      LEFT JOIN tasks t ON d.id = t.dao_id
      GROUP BY d.id, d.numero, d.objet, d.statut
      ORDER BY d.id
    `) as any[];
    
    console.log("Diagnostic complet des DAOs:");
    
    for (const dao of diagnostic) {
      const totalTasks = parseInt(dao.total_tasks || "0");
      const completedTasks = parseInt(dao.completed_tasks || "0");
      const totalProgress = parseInt(dao.total_progress || "0");
      const avgProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;
      
      // Statut attendu selon la logique
      let expectedStatut;
      if (totalTasks === 0) {
        expectedStatut = 'EN_ATTENTE';
      } else if (completedTasks === totalTasks && avgProgress === 100) {
        expectedStatut = 'TERMINEE';
      } else if (avgProgress > 0) {
        expectedStatut = 'EN_COURS';
      } else {
        expectedStatut = 'EN_ATTENTE';
      }
      
      const isCorrect = dao.current_statut === expectedStatut;
      const needsUpdate = !isCorrect;
      
      console.log(`\n=== DAO ${dao.numero} (ID: ${dao.dao_id}) ===`);
      console.log(`Objet: ${dao.objet}`);
      console.log(`Statut actuel: "${dao.current_statut}"`);
      console.log(`Statut attendu: "${expectedStatut}"`);
      console.log(`Tâches: ${completedTasks}/${totalTasks} terminées`);
      console.log(`Progression: ${avgProgress}% (calculée: ${dao.avg_progress_calculated}%)`);
      console.log(`Détail tâches: [${dao.tasks_progress}]`);
      console.log(`Correct: ${isCorrect ? '✅' : '❌'} ${needsUpdate ? '(Nécessite mise à jour)' : ''}`);
      
      // Si besoin de mise à jour, la faire automatiquement
      if (needsUpdate) {
        console.log(`🔄 Mise à jour automatique: "${dao.current_statut}" → "${expectedStatut}"`);
        await connection.execute(
          "UPDATE daos SET statut = ? WHERE id = ?",
          [expectedStatut, dao.dao_id]
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Diagnostic et correction des statuts DAO terminés",
      data: {
        total_analyzed: diagnostic.length,
        corrected: diagnostic.filter((dao: any) => {
          const totalTasks = parseInt(dao.total_tasks || "0");
          const completedTasks = parseInt(dao.completed_tasks || "0");
          const totalProgress = parseInt(dao.total_progress || "0");
          const avgProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;
          
          let expectedStatut;
          if (totalTasks === 0) {
            expectedStatut = 'EN_ATTENTE';
          } else if (completedTasks === totalTasks && avgProgress === 100) {
            expectedStatut = 'TERMINEE';
          } else if (avgProgress > 0) {
            expectedStatut = 'EN_COURS';
          } else {
            expectedStatut = 'EN_ATTENTE';
          }
          
          return dao.current_statut !== expectedStatut;
        }).length,
        details: diagnostic.map((dao: any) => {
          const totalTasks = parseInt(dao.total_tasks || "0");
          const completedTasks = parseInt(dao.completed_tasks || "0");
          const totalProgress = parseInt(dao.total_progress || "0");
          const avgProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;
          
          let expectedStatut;
          if (totalTasks === 0) {
            expectedStatut = 'EN_ATTENTE';
          } else if (completedTasks === totalTasks && avgProgress === 100) {
            expectedStatut = 'TERMINEE';
          } else if (avgProgress > 0) {
            expectedStatut = 'EN_COURS';
          } else {
            expectedStatut = 'EN_ATTENTE';
          }
          
          return {
            dao_id: dao.dao_id,
            numero: dao.numero,
            objet: dao.objet,
            current_statut: dao.current_statut,
            expected_statut: expectedStatut,
            is_correct: dao.current_statut === expectedStatut,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            avg_progress: avgProgress,
            tasks_detail: dao.tasks_progress
          };
        })
      }
    });
    
  } catch (error) {
    console.error("Erreur lors du diagnostic:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
