export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(410).send('Gone');
}
