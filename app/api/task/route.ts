import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureTaskTable(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS task (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export async function GET() {
  try {
    const connection = await db();
    await ensureTaskTable(connection);

    const [rows]: any = await connection.execute(
      "SELECT id, nom FROM task ORDER BY id ASC",
    );

    return NextResponse.json({ success: true, data: rows || [] });
  } catch (err: any) {
    console.error("API /api/task GET error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom } = body || {};

    if (!nom || typeof nom !== "string" || !nom.trim()) {
      return NextResponse.json(
        { success: false, message: "Le nom de la tache est requis" },
        { status: 400 },
      );
    }

    const connection = await db();
    await ensureTaskTable(connection);

    const [res]: any = await connection.execute(
      "INSERT INTO task (nom) VALUES (?)",
      [nom.trim()],
    );

    return NextResponse.json({ success: true, id: res?.insertId, nom: nom.trim() });
  } catch (err: any) {
    console.error("API /api/task POST error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 },
    );
  }
}
