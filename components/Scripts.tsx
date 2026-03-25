import { headers } from "next/headers";
import ClientScripts from "./Scripts-client";

export default async function Scripts() {
  // Récupérer le nonce depuis les headers du middleware
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  return <ClientScripts nonce={nonce} />;
}
