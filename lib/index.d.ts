// Déclaration des types pour les modules dans le dossier lib
declare module "@/lib/auth" {
  export function authenticateUser(
    email: string,
    password: string,
  ): Promise<{
    success: boolean;
    message?: string;
    user?: {
      id: number;
      role_id: number;
    };
  }>;

  export function createUser(
    email: string,
    password: string,
    username?: string,
    roleId?: string,
  ): Promise<{
    success: boolean;
    message?: string;
  }>;

  export function updateUserPassword(
    email: string,
    newPassword: string,
  ): Promise<{
    success: boolean;
    message?: string;
  }>;
}

declare module "@/lib/db" {
  import { Pool } from "mysql2/promise";
  export function db(): Promise<Pool>;
}
