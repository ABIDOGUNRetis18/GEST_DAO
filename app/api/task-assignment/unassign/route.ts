import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    console.log("=== DÉSASSIGNATION DE TÂCHE - DÉBUT ===");
    
    const body = await req.json();
    const { dao_id, id_task } = body || {};

    console.log("Données reçues:", JSON.stringify(body, null, 2));
    console.log("dao_id:", dao_id);
    console.log("id_task:", id_task);

    if (!dao_id || !id_task) {
      return NextResponse.json(
        { success: false, message: "dao_id et id_task sont requis" },
        { status: 400 },
      );
    }

    const connection = await db();

    // Mettre à jour la tâche pour la désassigner
    await connection.execute(
      "UPDATE tasks SET assigned_to = NULL, updated_at = NOW() WHERE dao_id = ? AND id_task = ?",
      [Number(dao_id), Number(id_task)],
    );

    console.log(`Tâche désassignée: dao_id=${dao_id}, id_task=${id_task}`);

    console.log("=== DÉSASSIGNATION DE TÂCHE - TERMINÉE ===");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API /api/task-assignment/unassign DELETE error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 },
    );
  }
}
