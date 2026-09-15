import tls from 'node:tls';

function clean(v,max=4000){return String(v??'').trim().slice(0,max)}
function validEmail(v){const s=clean(v,180).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:''}
async function readResp(socket){return new Promise((resolve,reject)=>{let b='';const t=setTimeout(()=>done(new Error('Timeout SMTP')),10000);const onData=c=>{b+=c.toString('utf8');const lines=b.split(/\r?\n/).filter(Boolean);const last=lines.at(-1)||'';if(/^\d{3} /.test(last))done(null,{code:Number(last.slice(0,3)),text:b})};const onErr=e=>done(e);function done(e,v){clearTimeout(t);socket.off('data',onData);socket.off('error',onErr);e?reject(e):resolve(v)}socket.on('data',onData);socket.on('error',onErr)})}
async function cmd(socket,c,ok=[250]){if(c)socket.write(c+'\r\n');const r=await readResp(socket);if(!ok.includes(r.code))throw new Error(`SMTP ${r.code}`);return r}
function wrap64(s){return Buffer.from(s,'base64').toString('base64').match(/.{1,76}/g)?.join('\r\n')||''}
async function sendQueueMail({subject,body,attachments}){
  const host=clean(process.env.SMTP_HOST||'smtps.aruba.it',255);const user=validEmail(process.env.PRACTICHE_SMTP_USER||process.env.SMTP_USER);const pass=String(process.env.PRACTICHE_SMTP_PASSWORD||process.env.SMTP_PASSWORD||'');const to=validEmail(process.env.PRACTICHE_SMTP_USER||process.env.SMTP_USER);if(!host||!user||!pass||!to)throw new Error('SMTP non configurato');
  const socket=tls.connect({host,port:465,servername:host,rejectUnauthorized:true});await new Promise((res,rej)=>{socket.once('secureConnect',res);socket.once('error',rej)});
  try{let r=await readResp(socket);if(r.code!==220)throw new Error('SMTP');await cmd(socket,'EHLO bonusfatto.it');await cmd(socket,'AUTH LOGIN',[334]);await cmd(socket,Buffer.from(user).toString('base64'),[334]);await cmd(socket,Buffer.from(pass).toString('base64'),[235]);await cmd(socket,`MAIL FROM:<${user}>`);await cmd(socket,`RCPT TO:<${to}>`,[250,251]);await cmd(socket,'DATA',[354]);
    const boundary=`----BonusFattoPEC-${Date.now()}`;const parts=[`From: BonusFatto <${user}>`,`To: ${to}`,`Subject: ${clean(subject,180).replace(/[\r\n]+/g,' ')}`,'MIME-Version: 1.0',`Content-Type: multipart/mixed; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: 8bit','',String(body||'')];
    for(const a of attachments||[]){const name=clean(a.name,120).replace(/["\r\n]/g,'_');const type=clean(a.type||'application/octet-stream',80);parts.push('',`--${boundary}`,`Content-Type: ${type}; name="${name}"`,'Content-Transfer-Encoding: base64',`Content-Disposition: attachment; filename="${name}"`,'',wrap64(a.data||''));}
    parts.push(`--${boundary}--`,'.','');socket.write(parts.join('\r\n'));r=await readResp(socket);if(r.code!==250)throw new Error('SMTP');await cmd(socket,'QUIT',[221]);
  }finally{socket.end()}
}

export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Metodo non consentito.'})}
  try{
    const {session_id,recipient,subject,message,attachments=[]}=req.body||{};const sid=clean(session_id,255);const secret=clean(process.env.STRIPE_SECRET_KEY,1200);if(!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)||!secret)return res.status(400).json({error:'Sessione non valida.'});
    const sr=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}`,{headers:{Authorization:`Bearer ${secret}`}});const s=await sr.json();if(!sr.ok||s.payment_status!=='paid'||s.status!=='complete'||s.metadata?.plan!=='pec'||s.metadata?.source!=='bonusfatto')return res.status(403).json({error:'Servizio PEC non disponibile per questa sessione.'});
    const dest=validEmail(recipient);if(!dest)return res.status(400).json({error:'Inserisci un indirizzo PEC destinatario valido.'});if(!clean(subject,300)||!clean(message,12000))return res.status(400).json({error:'Oggetto e testo sono obbligatori.'});
    const safeAttachments=Array.isArray(attachments)?attachments.slice(0,5).filter(a=>a&&typeof a.data==='string'&&a.data.length<7_000_000):[];
    const body=[`Richiesta invio PEC BonusFatto`,`Sessione: ${sid}`,`Cliente: ${s.customer_details?.email||s.customer_email||'-'}`,`Comune: ${s.metadata?.comune||'-'}`,`Destinatario PEC: ${dest}`,`Oggetto PEC: ${clean(subject,300)}`,'','TESTO DA INVIARE:',clean(message,12000),'',`Allegati: ${safeAttachments.map(a=>clean(a.name,120)).join(', ')||'nessuno'}`,'','Prendere in carico l’invio dalla casella PEC aziendale e trasmettere al cliente le ricevute.'].join('\r\n');
    await sendQueueMail({subject:`[BonusFatto PEC] ${clean(subject,120)}`,body,attachments:safeAttachments});
    return res.status(200).json({ok:true,message:'Richiesta PEC presa in carico. Riceverai le ricevute all’indirizzo usato per l’acquisto.'});
  }catch(error){console.error('PEC intake failed',error?.message||error);return res.status(500).json({error:'Non è stato possibile prendere in carico la PEC. Riprova tra poco.'})}
}
