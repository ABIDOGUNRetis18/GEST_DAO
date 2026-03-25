import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function PUT(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const image = formData.get("image") as File | null;
    const userIdRaw = formData.get("userId");

    // Validation : userId obligatoire
    if (!userIdRaw) {
      return NextResponse.json(
        { success: false, message: "Utilisateur non identifié" },
        { status: 401 }
      );
    }
    const userId = parseInt(userIdRaw as string, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: "userId invalide" },
        { status: 400 }
      );
    }

    // Validation des champs obligatoires
    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Nom et email requis" },
        { status: 400 }
      );
    }

    let photoUrl = null;

    if (image) {
      // Validation du type de fichier
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(image.type)) {
        return NextResponse.json(
          { success: false, message: "Type de fichier non autorisé. Utilisez JPG, PNG, WEBP ou GIF." },
          { status: 400 }
        );
      }

      // Validation de la taille (max 5MB)
      if (image.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, message: "Fichier trop volumineux (max 5MB)" },
          { status: 400 }
        );
      }

      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Whitelist stricte des extensions autorisées (protection path traversal)
      const ALLOWED_EXTENSIONS: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const ext = ALLOWED_EXTENSIONS[image.type];
      if (!ext) {
        return NextResponse.json(
          { success: false, message: "Type de fichier non autorisé" },
          { status: 400 }
        );
      }

      // Nom de fichier sans caractères spéciaux (protection path traversal)
      const safeUserId = String(userId).replace(/[^0-9]/g, "");
      const safeTimestamp = Date.now();
      const filename = `user_${safeUserId}_${safeTimestamp}.${ext}`;

      // Vérification que le chemin final reste dans uploadDir
      const uploadDir = path.join(process.cwd(), "private", "uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const filepath = path.join(uploadDir, filename);
      if (!filepath.startsWith(uploadDir)) {
        return NextResponse.json(
          { success: false, message: "Chemin de fichier invalide" },
          { status: 400 }
        );
      }

      fs.writeFileSync(filepath, buffer);

      // URL via la route API sécurisée
      photoUrl = `/api/uploads/${filename}`;
    }

    // Connexion via le pool centralisé
    const connection = await db();

    await connection.execute(
      `UPDATE users
       SET username = ?, email = ?${photoUrl ? ", url_photo = ?" : ""},
           updated_at = NOW()
       WHERE id = ?`,
      photoUrl ? [name, email, photoUrl, userId] : [name, email, userId]
    );

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour",
      photoUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
