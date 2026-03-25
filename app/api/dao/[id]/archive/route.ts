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
    
    // Vérifier si le DAO est déjà archivé
    if (dao.statut === 'ARCHIVE') {
      return NextResponse.json(
        { success: false, message: "Ce DAO est déjà archivé" },
        { status: 400 }
      );
    }
    
    // Archiver le DAO (changer le statut - PAS DE SUPPRESSION)
    await connection.execute(
      "UPDATE daos SET statut = 'ARCHIVE' WHERE id = ?",
      [id]
    );
    
    console.log(`DAO ${dao.numero} (ID: ${id}) archivé avec succès (statut changé, pas supprimé)`);
    
    return NextResponse.json({
      success: true,
      message: `DAO ${dao.numero} archivé avec succès`,
      data: {
        id: id,
        numero: dao.numero,
        statut: 'ARCHIVE',
        note: "Le DAO reste dans la base de données avec le statut ARCHIVE"
      }
    });
    
  } catch (error: any) {
    console.error("Erreur lors de l'archivage du DAO:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de l'archivage" },
      { status: 500 }
    );
  }
}
