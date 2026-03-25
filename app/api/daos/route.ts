import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDaoCreationEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    console.log("Début de la requête GET /api/daos");
    
    const dbPool = await db();
    console.log("Connexion à la base de données établie");

    // Vérification de l'existence des tables
    const [tables] = await dbPool.query("SHOW TABLES LIKE 'daos'");
    console.log("Tables trouvées:", tables);

    if (Array.isArray(tables) && tables.length === 0) {
      console.error("Erreur: La table 'daos' n'existe pas");
      return NextResponse.json(
        { success: false, message: "Table 'daos' non trouvée" },
        { status: 500 }
      );
    }

    // Vérification de la structure de la table
    const [columns] = await dbPool.query("SHOW COLUMNS FROM daos");
    console.log("Colonnes de la table daos:", columns);

    // Construire la requête en fonction des colonnes existantes
    const columnNames = Array.isArray(columns) ? columns.map((col: any) => col.Field) : [];
    console.log("Noms des colonnes:", columnNames);

    // Colonnes de base qui doivent exister
    const baseColumns = ['id', 'reference', 'objet', 'statut'];
    const optionalColumns = ['autorite', 'date_depot', 'created_at', 'numero', 'description', 'chef_id', 'team_id', 'groupement', 'nom_partenaire'];
    
    // Vérifier quelles colonnes optionnelles existent
    const availableOptionalColumns = optionalColumns.filter(col => columnNames.includes(col));
    const allColumns = [...baseColumns, ...availableOptionalColumns];
    
    console.log("Colonnes à sélectionner:", allColumns);

    // Requête principale pour récupérer tous les DAO
    console.log("Exécution de la requête principale...");
    const query = `
      SELECT ${allColumns.join(', ')}
      FROM daos
      ORDER BY created_at DESC
    `;
    
    console.log("Exécution de la requête:", query);
    
    const [daoRows] = await dbPool.query(query);
    
    console.log("Résultat de la requête des DAO:", JSON.stringify(daoRows, null, 2));
    console.log(`DAO trouvés: ${Array.isArray(daoRows) ? daoRows.length : '0'}`);

    return NextResponse.json({ 
      success: true, 
      data: daoRows 
    });
  } catch (error: any) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("=== CRÉATION DE DAO - DÉBUT ===");
    
    const body = await request.json();
    console.log("Données reçues:", JSON.stringify(body, null, 2));
    
    const { 
      reference, 
      objet, 
      statut, 
      autorite, 
      date_depot, 
      numero, 
      description, 
      chef_id, 
      team_id, 
      groupement, 
      nom_partenaire 
    } = body;
    
    // Validation des champs requis
    if (!reference || !objet || !statut) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Les champs référence, objet et statut sont requis" 
        },
        { status: 400 }
      );
    }
    
    const dbPool = await db();
    console.log("Connexion à la base établie pour création");
    
    // Récupérer les informations du chef de projet si chef_id est fourni
    let chefProjetInfo = { name: "Non spécifié", email: "Non spécifié" };
    
    if (chef_id) {
      try {
        const [chefRows] = await dbPool.execute(
          "SELECT username, email FROM users WHERE id = ?",
          [chef_id]
        );
        
        if (Array.isArray(chefRows) && chefRows.length > 0) {
          const chef = chefRows[0] as any;
          chefProjetInfo = {
            name: chef.username || "Non spécifié",
            email: chef.email || "Non spécifié"
          };
        }
      } catch (chefError) {
        console.error("Erreur lors de la récupération du chef de projet:", chefError);
      }
    }
    
    // Construire la requête d'insertion
    const insertQuery = `
      INSERT INTO daos (
        reference, objet, statut, autorite, date_depot, numero, 
        description, chef_id, team_id, groupement, nom_partenaire, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const values = [
      reference,
      objet,
      statut,
      autorite || null,
      date_depot || null,
      numero || null,
      description || null,
      chef_id || null,
      team_id || null,
      groupement || null,
      nom_partenaire || null
    ];
    
    console.log("Requête d'insertion:", insertQuery);
    console.log("Valeurs:", values);
    
    const [result] = await dbPool.execute(insertQuery, values) as any[];
    
    console.log("DAO créé avec ID:", result.insertId);
    console.log("Informations du chef de projet:", chefProjetInfo);
    
    // Envoyer un email de notification à l'admin
    try {
      console.log("Envoi de l'email de création de DAO...");
      const emailResult = await sendDaoCreationEmail(
        objet || `DAO-${reference}`,
        chefProjetInfo.name,
        chefProjetInfo.email
      );
      
      if (emailResult.success) {
        console.log("✅ Email de création de DAO envoyé avec succès");
      } else {
        console.error("❌ Erreur lors de l'envoi de l'email de création de DAO:", emailResult.error);
      }
    } catch (emailError) {
      console.error("❌ Exception lors de l'envoi de l'email de création de DAO:", emailError);
    }
    
    console.log("=== CRÉATION DE DAO - TERMINÉE ===");
    
    return NextResponse.json({
      success: true,
      message: "DAO créé avec succès",
      daoId: result.insertId,
      chefProjet: chefProjetInfo
    });
    
  } catch (error: any) {
    console.error("=== ERREUR CRÉATION DAO ===");
    console.error("Erreur:", error);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.log("===============================");
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Erreur lors de la création du DAO",
        error: error.message 
      },
      { status: 500 }
    );
  }
}
