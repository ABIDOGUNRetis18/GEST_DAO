import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    console.log("=== AJOUT DU STATUT ARCHIVE À LA TABLE DAOS ===");
    
    const connection = await db();
    
    // Modifier la colonne statut pour inclure ARCHIVE
    try {
      await connection.execute(`
        ALTER TABLE daos 
        MODIFY COLUMN statut ENUM('EN_ATTENTE', 'EN_COURS', 'A_RISQUE', 'TERMINEE', 'ARCHIVE') 
        DEFAULT 'EN_ATTENTE'
      `);
      console.log("✅ Colonne statut modifiée pour inclure ARCHIVE");
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('already exists')) {
        console.log("ℹ️ Le statut ARCHIVE existe déjà");
      } else {
        console.error("Erreur lors de la modification de la colonne:", error);
        throw error;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Statut ARCHIVE ajouté avec succès à la table daos"
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
