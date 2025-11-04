// src/services/api.service.js
import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL; // ex.: http://localhost:3333/api

export async function apiGet(path, token, query = {}) {
  const qs = new URLSearchParams(query).toString();
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`API GET ${url} => ${r.status}: ${text}`);
  }
  // Algumas APIs devolvem 204; por via das dúvidas:
  if (r.status === 204) return null;
  return r.json();
}

export async function apiPatch(path, token, body = {}) {
  const url = `${BASE_URL}${path}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`API PATCH ${url} => ${r.status}: ${text}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

export async function apiPost(path, token, body = {}) {
  const url = `${BASE_URL}${path}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`API POST ${url} => ${r.status}: ${text}`);
  }
  if (r.status === 204) return null;
  return r.json();
}
