"use client";

import Script from "next/script";

interface ClientScriptsProps {
  nonce: string;
}

export default function ClientScripts({ nonce }: ClientScriptsProps) {
  return (
    <>
      {/* jQuery doit être chargé EN PREMIER */}
      <Script
        src="https://code.jquery.com/jquery-3.6.0.min.js"
        strategy="beforeInteractive"
        integrity="sha384-vtXRMe3mGCbOeY7l30aIg8H9p3GdeSe4IFlP6G8JMa7o7lXvnz3GFKzPxzJdPfGK"
        crossOrigin="anonymous"
        nonce={nonce}
      />

      {/* DataTables (dépend de jQuery) */}
      <Script src="/js/jquery.dataTables.js" strategy="afterInteractive" nonce={nonce} />

      {/* Autres scripts */}
      <Script src="/js/Chart.min.js" strategy="afterInteractive" nonce={nonce} />
      <Script src="/js/off-canvas.js" strategy="lazyOnload" nonce={nonce} />
      <Script src="/js/hoverable-collapse.js" strategy="lazyOnload" nonce={nonce} />
      <Script src="/js/template.js" strategy="lazyOnload" nonce={nonce} />
      <Script src="/js/dashboard.js" strategy="lazyOnload" nonce={nonce} />
      <Script src="/js/data-table.js" strategy="lazyOnload" nonce={nonce} />
      <Script src="/js/dataTables.bootstrap4.js" strategy="lazyOnload" nonce={nonce} />
      <Script src="/js/chart.js" strategy="lazyOnload" nonce={nonce} />
    </>
  );
}
