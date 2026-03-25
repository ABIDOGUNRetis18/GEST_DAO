import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const connection = await db();

    const [rows]: any = await connection.execute(
      `
      SELECT
        tm.user_id AS id,
        u.username
      FROM daos d
      JOIN team_members tm ON d.team_id = tm.team_id
      JOIN users u ON tm.user_id = u.id
      WHERE d.id = ?
      ORDER BY u.username ASC
    `,
      [Number(id)],
    );

    return NextResponse.json({ success: true, data: rows || [] });
  } catch (err: any) {
    console.error("API /api/dao/[id]/team-members GET error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 },
    );
  }
}
