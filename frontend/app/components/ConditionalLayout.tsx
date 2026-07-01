"use client";

import { usePathname } from "next/navigation";

interface ConditionalLayoutProps {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
  chatWidget: React.ReactNode;
}

export default function ConditionalLayout({
  children,
  header,
  footer,
  chatWidget,
}: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isMinimalLayout = pathname === "/login" || pathname === "/register" || pathname.startsWith("/admin");

  if (isMinimalLayout) {
    return <>{children}</>;
  }

  return (
    <>
      {header}
      {children}
      {chatWidget}
      {footer}
    </>
  );
}
