import { api } from './http.js';

export async function loginService({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  // data: { token, user }
  return data;
}
