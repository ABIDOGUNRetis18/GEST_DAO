import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const connection = await db();
    
    // Supprimer les tâches orphelines (tasks sans dao_id valide)
    const [result] = await connection.execute(`
      DELETE FROM tasks 
      WHERE dao_id NOT IN (SELECT id FROM daos)
    `);
    
    const deletedCount = (result as any).affectedRows;
    
    return NextResponse.json({ 
      success: true, 
      message: `${deletedCount} tâches orphelines supprimées`,
      deletedCount 
    });
    
  } catch (error: any) {
    console.error("Erreur lors du nettoyage des tâches:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
