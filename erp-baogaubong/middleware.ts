import { NextRequest, NextResponse } from 'next/server';

// Kiem tra nhe o edge: chi chan trang khi chua co cookie phien.
// Kiem tra quyen THAT dien ra o server (requirePerm / layout).
export function middleware(req: NextRequest) {
  const isPublic =
    req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/api/auth/login') ||
    req.nextUrl.pathname.startsWith('/api/health') ||
    req.nextUrl.pathname.startsWith('/api/ready') ||
    req.nextUrl.pathname.startsWith('/api/webhooks/') ||
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname === '/favicon.ico';
  if (isPublic) return NextResponse.next();
  // Cong khach/dai ly: phien rieng (bgb_portal), kiem tra that o API portal
  if (req.nextUrl.pathname.startsWith('/portal') || req.nextUrl.pathname.startsWith('/api/portal')) {
    return NextResponse.next();
  }
  const has = req.cookies.get('bgb_session');
  if (!has) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'Chưa đăng nhập.' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
