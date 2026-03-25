"use client";
import dynamic from "next/dynamic";

const HistoryPageClient = dynamic(
  () => import("./page-client"),
  { ssr: false }
);

export default function HistoryWrapper() {
  return <HistoryPageClient />;
}
