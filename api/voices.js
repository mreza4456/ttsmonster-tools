// /api/voices.js
// GET request -> mengembalikan daftar voice_id yang tersedia di akun TTS Monster kamu
// Akses lewat browser: https://your-proxy.vercel.app/api/voices

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const apiKey = process.env.TTS_MONSTER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'TTS_MONSTER_API_KEY belum diset di environment variables' });
        }

        const voicesRes = await fetch('https://api.console.tts.monster/voices', {
            method: 'POST',
            headers: { 'Authorization': apiKey }
        });

        const data = await voicesRes.json();
        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({ error: 'Internal proxy error', detail: err.message });
    }
}