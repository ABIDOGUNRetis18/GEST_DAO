"use client";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="text-justify: auto; mx-auto d-flex justify-content-center">
        <span className="text-muted text-center text-sm-left d-block d-sm-inline-block">
          © {new Date().getFullYear()} 2SND TECHNOLOGIES - Tous droits réservés
        </span>
      </div>
    </footer>
  );
}
