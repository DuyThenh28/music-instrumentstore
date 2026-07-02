"use client";

import Link from "next/link";
import AuthNav from "./AuthNav";
import CartButton from "./CartButton";
import { useLanguage } from "../../context/LanguageContext";

export default function Header() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header style={{ backgroundColor: '#05100c', padding: '0 3%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid rgba(223, 158, 71, 0.2)', position: 'relative', zIndex: 10 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .header-logo h1 { font-family: var(--font-serif), serif; font-size: 1.8rem; color: #fff; margin: 0; line-height: 1; letter-spacing: 1px; font-weight: 400; white-space: nowrap; }
        .header-logo p { font-family: var(--font-sans), sans-serif; font-size: 0.6rem; color: #DF9E47; letter-spacing: 4px; margin: 4px 0 0 2px; text-transform: uppercase; font-weight: 600; white-space: nowrap; }
        .header-nav { display: flex; gap: 2rem; }
        .header-nav a { color: #fff; text-decoration: none; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; transition: color 0.2s; white-space: nowrap; }
        .header-nav a:hover, .header-nav a.active { color: #DF9E47; }
        .header-actions { display: flex; align-items: center; gap: 1rem; white-space: nowrap; }
        .header-actions form { position: relative; }
      `}} />
      <Link href="/" className="header-logo" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <h1>AUREATE FOREST</h1>
        <p>BOUTIQUE</p>
      </Link>

      <nav className="header-nav">
        <Link href="/" className="active">{t("nav.home")}</Link>
        <Link href="/products">{t("nav.products")}</Link>
        <Link href="/contact">{t("nav.contact")}</Link>
      </nav>

      <div className="header-actions">
        <form action="/products" method="GET">
          <input type="text" name="q" placeholder={t("nav.search")} style={{ backgroundColor: '#13241d', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 32px 10px 12px', color: '#fff', fontSize: '0.8rem', width: '200px', outline: 'none' }} />
          <button type="submit" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </form>
        <div className="header-auth-cart" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#9CA3AF', borderRight: '1px solid rgba(255, 255, 255, 0.1)', paddingRight: '0.8rem' }}>
            <button onClick={() => setLanguage('vi')} style={{ background: 'none', border: 'none', color: language === 'vi' ? '#DF9E47' : '#9CA3AF', cursor: 'pointer', transition: 'color 0.2s', padding: 0, fontWeight: 700 }}>VI</button>
            <span>/</span>
            <button onClick={() => setLanguage('en')} style={{ background: 'none', border: 'none', color: language === 'en' ? '#DF9E47' : '#9CA3AF', cursor: 'pointer', transition: 'color 0.2s', padding: 0, fontWeight: 700 }}>EN</button>
          </div>
          <AuthNav />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
