import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { RowDataPacket } from "mysql2";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    // Récupère la session et l'utilisateur
    const dbPool = await db();
    const [rows] = await dbPool.query<RowDataPacket[]>(
      `SELECT users.id, users.username, users.email, users.url_photo
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.session_token = ? 
       AND sessions.expires > NOW()`,
      [sessionToken],
    );

    console.log("Données utilisateur depuis la base de données:", rows);

    if (!rows || rows.length === 0) {
      console.log("Aucun utilisateur trouvé avec ce token de session");
      return NextResponse.json({ user: null });
    }

    // Logs de débogage
    console.log("Résultat de la requête SQL:", rows);
    if (rows && rows.length > 0) {
      console.log("Données brutes de l'utilisateur:", rows[0]);
      console.log("Type de username:", typeof rows[0].username);
      console.log("Valeur de username:", rows[0].username);
      console.log("Valeur de email:", rows[0].email);
      console.log("Valeur de url_photo:", rows[0].url_photo);
    }

    return NextResponse.json({ user: rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ user: null });
  }
}
