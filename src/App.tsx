import { useEffect, useState, useMemo, useRef } from "react";
const bonusLogo = "/bonusfatto_logo.png";
const sunLogo = "/logo.webp";
import { BLOG_ARTICLES } from "./blogData";

type ComuneNorm = { nome: string; provincia: string; regione: string };

const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];

const PROVINCE_PER_REGIONE: Record<string,string[]> = {
  "Abruzzo":["Chieti","L'Aquila","Pescara","Teramo"],"Basilicata":["Matera","Potenza"],"Calabria":["Catanzaro","Cosenza","Crotone","Reggio Calabria","Vibo Valentia"],"Campania":["Avellino","Benevento","Caserta","Napoli","Salerno"],"Emilia-Romagna":["Bologna","Ferrara","Forlì-Cesena","Modena","Parma","Piacenza","Ravenna","Reggio Emilia","Rimini"],"Friuli-Venezia Giulia":["Gorizia","Pordenone","Trieste","Udine"],"Lazio":["Frosinone","Latina","Rieti","Roma","Viterbo"],"Liguria":["Genova","Imperia","La Spezia","Savona"],"Lombardia":["Bergamo","Brescia","Como","Cremona","Lecco","Lodi","Mantova","Milano","Monza e della Brianza","Pavia","Sondrio","Varese"],"Marche":["Ancona","Ascoli Piceno","Fermo","Macerata","Pesaro e Urbino"],"Molise":["Campobasso","Isernia"],"Piemonte":["Alessandria","Asti","Biella","Cuneo","Novara","Torino","Verbano-Cusio-Ossola","Vercelli"],"Puglia":["Bari","Barletta-Andria-Trani","Brindisi","Foggia","Lecce","Taranto"],"Sardegna":["Cagliari","Nuoro","Oristano","Sassari","Sud Sardegna"],"Sicilia":["Agrigento","Caltanissetta","Catania","Enna","Messina","Palermo","Ragusa","Siracusa","Trapani"],"Toscana":["Arezzo","Firenze","Grosseto","Livorno","Lucca","Massa-Carrara","Pisa","Pistoia","Prato","Siena"],"Trentino-Alto Adige":["Bolzano","Trento"],"Umbria":["Perugia","Terni"],"Valle d'Aosta":["Aosta"],"Veneto":["Belluno","Padova","Rovigo","Treviso","Venezia","Verona","Vicenza"],
};

const FALLBACK_ROMA = ["Roma","Fiumicino","Guidonia Montecelio","Pomezia","Albano Laziale","Anzio","Ardea","Bracciano","Cerveteri","Ciampino","Civitavecchia","Colleferro","Frascati","Ladispoli","Marino","Mentana","Monterotondo","Nettuno","Tivoli","Velletri"].map(n=>({nome:n, provincia:"Roma", regione:"Lazio"}));
const FALLBACK_TORINO = ["Torino","Beinasco","Carmagnola","Chieri","Moncalieri","Nichelino","Orbassano","Pinerolo","Rivoli","Settimo Torinese","Venaria Reale","Collegno","Grugliasco","Chivasso","Ivrea"].map(n=>({nome:n, provincia:"Torino", regione:"Piemonte"}));

const MEDIA_TARI_MAP: Record<string, number> = {"roma":360,"milano":400,"torino":380,"napoli":340,"bologna":370,"firenze":350,"palermo":320,"fiumicino":330,"guidonia montecelio":310,"pomezia":310,"albano laziale":305,"anzio":315,"venezia":380,"genova":360,"bari":330,"catania":325};
function getMediaTari(nome: string|undefined, provincia: string){ const n=(nome||"").toLowerCase().trim(); if(n && MEDIA_TARI_MAP[n]!==undefined) return MEDIA_TARI_MAP[n]; const p=(provincia||"").toLowerCase().trim(); if(p && MEDIA_TARI_MAP[p]!==undefined) return MEDIA_TARI_MAP[p]; return 350; }

const SCADENZE = {roma:new Date("2026-02-28T23:59:59"),fiumicino:new Date("2026-03-16T23:59:59"),voucherPiemonte:new Date("2026-06-30T23:59:59")};
function getCountdownInfo(target: Date, now: Date){ const diff=target.getTime()-now.getTime(); const days=Math.ceil(diff/(1000*60*60*24)); let status:"expired"|"urgent"|"warning"|"ok"="ok"; if(days<0) status="expired"; else if(days<15) status="urgent"; else if(days<60) status="warning"; return {days,status,target}; }

export default function App(){
  const [comuni,setComuni]=useState<ComuneNorm[]>([]); const [loadingComuni,setLoadingComuni]=useState(true);
  const [regione,setRegione]=useState("Lazio"); const [provincia,setProvincia]=useState("Roma");
  const [comuneQuery,setComuneQuery]=useState(""); const [selectedComune,setSelectedComune]=useState<ComuneNorm|null>(null); const [showDropdown,setShowDropdown]=useState(true);
  const [iseeInput,setIseeInput]=useState(""); const [figli,setFigli]=useState(1); const [tariInput,setTariInput]=useState("");
  const isee=useMemo(()=>{const n=parseInt(iseeInput,10); return isNaN(n)?0:n;},[iseeInput]);
  const tariImporto=useMemo(()=>{const n=parseInt(tariInput,10); return isNaN(n)?0:n;},[tariInput]);
  const [stage,setStage]=useState<"form"|"teaser"|"checkout"|"result"|"blog"|"article">("form");
  const [selectedSlug,setSelectedSlug]=useState<string|null>(null);
  const selectedArticle = selectedSlug? BLOG_ARTICLES.find(a=>a.slug===selectedSlug) : null;
  const [pdfModels,setPdfModels]=useState(false); const [alert2026,setAlert2026]=useState(false); const [alert2027,setAlert2027]=useState(false);
  const [now,setNow]=useState(()=>new Date()); const [copied,setCopied]=useState(false);
  const teaserRef=useRef<HTMLDivElement>(null); const resultRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{ const i=setInterval(()=>setNow(new Date()),60000); return ()=>clearInterval(i); },[]);
  useEffect(()=>{
    async function load(){
      try{
        const res=await fetch("https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json");
        const data=await res.json();
        const norm:ComuneNorm[]=data.map((c:any)=>({nome:c.nome, provincia:c.provincia?.nome||"", regione:c.regione?.nome||""}));
        setComuni(norm);
      }catch{ setComuni([...FALLBACK_ROMA,...FALLBACK_TORINO]); }
      setLoadingComuni(false);
    }
    load();
  },[]);

  const comuniFiltrati=useMemo(()=>{
    const q=comuneQuery.toLowerCase().trim();
    const base=comuni.length?comuni:[...FALLBACK_ROMA,...FALLBACK_TORINO];
    let filtered=base.filter(c=> c.provincia.toLowerCase()===provincia.toLowerCase() || (provincia==="Roma" && FALLBACK_ROMA.some(f=>f.nome===c.nome)) );
    if(q) filtered=filtered.filter(c=>c.nome.toLowerCase().includes(q));
    return filtered.slice(0,80);
  },[comuni,provincia,comuneQuery]);

  const mediaTari=getMediaTari(selectedComune?.nome, provincia);
  const tariInfo=useMemo(()=>{
    if(!isee) return {percent:0,risparmioStima:0,msg:"Inserisci ISEE per calcolare % sconto TARI"};
    if(isee<=8000) return {percent:100,risparmioStima:mediaTari,msg:`✅ ISEE ${isee}€ ≤ 8.000€ → 100% esenzione stimata`};
    if(isee<=15000) return {percent:50,risparmioStima:Math.round(mediaTari*0.5),msg:`✅ ISEE ${isee}€ ≤ 15.000€ → 50% sconto stimato`};
    if(isee<=26530) return {percent:25,risparmioStima:Math.round(mediaTari*0.25),msg:`ℹ️ ISEE ${isee}€ ≤ 26.530€ → 25% sconto (Costarainera: sopra soglie medie 8-15k ma entro fascia estesa)`};
    return {percent:0,risparmioStima:0,msg:`⚠️ ISEE ${isee}€ > 26.530€ → sopra soglie medie comunali`};
  },[isee,mediaTari]);

  const bonus=useMemo(()=>{
    let lucegas=0; if(isee && isee<=9796) lucegas=250; else if(isee && isee<=20000 && figli>=4) lucegas=250;
    let assegno=0; if(figli>0){ if(isee<=17500) assegno=199*figli; else if(isee<=40000) assegno=120*figli; else assegno=57*figli; }
    let nido=0; if(figli>0){ if(isee<=25000) nido=3000; else if(isee<=40000) nido=2500; else nido=1500; }
    let voucher=0; if(regione==="Piemonte" && isee<=26000) voucher=500;
    const totale=tariInfo.risparmioStima+lucegas+assegno*12+nido+voucher;
    return {totale,tari:tariInfo.risparmioStima,lucegas,assegno,nido,voucherPiemonte:voucher};
  },[tariInfo,isee,figli,regione]);

  const countdownRoma=getCountdownInfo(SCADENZE.roma,now);
  const countdownFiumicino=getCountdownInfo(SCADENZE.fiumicino,now);
  const countdownVoucher=getCountdownInfo(SCADENZE.voucherPiemonte,now);
  const comuneLabel=selectedComune?.nome || provincia;
  const totaleCheckout=4.99 + (alert2026?9.9:0) + (alert2027?9.9:0);
  const emailModello=`Oggetto: Richiesta agevolazione TARI 2026 – ISEE ${isee}€ – Comune ${comuneLabel}

Spett.le Ufficio Tributi Comune di ${comuneLabel},
ai sensi art.18 Regolamento TARI e Delibera vigente richiedo sconto disagio economico ISEE ${isee}€ (nucleo ${figli} figli).
Importo TARI medio stimato ${mediaTari}€, % stimata ${tariInfo.percent}% → risparmio ~${tariInfo.risparmioStima}€.
Allego DSU ISEE 2026, documento, utenza TARI.
Resto a disposizione.
Cordiali saluti
[NOME COGNOME] – [CF] – [TEL]`;

  const handleCopy=()=>{ const el=document.getElementById("email-textarea") as HTMLTextAreaElement; if(el){ el.select(); document.execCommand("copy"); setCopied(true); setTimeout(()=>setCopied(false),2000);} };

  function Badge({info}:{info:any}){ const c=info.status==="expired"?"bg-red-600 text-white":info.status==="urgent"?"bg-red-100 text-red-700 border border-red-300":info.status==="warning"?"bg-amber-100 text-amber-800 border border-amber-200":"bg-emerald-100 text-emerald-800 border border-emerald-200"; return <span className={`px-2.5 py-1 rounded-full text- font-bold ${c}`}>{info.days<0?`Scaduto ${Math.abs(info.days)}gg fa`:`${info.days}gg rimasti`}</span>; }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-amber-100">
        <div className="max-w- mx-auto px-4 sm:px-6 md:px-8 h- flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={()=>setStage("form")}>
            <img src={bonusLogo} alt="BonusFatto" className="h- w-auto" />
            <span className="font-extrabold text- tracking-tight">BonusFatto.it</span>
            <span className="hidden sm:inline text- bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold ml-2">7904 comuni</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setStage("blog")} className="h- px-4 rounded- bg-slate-900 text-white font-bold text- hover:bg-black">📚 Magazine</button>
            <button onClick={()=>setStage("form")} className="hidden sm:flex h- px-4 rounded- bg-amber-400 text-slate-900 font-bold text- hover:bg-amber-500">Calcola Bonus →</button>
          </div>
        </div>
      </header>

      {stage==="form" && (
        <div className="max-w- mx-auto px-4 sm:px-6 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-full px-3 py-1 text- font-bold text-amber-800"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Aggiornato Set 2026 • Tutti i comuni italiani</div>
              <h1 className="mt-4 text- md:text- font-extrabold leading-[0.95] tracking-tight">Scopri tutti i bonus con il tuo <span className="text-amber-500">ISEE 2026</span></h1>
              <p className="mt-3 text- text-slate-600">TARI scontata fino 100%, Luce/Gas/Acqua 250€ automatici, Assegno Unico, Nido, Voucher Scuola. Calcolo in 30 secondi per {comuneLabel}.</p>
              <div className="mt-6 rounded- bg-white border border-slate-200 p-5 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text- font-bold uppercase text-slate-600">Regione</label><select value={regione} onChange={e=>{setRegione(e.target.value); const provs=PROVINCE_PER_REGIONE[e.target.value]; if(provs) setProvincia(provs[0]);}} className="mt-1 w-full h- rounded- border border-slate-200 px-3">{REGIONI.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label className="text- font-bold uppercase text-slate-600">Provincia</label><select value={provincia} onChange={e=>setProvincia(e.target.value)} className="mt-1 w-full h- rounded- border border-slate-200 px-3">{(PROVINCE_PER_REGIONE[regione]||[provincia]).map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                </div>
                <div className="mt-4"><label className="text- font-bold uppercase text-slate-600">Comune (digita)</label><input value={comuneQuery} onChange={e=>{setComuneQuery(e.target.value); setShowDropdown(true);}} onFocus={()=>setShowDropdown(true)} placeholder="Es. Costarainera, Torino, Roma..." className="mt-1 w-full h- rounded- border border-slate-200 px-3" />
                  {showDropdown && (<div className="mt-2 max-h- overflow-auto rounded- border border-slate-200 bg-white">{loadingComuni? <div className="p-3 text-">Carico comuni...</div> : comuniFiltrati.map(c=>(<div key={c.nome+c.provincia} onClick={()=>{setSelectedComune(c); setComuneQuery(c.nome); setShowDropdown(false);}} className="px-3 py-2 hover:bg-amber-50 cursor-pointer text- flex justify-between"><span>{c.nome}</span><span className="text-slate-400">{c.provincia}</span></div>))}</div>)}
                  {selectedComune && <div className="mt-2 text- bg-emerald-50 border border-emerald-200 rounded- p-2">✅ Selezionato: <b>{selectedComune.nome}</b> ({selectedComune.provincia}) – TARI media {mediaTari}€</div>}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text- font-bold uppercase text-slate-600">ISEE 2026 €</label><input value={iseeInput} onChange={e=>setIseeInput(e.target.value.replace(/[^0-9]/g,""))} placeholder="Es. 15000" className="mt-1 w-full h- rounded- border border-slate-200 px-3" /></div>
                  <div><label className="text- font-bold uppercase text-slate-600">Figli a carico</label><select value={figli} onChange={e=>setFigli(parseInt(e.target.value))} className="mt-1 w-full h- rounded- border border-slate-200 px-3">{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                  <div><label className="text- font-bold uppercase text-slate-600">TARI annua € (opz)</label><input value={tariInput} onChange={e=>setTariInput(e.target.value.replace(/[^0-9]/g,""))} placeholder="Es. 350" className="mt-1 w-full h- rounded- border border-slate-200 px-3" /></div>
                </div>
                <div className="mt-3 text- p-3 rounded- bg-slate-50 border">{tariInfo.msg}</div>
                <button onClick={()=>setStage("teaser")} disabled={!isee} className="mt-5 w-full h- rounded- bg-slate-900 text-white font-extrabold text- disabled:opacity-50 hover:bg-black">Vedi bonus per {comuneLabel} →</button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded- bg-gradient-to-br from-amber-300 to-orange-400 p-6 text-slate-900 shadow-lg">
                <img src={sunLogo} alt="sole" className="w- h- drop-shadow" />
                <div className="mt-4 font-extrabold text- leading-[1.1]">Risparmia fino a 5.000€/anno con ISEE</div>
                <div className="mt-2 text- opacity-80">TARI, luce, gas, acqua, assegno unico, nido, voucher scuola – tutto in un report.</div>
                <div className="mt-4 flex flex-wrap gap-2 text- font-bold"><span className="bg-white/80 rounded-full px-3 py-1">7904 comuni</span><span className="bg-white/80 rounded-full px-3 py-1">ARERA verificato</span><span className="bg-white/80 rounded-full px-3 py-1">Modello email</span></div>
              </div>
              <div className="rounded- border bg-white p-4 shadow-sm">
                <div className="font-bold text-">⏰ Scadenze live</div>
                <div className="mt-3 space-y-3 text-">
                  <div className="flex justify-between items-center"><span>Roma 28/02/26</span><Badge info={countdownRoma} /></div>
                  <div className="flex justify-between items-center"><span>Fiumicino 16/03/26</span><Badge info={countdownFiumicino} /></div>
                  <div className="flex justify-between items-center"><span>Voucher Piemonte 06/26</span><Badge info={countdownVoucher} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage==="teaser" && (
        <div ref={teaserRef} className="max-w- mx-auto px-4 sm:px-6 md:px-8 py-8">
          <div className="rounded- bg-white border p-6 shadow-sm">
            <h2 className="text- font-extrabold">Risultato per {comuneLabel} – ISEE {isee}€</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded- bg-amber-50 border border-amber-200 p-4"><div className="text- font-bold uppercase text-amber-800">TARI stimata</div><div className="text- font-extrabold">{tariInfo.percent}% → ~{tariInfo.risparmioStima}€</div><div className="text- text-slate-600 mt-1">{tariInfo.msg}</div></div>
              <div className="rounded- bg-blue-50 border border-blue-200 p-4"><div className="text- font-bold uppercase text-blue-700">Luce/Gas/Acqua</div><div className="text- font-extrabold">~{bonus.lucegas}€/anno</div><div className="text- text-slate-600 mt-1">Bonus sociale automatico ARERA</div></div>
              <div className="rounded- bg-violet-50 border border-violet-200 p-4"><div className="text- font-bold uppercase text-violet-700">Totale bonus famiglia</div><div className="text- font-extrabold">~{bonus.totale}€/anno</div><div className="text- text-slate-600 mt-1">Include assegno unico, nido, voucher</div></div>
            </div>
            <button onClick={()=>setStage("checkout")} className="mt-6 w-full md:w-auto h- px-6 rounded- bg-slate-900 text-white font-bold hover:bg-black">Sblocca report completo 4,99€ →</button>
            <button onClick={()=>setStage("form")} className="mt-3 ml-0 md:ml-3 h- px-6 rounded- border font-bold">← Modifica dati</button>
          </div>
        </div>
      )}

      {stage==="checkout" && (
        <div className="max-w- mx-auto px-4 py-8">
          <div className="rounded- bg-white border p-6 shadow-sm">
            <h2 className="text- font-extrabold">Checkout – Report {comuneLabel}</h2>
            <div className="mt-4 text-">Report completo + modello email pronta + checklist documenti.</div>
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-"><input type="checkbox" checked={pdfModels} onChange={e=>setPdfModels(e.target.checked)} /> + Modello PDF editabile (+2€)</label>
              <label className="flex items-center gap-2 text-"><input type="checkbox" checked={alert2026} onChange={e=>setAlert2026(e.target.checked)} /> + Alert scadenza 2026 (+9,90€)</label>
              <label className="flex items-center gap-2 text-"><input type="checkbox" checked={alert2027} onChange={e=>setAlert2027(e.target.checked)} /> + Alert scadenza 2027 (+9,90€)</label>
            </div>
            <div className="mt-4 font-bold">Totale: {totaleCheckout.toFixed(2)}€</div>
            <button onClick={()=>setStage("result")} className="mt-4 w-full h- rounded- bg-amber-400 font-extrabold hover:bg-amber-500">Paga con Stripe (simulato) →</button>
          </div>
        </div>
      )}

      {stage==="result" && (
        <div ref={resultRef} className="max-w- mx-auto px-4 py-8">
          <div className="rounded- bg-white border p-6 shadow-sm">
            <h2 className="text- font-extrabold">Report {comuneLabel} – Pronto!</h2>
            <div className="mt-4 text-">Hai sbloccato report completo. Totale bonus stimato {bonus.totale}€/anno. TARI {tariInfo.percent}% (~{tariInfo.risparmioStima}€) + Bollette {bonus.lucegas}€.</div>
            <div className="mt-6 rounded- border-2 border-violet-300 bg-violet-50 p-4">
              <div className="flex justify-between"><div className="font-extrabold">📧 Modello email pronta</div><button onClick={handleCopy} className={`h- px-4 rounded- font-bold text- ${copied?"bg-emerald-600 text-white":"bg-slate-900 text-white"}`}>{copied?"✅ Copiato!":"📋 Copia"}</button></div>
              <textarea id="email-textarea" readOnly value={emailModello} className="mt-3 w-full min-h- rounded- border p-3 text- font-mono" />
            </div>
            <button onClick={()=>setStage("form")} className="mt-6 h- px-6 rounded- border font-bold">← Nuovo calcolo</button>
            <button onClick={()=>setStage("blog")} className="mt-6 ml-3 h- px-6 rounded- bg-slate-900 text-white font-bold">📚 Vai al Magazine →</button>
          </div>
        </div>
      )}

      {stage==="blog" && (
        <div className="max-w- mx-auto px-4 sm:px-6 md:px-8 py-8">
          <h1 className="text- font-extrabold tracking-tight">Magazine BonusFatto.it</h1>
          <p className="text- text-slate-600 mt-2 max-w-">Guide pratiche su ISEE, TARI, Bonus Luce/Gas, Voucher Scuola e tutti i bonus 2026. Articoli verificati con fonti ARERA, INPS, Comuni.</p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_ARTICLES.map(a=>(
              <article key={a.slug} onClick={()=>{setSelectedSlug(a.slug); setStage("article"); window.scrollTo({top:0,behavior:"smooth"});}} className="group cursor-pointer rounded- border border-slate-200 bg-white overflow-hidden hover:shadow-xl transition">
                <div className="h- overflow-hidden"><img src={a.img} alt={a.titolo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /></div>
                <div className="p-5"><div className="flex items-center gap-2 text-"><span className="bg-slate-900 text-white px-2 py-1 rounded-full font-bold">{a.categoria}</span><span className="text-slate-500">{a.data} • {a.lettura}</span></div><h3 className="mt-3 font-extrabold text- leading-[1.3] group-hover:text-violet-700">{a.titolo}</h3><p className="mt-2 text- text-slate-600 line-clamp-2">{a.excerpt}</p><div className="mt-4 text- font-bold text-violet-600">Leggi guida →</div></div>
              </article>
            ))}
          </div>
        </div>
      )}

      {stage==="article" && selectedArticle && (
        <div className="max-w- mx-auto px-4 sm:px-6 md:px-8 py-8">
          <button onClick={()=>setStage("blog")} className="mb-6 text- font-bold text-slate-600 hover:text-slate-900">← Torna al Magazine</button>
          <div className="flex flex-wrap gap-2 mb-4"><span className="bg-slate-900 text-white px-3 py-1 rounded-full text- font-bold">{selectedArticle.categoria}</span><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-">{selectedArticle.data} • {selectedArticle.lettura}</span></div>
          <h1 className="text- md:text- font-extrabold leading-[1.1]">{selectedArticle.titolo}</h1>
          <p className="mt-4 text- text-slate-600">{selectedArticle.excerpt}</p>
          <img src={selectedArticle.img} alt={selectedArticle.titolo} className="mt-6 w-full rounded- border" />
          <div className="mt-8 prose prose-slate max-w-none text- leading-[1.7] [&>h2]:text- [&>h2]:font-extrabold [&>h2]:mt-8" dangerouslySetInnerHTML={{__html: selectedArticle.contenuto}} />
          <div className="mt-10 rounded- bg-slate-900 text-white p-6 flex flex-col md:flex-row gap-4 justify-between"><div><div className="font-bold">Serve calcolo personalizzato?</div><div className="text- text-white/70">Calcoliamo sconto TARI reale + bonus</div></div><button onClick={()=>setStage("form")} className="h- px-6 rounded- bg-white text-slate-900 font-bold">Calcola bonus →</button></div>
        </div>
      )}

      <div className="max-w- mx-auto px-4 pb-12 mt-8 text-center text- text-slate-400">BonusFatto.it – 7904 comuni • Tutti i bonus 2026 • Magazine SEO • ARERA INPS verificato</div>
    </div>
  );
}
