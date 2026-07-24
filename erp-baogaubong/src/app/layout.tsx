import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Xưởng Gấu Bảo — Quản trị', description: 'Hệ thống quản trị Xưởng Gấu Bảo' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="vi"><body>{children}</body></html>);
}
