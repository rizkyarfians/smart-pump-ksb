import API from './api';

export async function sendPumpCommand(payload) {
  console.log('[FRONTEND] Sending pump command:', payload);

  const res = await API.post('/pump/command', payload);

  console.log('[FRONTEND] Pump command response:', res.data);

  return res.data;
}