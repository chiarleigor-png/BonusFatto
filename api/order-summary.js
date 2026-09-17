function clean(value,max=1200){ return String(value??'').trim().slice(0,max); }
function headers(){ const key=clean(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!key) throw new Error('Supabase non configurato'); return {apikey:key,Authorization:`Bearer ${key}`}; }
function base(){ const u=clean(process.env.SUPABASE_URL,600).replace(/\/$/,''); if(!u) throw new Error('Supabase non configurato'); return u; }
async function stripeSession(id){ const secret=clean(process.env.STRIPE_SECRET_KEY); const r=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${secret}`}}); const s=await r.json(); if(!r.ok||!s?.id) throw new Error('Sessione non valida'); return s; }
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Metodo non consentito.'});
  const id=clean(req.query?.session_id,255); if(!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({error:'Sessione non valida.'});
  try{
    const s=await stripeSession(id); if(s.payment_status!=='paid'||s.status!=='complete'||s.metadata?.source!=='bonusfatto') return res.status(403).json({error:'Non autorizzato.'});
    const fields='order_code,plan,customer_name,customer_surname,fiscal_code,customer_email,billing_address,billing_zip,billing_city,billing_province,pec,whatsapp,whatsapp_consent,calculation_municipality,isee,children';
    const r=await fetch(`${base()}/rest/v1/bonusfatto_orders?stripe_session_id=eq.${encodeURIComponent(id)}&select=${fields}`,{headers:headers()});
    const rows=await r.json(); const o=Array.isArray(rows)?rows[0]:null; if(!r.ok||!o) return res.status(404).json({error:'Ordine non trovato.'});
    res.setHeader('Cache-Control','private, no-store, max-age=0'); return res.status(200).json(o);
  }catch(e){ console.error('order summary failed',e?.message||e); return res.status(500).json({error:'Dati ordine non disponibili.'}); }
}
