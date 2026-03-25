"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import html2canvas from "html2canvas";
// jsPDF chargé dynamiquement dans handlePrintPdf (incompatible SSR)

interface Dao {
  id: number;
  numero: string;
  reference: string;
  autorite: string;
  date_depot?: string;
  statut?: string;
  chef_projet?: string;
  chef_id?: number;
  team_id?: string;
}


const escapeHtml = (str: string | undefined | null): string => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};


export default function HistoryPage() {
  const router = useRouter();
  const [daos, setDaos] = useState<Dao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("");

  const months = [
    { value: "", label: "Tous les mois" },
    { value: "01", label: "Janvier" },
    { value: "02", label: "Février" },
    { value: "03", label: "Mars" },
    { value: "04", label: "Avril" },
    { value: "05", label: "Mai" },
    { value: "06", label: "Juin" },
    { value: "07", label: "Juillet" },
    { value: "08", label: "Août" },
    { value: "09", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" },
  ];

  const getCurrentYearMonths = () => {
    const currentYear = new Date().getFullYear();
    return months.map((month) => ({
      ...month,
      label: month.value ? `${month.label} ${currentYear}` : month.label,
    }));
  };

  const handlePrintPdf = async () => {
    // ── Import dynamique jsPDF ───────────────────────────────────────────────
    // Chargé uniquement au clic, côté client, jamais en SSR.
    const { jsPDF } = await import("jspdf");

    const loadingIndicator = document.createElement("div");
    loadingIndicator.innerHTML = "Génération du rapport des DAO terminés...";
    loadingIndicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 9999;
      font-size: 16px;
    `;
    document.body.appendChild(loadingIndicator);

    const pdfContainer = document.createElement("div");
    pdfContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 210mm;
      min-height: 297mm;
      background: white;
      padding: 15mm;
      font-family: "Roboto", Arial, sans-serif;
      box-sizing: border-box;
      font-size: 12px;
      line-height: 1.4;
      overflow: hidden;
    `;

    pdfContainer.innerHTML = `
      <div style="background: #1e3a8a; color: white; text-align: center; padding: 20px 10px; margin: -15mm -15mm 15mm -15mm;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div style="text-align: left;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 70px; height: 45px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 8px;">
                <img src="/images/logo.png" alt="2SND Technologies" style="width: 100%; height: 100%; object-fit: contain;" />
              </div>
              <div>
                <div style="font-size: 16px; font-weight: bold;">2SND Technologies</div>
                <div style="font-size: 11px; opacity: 0.8; margin-top: 1px;">Plateforme DAO</div>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; opacity: 0.8;">${new Date().toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</div>
          </div>
        </div>
        <h3 style="margin: 0; font-size: 20px; font-weight: bold;">Rapport des DAO Terminés</h3>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="color: #1e3a8a; margin: 0 0 15px; font-size: 14px; font-weight: bold; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px;">
          DÉTAILS DES DAO TERMINÉS
        </h4>
        <div style="border: 1px solid #1e3a8a;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #1e3a8a; color: white;">
                <th style="padding: 8px; text-align: left; border-right: 1px solid #fff;">Nom</th>
                <th style="padding: 8px; text-align: left; border-right: 1px solid #fff;">Type</th>
                <th style="padding: 8px; text-align: left; border-right: 1px solid #fff;">Référence</th>
                <th style="padding: 8px; text-align: left; border-right: 1px solid #fff;">Autorité</th>
                <th style="padding: 8px; text-align: left; border-right: 1px solid #fff;">Chef Projet</th>
                <th style="padding: 8px; text-align: left; border-right: 1px solid #fff;">Groupement</th>
                <th style="padding: 8px; text-align: center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDaos.map((dao, index) => `
                <tr style="background: ${index % 2 === 0 ? "#f8fafc" : "white"}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px; font-weight: bold; border-right: 1px solid #e2e8f0;">${escapeHtml(dao.numero)}</td>
                  <td style="padding: 8px; border-right: 1px solid #e2e8f0;">AMI</td>
                  <td style="padding: 8px; border-right: 1px solid #e2e8f0;">${escapeHtml(dao.reference)}</td>
                  <td style="padding: 8px; border-right: 1px solid #e2e8f0;">${escapeHtml(dao.autorite) || "N/A"}</td>
                  <td style="padding: 8px; border-right: 1px solid #e2e8f0;">${escapeHtml(dao.chef_projet) || "N/A"}</td>
                  <td style="padding: 8px; border-right: 1px solid #e2e8f0;">-</td>
                  <td style="padding: 8px; text-align: center;">
                    <span style="background: #dbeafe; color: #1e3a8a; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold;">
                      TERMINÉE
                    </span>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div style="text-align: center; font-size: 11px; color: #666; margin-top: 30px; border-top: 1px solid #1e3a8a; padding-top: 15px;">
        <p style="margin-bottom: 5px; font-weight: bold; color: #1e3a8a;">
          Total: ${filteredDaos.length} DAO${filteredDaos.length > 1 ? "s" : ""} terminé${filteredDaos.length > 1 ? "s" : ""}
        </p>
        <p style="margin-bottom: 3px;">Rapport généré via la plateforme 2SND Technologies DAO</p>
        <p style="font-size: 10px; color: #888;">${new Date().toLocaleDateString("fr-FR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })}</p>
      </div>
    `;

    try {
      document.body.appendChild(pdfContainer);

      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: pdfContainer.scrollWidth,
        height: pdfContainer.scrollHeight,
        windowWidth: pdfContainer.scrollWidth,
        windowHeight: pdfContainer.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth  = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth  = pdfWidth - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position   = 5;

      pdf.addImage(imgData, "JPEG", 5, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 5;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 5, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`dao-termines-${new Date().toISOString().split("T")[0]}.pdf`);
      console.log("✅ PDF généré avec succès");

    } catch (err) {
      console.error("Erreur lors de la génération du PDF:", err);
    } finally {
      // Nettoyage garanti même en cas d'erreur
      if (document.body.contains(pdfContainer))    document.body.removeChild(pdfContainer);
      if (document.body.contains(loadingIndicator)) document.body.removeChild(loadingIndicator);
    }
  };

  useEffect(() => {
    loadDaos();
  }, []);

  async function loadDaos() {
    try {
      setLoading(true);
      setError("");

      const daoRes  = await fetch("/api/dao", { cache: "no-store" });
      const daoJson = await daoRes.json().catch(() => ({}));

      if (!daoRes.ok) {
        console.error("API /api/dao error:", daoJson);
        setDaos([]);
        setError(daoJson?.message || "Erreur lors du chargement des DAO");
        return;
      }

      const allDaos = Array.isArray(daoJson?.data) ? (daoJson.data as Dao[]) : [];
      const terminatedDaos = allDaos.filter((dao) => {
        const rawStatut = String(dao.statut || "").toUpperCase();
        return rawStatut === "TERMINEE" || rawStatut === "TERMINE";
      });

      setDaos(terminatedDaos);
    } catch (err) {
      console.error("Error fetching DAOs:", err);
      setDaos([]);
      setError("Erreur réseau lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }

  const filteredDaos = daos.filter((dao: Dao) => {
    const term      = searchTerm.toLowerCase();
    const numero    = dao.numero?.toLowerCase() || "";
    const reference = dao.reference?.toLowerCase() || "";
    const autorite  = dao.autorite?.toLowerCase() || "";

    const matchesSearch = !term
      ? true
      : numero.includes(term) || reference.includes(term) || autorite.includes(term);

    const matchesMonth =
      !monthFilter || !dao.date_depot
        ? true
        : new Date(dao.date_depot).getMonth() + 1 === parseInt(monthFilter);

    return matchesSearch && matchesMonth;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="sr-only">Chargement...</span>
          </div>
          <p className="mt-2 text-gray-600">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadDaos}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-gray-50 p-6 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-900">Historique des DAO terminés</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintPdf}
                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                  title="Exporter le rapport en PDF"
                >
                  <FileText size={20} />
                </button>
                <input
                  placeholder="Rechercher (n°, objet, équipe...)"
                  className="px-3 py-2 border rounded w-72 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="px-3 py-2 border rounded text-sm"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                >
                  {getCurrentYearMonths().map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <section className="no-print">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">DAOs terminés uniquement</span>
            <span className="text-sm text-gray-500">
              {filteredDaos.length} DAO{filteredDaos.length > 1 ? "s" : ""} trouvé{filteredDaos.length > 1 ? "s" : ""}
            </span>
          </div>

          {filteredDaos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucun DAO terminé trouvé.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDaos.map((dao) => (
                <article
                  key={dao.id}
                  onClick={() => router.push(`/dash/admin/details/${dao.id}`)}
                  className="bg-white p-4 rounded shadow cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">N° {dao.numero}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {dao.reference} - {dao.autorite}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Terminée
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date dépôt</span>
                      <span className="font-medium">
                        {dao.date_depot
                          ? new Date(dao.date_depot).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Chef projet</span>
                      <span className="font-medium">{dao.chef_projet || "N/A"}</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Progression</span>
                        <span className="font-medium">100%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded mt-2">
                        <div className="h-2 bg-green-600 rounded" style={{ width: "100%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Voir détails →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}
