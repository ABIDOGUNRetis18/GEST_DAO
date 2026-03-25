import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (url.pathname.startsWith('/_next/image')) {
    const img = url.searchParams.get('url');
    if (img) {
      const decoded = decodeURIComponent(img);
      if (
        /\.{2,}/i.test(decoded) ||
        /%2e%2e/i.test(decoded) ||
        /^\/(?!images\/)/.test(decoded)
      ) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }
    }
    return NextResponse.next();
  }

  const sensitiveParams = ['email', 'password', 'token', 'secret', 'api_key', 'access_token'];
  for (const param of sensitiveParams) {
    if (url.searchParams.has(param)) {
      const clean = new URL(request.url);
      clean.searchParams.delete(param);
      return NextResponse.redirect(clean, 301);
    }
  }

  const response = NextResponse.next();

  if (isDevelopment) {
    response.headers.set('x-debug-env', 'development-no-csp');
  } else {
    const nonce = generateNonce();
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net https://code.jquery.com`,
      `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://cdn.jsdelivr.net`,
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('x-nonce', nonce);
  }

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  if (!isDevelopment) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  }

  return response;
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

export const config = {
  matcher: [
    '/((?!api|_next/static|favicon.ico).*)',
    '/_next/image',
  ],
};