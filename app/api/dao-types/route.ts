import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureTables(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS dao_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(20) NOT NULL,
      libelle VARCHAR(100) NOT NULL,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_dao_types_code (code),
      INDEX idx_dao_types_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // S'assurer que la colonne code est bien unique même si le schéma existait avant.
  try {
    await connection.execute(`
      ALTER TABLE dao_types
      ADD UNIQUE KEY uk_dao_types_code (code)
    `);
  } catch (err) {
    // L'index existe déjà, donc on ignore l'erreur
  }

  // Insérer les types de DAO par défaut s'ils n'existent pas
  await connection.execute(`
    INSERT IGNORE INTO dao_types (code, libelle, description) VALUES
    ('AMI', 'AMI', 'Appel à manifestation d''intérêt'),
    ('DP', 'DP', 'Dialogue compétitif'),
    ('DC', 'DC', 'Demande de concurrence'),
    ('AAO', 'AAO', 'Appel d''offres ouvert')
  `);
}

export async function GET(req: NextRequest) {
  try {
    const connection = await db();
    await ensureTables(connection);

    const [rows] = await connection.execute(`
      SELECT id, code, libelle, description, created_at
      FROM dao_types 
      ORDER BY libelle ASC
    `);

    return NextResponse.json({ 
      success: true, 
      data: rows 
    });
  } catch (err: any) {
    console.error("API /api/dao-types GET error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Le code est requis" },
        { status: 400 }
      );
    }

    // Validation du code (lettres majuscules et chiffres uniquement)
    if (!/^[A-Z0-9]+$/.test(code)) {
      return NextResponse.json(
        { success: false, message: "Le code doit contenir uniquement des lettres majuscules et des chiffres" },
        { status: 400 }
      );
    }

    const connection = await db();
    await ensureTables(connection);

    // Vérifier si le code existe déjà
    const [existingRows] = await connection.execute(
      "SELECT id FROM dao_types WHERE code = ?",
      [code]
    );

    if ((existingRows as any[]).length > 0) {
      return NextResponse.json(
        { success: false, message: "Ce code de type DAO existe déjà" },
        { status: 409 }
      );
    }

    // Insérer le nouveau type avec le code comme libellé
    const [result] = await connection.execute(
      "INSERT INTO dao_types (code, libelle, description) VALUES (?, ?, ?)",
      [code, code, null]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: (result as any).insertId,
        code,
        libelle: code,
        description: null
      }
    });
  } catch (err: any) {
    console.error("API /api/dao-types POST error:", err?.message, err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
