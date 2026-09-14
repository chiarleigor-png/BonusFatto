import { createBonusFattoReport } from '../lib/reportPdf.js';

function clean(value,max=1200){ return String(value??'').trim().slice(0,max); }
function headers(){ const key=clean(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!key) throw new Error('Supabase non configurato'); return {apikey:key,Authorization:`Bearer ${key}`}; }
function base(){ const u=clean(process.env.SUPABASE_URL,600).replace(/\/$/,''); if(!u) throw new Error('Supabase non configurato'); return u; }
async function stripeSession(id){ const secret=clean(process.env.STRIPE_SECRET_KEY); if(!secret) throw new Error('Stripe non configurato'); const r=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${secret}`}}); const s=await r.json(); if(!r.ok||!s?.id) throw new Error('Sessione Stripe non valida'); return s; }
async function orderFor(id){ const r=await fetch(`${base()}/rest/v1/bonusfatto_orders?stripe_session_id=eq.${encodeURIComponent(id)}&select=*`,{headers:headers()}); const rows=await r.json(); if(!r.ok) throw new Error('Ordine non disponibile'); return Array.isArray(rows)?rows[0]||null:null; }

export default async function handler(req,res){
  if(req.method!=='GET'){ res.setHeader('Allow','GET'); return res.status(405).json({error:'Metodo non consentito.'}); }
  const sessionId=clean(req.query?.session_id,255);
  if(!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return res.status(400).json({error:'Sessione non valida.'});
  try{
    const session=await stripeSession(sessionId);
    if(session.payment_status!=='paid'||session.status!=='complete'||session.metadata?.source!=='bonusfatto'||session.metadata?.plan!=='report') return res.status(403).json({error:'Relazione non disponibile per questa sessione.'});
    const order=await orderFor(sessionId);
    if(!order||order.status!=='paid'||order.plan!=='report') return res.status(404).json({error:'Ordine pagato non trovato.'});
    const pdf=await createBonusFattoReport(order);
    const safe=String(order.order_code||'BonusFatto').replace(/[^A-Za-z0-9_-]/g,'');
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="BonusFatto_Relazione_${safe}.pdf"`);
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    return res.status(200).send(pdf);
  }catch(error){ console.error('BonusFatto report failed',error?.message||error); return res.status(500).json({error:'Impossibile generare la relazione. Riprova tra poco.'}); }
}
