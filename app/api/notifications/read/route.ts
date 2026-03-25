import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id requis" }, { status: 400 });
    }

    const connection = await db();
    await connection.execute(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      [user_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
