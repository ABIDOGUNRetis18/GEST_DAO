import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PREFIXES   = ['/images/', '/public/'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico'];
const ALLOWED_WIDTHS     = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

export function validateImageRequest(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith('/_next/image')) return null;
  const url = request.nextUrl.searchParams.get('url');
  const w   = request.nextUrl.searchParams.get('w');
  const q   = request.nextUrl.searchParams.get('q');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  const decoded = decodeURIComponent(url);
  if (/\.\.|\%2e\%2e|\%252e/i.test(decoded))
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  const ext = decoded.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.includes('.' + ext))
    return NextResponse.json({ error: 'Invalid extension' }, { status: 400 });
  if (!ALLOWED_PREFIXES.some(p => decoded.startsWith(p)))
    return NextResponse.json({ error: 'Path not allowed' }, { status: 403 });
  if (w && !ALLOWED_WIDTHS.includes(Number(w)))
    return NextResponse.json({ error: 'Invalid width' }, { status: 400 });
  if (q && (Number(q) < 1 || Number(q) > 100))
    return NextResponse.json({ error: 'Invalid quality' }, { status: 400 });
  return null;
}
