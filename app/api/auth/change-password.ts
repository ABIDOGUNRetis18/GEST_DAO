import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentPassword, newPassword, userId } = body;

    // Validation des champs
    if (!currentPassword || !newPassword || !userId) {
      return NextResponse.json(
        { message: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "Le nouveau mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    const connection = await db();

    // Vérifier l'ancien mot de passe
    const [rows]: any = await connection.execute(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      return NextResponse.json(
        { message: "Mot de passe actuel incorrect" },
        { status: 400 }
      );
    }

    // Hash du nouveau mot de passe
    const hashed = await bcrypt.hash(newPassword, 12);

    // Mise à jour SQL
    await connection.execute(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
      [hashed, userId]
    );

    return NextResponse.json({
      message: "Mot de passe mis à jour avec succès",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
