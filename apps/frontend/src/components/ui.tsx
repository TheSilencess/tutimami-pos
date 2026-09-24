import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { Loader2, Search, X } from 'lucide-react';

export function Button({ children, variant='primary', loading=false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'ghost'|'danger'; loading?: boolean }) {
  return <button {...props} disabled={loading || props.disabled} className={`btn btn-${variant} ${props.className || ''}`}>{loading && <Loader2 size={16} className="spin" />}{children}</button>;
}

export function Input({ label, icon, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: ReactNode }) {
  return <label className="field">{label && <span>{label}</span>}<div className="input-wrap">{icon}{<input {...props} />}</div></label>;
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) { return <Input {...props} icon={<Search size={17} />} placeholder={props.placeholder || 'Buscar...'} />; }

export function Badge({ children, tone='neutral' }: { children: ReactNode; tone?: 'neutral'|'success'|'warning'|'danger' }) { return <span className={`badge badge-${tone}`}>{children}</span>; }

export function Modal({ open, title, onClose, children, wide=false }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className={`modal ${wide ? 'modal-wide' : ''}`}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{children}</div></div>;
}

export function Empty({ title='Sin registros', text='No hay información para mostrar.' }: { title?: string; text?: string }) { return <div className="empty"><div className="empty-dot"/><strong>{title}</strong><span>{text}</span></div>; }

export function Spinner() { return <div className="center-loader"><Loader2 className="spin" size={24}/></div>; }
