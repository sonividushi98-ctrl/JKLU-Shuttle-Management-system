import axios from 'axios';
import { getStoredToken } from './session';

// All /api/admin routes need an Admin's JWT in the Authorization header.
const adminApi = axios.create({ baseURL: 'http://localhost:5000/api/admin', timeout: 8000 });

adminApi.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turns an axios error into a message to show, preferring the server's own text.
export const adminErrorMessage = (err) => {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response) return `Request failed (${err.response.status}).`;
  return 'Cannot reach the shuttle server. Make sure the backend is running.';
};

export const getSlotLoad = (date) =>
  adminApi.get('/slots/load', { params: { date } }).then((res) => res.data);

export const createSlot = (slot) =>
  adminApi.post('/slots', slot).then((res) => res.data);

export const cancelSlot = (slotId, date, reason) =>
  adminApi.post(`/slots/${slotId}/cancel`, { date, reason }).then((res) => res.data);

export const getPassengers = (slotId, date) =>
  adminApi.get(`/slots/${slotId}/passengers`, { params: { date } }).then((res) => res.data);
