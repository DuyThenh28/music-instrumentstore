"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  brand: string;
  type?: string;
  price: number;
  imageUrl: string;
  description: string;
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");

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

  useEffect(() => {
    const init = async () => {
      await fetchProducts();
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
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete product");

      alert("Xóa sản phẩm thành công!");
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

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save product");

      alert(editProduct ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!");
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Không thể lưu sản phẩm. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="admin-page-container">
      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <h3>Bảng Quản Trị</h3>
            <p>Nhóm TTTN Music</p>
          </div>
          <nav className="sidebar-nav">
            <button
              className={activeTab === "products" ? "active" : ""}
              onClick={() => setActiveTab("products")}
            >
              🎷 Quản Lý Sản Phẩm
            </button>
            <button
              className={activeTab === "orders" ? "active" : ""}
              onClick={() => setActiveTab("orders")}
            >
              📦 Quản Lý Đơn Hàng
            </button>
            <div className="sidebar-divider"></div>
            <Link href="/" className="back-to-shop">
              🏠 Quay lại Cửa Hàng
            </Link>
          </nav>
        </aside>

        {/* Content Area */}
        <section className="admin-content">
          {activeTab === "products" ? (
            <div className="admin-section">
              <div className="section-header">
                <h2>Quản Lý Danh Sách Sản Phẩm</h2>
                <button className="add-product-btn" onClick={handleOpenAddModal}>
                  ➕ Thêm Sản Phẩm Mới
                </button>
              </div>

              {/* Search Bar */}
              <div className="admin-search-bar">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm theo tên hoặc thương hiệu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="admin-loading">Đang tải danh sách sản phẩm...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="admin-empty">Không tìm thấy sản phẩm nào.</div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Hình Ảnh</th>
                        <th>Tên Sản Phẩm</th>
                        <th>Thương Hiệu</th>
                        <th>Phân Loại</th>
                        <th>Giá Bán</th>
                        <th>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td><code>{product.id}</code></td>
                          <td>
                            <div className="table-img-wrapper">
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                width={60}
                                height={60}
                                className="table-img"
                              />
                            </div>
                          </td>
                          <td><strong>{product.name}</strong></td>
                          <td>{product.brand}</td>
                          <td><span className="badge-type">{product.type || "Alto"}</span></td>
                          <td><strong className="text-emerald-700">{product.price.toLocaleString("vi-VN")}đ</strong></td>
                          <td className="table-actions">
                            <button
                              className="edit-btn"
                              onClick={() => handleOpenEditModal(product)}
                            >
                              Sửa
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="admin-section">
              <div className="section-header">
                <h2>Quản Lý Đơn Đặt Hàng</h2>
              </div>
              <div className="admin-empty">
                Chức năng quản lý hóa đơn & khách hàng đang được xử lý thông qua hệ thống EventBridge và SQS ở Backend.
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div className="modal-header">
              <h2>{editProduct ? "Cập Nhật Sản Phẩm" : "Thêm Sản Phẩm Mới"}</h2>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="prod-id">Mã sản phẩm (ID)</label>
                  <input
                    id="prod-id"
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    disabled={!!editProduct || isSubmitting}
                    placeholder="Ví dụ: 24"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="prod-name">Tên sản phẩm</label>
                  <input
                    id="prod-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="Ví dụ: Yamaha YAS-480"
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="prod-brand">Thương hiệu</label>
                  <input
                    id="prod-brand"
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="Yamaha, Selmer, v.v."
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="prod-type">Phân loại</label>
                  <select
                    id="prod-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="Alto Saxophone">Alto Saxophone</option>
                    <option value="Tenor Saxophone">Tenor Saxophone</option>
                    <option value="Soprano Saxophone">Soprano Saxophone</option>
                    <option value="Baritone Saxophone">Baritone Saxophone</option>
                    <option value="Accessories">Phụ kiện Saxophone</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="prod-price">Giá bán (VND)</label>
                  <input
                    id="prod-price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    disabled={isSubmitting}
                    placeholder="Ví dụ: 35000000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prod-image">Đường dẫn hình ảnh (URL)</label>
                <input
                  id="prod-image"
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Ví dụ: /images/yamaha-yas280.jpg hoặc link https://"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prod-desc">Mô tả sản phẩm</label>
                <textarea
                  id="prod-desc"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Nhập mô tả chi tiết sản phẩm..."
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : editProduct ? "Cập Nhật" : "Thêm Mới"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}