"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "@aws-amplify/auth";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Vui lòng nhập email và mật khẩu!");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({
        username: email,
        password: password,
      });

      alert("Đăng nhập thành công!");
      // Redirect to home page and refresh to update AuthNav state
      router.refresh();
      window.location.href = "/";
    } catch (err) {
      const error = err as Error;
      console.error("Login error:", error);
      alert(error.message || "Tên đăng nhập hoặc mật khẩu không đúng!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-icon">🎷</div>

        <h1>Đăng Nhập</h1>
        <p className="login-desc">
          Đăng nhập để mua hàng và theo dõi đơn của bạn
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
        />

        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang xử lý..." : "Đăng Nhập"}
        </button>

        <p className="login-register">
          Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
        </p>
      </form>
    </main>
  );
}