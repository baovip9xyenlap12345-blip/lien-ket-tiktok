// Header bao mat ap cho MOI trang — chong nhung iframe (clickjacking), do kieu file, lo thong tin.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },                 // khong cho web khac nhung app vao iframe
  { key: 'X-Content-Type-Options', value: 'nosniff' },            // trinh duyet khong doan kieu file
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,   // an header 'X-Powered-By: Next.js' (bot do phien ban de tim lo hong)
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default nextConfig;
