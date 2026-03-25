import { AuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Session, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./lib/db";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role_id: number;
    } & DefaultSession["user"];
  }
}

// Fonction pour adapter l'utilisateur de la base de données au format attendu par NextAuth
async function getUserByEmail(email: string) {
  const connection = await db();
  const [users] = await connection.execute<any[]>(
    "SELECT * FROM users WHERE email = ?",
    [email],
  );
  return users[0];
}

export const authConfig: AuthOptions = {
  // Configuration des pages personnalisées
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/login",
  },
  // Configuration des callbacks
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("Tentative de connexion:", { user, account });
      return true;
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirection:", { url, baseUrl });
      // Si l'URL commence par /, c'est une URL relative, on l'ajoute à l'URL de base
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Si l'URL est sur le même domaine, on l'utilise telle quelle
      else if (new URL(url).origin === baseUrl) return url;
      // Sinon, on redirige vers l'URL de base
      return baseUrl;
    },
    async session({ session, token, user }) {
      console.log("Mise à jour de la session:", { session, token });
      if (token) {
        try {
          const dbUser = await getUserByEmail(token.email!);
          if (dbUser) {
            session.user.id = dbUser.id.toString();
            session.user.role_id = dbUser.role_id;
            session.user.name = dbUser.username || token.name || "";
            session.user.email = token.email!;
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des données utilisateur:",
            error,
          );
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Mise à jour du token avec l'ID utilisateur si disponible
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        try {
          const { email, password } = credentials;
          const connection = await db();
          const [users] = await connection.execute<any[]>(
            "SELECT * FROM users WHERE email = ?",
            [email],
          );

          if (!users || users.length === 0) {
            return null;
          }

          const user = users[0];
          const isValid = await bcrypt.compare(password, user.password);

          if (!isValid) {
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.username,
            role_id: user.role_id,
          };
        } catch (error) {
          console.error("Error during authentication:", error);
          return null;
        }
      },
    }),
  ],
  // Configuration de la session
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    updateAge: 24 * 60 * 60, // Mise à jour de la session toutes les 24 heures
  },
  // Configuration des cookies
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 jours
      },
    },
  },
  // Clé secrète pour le chiffrement
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "votre-secret-tres-long-et-securise",
  // Mode debug en développement
  debug: process.env.NODE_ENV === "development",
  // Configuration du fournisseur JWT
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
};
