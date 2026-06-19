// /api/tts.js
// Menerima POST dengan ?session=xxx (terenkripsi dari browser)
// Mendekripsi session → ambil token + voiceId → forward ke TTS Monster

import { createDecipheriv, pbkdf2Sync } from 'crypto';

// ⚠️ HARUS SAMA dengan SHARED_SECRET di index.html
const SHARED_SECRET = 'ganti-dengan-rahasia-acakmu-32char!!';
const SALT          = 'ttsm-salt-v1';

function deriveKey(secret) {
  return pbkdf2Sync(secret, SALT, 100000, 32, 'sha256');
}

function decryptSession(sessionB64url) {
  // base64url → base64 → Buffer
  const base64   = sessionB64url.replace(/-/g, '+').replace(/_/g, '/');
  const combined = Buffer.from(base64, 'base64');

  const iv         = combined.subarray(0, 12);
  const ciphertext = combined.subarray(12);
  const key        = deriveKey(SHARED_SECRET);

  // AES-256-GCM: tag adalah 16 byte terakhir
  const tag  = ciphertext.subarray(ciphertext.length - 16);
  const data = ciphertext.subarray(0, ciphertext.length - 16);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // Ambil session dari query string
  const sessionParam = req.query?.session;
  if (!sessionParam) {
    return res.status(400).json({ error: 'Parameter session tidak ditemukan di URL.' });
  }

  // Dekripsi
  let token, voiceId;
  try {
    const payload = decryptSession(sessionParam);

    // Cek usia session (opsional: tolak jika lebih dari 30 hari)
    const ageMs = Date.now() - (payload.ts || 0);
    if (ageMs > 30 * 24 * 60 * 60 * 1000) {
      return res.status(401).json({ error: 'Session sudah kedaluwarsa. Generate URL baru dari panel.' });
    }

    token   = payload.token;
    voiceId = payload.voiceId;
  } catch (err) {
    return res.status(401).json({ error: 'Session tidak valid atau sudah dimodifikasi.', detail: err.message });
  }

  // Ambil pesan dari body
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Field "message" wajib diisi di request body.' });
  }

  try {
    const ttsRes = await fetch('https://api.console.tts.monster/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        voice_id: voiceId,
        message: String(message).slice(0, 500)
      })
    });

    const data = await ttsRes.json();

    if (!ttsRes.ok) {
      console.error('TTS Monster error:', data);
      return res.status(ttsRes.status).json({ error: 'TTS Monster API error', detail: data });
    }

    return res.status(200).json(data); // { status: 200, url: "https://storage.tts.monster/..." }

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal proxy error', detail: err.message });
  }
}