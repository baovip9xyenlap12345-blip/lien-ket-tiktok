import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Bảo Gấu Bông — Quản trị', description: 'Hệ thống quản trị Bảo Gấu Bông' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="vi"><body>{children}</body></html>);
}
