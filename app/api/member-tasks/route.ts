import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    console.log("Début de la requête GET /api/member-tasks");
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log("ID utilisateur reçu:", userId);

    if (!userId) {
      console.error("Erreur: ID utilisateur manquant");
      return NextResponse.json({ success: false, message: "ID utilisateur manquant" }, { status: 400 });
    }

    try {
      // Vérification de la connexion à la base de données
      console.log("Tentative de connexion à la base de données...");
      const dbPool = await db();
      console.log("Connexion à la base de données établie avec succès");

      // Vérification de l'existence des tables
      const [tables] = await dbPool.query("SHOW TABLES LIKE 'tasks'");
      console.log("Tables trouvées:", tables);

      if (Array.isArray(tables) && tables.length === 0) {
        console.error("Erreur: La table 'tasks' n'existe pas");
        return NextResponse.json(
          { success: false, message: "Table 'tasks' non trouvée" },
          { status: 500 }
        );
      }

      // Vérification des colonnes de la table tasks
      const [columns] = await dbPool.query("SHOW COLUMNS FROM tasks");
      console.log("Colonnes de la table tasks:", columns);

      // Essai d'une requête simple d'abord
      console.log("Exécution d'une requête simple...");
      const [simpleResult] = await dbPool.query("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?", [userId]);
      console.log("Résultat de la requête simple:", simpleResult);

      // Vérification des colonnes de la table daos
      console.log("Vérification des colonnes de la table daos...");
      const [daoColumns] = await dbPool.query("SHOW COLUMNS FROM daos");
      console.log("Colonnes de la table daos:", daoColumns);
      
      // Requête principale
      console.log("Exécution de la requête principale...");
      // Afficher les colonnes de la table tasks pour le débogage
      const [taskColumns] = await dbPool.query("SHOW COLUMNS FROM tasks");
      console.log("Colonnes de la table tasks:", taskColumns);

      // Récupérer les tâches avec les informations du DAO
      const query = `
        SELECT 
          t.id,
          t.id_task,
          t.dao_id,
          t.titre,
          t.description,
          t.statut,
          t.progress,
          t.date_creation,
          t.date_echeance,
          t.priorite,
          t.assigned_to,
          d.reference as dao_reference,
          d.objet as dao_objet
        FROM tasks t
        LEFT JOIN daos d ON t.dao_id = d.id
        WHERE t.assigned_to = ?
        ORDER BY t.date_creation DESC
      `;
      
      console.log("Exécution de la requête:", query);
      
      const [taskRows] = await dbPool.query(query, [userId]);
      
      console.log("Résultat de la requête des tâches:", JSON.stringify(taskRows, null, 2));
      
      // Vérifier que chaque tâche a un ID valide
      if (Array.isArray(taskRows)) {
        const invalidTasks = taskRows.filter((task: any) => !task.id);
        if (invalidTasks.length > 0) {
          console.error("Tâches sans ID valide trouvées:", invalidTasks);
        }
      }

      console.log(`Tâches trouvées: ${Array.isArray(taskRows) ? taskRows.length : '0'}`);

      return NextResponse.json({ 
        success: true, 
        data: taskRows 
      });
    } catch (dbError) {
      console.error("Erreur de base de données:", dbError);
      return NextResponse.json(
        { 
          success: false, 
          message: "Erreur de base de données",
          error: String(dbError)
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des tâches:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Erreur serveur",
        error: String(error)
      }, 
      { status: 500 }
    );
  }
}
