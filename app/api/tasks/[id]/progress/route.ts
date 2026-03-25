import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  console.log('=== DÉBUT API PUT /api/tasks/[id]/progress ===');
  
  // Afficher les informations de la requête
  const url = new URL(req.url);
  console.log('URL complète:', req.url);
  console.log('Chemin:', url.pathname);
  console.log('Paramètres de recherche:', url.searchParams.toString());
  console.log('Méthode:', req.method);
  console.log('En-têtes:', Object.fromEntries(req.headers.entries()));
  
  // Extraire l'ID des paramètres de la route ou de l'URL
  const { id: _id } = await params;
  let id = _id;
  
  // Si l'ID n'est pas dans les paramètres, essayons de l'extraire de l'URL
  if (!id) {
    const pathParts = new URL(req.url).pathname.split('/').filter(Boolean);
    id = pathParts[pathParts.length - 2]; // L'ID est l'avant-dernier segment de l'URL
    console.log('ID extrait de l\'URL:', id);
  }
  
  console.log('Paramètres de la route (params):', params);
  console.log('ID extrait:', id);
  console.log(`Type de l'ID: ${typeof id}, Valeur: ${id}`);
  
  // Vérifier que l'ID est valide
  if (!id || id === 'undefined' || id === 'null' || id === '0') {
    const errorMsg = `ID de tâche manquant ou invalide dans l'URL: ${id}`;
    console.error(errorMsg);
    console.log('Headers de la requête:', Object.fromEntries(req.headers.entries()));
    console.log('URL complète:', req.url);
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMsg,
        receivedId: id,
        params: params,
        url: req.url
      },
      { status: 400 },
    );
  }
  
  try {
    const body = await req.json().catch((error) => {
      console.error('Erreur lors de l\'analyse du corps de la requête:', error);
      throw new Error('Corps de la requête invalide');
    });
    
    const { progress } = body;
    console.log("Données reçues:", { id, progress });

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      const errorMsg = `Progression invalide: ${progress}`;
      console.error(errorMsg);
      return NextResponse.json(
        { success: false, message: errorMsg },
        { status: 400 },
      );
    }

    console.log("Connexion à la base de données...");
    const connection = await db();
    
    try {
      // Vérifier d'abord si la tâche existe
      console.log(`Vérification de l'existence de la tâche ${id}...`);
      const [taskRows] = await connection.query(
        "SELECT id, dao_id FROM tasks WHERE id = ?",
        [id]
      );
      
      if (!Array.isArray(taskRows) || taskRows.length === 0) {
        const errorMsg = `Tâche non trouvée avec l'ID: ${id}`;
        console.error(errorMsg);
        return NextResponse.json(
          { success: false, message: errorMsg },
          { status: 404 },
        );
      }

      const task = (taskRows as any[])[0];
      const daoId = task.dao_id;
      
      // Vérifier si c'est la première tâche du DAO
      console.log(`Vérification du blocage pour le DAO ${daoId} et la tâche ${id}...`);
      const [firstTaskRows] = await connection.query(
        "SELECT id, progress FROM tasks WHERE dao_id = ? ORDER BY id ASC LIMIT 1",
        [daoId]
      );
      
      if (!Array.isArray(firstTaskRows) || (firstTaskRows as any[]).length === 0) {
        const errorMsg = `Aucune tâche trouvée pour le DAO ${daoId}`;
        console.error(errorMsg);
        return NextResponse.json(
          { success: false, message: errorMsg },
          { status: 404 },
        );
      }
      
      const firstTask = (firstTaskRows as any[])[0];
      
      // Si ce n'est pas la première tâche et que la première n'est pas terminée, bloquer
      // Bypass pour administration / correction possible avec override dans le corps.
      const forceOverride = !!body?.override;
      if (firstTask.id !== parseInt(id) && firstTask.progress < 100 && !forceOverride) {
        const errorMsg = `La progression est bloquée tant que la première tâche n'est pas terminée. Tâche actuelle: ${id}, Première tâche: ${firstTask.id} (Progression: ${firstTask.progress}%)`;
        console.error(`BLOCAGE: ${errorMsg}`);
        return NextResponse.json(
          { 
            success: false, 
            message: "Impossible de modifier la progression de cette tâche.",
            details: "La première tâche du DAO doit être terminée (100%) avant de pouvoir modifier les autres tâches.",
            firstTaskId: firstTask.id,
            firstTaskProgress: firstTask.progress,
            currentTaskId: parseInt(id)
          },
          { status: 403 }, // Forbidden
        );
      }
      
      console.log(`Permission accordée: mise à jour de la progression à ${progress}% pour la tâche ${id}...`);
      
      // Mettre à jour la progression dans la table tasks
      const [result] = await connection.execute(
        "UPDATE tasks SET progress = ? WHERE id = ?",
        [progress, id],
      );

      console.log("Résultat de la mise à jour:", result);

      // Vérifier si la mise à jour a réussi
      if ('affectedRows' in result && result.affectedRows === 0) {
        const errorMsg = `Aucune ligne mise à jour pour la tâche ${id}`;
        console.error(errorMsg);
        return NextResponse.json(
          { success: false, message: errorMsg },
          { status: 404 },
        );
      }

      console.log("Progression mise à jour avec succès");
      
      // === VÉRIFICATION AUTOMATIQUE DU STATUT DU DAO ===
      console.log("=== DÉBUT VÉRIFICATION STATUT DAO ===");
      
      // Récupérer le dao_id de cette tâche
      const [taskInfo] = await connection.execute(
        "SELECT dao_id FROM tasks WHERE id = ?",
        [id]
      ) as any[];
      
      console.log("TaskInfo résultat:", taskInfo);
      
      if (taskInfo.length > 0) {
        const daoId = taskInfo[0].dao_id;
        console.log("DAO ID concerné:", daoId);
        
        if (daoId) {
          // Vérifier le statut actuel du DAO
          const [currentDao] = await connection.execute(
            "SELECT id, statut FROM daos WHERE id = ?",
            [daoId]
          ) as any[];
          
          console.log("DAO actuel:", currentDao);
          
          // Vérifier toutes les tâches de ce DAO
          const [allTasks] = await connection.execute(
            "SELECT id, progress FROM tasks WHERE dao_id = ?",
            [daoId]
          ) as any[];
          
          console.log("Toutes les tâches du DAO:", allTasks);
          console.log("Nombre de tâches:", allTasks.length);
          
          if (allTasks.length > 0) {
            // Calculer la progression moyenne du DAO
            const totalProgress = allTasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
            const averageProgress = Math.round(totalProgress / allTasks.length);
            
            console.log("Progression totale:", totalProgress);
            console.log("Progression moyenne calculée:", averageProgress, "%");
            
            // Vérifier combien de tâches sont à 100%
            const completedTasks = allTasks.filter((task: any) => (task.progress || 0) === 100);
            console.log("Tâches complétées (100%):", completedTasks.length, "/", allTasks.length);
            
            // Mettre à jour le statut du DAO selon la progression
            let newStatut;
            if (completedTasks.length === allTasks.length && averageProgress === 100) {
              newStatut = 'TERMINEE';
            } else if (averageProgress > 0) {
              newStatut = 'EN_COURS';
            } else {
              newStatut = 'A_RISQUE';
            }
            
            console.log("Ancien statut:", currentDao[0]?.statut);
            console.log("Nouveau statut calculé:", newStatut);
            console.log("Toutes les tâches sont à 100%?", completedTasks.length === allTasks.length);
            
            // Mettre à jour le statut du DAO seulement s'il a changé
            if (currentDao[0]?.statut !== newStatut) {
              console.log("Mise à jour du statut nécessaire...");
              
              const [updateResult] = await connection.execute(
                "UPDATE daos SET statut = ? WHERE id = ?",
                [newStatut, daoId]
              ) as any[];
              
              console.log("Résultat de la mise à jour:", updateResult);
              
              if ('affectedRows' in updateResult && updateResult.affectedRows > 0) {
                console.log(`✅ Statut du DAO ${daoId} mis à jour de "${currentDao[0]?.statut}" à "${newStatut}"`);
              } else {
                console.log("⚠️ Aucune ligne mise à jour - possible problème avec la requête");
              }
            } else {
              console.log("ℹ️ Le statut est déjà correct, pas de mise à jour nécessaire");
            }
          } else {
            console.log("⚠️ Aucune tâche trouvée pour ce DAO");
          }
        } else {
          console.log("⚠️ DAO ID est null ou undefined");
        }
      } else {
        console.log("⚠️ Aucune information trouvée pour cette tâche");
      }
      
      console.log("=== FIN VÉRIFICATION STATUT DAO ===");
      
      return NextResponse.json({ 
        success: true, 
        data: { progress } 
      });
      
    } catch (dbError) {
      console.error("Erreur de base de données:", dbError);
      return NextResponse.json(
        { 
          success: false, 
          message: "Erreur de base de données",
          error: String(dbError)
        },
        { status: 500 },
      );
    }
  } catch (err) {
    const error = err as Error;
    console.error("Erreur lors de la mise à jour de la progression:", error.message, error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Erreur serveur",
        error: error.message 
      },
      { status: 500 },
    );
  }
}