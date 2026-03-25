import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/uploads/")) {
    return NextResponse.json(
      { error: "Accès non autorisé" },
      { status: 403 }
    );
  }

  if (pathname.startsWith("/test-") && pathname.endsWith(".html")) {
    return NextResponse.json(
      { error: "Accès non autorisé" },
      { status: 403 }
    );
  }

  const response = NextResponse.next();

  // Supprimer X-Powered-By
  response.headers.delete("X-Powered-By");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
