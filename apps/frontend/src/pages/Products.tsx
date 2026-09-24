import { ReactNode, useEffect, useState } from 'react';
import { Plus, Package, Pencil, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { Category, Product, User } from '../types';
import { Badge, Button, Empty, Input, Modal, SearchInput, Spinner } from '../components/ui';

const money = (n: number) => `Q ${Number(n || 0).toFixed(2)}`;

function can(user: User | null, permission: string) {
  return (
    user?.roles?.some((item) => item.role.name === 'ADMIN') ||
    user?.permissions?.includes(permission) ||
    false
  );
}

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, me] = await Promise.all([
        api.get('/products', { params: { q: q || undefined } }),
        api.get('/products/categories'),
        api.get('/auth/me'),
      ]);
      setItems(p.data);
      setCats(c.data);
      setUser(me.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, [q]);

  const canCreate = can(user, 'products.create');
  const canEdit = can(user, 'products.edit');
  const canDelete = can(user, 'products.delete');
  const showActions = canEdit || canDelete;

  return (
    <div>
      <Page
        title="Productos"
        text="Administra tu catálogo, precios y existencias."
        action={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              <Plus size={17} />
              Nuevo producto
            </Button>
          ) : undefined
        }
      />

      <div className="toolbar">
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
        />
        <div className="toolbar-count">{items.length} productos</div>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length ? (
        <div className="product-table">
          <div className="table-head">
            <span>Producto</span>
            <span>SKU</span>
            <span>Categoría</span>
            <span>Precio</span>
            <span>Stock</span>
            {showActions && <span />}
          </div>

          {items.map((p) => (
            <div className="table-row" key={p.id}>
              <div className="product-cell">
                <div className="product-thumb">
                  <Package size={19} />
                </div>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.description || 'Sin descripción'}</small>
                </div>
              </div>
              <span className="mono">{p.sku}</span>
              <span>{p.category?.name || '—'}</span>
              <strong>{money(Number(p.salePrice))}</strong>
              <span>
                <Badge tone={p.stock <= p.minStock ? 'warning' : 'success'}>
                  {p.stock} uds.
                </Badge>
              </span>

              {showActions && (
                <div className="row-actions">
                  {canEdit && (
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setEditing(p);
                        setModal(true);
                      }}
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="icon-btn danger-icon"
                      title="Desactivar"
                      onClick={async () => {
                        if (confirm('¿Desactivar este producto?')) {
                          await api.patch(`/products/${p.id}/deactivate`);
                          load();
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="No hay productos"
          text="Crea tu primer producto para empezar."
        />
      )}

      <ProductModal
        open={modal}
        onClose={() => setModal(false)}
        product={editing}
        categories={cats}
        onSaved={load}
      />
    </div>
  );
}

function ProductModal({
  open,
  onClose,
  product,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    sku: '',
    name: '',
    salePrice: '',
    cost: '',
    stock: '0',
    minStock: '0',
    categoryId: '',
    barcode: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(
      product
        ? {
            sku: product.sku,
            name: product.name,
            salePrice: String(product.salePrice),
            cost: String(product.cost),
            stock: String(product.stock),
            minStock: String(product.minStock),
            categoryId: product.categoryId,
            barcode: product.barcode || '',
            description: product.description || '',
          }
        : {
            sku: '',
            name: '',
            salePrice: '',
            cost: '',
            stock: '0',
            minStock: '0',
            categoryId: categories[0]?.id || '',
            barcode: '',
            description: '',
          },
    );
  }, [product, open, categories]);

  const save = async () => {
    setLoading(true);
    try {
      const data = {
        ...form,
        salePrice: Number(form.salePrice),
        cost: Number(form.cost),
        stock: Number(form.stock),
        minStock: Number(form.minStock),
      };

      if (product) {
        await api.patch(`/products/${product.id}`, data);
      } else {
        await api.post('/products', data);
      }

      onClose();
      onSaved();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      wide
    >
      <div className="form-grid">
        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
        />
        <Input
          label="Precio de venta"
          type="number"
          value={form.salePrice}
          onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
        />
        <Input
          label="Costo"
          type="number"
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: e.target.value })}
        />
        <Input
          label="Stock"
          type="number"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
        <Input
          label="Stock mínimo"
          type="number"
          value={form.minStock}
          onChange={(e) => setForm({ ...form, minStock: e.target.value })}
        />
        <label className="field">
          <span>Categoría</span>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Código de barras"
          value={form.barcode}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
        />
        <label className="field full">
          <span>Descripción</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
      </div>

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button loading={loading} onClick={save} disabled={!form.categoryId}>
          Guardar producto
        </Button>
      </div>
    </Modal>
  );
}

function Page({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">CATÁLOGO</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
