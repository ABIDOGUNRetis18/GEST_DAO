import { redirect } from "next/navigation";

// Cette page redirige vers /login par défaut
export default function HomePage() {
  redirect("/login");
  return null;
}
