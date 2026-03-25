// app/api/check-email/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://ton-domaine.com",
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { success: false, error: "Email requis" },
      { status: 400, headers: getCorsHeaders(origin) }
    );
  }

  try {
    const connection = await db();

    interface UserRow extends RowDataPacket {
      id: number;
      password: string | null;
    }

    const [rows] = await connection.execute<UserRow[]>(
      "SELECT id, password FROM users WHERE email = ?",
      [email]
    );

    const userExists = Array.isArray(rows) && rows.length > 0;
    const hasPassword = userExists && rows[0].password !== null && rows[0].password !== "";

    return NextResponse.json(
      { success: userExists, hasPassword },
      { headers: getCorsHeaders(origin) }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
