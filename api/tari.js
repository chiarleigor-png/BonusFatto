import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const top100 = require('../lib/top100Comuni.json');

function clean(value,max=1000){ return String(value??'').trim().slice(0,max); }
export default async function handler(req,res){
  const istat=clean(req.query?.istat,6);
  if(!/^\d{6}$/.test(istat)) return res.status(400).json({ok:false,error:'ISTAT_INVALIDO'});
  const comune=top100.find((item)=>item.istat===istat);
  if(!comune) return res.status(404).json({ok:false,error:'COMUNE_NON_IN_TOP100'});
  const supabaseUrl=clean(process.env.SUPABASE_URL,600).replace(/\/$/,'');
  const key=clean(process.env.SUPABASE_SERVICE_ROLE_KEY,1200);
  if(!supabaseUrl||!key) return res.status(503).json({ok:false,error:'TARI_DB_NOT_CONFIGURED'});
  const response=await fetch(`${supabaseUrl}/rest/v1/comuni_tari?istat=eq.${encodeURIComponent(istat)}&select=istat,comune,provincia,scadenza_rata_1,scadenza_rata_2,riduzione_isee_9796,url_fonte,verified&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  const rows=await response.json().catch(()=>[]);
  if(!response.ok) return res.status(502).json({ok:false,error:'TARI_DB_ERROR'});
  const data=Array.isArray(rows)?rows[0]||null:null;
  res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ok:true,available:Boolean(data),comune:{nome:comune.nome,istat:comune.istat,provincia:comune.provincia,regione:comune.regione,url_mef:comune.url_mef},data});
}
