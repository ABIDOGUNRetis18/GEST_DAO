import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    console.log('API DELETE appelée avec params:', params);
    
    const { id, commentId } = await params;
    
    // Pour le débogage, on va essayer de supprimer sans vérification user_id d'abord
    console.log('Tentative de suppression du commentaire:', commentId);
    
    const connection = await db();

    // D'abord, récupérer les détails du commentaire à supprimer
    const [commentRows]: any = await connection.execute(
      `SELECT sender_id, subject, content FROM messages WHERE id = ?`,
      [commentId]
    );

    if (commentRows.length === 0) {
      console.log('Commentaire non trouvé:', commentId);
      return NextResponse.json(
        { success: false, message: "Commentaire non trouvé" },
        { status: 404 },
      );
    }

    const commentToDelete = commentRows[0];
    console.log('Commentaire trouvé:', commentToDelete);

    // Supprimer uniquement le message global du commentaire (receiver_id IS NULL)
    console.log('Exécution de la requête DELETE pour message global...');
    const [result] = await connection.execute(
      `DELETE FROM messages 
       WHERE id = ? AND sender_id = ? AND receiver_id IS NULL`,
      [commentId, commentToDelete.sender_id]
    );

    console.log('Résultat de la suppression multiple:', result);

    return NextResponse.json({ 
      success: true, 
      message: "Commentaire supprimé avec succès",
      deletedRows: result
    });
  } catch (err: any) {
    console.error("API DELETE error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur", error: err?.message },
      { status: 500 },
    );
  }
}
