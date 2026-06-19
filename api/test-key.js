// /api/test-key.js
// Dipanggil dari admin.html. Token TIDAK disimpan di server — cuma diteruskan
// ke TTS Monster buat divalidasi, lalu hasilnya (info user + daftar voice) dikirim balik.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { token } = req.body;
    if (!token || !token.trim()) {
        return res.status(400).json({ error: 'Token kosong' });
    }

    try {
        const [userRes, voicesRes] = await Promise.all([
            fetch('https://api.console.tts.monster/user', {
                method: 'POST',
                headers: { 'Authorization': token }
            }),
            fetch('https://api.console.tts.monster/voices', {
                method: 'POST',
                headers: { 'Authorization': token }
            })
        ]);

        if (!userRes.ok) {
            return res.status(401).json({ error: 'Token tidak valid atau ditolak TTS Monster' });
        }

        const user = await userRes.json();
        const voicesData = voicesRes.ok ? await voicesRes.json() : { voices: [], customVoices: [] };

        return res.status(200).json({
            valid: true,
            user,
            voices: voicesData.voices || [],
            customVoices: voicesData.customVoices || []
        });

    } catch (err) {
        return res.status(500).json({ error: 'Gagal menghubungi TTS Monster', detail: err.message });
    }
}