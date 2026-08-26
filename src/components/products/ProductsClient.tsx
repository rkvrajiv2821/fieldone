"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Package, RefreshCw, Pencil, Trash2, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { cn, formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { CreateProductModal } from "./CreateProductModal";
import { EditProductModal } from "./EditProductModal";
import { ManagePermissionsModal } from "./ManagePermissionsModal";
import { DeleteProductDialog } from "./DeleteProductDialog";

type Product = {
  id: string; name: string; description?: string | null;
  image?: string | null; price: number; isActive: boolean;
  createdAt: Date; myPermission: string;
  permissions: { managerId: string; permission: string }[];
};

const PERM_COLORS: Record<string, string> = {
  FULL_ACCESS: "text-purple-700 bg-purple-50 border-purple-200",
  CREATE:      "text-blue-700 bg-blue-50 border-blue-200",
  EDIT:        "text-amber-700 bg-amber-50 border-amber-200",
  VIEW_ONLY:   "text-gray-600 bg-gray-50 border-gray-200",
};
const PERM_LABELS: Record<string, string> = {
  FULL_ACCESS: "Full Access", CREATE: "Create", EDIT: "Edit", VIEW_ONLY: "View Only",
};

export function ProductsClient({ currentUser, managers }: {
  currentUser: { id: string; role: Role };
  managers: { id: string; name: string; email: string }[];
}) {
  const [products,   setProducts]   = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct,   setEditProduct]   = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [permProduct,   setPermProduct]   = useState<Product | null>(null);

  const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...(search && { search }) });
      const res    = await fetch(`/api/products?${params}`);
      const data   = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProducts(data.data);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleActive = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, isActive: !p.isActive } : p));
      toast.success(`${product.name} ${!product.isActive ? "activated" : "deactivated"}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    try {
      const res = await fetch(`/api/products/${deleteProduct.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`${deleteProduct.name} deleted`);
      setDeleteProduct(null);
      fetchProducts();
    } catch (e: any) { toast.error(e.message); }
  };

  const canEdit   = (p: Product) => isSuperAdmin || ["EDIT", "CREATE", "FULL_ACCESS"].includes(p.myPermission);
  const canCreate = isSuperAdmin;

  const activeCount   = products.filter((p) => p.isActive).length;
  const inactiveCount = products.filter((p) => !p.isActive).length;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Products</h2>
          <p className="page-subtitle">
            {isSuperAdmin ? "Manage your product catalogue" : "Browse available products"}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Products", value: products.length,  color: "bg-blue-50 text-blue-600",    icon: Package },
          { label: "Active",         value: activeCount,      color: "bg-emerald-50 text-emerald-600", icon: ToggleRight },
          { label: "Inactive",       value: inactiveCount,    color: "bg-gray-50 text-gray-500",     icon: ToggleLeft },
        ].map((s) => (
          <div key={s.label} className="crm-card flex items-center gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="crm-card p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search products..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={fetchProducts} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400 ml-auto">{products.length} products</span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No products found</p>
            <p className="text-gray-400 text-sm mt-1">
              {canCreate ? "Click 'Add Product' to create one" : "No products available yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="hide-mobile">Description</th>
                  <th>Price</th>
                  <th>Status</th>
                  {!isSuperAdmin && <th>Your Access</th>}
                  {isSuperAdmin && <th className="hide-tablet">Managers</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className={cn(!product.isActive && "opacity-60")}>
                    {/* Product image + name */}
                    <td>
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <Image src={product.image} alt={product.name}
                            width={44} height={44}
                            className="w-11 h-11 rounded-xl object-cover shrink-0 border border-gray-100" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-blue-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-400">ID: {product.id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="hide-mobile">
                      <p className="text-sm text-gray-500 line-clamp-2 max-w-[200px]">
                        {product.description || "—"}
                      </p>
                    </td>

                    {/* Price */}
                    <td>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(Number(product.price))}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={cn("status-badge",
                        product.isActive
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-gray-500 bg-gray-50 border-gray-200")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full",
                          product.isActive ? "bg-emerald-500" : "bg-gray-400")} />
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Manager's permission badge */}
                    {!isSuperAdmin && (
                      <td>
                        <span className={cn("status-badge", PERM_COLORS[product.myPermission] || PERM_COLORS.VIEW_ONLY)}>
                          {PERM_LABELS[product.myPermission] || "View Only"}
                        </span>
                      </td>
                    )}

                    {/* Permission count (super admin) */}
                    {isSuperAdmin && (
                      <td className="hide-tablet">
                        <span className="text-sm text-gray-500">
                          {product.permissions.length} manager{product.permissions.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-1">
                        {/* Manage permissions (super admin only) */}
                        {isSuperAdmin && (
                          <button onClick={() => setPermProduct(product)}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                            title="Manage permissions">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Toggle active (super admin only) */}
                        {isSuperAdmin && (
                          <button onClick={() => toggleActive(product)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                            title={product.isActive ? "Deactivate" : "Activate"}>
                            {product.isActive
                              ? <ToggleRight className="w-3.5 h-3.5" />
                              : <ToggleLeft  className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Edit */}
                        {canEdit(product) && (
                          <button onClick={() => setEditProduct(product)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit product">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete (super admin only) */}
                        {isSuperAdmin && (
                          <button onClick={() => setDeleteProduct(product)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete product">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateProductModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchProducts(); setShowCreate(false); }}
        />
      )}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onUpdated={() => { fetchProducts(); setEditProduct(null); }}
        />
      )}
      {permProduct && (
        <ManagePermissionsModal
          product={permProduct}
          managers={managers}
          onClose={() => setPermProduct(null)}
        />
      )}
      {deleteProduct && (
        <DeleteProductDialog
          product={deleteProduct}
          onClose={() => setDeleteProduct(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}