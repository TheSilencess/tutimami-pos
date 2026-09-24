import { useEffect, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { Badge, Button, Empty, Spinner } from '../components/ui';

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>\"]/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[char],
  );
}

function money(value: unknown) {
  return `Q ${Number(value || 0).toFixed(2)}`;
}

function openReceipt(payload: any) {
  const printWindow = window.open('', '_blank', 'width=430,height=820');

  if (!printWindow) {
    throw new Error('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes para TutiMami POS.');
  }

  const payment = payload.payments?.[0];
  const paymentNames: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    TRANSFER: 'Transferencia',
  };

  const itemsHtml = (payload.items || []).map((item: any) => `
    <tr>
      <td style="padding:8px 0;vertical-align:top">
        ${esc(item.name)}
        <div style="font-size:10px;color:#777;margin-top:2px">${item.qty} x ${money(item.unitPrice)}</div>
      </td>
      <td style="padding:8px 0;text-align:right;vertical-align:top;font-weight:700">${money(item.total)}</td>
    </tr>`).join('');

  const change = payment?.method === 'CASH'
    ? Math.max(0, Number(payment.amount) - Number(payload.total))
    : 0;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Recibo ${esc(payload.saleId)}</title>
<style>
@page{size:80mm auto;margin:4mm}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#171716;font-family:Arial,Helvetica,sans-serif;font-size:11px}
.receipt{width:72mm;margin:0 auto}
.brand{font-size:23px;font-weight:900;letter-spacing:-1px;text-align:center}
.sub{text-align:center;color:#777;font-size:9px;line-height:1.5}
.line{border-top:1px dashed #aaa;margin:10px 0}
.meta{font-size:10px;line-height:1.55}
.meta strong{font-weight:700}
.items{width:100%;border-collapse:collapse;margin-top:5px}
.items th{font-size:8px;text-transform:uppercase;color:#777;text-align:left;padding-bottom:4px;border-bottom:1px solid #222}
.items th:last-child{text-align:right}
.totals{margin-top:9px;border-top:1px solid #222;padding-top:7px}
.totals div{display:flex;justify-content:space-between;margin:4px 0}
.total{font-size:15px;font-weight:900;margin-top:7px!important;padding-top:7px;border-top:1px double #222}
.payment{margin-top:10px;padding:8px;background:#f4f4f2;border-radius:5px}
.footer{text-align:center;margin-top:14px;color:#777;font-size:9px;line-height:1.5}
.thanks{text-align:center;font-weight:800;margin-top:12px;font-size:11px}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style>
</head>
<body>
<main class="receipt">
  <div class="brand">TutiMami</div>
  <div class="sub">Comprobante de venta<br>${esc(new Date(payload.createdAt).toLocaleString('es-GT'))}</div>
  <div class="line"></div>
  <div class="meta">
    <strong>Venta:</strong> ${esc(payload.saleId)}<br>
    <strong>Cajero:</strong> ${esc(payload.cashierName)}<br>
    <strong>Cliente:</strong> ${esc(payload.customer?.name || 'Consumidor final')}<br>
    <strong>NIT:</strong> ${esc(payload.customer?.nit || 'N/A')}<br>
    <strong>Teléfono:</strong> ${esc(payload.customer?.phone || 'N/A')}
  </div>
  <table class="items">
    <thead><tr><th>Producto</th><th>Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><b>${money(payload.subtotal)}</b></div>
    <div><span>Descuento</span><b>${money(payload.discount)}</b></div>
    <div class="total"><span>TOTAL</span><span>${money(payload.total)}</span></div>
  </div>
  <div class="payment">
    <div><strong>Método:</strong> ${esc(paymentNames[payment?.method] || payment?.method || 'N/A')}</div>
    <div><strong>Recibido:</strong> ${money(payment?.amount || payload.total)}</div>
    ${payment?.method === 'CASH' ? `<div><strong>Cambio:</strong> ${money(change)}</div>` : ''}
    ${payment?.reference ? `<div><strong>Referencia:</strong> ${esc(payment.reference)}</div>` : ''}
  </div>
  <div class="thanks">¡Gracias por tu compra!</div>
  <div class="footer">Conserva este comprobante para cualquier consulta.<br>TutiMami POS</div>
</main>
<script>window.onload=()=>{window.focus();setTimeout(()=>window.print(),180)}</script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function Printing() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprinting, setReprinting] = useState<string | null>(null);

  const load = () =>
    api.get('/printing/jobs')
      .then((response) => setItems(response.data))
      .finally(() => setLoading(false));

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const reprint = async (jobId: string) => {
    setReprinting(jobId);
    try {
      const response = await api.post(`/printing/jobs/${jobId}/reprint`, {});
      openReceipt(response.data.payload);
      await load();
    } catch (error) {
      alert(errorMessage(error));
    } finally {
      setReprinting(null);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">OPERACIONES</span>
          <h1>Impresión</h1>
          <p>Historial de recibos y reimpresiones.</p>
        </div>
        <Button variant="secondary" onClick={() => load()}>
          <RefreshCw size={16} />Actualizar
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : !items.length ? (
        <Empty title="Sin recibos" text="Los recibos generados aparecerán aquí." />
      ) : (
        <div className="product-table">
          <div className="table-head">
            <span>Trabajo</span>
            <span>Venta</span>
            <span>Impresora</span>
            <span>Fecha</span>
            <span>Estado</span>
            <span>Acción</span>
          </div>

          {items.map((job) => (
            <div className="table-row" key={job.id}>
              <div className="sale-id">
                <div className="sale-icon"><Printer size={16} /></div>
                <strong>{job.id.slice(0, 12)}</strong>
              </div>
              <span>{job.saleId?.slice(0, 12)}</span>
              <span>{job.printerName || 'Predeterminada'}</span>
              <span>{new Date(job.createdAt).toLocaleString('es-GT')}</span>
              <Badge tone={job.status === 'QUEUED' ? 'warning' : 'success'}>
                {job.status === 'QUEUED' ? 'Listo' : job.status}
              </Badge>
              <Button
                variant="secondary"
                loading={reprinting === job.id}
                onClick={() => reprint(job.id)}
              >
                <Printer size={15} />Reimprimir
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
