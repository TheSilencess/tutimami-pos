import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { Category, Customer, Product } from '../types';
import { Badge, Button, Modal, Spinner } from '../components/ui';

const money = (n: number) => `Q ${Number(n || 0).toFixed(2)}`;

type CartItem = { product: Product; qty: number; discount: number };
type CustomerForm = {
  customerType: 'CF' | 'NIT';
  name: string;
  nit: string;
  phone: string;
  email: string;
  address: string;
};

const emptyCustomer: CustomerForm = {
  customerType: 'CF',
  name: '',
  nit: '',
  phone: '',
  email: '',
  address: '',
};

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState('');
  const [checkout, setCheckout] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomer);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [method, setMethod] = useState('CASH');
  const [pay, setPay] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCustomers = async () => {
    const response = await api.get('/customers');
    setCustomers(response.data);
    return response.data as Customer[];
  };

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/products/categories'),
      api.get('/customers'),
    ])
      .then(([p, c, u]) => {
        setProducts(p.data);
        setCats(c.data);
        setCustomers(u.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = products.filter(
    (p) =>
      (cat === 'all' || p.categoryId === cat) &&
      (!q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.sku.toLowerCase().includes(q.toLowerCase())),
  );

  const add = (p: Product) =>
    setCart((c) => {
      const x = c.find((i) => i.product.id === p.id);
      return x
        ? c.map((i) =>
            i.product.id === p.id
              ? { ...i, qty: Math.min(i.qty + 1, p.stock) }
              : i,
          )
        : [...c, { product: p, qty: 1, discount: 0 }];
    });

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + Number(i.product.salePrice) * i.qty, 0),
    [cart],
  );
  const tax = Number((subtotal * 0.12).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  const payAmount = Number(pay || total);

  const createCustomer = async () => {
    if (!customerForm.name.trim()) {
      alert('Ingresa el nombre del cliente.');
      return;
    }

    if (customerForm.customerType === 'NIT' && !customerForm.nit.trim()) {
      alert('Ingresa el NIT del cliente.');
      return;
    }

    setCreatingCustomer(true);
    try {
      const response = await api.post('/customers', {
        customerType: customerForm.customerType,
        name: customerForm.name.trim(),
        nit: customerForm.customerType === 'NIT' ? customerForm.nit.trim() : undefined,
        phone: customerForm.phone.trim() || undefined,
        email: customerForm.email.trim() || undefined,
        address: customerForm.address.trim() || undefined,
      });

      const created = response.data as Customer;
      const nextCustomers = await loadCustomers();
      setCustomers(nextCustomers);
      setCustomer(created.id);
      setCustomerForm(emptyCustomer);
      setNewCustomerOpen(false);
    } catch (error) {
      alert(errorMessage(error));
    } finally {
      setCreatingCustomer(false);
    }
  };

  const finish = async () => {
    if (!customer) {
      alert('Selecciona un cliente o crea uno nuevo antes de continuar.');
      return;
    }
    if (!cart.length) {
      alert('Agrega al menos un producto.');
      return;
    }
    if (payAmount < total) {
      alert('El pago es menor al total.');
      return;
    }

    try {
      await api.post('/sales', {
        customerId: customer,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.qty,
          discount: i.discount,
        })),
        discount: 0,
        payment: { method, amount: payAmount },
      });

      setCart([]);
      setCheckout(false);
      setPay('');
      setSuccess(true);

      const productsResponse = await api.get('/products');
      setProducts(productsResponse.data);
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="pos-page">
      <div className="pos-head">
        <div>
          <span className="eyebrow">VENTA RÁPIDA</span>
          <h1>Punto de venta</h1>
          <p>Selecciona productos, asigna el cliente y procesa la compra.</p>
        </div>

        <div className="pos-customer">
          <label>Cliente</label>
          <div style={{ display: 'flex', gap: 7 }}>
            <select
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Seleccionar cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.nit ? ` · ${c.nit}` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn"
              title="Agregar cliente"
              onClick={() => setNewCustomerOpen(true)}
            >
              <UserPlus size={17} />
            </button>
          </div>
        </div>
      </div>

      <div className="pos-layout">
        <section className="pos-products">
          <div className="pos-search">
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto por nombre o SKU..."
            />
          </div>

          <div className="category-tabs">
            <button
              className={cat === 'all' ? 'active' : ''}
              onClick={() => setCat('all')}
            >
              Todos
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                className={cat === c.id ? 'active' : ''}
                onClick={() => setCat(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="pos-grid">
            {visible.map((p) => (
              <button
                className="pos-product"
                key={p.id}
                disabled={!p.stock}
                onClick={() => add(p)}
              >
                <div className="pos-product-image">
                  <ShoppingCart size={23} />
                </div>
                <div className="pos-product-info">
                  <strong>{p.name}</strong>
                  <span>{p.sku}</span>
                  <div>
                    <b>{money(Number(p.salePrice))}</b>
                    <Badge tone={p.stock <= p.minStock ? 'warning' : 'neutral'}>
                      {p.stock} disponibles
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="cart-panel">
          <div className="cart-head">
            <div>
              <h3>Carrito</h3>
              <span>{cart.reduce((s, i) => s + i.qty, 0)} productos</span>
            </div>
            <ShoppingCart size={20} />
          </div>

          <div className="cart-items">
            {cart.length ? (
              cart.map((i) => (
                <div className="cart-item" key={i.product.id}>
                  <div className="cart-item-main">
                    <strong>{i.product.name}</strong>
                    <span>{money(Number(i.product.salePrice))} c/u</span>
                  </div>
                  <div className="qty">
                    <button
                      onClick={() =>
                        setCart((c) =>
                          c.map((x) =>
                            x.product.id === i.product.id
                              ? { ...x, qty: Math.max(1, x.qty - 1) }
                              : x,
                          ),
                        )
                      }
                    >
                      <Minus size={13} />
                    </button>
                    <b>{i.qty}</b>
                    <button
                      onClick={() =>
                        setCart((c) =>
                          c.map((x) =>
                            x.product.id === i.product.id
                              ? {
                                  ...x,
                                  qty: Math.min(x.product.stock, x.qty + 1),
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() =>
                      setCart((c) => c.filter((x) => x.product.id !== i.product.id))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <div className="cart-empty">
                <ShoppingCart size={28} />
                <strong>Tu carrito está vacío</strong>
                <span>Agrega productos para comenzar una venta.</span>
              </div>
            )}
          </div>

          <div className="cart-footer">
            <div>
              <span>Subtotal</span>
              <b>{money(subtotal)}</b>
            </div>
            <div>
              <span>IVA (12%)</span>
              <b>{money(tax)}</b>
            </div>
            <div className="cart-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <Button
              disabled={!cart.length || !customer}
              onClick={() => setCheckout(true)}
              className="checkout-btn"
            >
              Cobrar {money(total)}
            </Button>
          </div>
        </aside>
      </div>

      <CustomerModal
        open={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        form={customerForm}
        setForm={setCustomerForm}
        loading={creatingCustomer}
        onSave={createCustomer}
      />

      <Checkout
        open={checkout}
        onClose={() => setCheckout(false)}
        method={method}
        setMethod={setMethod}
        pay={pay || String(total)}
        setPay={setPay}
        total={total}
        finish={finish}
      />

      <Modal open={success} onClose={() => setSuccess(false)} title="Venta completada">
        <div className="success-state">
          <CheckCircle2 size={52} />
          <h3>¡Venta registrada!</h3>
          <p>La operación se guardó correctamente en el sistema.</p>
          <Button onClick={() => setSuccess(false)}>Nueva venta</Button>
        </div>
      </Modal>
    </div>
  );
}

function CustomerModal({
  open,
  onClose,
  form,
  setForm,
  loading,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  form: CustomerForm;
  setForm: React.Dispatch<React.SetStateAction<CustomerForm>>;
  loading: boolean;
  onSave: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Nuevo cliente" wide>
      <div className="form-grid">
        <label className="field">
          <span>Tipo de cliente</span>
          <select
            value={form.customerType}
            onChange={(e) =>
              setForm((f) => ({ ...f, customerType: e.target.value as 'CF' | 'NIT' }))
            }
          >
            <option value="CF">Consumidor final</option>
            <option value="NIT">NIT</option>
          </select>
        </label>

        <label className="field">
          <span>Nombre *</span>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre completo o razón social"
            autoFocus
          />
        </label>

        <label className="field">
          <span>NIT{form.customerType === 'NIT' ? ' *' : ''}</span>
          <input
            value={form.nit}
            onChange={(e) => setForm((f) => ({ ...f, nit: e.target.value }))}
            placeholder="CF / NIT"
          />
        </label>

        <label className="field">
          <span>Teléfono</span>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Número de teléfono"
          />
        </label>

        <label className="field">
          <span>Correo</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="correo@ejemplo.com"
          />
        </label>

        <label className="field full">
          <span>Dirección</span>
          <textarea
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Dirección del cliente"
            rows={3}
          />
        </label>
      </div>

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={onSave} loading={loading}>
          Guardar cliente
        </Button>
      </div>
    </Modal>
  );
}

function Checkout({
  open,
  onClose,
  method,
  setMethod,
  pay,
  setPay,
  total,
  finish,
}: {
  open: boolean;
  onClose: () => void;
  method: string;
  setMethod: (v: string) => void;
  pay: string;
  setPay: (v: string) => void;
  total: number;
  finish: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Cobrar venta">
      <div className="checkout-total">
        <span>Total a pagar</span>
        <strong>{money(total)}</strong>
      </div>

      <div className="payment-methods">
        <button
          className={method === 'CASH' ? 'selected' : ''}
          onClick={() => setMethod('CASH')}
        >
          <Banknote size={22} />
          <span>Efectivo</span>
        </button>
        <button
          className={method === 'CARD' ? 'selected' : ''}
          onClick={() => setMethod('CARD')}
        >
          <CreditCard size={22} />
          <span>Tarjeta</span>
        </button>
        <button
          className={method === 'TRANSFER' ? 'selected' : ''}
          onClick={() => setMethod('TRANSFER')}
        >
          <CreditCard size={22} />
          <span>Transferencia</span>
        </button>
      </div>

      <label className="field">
        <span>Monto recibido</span>
        <div className="input-wrap">
          <span className="prefix">Q</span>
          <input
            type="number"
            value={pay}
            onChange={(e) => setPay(e.target.value)}
          />
        </div>
      </label>

      {method === 'CASH' && (
        <div className="change-box">
          <span>Cambio</span>
          <strong>{money(Math.max(0, Number(pay) - total))}</strong>
        </div>
      )}

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={finish}>Confirmar venta</Button>
      </div>
    </Modal>
  );
}
