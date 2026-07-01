"use client";

import "../components/AmplifyConfig";
import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import type { Order } from "../../types/cart";
import { OrderTabs } from "../components/OrderTabs";
import { EmptyOrders } from "../components/EmptyOrders";
import { OrderCard } from "../components/OrderCard";

const getStoredOrders = (): Order[] => {
  if (typeof window === "undefined") {
    return [];
  }

  return JSON.parse(localStorage.getItem("orders") || "[]") as Order[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState("Chờ xác nhận");

  useEffect(() => {
    // Load local storage first
    setOrders(getStoredOrders());

    // Fetch database orders if logged in
    const fetchDbOrders = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) return;

        const res = await fetch("/api/users/orders", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const dbData = await res.json();
          const mappedOrders = dbData.map((order: any) => ({
            id: order.id,
            customer: order.customer,
            paymentMethod: order.paymentMethod,
            products: (order.items || []).map((item: any) => ({
              id: Number(item.productId) || 0,
              name: item.name,
              price: `${(item.price || 0).toLocaleString("vi-VN")}đ`,
              image: item.imageUrl || "/placeholder.png",
              quantity: item.quantity
            })),
            totalItems: order.totalItems,
            totalPrice: order.totalPrice,
            status: order.status === "PENDING" ? "Chờ xác nhận" : (order.status ?? "Chờ xác nhận"),
            createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : ""
          }));
          mappedOrders.sort((a: any, b: any) => b.id.localeCompare(a.id));
          setOrders(mappedOrders);
        }
      } catch (err) {
        console.error("Failed to fetch user DB orders:", err);
      }
    };

    fetchDbOrders();
  }, []);

  const tabs = [
    "Chờ xác nhận",
    "Chờ lấy đơn",
    "Chờ giao hàng",
    "Đánh giá",
  ];

  const filteredOrders = orders.filter(
    (order: Order) => order.status === activeTab
  );

  return (
    <main className="orders-page">
      <h1 className="orders-title">Đơn Đã Mua</h1>

      <OrderTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {filteredOrders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <section className="orders-list">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </section>
      )}
    </main>
  );
}
