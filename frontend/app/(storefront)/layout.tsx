import Link from "next/link";
import ClientHeader from "../components/layout/ClientHeader";
import FloatingContacts from "../components/contact/FloatingContacts";
import ChatWidget from "../components/chat/ChatWidget";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClientHeader />
      {children}
      <FloatingContacts />
      <ChatWidget />
      <footer>
        <div className="container">
          <div className="footer-section">
            <div className="footer-column">
              <h3>AUREATE FOREST</h3>
              <p>Chuyên cung cấp Saxophone chính hãng, âm thanh chuẩn mực cho nghệ sĩ chuyên nghiệp.</p>
              <p>📍 TP. Hồ Chí Minh, Việt Nam</p>
              <p>📞 0912 19 12 18</p>
              <p>📧 support@nhomtttnmusic.vn</p>
            </div>
            <div className="footer-column">
              <h4>THÔNG TIN</h4>
              <ul>
                <li><Link href="/about">Giới thiệu</Link></li>
                <li><Link href="#">Chính sách bảo hành</Link></li>
                <li><Link href="#">Chính sách đổi trả</Link></li>
                <li><Link href="#">Điều khoản sử dụng</Link></li>
                <li><Link href="#">Hướng dẫn mua hàng</Link></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>DANH MỤC</h4>
              <ul>
                <li><Link href="/products?category=Alto%20Saxophone">Alto Saxophone</Link></li>
                <li><Link href="/products?category=Tenor%20Saxophone">Tenor Saxophone</Link></li>
                <li><Link href="/products?category=Soprano%20Saxophone">Soprano Saxophone</Link></li>
                <li><Link href="/products">Xem tất cả</Link></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>KẾT NỐI</h4>
              <ul>
                <li><a href="#">Facebook</a></li>
                <li><a href="#">Zalo</a></li>
                <li><a href="#">Instagram</a></li>
                <li><a href="#">YouTube</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-divider">
            © 2026 AUREATE FOREST | AWS CLOUD PROJECT
          </div>
        </div>
      </footer>
    </>
  );
}
