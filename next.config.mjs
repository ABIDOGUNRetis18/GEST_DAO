/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  // Configuration de Turbopack
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    
  },
  // Configuration des alias pour la compatibilité avec Webpack
  webpack: (config) => {
    config.resolve.alias = {
      "@": path.resolve(__dirname, "./"),
    };
    return config;
  },
  // Configuration des en-têtes pour les API
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST, PUT, DELETE, OPTIONS" }
        ]
      }
    ]
  },
  // Désactive le mode strict pour éviter les problèmes de compatibilité
  reactStrictMode: true,
  // Désactive la vérification ESLint pendant la compilation
 
  // Désactive les vérifications TypeScript pendant la compilation
 
};

module.exports = nextConfig;
