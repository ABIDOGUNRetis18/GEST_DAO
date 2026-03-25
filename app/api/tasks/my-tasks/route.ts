import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DÉBUT API MY-TASKS ===");
    
    // Récupérer l'ID de l'utilisateur connecté (simulation)
    // TODO: Remplacer par l'authentification réelle
    const userId = 41; // Utiliser directement l'utilisateur 41 (admin) pour tester
    
    console.log("User ID:", userId);
    
    const connection = await db();
    console.log("Connexion DB OK");
    
    // Vérifier si l'utilisateur existe
    const [userCheck] = await connection.execute(
      "SELECT id, username, role_id FROM users WHERE id = ?",
      [userId]
    ) as any[];
    
    console.log("Utilisateur trouvé:", userCheck);
    
    if (!userCheck.length) {
      console.log("Utilisateur non trouvé!");
      return NextResponse.json(
        { success: false, message: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    const user = userCheck[0];
    console.log("User info:", user);
    
    // Voir toutes les tâches
    const [allTasks] = await connection.execute("SELECT * FROM tasks") as any[];
    console.log("Toutes les tâches:", allTasks.length);
    
    // Voir les tâches assignées à cet utilisateur
    const [assignedTasks] = await connection.execute(
      "SELECT * FROM tasks WHERE assigne_a = ?", 
      [userId]
    ) as any[];
    console.log("Tâches assignées à l'utilisateur", userId, ":", assignedTasks.length, assignedTasks);
    
    // Retourner les tâches
    return NextResponse.json({
      success: true,
      data: assignedTasks,
      user: user
    });
    
  } catch (err: any) {
    console.error("API /api/tasks/my-tasks GET error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
