function euroIt(value){ return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(value||0)); }
function buildMail(o){ const name=[o.customer_name,o.customer_surname].filter(Boolean).join(' ')||'[Nome e cognome]'; return `Oggetto: Richiesta informazioni agevolazioni TARI 2026 – ISEE ${euroIt(o.isee)} – Comune ${o.calculation_municipality}\n\nGentile Ufficio Tributi del Comune di ${o.calculation_municipality},\n\nsono residente nel Comune e dispongo di un ISEE 2026 pari a ${euroIt(o.isee)}.\n\nChiedo cortesemente di conoscere le eventuali agevolazioni, riduzioni o esenzioni TARI comunali ulteriori rispetto al bonus sociale rifiuti nazionale, con indicazione di requisiti, percentuali applicabili, documentazione necessaria, modalità di presentazione e scadenze.\n\nQualora sia prevista una procedura a domanda, chiedo anche il relativo modulo o il collegamento al servizio online.\n\nResto a disposizione per trasmettere la documentazione attraverso i canali ufficiali dell'Ente.\n\nCordiali saluti,\n${name}\n${o.fiscal_code||'[Codice fiscale]'}\n[Codice utenza TARI]\n${o.customer_email||'[Recapito]'}`; }
async function run(){
  const id=new URLSearchParams(location.search).get('session_id'); if(!id||!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return;
  let order; try{ const r=await fetch(`/api/order-summary?session_id=${encodeURIComponent(id)}`,{credentials:'same-origin'}); if(!r.ok)return; order=await r.json(); }catch{return;}
  if(order.plan!=='report') return;
  const apply=()=>{
    const banner=[...document.querySelectorAll('.paid-banner')].find(x=>x.textContent.includes('relazione PDF')); if(!banner)return false;
    if(!document.querySelector('.bf-definitive-report')){
      const a=document.createElement('a'); a.className='primary bf-definitive-report'; a.href=`/api/report?session_id=${encodeURIComponent(id)}`; a.textContent='Scarica relazione PDF definitiva'; a.style.display='inline-flex'; a.style.margin='12px 0'; a.style.textDecoration='none'; banner.insertAdjacentElement('afterend',a);
    }
    const area=document.querySelector('textarea'); if(area&&area.value.includes('Ufficio Tributi')){ area.value=buildMail(order); area.dispatchEvent(new Event('input',{bubbles:true})); }
    return true;
  };
  if(apply())return; const obs=new MutationObserver(()=>{if(apply())obs.disconnect();}); obs.observe(document.documentElement,{childList:true,subtree:true}); setTimeout(()=>obs.disconnect(),12000);
}
run();
