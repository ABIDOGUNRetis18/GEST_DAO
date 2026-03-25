import bcrypt from "bcryptjs";
import { db } from "./db";
import { RowDataPacket } from "mysql2";

export async function authenticateUser(email: string, password: string) {
  try {
    const connection = await db();
    const [users] = await connection.execute<RowDataPacket[]>(
      "SELECT id, email, username, url_photo, role_id, password FROM users WHERE email = ?",
      [email],
    );

    const user = users[0] as {
      id: number;
      email: string;
      username: string | null;
      url_photo: string | null;
      role_id: number;
      password: string;
    };
    if (!user) {
      return { success: false, message: "Email ou mot de passe incorrect" };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, message: "Email ou mot de passe incorrect" };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        url_photo: user.url_photo,
        role_id: user.role_id,
      },
    };
  } catch (error) {
    console.error("Erreur lors de l'authentification:", error);
    return {
      success: false,
      message: "Une erreur est survenue lors de l'authentification",
    };
  }
}

export async function createUser(
  email: string,
  password: string,
  username?: string,
  roleId: number | string = 4, // Par défaut: Membre Equipe (accepte nombre ou string)
) {
  try {
    const connection = await db();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Générer un username à partir de l'email si non fourni
    const finalUsername = username || email.split("@")[0];

    // Convertir roleId en nombre si c'est une string
    const finalRoleId = typeof roleId === 'string' ? parseInt(roleId, 10) : roleId;

    await connection.execute(
      "INSERT INTO users (email, password, username, role_id) VALUES (?, ?, ?, ?)",
      [email, hashedPassword, finalUsername, finalRoleId],
    );

    return { success: true };
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      return { success: false, message: "Cet email est déjà utilisé" };
    }
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return {
      success: false,
      message: "Une erreur est survenue lors de la création du compte",
    };
  }
}

export async function updateUserPassword(email: string, newPassword: string) {
  try {
    const connection = await db();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await connection.execute("UPDATE users SET password = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mot de passe:", error);
    return {
      success: false,
      message: "Une erreur est survenue lors de la mise à jour du mot de passe",
    };
  }
}
