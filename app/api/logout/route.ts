// app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Créer une réponse de succès avec redirection
    const response = NextResponse.json(
      {
        success: true,
        message: "Déconnexion réussie",
        redirectTo: "/login", // URL de redirection
      },
      { status: 200 },
    );

    // Supprimer tous les cookies liés à l'authentification
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      maxAge: 0, // Expire immédiatement
    };

    // Supprimer les cookies potentiels
    response.cookies.set("auth-token", "", cookieOptions);
    response.cookies.set("session", "", cookieOptions);
    response.cookies.set("token", "", cookieOptions);

    return response;
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return NextResponse.json(
      { message: "Erreur lors de la déconnexion" },
      { status: 500 },
    );
  }
}
