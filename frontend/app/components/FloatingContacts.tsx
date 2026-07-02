"use client";

import Link from "next/link";

export default function FloatingContacts() {
  return (
    <div style={{ position: 'fixed', bottom: '100px', right: '30px', display: 'flex', flexDirection: 'column', gap: '15px', zIndex: 9999 }}>
      {/* Phone */}
      <Link href="tel:0912191218" style={{ width: '60px', height: '60px', backgroundColor: '#4CAF50', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(76, 175, 80, 0.3)', transition: 'transform 0.2s', color: 'white' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </Link>
      {/* Zalo */}
      <Link href="https://zalo.me/0912191218" target="_blank" rel="noopener noreferrer" style={{ width: '60px', height: '60px', backgroundColor: '#0068FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0, 104, 255, 0.3)', transition: 'transform 0.2s', color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', fontFamily: 'var(--font-sans), sans-serif' }}>
        Zalo
      </Link>
    </div>
  );
}
