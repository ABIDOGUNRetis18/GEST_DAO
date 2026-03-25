import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const connection = await db();
    
    // Vérifier si le DAO existe
    const [daoRows] = await connection.execute(
      "SELECT id, numero, statut FROM daos WHERE id = ?",
      [id]
    ) as any[];
    
    if (!daoRows || daoRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "DAO non trouvé" },
        { status: 404 }
      );
    }
    
    const dao = daoRows[0];
    
    // Vérifier si le DAO est bien archivé
    if (dao.statut !== 'ARCHIVE') {
      return NextResponse.json(
        { success: false, message: "Ce DAO n'est pas archivé" },
        { status: 400 }
      );
    }
    
    // Restaurer le DAO (remettre le statut par défaut)
    await connection.execute(
      "UPDATE daos SET statut = 'EN_COURS' WHERE id = ?",
      [id]
    );
    
    console.log(`DAO ${dao.numero} (ID: ${id}) restauré avec succès`);
    
    return NextResponse.json({
      success: true,
      message: `DAO ${dao.numero} restauré avec succès`,
      data: {
        id: id,
        numero: dao.numero,
        statut: 'EN_COURS',
        note: "Le DAO a été restauré avec le statut EN_COURS"
      }
    });
    
  } catch (error: any) {
    console.error("Erreur lors de la restauration du DAO:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de la restauration" },
      { status: 500 }
    );
  }
}
