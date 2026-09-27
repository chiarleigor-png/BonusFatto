import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const top100 = require('../../lib/top100Comuni.json');

export default async function handler(req,res){
  const secret=String(process.env.CRON_SECRET||'').trim();
  if(secret && String(req.headers.authorization||'')!==`Bearer ${secret}`) return res.status(401).json({ok:false,error:'UNAUTHORIZED'});
  const dayIndex=Math.floor(Date.now()/86400000);
  const batchIndex=dayIndex%5;
  const start=batchIndex*20;
  const batch=top100.slice(start,start+20).map(({istat,nome,url_mef})=>({istat,nome,url_mef}));
  return res.status(200).json({ok:true,batch:batchIndex+1,start,count:batch.length,comuni:batch,status:'SCRAPER_READY'});
}
