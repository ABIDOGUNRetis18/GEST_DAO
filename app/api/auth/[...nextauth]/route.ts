import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const handler = async (req: Request, ctx: any) => {
  try {
    return await NextAuth(authConfig)(req, ctx);
  } catch (error) {
    console.error("NextAuth error:", error);
    return NextResponse.json(
      {
        error: "Erreur d'authentification",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
};

export { handler as GET, handler as POST };
