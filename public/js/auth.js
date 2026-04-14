const API = window.location.origin;
const auth = {
  getToken() { return localStorage.getItem('bt_token'); },
  getUser() { try { return JSON.parse(localStorage.getItem('bt_user')); } catch { return null; } },
  save(token, user) {
    localStorage.setItem('bt_token', token);
    localStorage.setItem('bt_user', JSON.stringify(user));
  },
  clear() { localStorage.removeItem('bt_token'); localStorage.removeItem('bt_user'); },
  headers() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.getToken()}` }; },
  logout() { this.clear(); window.location.href = '/'; },
  guard(allowedRoles) {
    const user = this.getUser();
    if (!user || !this.getToken()) { window.location.href = '/'; return null; }
    if (allowedRoles && !allowedRoles.includes(user.role)) { window.location.href = '/'; return null; }
    return user;
  }
};
async function apiPost(path, body) {
  const res = await fetch(API + path, { method: 'POST', headers: auth.headers(), body: JSON.stringify(body) });
  return res.json();
}
async function apiGet(path) {
  const res = await fetch(API + path, { headers: auth.headers() });
  return res.json();
}
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
