import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    console.log("=== RÉCUPÉRATION PROCHAIN NUMÉRO DAO - DÉBUT ===");
    
    const connection = await db();
    const year = new Date().getFullYear();
    
    // Créer la table des DAOs si elle n'existe pas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS daos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero VARCHAR(100) UNIQUE,
        date_depot DATE,
        objet TEXT,
        description TEXT,
        reference VARCHAR(255),
        autorite VARCHAR(255),
        chef_id BIGINT UNSIGNED,
        team_id VARCHAR(100),
        statut ENUM('aRisque', 'enCours') DEFAULT 'enCours',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    // Récupérer le dernier numéro DAO pour cette année
    const [lastDaoRows]: any = await connection.execute(
      `SELECT numero FROM daos 
       WHERE numero LIKE ? 
       ORDER BY numero DESC 
       LIMIT 1`,
      [`DAO-${year}-%`]
    );
    
    let nextSeq = 1;
    let lastNumber = "";
    
    if (Array.isArray(lastDaoRows) && lastDaoRows.length > 0) {
      const lastNumero = lastDaoRows[0].numero;
      console.log("Dernier numéro trouvé:", lastNumero);
      
      // Extraire le numéro séquentiel du dernier numéro
      const match = lastNumero.match(new RegExp(`DAO-${year}-(\\d+)`));
      if (match && match[1]) {
        lastNumber = match[1];
        nextSeq = parseInt(match[1]) + 1;
      }
    }
    
    // Générer le nouveau numéro formaté
    const generatedNumero = `DAO-${year}-${String(nextSeq).padStart(3, "0")}`;
    
    console.log("Année:", year);
    console.log("Dernier numéro:", lastNumber || "Aucun");
    console.log("Prochain séquence:", nextSeq);
    console.log("Numéro généré:", generatedNumero);
    console.log("=== RÉCUPÉRATION PROCHAIN NUMÉRO DAO - TERMINÉ ===");
    
    return NextResponse.json({
      success: true,
      numero: generatedNumero,
      year: year,
      sequence: nextSeq,
      lastNumber: lastNumber
    });
    
  } catch (error: any) {
    console.error("Erreur lors de la récupération du prochain numéro DAO:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Erreur lors de la récupération du prochain numéro DAO" 
      },
      { status: 500 }
    );
  }
}
