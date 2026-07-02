"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CartButton() {
  const [mounted, setMounted] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setMounted(true);

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const total = cart.reduce(
      (sum: number, item: any) => sum + (item.quantity || 1),
      0
    );

    setTotalItems(total);
  }, []);

  return (
    <Link href="/cart" className="flex items-center gap-2 no-underline">
      🛒 GIỎ HÀNG ({mounted ? totalItems : 0})
    </Link>
  );
}