export default function handler(req, res) {
  const istat = req.query.istat || req.query.q || null;
  return res.status(200).json({ ok: true, test: "vite api funziona", istat: istat, time: new Date().toISOString() });
}
