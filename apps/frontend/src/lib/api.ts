import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

let accessToken = localStorage.getItem('tutimami_access');
let refreshing: Promise<string | null> | null = null;

export function setToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem('tutimami_access', token);
  else localStorage.removeItem('tutimami_access');
}

export function getToken() { return accessToken; }

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
    original._retry = true;
    refreshing ??= api.post('/auth/refresh').then((r) => {
      setToken(r.data.accessToken);
      return r.data.accessToken;
    }).catch(() => null).finally(() => { refreshing = null; });
    const token = await refreshing;
    if (token) {
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }
    setToken(null);
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export const errorMessage = (error: unknown) => {
  const e = error as { response?: { data?: { message?: string | string[] } } };
  const message = e.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || 'Ocurrió un error. Inténtalo de nuevo.';
};
