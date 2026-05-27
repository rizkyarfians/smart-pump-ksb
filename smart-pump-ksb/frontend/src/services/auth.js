import API from './api';

const USER_KEY = 'smart_pump_user';

export async function login({ username, password }) {
  const res = await API.post('/auth/login', {
    username,
    password,
  });

  const user = res.data?.data?.user;

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  return {
    success: true,
    user,
  };
}

export async function logout() {
  await API.post('/auth/logout');
  localStorage.removeItem(USER_KEY);
}

export async function getMe() {
  const res = await API.get('/auth/me');

  const user = res.data?.data?.user;

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  return user;
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getCurrentUser());
}