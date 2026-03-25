// app/layout.tsx
import { Inter, Roboto } from "next/font/google";
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@mdi/font/css/materialdesignicons.min.css";
import ClientLayout from "./layout-client";

const inter = Inter({ subsets: ["latin"] });

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={roboto.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/custom.css" />
        <script
          src="https://code.jquery.com/jquery-3.6.0.min.js"
          integrity="sha384-vtXRMe3mGCbOeY7l30aIg8H9p3GdeSe4IFlP6G8JMa7o7lXvnz3GFKzPxzJdPfGK"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz"
          crossOrigin="anonymous"
        />
        <script src="/js/off-canvas.js" />
        <script src="/js/hoverable-collapse.js" />
        <script src="/js/template.js" />
      </body>
    </html>
  );
}
