"use client";
import dynamic from "next/dynamic";

const DirecteurGeneralClient = dynamic(
  () => import("./page-client"),
  { ssr: false }
);

export default function DirecteurGeneralPage() {
  return <DirecteurGeneralClient />;
}
