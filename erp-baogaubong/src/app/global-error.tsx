'use client';
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="vi"><body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: 40 }}>
      <h1>Có lỗi hệ thống</h1>
      <p>Vui lòng thử lại. Nếu lặp lại, liên hệ quản trị viên.</p>
      <button onClick={reset}>Thử lại</button>
    </body></html>
  );
}
