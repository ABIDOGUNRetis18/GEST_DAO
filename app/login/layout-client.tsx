"use client";

interface ClientLoginLayoutProps {
  children: React.ReactNode;
  nonce?: string;
}

export default function ClientLoginLayout({ children, nonce }: ClientLoginLayoutProps) {
  return (
    <div className="container-scroller">
      <div className="container-fluid page-body-wrapper full-page-wrapper">
        <div 
          className="content-wrapper d-flex align-items-center auth px-0"
          style={{
            backgroundImage: 'url("/images/image1.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            minHeight: '100vh',
            position: 'relative'
          }}
        >
          {/* Overlay pour améliorer la lisibilité du formulaire */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1
            }}
          />
          <div className="row w-100 mx-0" style={{ position: 'relative', zIndex: 2 }}>
            <div className="col-lg-4 mx-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
