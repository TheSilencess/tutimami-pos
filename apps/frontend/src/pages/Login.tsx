import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight, Moon, Sun } from 'lucide-react';
import { api, errorMessage, setToken } from '../lib/api';
import { User } from '../types';
import { Button } from '../components/ui';

function getTheme() {
  const saved = localStorage.getItem('tutimami_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme);
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [show,setShow]=useState(false); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('tutimami_theme', theme);
  }, [theme]);

  const submit=async(e:FormEvent)=>{e.preventDefault();setLoading(true);setError('');try{const r=await api.post('/auth/login',{email,password});setToken(r.data.accessToken);onLogin(r.data.user);}catch(err){setError(errorMessage(err));}finally{setLoading(false)}};
  return <div className="login-page"><div className="login-visual"><div className="login-brand"><div className="brand-mark">TM</div><div><strong>TutiMami</strong><small>POINT OF SALE</small></div></div><div className="visual-copy"><span className="eyebrow">RETAIL MANAGEMENT</span><h1>Vende mejor.<br/><em>Controla todo.</em></h1><p>Una experiencia de punto de venta pensada para una tienda moderna, rápida y organizada.</p></div><div className="visual-footer">TutiMami POS · 2026</div></div><div className="login-panel"><div className="login-theme-toggle"><button type="button" className="icon-btn" onClick={()=>setTheme(theme==='dark'?'light':'dark')} title={theme==='dark'?'Modo claro':'Modo oscuro'}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></div><div className="login-form-wrap"><div className="mobile-login-brand"><div className="brand-mark">TM</div><strong>TutiMami</strong></div><span className="eyebrow">BIENVENIDO DE NUEVO</span><h2>Iniciar sesión</h2><p className="muted">Accede al panel de administración de TutiMami.</p><form onSubmit={submit}><label className="field"><span>Correo electrónico</span><div className="input-wrap"><Mail size={18}/><input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" required /></div></label><label className="field"><span>Contraseña</span><div className="input-wrap"><LockKeyhole size={18}/><input value={password} onChange={e=>setPassword(e.target.value)} type={show?'text':'password'} autoComplete="current-password" required/><button type="button" className="input-action" onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{error&&<div className="error-box">{error}</div>}<Button loading={loading} type="submit" className="login-button">Entrar <ArrowRight size={17}/></Button></form><small className="login-note">Tu sesión está protegida mediante autenticación segura.</small></div></div></div>;
}
