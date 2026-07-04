/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import "../components/common/AmplifyConfig";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAuthSession } from "aws-amplify/auth";
import type { Product } from "../../types/product";
import type { Order } from "../../types/cart";
import { AdminSidebar } from "../components/admin/AdminSidebar";
import { ProductTable } from "../components/product/ProductTable";
import { ProductModal } from "../components/product/ProductModal";
import { OrderTable } from "../components/order/OrderTable";
import { OrderDetailsModal } from "../components/order/OrderDetailsModal";

interface AdminUser {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
  role?: string;
}

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "users">("products");

  // User/Personnel management state
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserSubmitting, setIsEditUserSubmitting] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: "",
    phone: "",
    address: "",
    role: "User",
  });

  // Form / Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    brand: "",
    type: "Alto Saxophone",
    price: 0,
    imageUrl: "",
    description: "",
  });

  // Order management state
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("Tất cả");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) return;

      const res = await fetch("/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders list:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) return;

      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (error) {
      console.error("Error fetching users list:", error);
    }
  };

  const handleOpenEditUserModal = (user: AdminUser) => {
    setSelectedUser(user);
    setUserFormData({
      name: user.name || "",
      phone: user.phone || "",
      address: user.address || "",
      role: user.role || "User",
    });
    setIsUserModalOpen(true);
  };

  const handleEditUserSubmit = async () => {
    if (!selectedUser) return;
    setIsEditUserSubmitting(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) return;

      const res = await fetch(`/api/admin/users/${selectedUser.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userFormData),
      });

      if (res.ok) {
        alert("Cập nhật vai trò người dùng thành công!");
        setIsUserModalOpen(false);
        fetchUsers();
      } else {
        alert("Cập nhật thất bại. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error("Failed to update user profile:", err);
      alert("Đã xảy ra lỗi khi cập nhật.");
    } finally {
      setIsEditUserSubmitting(false);
    }
  };

  const handleDeleteUserProfile = async (userId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hồ sơ người dùng này? Thao tác này không thể hoàn tác.")) return;

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) return;

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        alert("Xóa hồ sơ người dùng thành công!");
        fetchUsers();
      } else {
        alert("Không thể xóa hồ sơ người dùng.");
      }
    } catch (err) {
      console.error("Failed to delete user profile:", err);
      alert("Đã xảy ra lỗi khi xóa.");
    }
  };

  useEffect(() => {
    if (activeTab === "users" && isAuthorized) {
      fetchUsers();
    }
  }, [activeTab, isAuthorized]);

  useEffect(() => {
    const init = async () => {
      try {
        const session = await fetchAuthSession();
        const groups = session.tokens?.idToken?.payload["cognito:groups"] as string[] | undefined;
        if (groups && (groups.includes("Admin") || groups.includes("Staff"))) {
          setIsAuthorized(true);
          await fetchProducts();
          fetchOrders();
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthorized(false);
      }
    };
    init();
  }, []);

  const handleOpenAddModal = () => {
    setEditProduct(null);
    setFormData({
      id: String(Date.now()), // Auto-generated numeric ID
      name: "",
      brand: "",
      type: "Alto Saxophone",
      price: 0,
      imageUrl: "",
      description: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditProduct(product);
    setFormData({
      id: product.id,
      name: product.name,
      brand: product.brand,
      type: product.type || "Alto Saxophone",
      price: product.price,
      imageUrl: product.imageUrl,
      description: product.description,
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa sản phẩm này?")) return;

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        },
      });

      if (!res.ok) throw new Error("Failed to delete product");

      alert("Xóa sản phẩm thành công!");
      setLoading(true);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Không thể xóa sản phẩm. Vui lòng thử lại!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id || !formData.name || !formData.brand || !formData.imageUrl || !formData.description || formData.price <= 0) {
      alert("Vui lòng nhập đầy đủ các thông tin hợp lệ!");
      return;
    }

    setIsSubmitting(true);
    try {
      const method = editProduct ? "PUT" : "POST";
      const url = editProduct ? `/api/products/${editProduct.id}` : "/api/products";

      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save product");

      alert(editProduct ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!");
      setIsModalOpen(false);
      setLoading(true);
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Không thể lưu sản phẩm. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormDataChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) return;

      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        alert(`Đã cập nhật trạng thái đơn hàng sang: ${newStatus}`);
        fetchOrders();
      } else {
        alert("Cập nhật trạng thái thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Lỗi khi kết nối với máy chủ.");
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    alert(`Không hỗ trợ xóa đơn hàng thực tế (${orderId}). Vui lòng chuyển trạng thái đơn hàng sang 'Đã hủy'.`);
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.brand.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = usersList.filter((user) => {
    const term = userSearch.toLowerCase();
    return (
      (user.name || "").toLowerCase().includes(term) ||
      (user.email || "").toLowerCase().includes(term) ||
      (user.phone || "").toLowerCase().includes(term) ||
      (user.role || "").toLowerCase().includes(term)
    );
  });

  if (isAuthorized === null) {
    return (
      <main className="admin-page-container flex justify-center items-center">
        <div className="admin-loading">
          Đang kiểm tra quyền truy cập...
        </div>
      </main>
    );
  }

  if (isAuthorized === false) {
    return (
      <main className="admin-page-container flex justify-center items-center">
        <div className="login-card">
          <div className="login-icon">🔒</div>
          <h1 style={{ color: "var(--color-gold-muted)" }}>Truy Cập Bị Từ Chối</h1>
          <p className="login-desc">
            Tài khoản của bạn không có quyền truy cập vào khu vực quản trị. Vui lòng đăng nhập bằng tài khoản có đặc quyền Admin.
          </p>
          <Link href="/">
            <button type="button" className="primary-btn">Quay Lại Cửa Hàng</button>
          </Link>
          <p className="login-register">
            Có tài khoản Admin? <Link href="/login">Đăng nhập tại đây</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page-container">
      <div className="admin-layout">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <section className="admin-content">
          {activeTab === "products" ? (
            <div className="admin-section">
              <div className="section-header">
                <h2>Quản Lý Danh Sách Sản Phẩm</h2>
                <button
                  type="button"
                  className="add-product-btn"
                  onClick={handleOpenAddModal}
                >
                  ➕ Thêm Sản Phẩm Mới
                </button>
              </div>

              <ProductTable
                products={filteredProducts}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                onEditProduct={handleOpenEditModal}
                onDeleteProduct={handleDeleteProduct}
              />
            </div>
          ) : activeTab === "orders" ? (
            <div className="admin-section">
              <div className="section-header">
                <h2>Quản Lý Đơn Đặt Hàng</h2>
              </div>
              <OrderTable
                orders={orders}
                search={orderSearch}
                onSearchChange={setOrderSearch}
                statusFilter={orderStatusFilter}
                onStatusFilterChange={setOrderStatusFilter}
                onUpdateStatus={handleUpdateOrderStatus}
                onViewDetails={handleViewOrderDetails}
                onDeleteOrder={handleDeleteOrder}
              />
            </div>
          ) : (
            <div className="admin-section">
              <div className="flex justify-between items-center mb-8">
                <h2>Quản Lý Người Dùng & Nhân Sự</h2>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Tìm kiếm người dùng..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="admin-form-input"
                    style={{ maxWidth: "300px" }}
                  />
                </div>
              </div>

              {/* Table */}
              <div style={{ overflow: "hidden" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Họ và Tên</th>
                      <th>Email</th>
                      <th>Số điện thoại</th>
                      <th>Địa chỉ</th>
                      <th>Vai trò</th>
                      <th style={{ textAlign: "right" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center" style={{ padding: "2rem" }}>
                          Không tìm thấy người dùng nào.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.userId}>
                          <td style={{ fontWeight: "600" }}>{user.name || "Chưa cập nhật"}</td>
                          <td>{user.email}</td>
                          <td>{user.phone || "Chưa cập nhật"}</td>
                          <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{user.address || "Chưa cập nhật"}</td>
                          <td>
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "0.25rem",
                              fontSize: "12px",
                              fontWeight: "600",
                              display: "inline-block",
                              backgroundColor: user.role === "Admin" ? "var(--color-error-container)" :
                                               user.role === "Staff" ? "var(--color-secondary-container)" :
                                               "var(--color-surface-container-low)",
                              color: user.role === "Admin" ? "var(--color-error)" :
                                     user.role === "Staff" ? "var(--color-on-secondary-container)" :
                                     "var(--color-on-surface)",
                              border: "1px solid var(--color-border-subtle)"
                            }}>
                              {user.role === "Admin" ? "Quản trị viên" :
                               user.role === "Staff" ? "Nhân viên" :
                               "Khách hàng"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditUserModal(user)}
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "var(--color-primary)",
                                  padding: "6px 12px",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                              >
                                Sửa vai trò
                              </button>
                              <button
                                onClick={() => handleDeleteUserProfile(user.userId)}
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "var(--color-error)",
                                  padding: "6px 12px",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <ProductModal
        isOpen={isModalOpen}
        editProduct={editProduct}
        formData={formData}
        onChangeField={handleFormDataChange}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onClose={() => setIsModalOpen(false)}
      />

      <OrderDetailsModal
        isOpen={isOrderModalOpen}
        order={selectedOrder}
        onClose={() => setIsOrderModalOpen(false)}
      />

      {isUserModalOpen && selectedUser && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h3 className="admin-modal-title">Cập Nhật Vai Trò Người Dùng</h3>

            <div className="space-y-4" style={{ marginBottom: "1.5rem" }}>
              <div>
                <label className="admin-label">Họ và Tên</label>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-on-surface)" }}>{selectedUser.name || "Chưa cập nhật"}</p>
              </div>
              <div>
                <label className="admin-label">Email</label>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-on-surface)" }}>{selectedUser.email}</p>
              </div>
              <div>
                <label className="admin-label">Vai trò người dùng</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  className="admin-form-input"
                >
                  <option value="User">Khách hàng (User)</option>
                  <option value="Staff">Nhân viên (Staff)</option>
                  <option value="Admin">Quản trị viên (Admin)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleEditUserSubmit}
                disabled={isEditUserSubmitting}
                className="primary-btn"
                style={{ flex: 1 }}
              >
                {isEditUserSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button
                onClick={() => setIsUserModalOpen(false)}
                disabled={isEditUserSubmitting}
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  color: "var(--color-on-surface)",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "0.25rem",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                  opacity: isEditUserSubmitting ? 0.5 : 1
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}