// /api/test-key.js
// Receives { token, voiceId } from the panel.
// 1. Validates the token by fetching the user/account info.
// 2. Validates the voiceId by checking it exists in the account's voice list.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, voiceId } = req.body || {};
  if (!token) return res.status(400).json({ valid: false, error: 'Token is required.' });
  if (!voiceId) return res.status(400).json({ valid: false, error: 'Voice ID is required.' });

  try {
    // 1) Fetch voices (also gives us account/user usage info in most TTS Monster responses)
    const voicesRes = await fetch('https://api.console.tts.monster/voices', {
      method: 'POST',
      headers: { 'Authorization': token }
    });

    if (!voicesRes.ok) {
      return res.status(401).json({ valid: false, error: 'Invalid API token.' });
    }

    const data = await voicesRes.json();

    const allVoices = [
      ...(data.customVoices || []).map(v => ({ ...v, custom: true })),
      ...(data.voices || [])
    ];

    const matchedVoice = allVoices.find(v => v.voice_id === voiceId);
    if (!matchedVoice) {
      return res.status(404).json({ valid: false, error: 'Voice ID not found in this account.' });
    }

    return res.status(200).json({
      valid: true,
      user: data.user || null,
      voice: matchedVoice
    });

  } catch (err) {
    console.error('test-key error:', err);
    return res.status(500).json({ valid: false, error: 'Internal proxy error', detail: err.message });
  }
}