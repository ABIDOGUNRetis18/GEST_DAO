import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export async function GET() {
  try {
    const connection = await db();
    const [rows]: any = await connection.execute(`
      SELECT id, name, status_report, office, price, date, gross_amount
      FROM purchases
      ORDER BY date DESC
    `);
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("API /api/purchases GET error:", err);
    return NextResponse.json(
      { message: "Erreur serveur lors de la récupération des achats" },
      { status: 500 },
    );
  }
}