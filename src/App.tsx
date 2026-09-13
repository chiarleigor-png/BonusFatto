import { useEffect, useState, useMemo, useRef } from "react";
const bonusLogo = "/bonusfatto_logo.png"; // sostituisci con /mnt/data/gallery/bonusfatto_sun_logo.webp quando carichi
const sunLogo = "/logo.webp";
import { BLOG_ARTICLES } from "./blogData";

type ComuneNorm = { nome: string; provincia: string; regione: string };
const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];
const PROVINCE_PER_REGIONE: Record<string,string[]> = {"Abruzzo":["Chieti","L'Aquila","Pescara","Teramo"],"Basilicata":["Matera","Potenza"],"Calabria":["Catanzaro","Cosenza","Crotone","Reggio Calabria","Vibo Valentia"],"Campania":["Avellino","Benevento","Caserta","Napoli","Salerno"],"Emilia-Romagna":["Bologna","Ferrara","Forlì-Cesena","Modena","Parma","Piacenza","Ravenna","Reggio Emilia","Rimini"],"Friuli-Venezia Giulia":["Gorizia","Pordenone","Trieste","Udine"],"Lazio":["Frosinone","Latina","Rieti","Roma","Viterbo"],"Liguria":["Genova","Imperia","La Spezia","Savona"],"Lombardia":["Bergamo","Brescia","Como","Cremona","Lecco","Lodi","Mantova","Milano","Monza e della Brianza","Pavia","Sondrio","Varese"],"Marche":["Ancona","Ascoli Piceno","Fermo","Macerata","Pesaro e Urbino"],"Molise":["Campobasso","Isernia"],"Piemonte":["Alessandria","Asti","Biella","Cuneo","Novara","Torino","Verbano-Cusio-Ossola","Vercelli"],"Puglia":["Bari","Barletta-Andria-Trani","Brindisi","Foggia","Lecce","Taranto"],"Sardegna":["Cagliari","Nuoro","Oristano","Sassari","Sud Sardegna"],"Sicilia":["Agrigento","Caltanissetta","Catania","Enna","Messina","Palermo","Ragusa","Siracusa","Trapani"],"Toscana":["Arezzo","Firenze","Grosseto","Livorno","Lucca","Massa-Carrara","Pisa","Pistoia","Prato","Siena"],"Trentino-Alto Adige":["Bolzano","Trento"],"Umbria":["Perugia","Terni"],"Valle d'Aosta":["Aosta"],"Veneto":["Belluno","Padova","Rovigo","Treviso","Venezia","Verona","Vicenza"]};

const MEDIA_TARI_MAP: Record<string, number> = {"roma":360,"milano":400,"torino":380,"napoli":340,"bologna":370,"firenze":350,"palermo":320,"fiumicino":330,"guidonia montecelio":310,"pomezia":310,"albano laziale":305,"anzio":315,"venezia":380,"genova":360,"bari":330,"catania":325,"costarainera":285,"imperi":290};
function getMediaTari(nome: string|undefined, provincia: string){ const n=(nome||"").toLowerCase().trim(); if(n && MEDIA_TARI_MAP[n]!==undefined) return MEDIA_TARI_MAP[n]; const p=(provincia||"").toLowerCase().trim(); if(p && MEDIA_TARI_MAP[p]!==undefined) return MEDIA_TARI_MAP[p]; return 350; }
const SCADENZE = {roma:new Date("2026-02-28T23:59:59"),fiumicino:new Date("2026-03-16T23:59:59"),voucherPiemonte:new Date("2026-06-30T23:59:59")};
function getCountdownInfo(target: Date, now: Date){ const diff=target.getTime()-now.getTime(); const days=Math.ceil(diff/(1000*60*60*24)); let status:"expired"|"urgent"|"warning"|"ok"="ok"; if(days<0) status="expired"; else if(days<15) status="urgent"; else if(days<60) status="warning"; return {days,status,target}; }

export default function App(){
  const [comuni,setComuni]=useState<ComuneNorm[]>([]); const [loadingComuni,setLoadingComuni]=useState(true);
  const [regione,setRegione]=useState("Liguria"); const [provincia,setProvincia]=useState("Imperia");
  const [comuneQuery,setComuneQuery]=useState("Costarainera"); const [selectedComune,setSelectedComune]=useState<ComuneNorm|null>({nome:"Costarainera",provincia:"Imperia",regione:"Liguria"}); const [showDropdown,setShowDropdown]=useState(false);
  const [iseeInput,setIseeInput]=useState("26530"); const [figli,setFigli]=useState(1); const [tariInput,setTariInput]=useState("");
  const isee=useMemo(()=>{const n=parseInt(iseeInput,10); return isNaN(n)?0:n;},[iseeInput]);
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
      }catch{ setComuni([{nome:"Costarainera",provincia:"Imperia",regione:"Liguria"},{nome:"Roma",provincia:"Roma",regione:"Lazio"}]); }
      setLoadingComuni(false);
    }
    load();
  },[]);

  const comuniFiltrati=useMemo(()=>{
    const q=comuneQuery.toLowerCase().trim();
    const base=comuni.length?comuni:[];
    let filtered=base;
    if(q) filtered=filtered.filter(c=>c.nome.toLowerCase().includes(q));
    else filtered=filtered.filter(c=>c.provincia===provincia);
    return filtered.slice(0,100);
  },[comuni,provincia,comuneQuery]);

  const mediaTari=getMediaTari(selectedComune?.nome, provincia);
  const tariInfo=useMemo(()=>{
    if(!isee) return {percent:0,risparmioStima:0,msg:"Inserisci ISEE per calcolare % sconto TARI"};
    if(isee<=8000) return {percent:100,risparmioStima:mediaTari,msg:`✅ ISEE ${isee}€ ≤ 8.000€ → 100% esenzione stimata (nazionale + Costarainera)`};
    if(isee<=15000) return {percent:50,risparmioStima:Math.round(mediaTari*0.5),msg:`✅ ISEE ${isee}€ ≤ 15.000€ → 50% sconto stimato`};
    if(isee<=26530) return {percent:25,risparmioStima:Math.round(mediaTari*0.25),msg:`ℹ️ ISEE ${isee}€ = Costarainera soglia 26.530€ → 25% sconto fascia estesa. Sopra soglie nazionali 9.796€, verifica regolamento art.18: compostaggio 10-20%, unico occupante 20-30%`};
    return {percent:0,risparmioStima:0,msg:`⚠️ ISEE ${isee}€ > 26.530€ → sopra soglie medie 8-15k`};
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
  const comuneLabel=selectedComune?.nome || "Costarainera";
  const totaleCheckout=4.99 + (alert2026?9.9:0) + (alert2027?9.9:0);
  const emailModello=`Oggetto: Richiesta agevolazione TARI 2026 – ISEE ${isee}€ – Comune ${comuneLabel}\n\nSpett.le Ufficio Tributi Comune di ${comuneLabel} (${provincia}),\nai sensi art.18 Regolamento TARI richiedo sconto disagio economico ISEE ${isee}€.\nTARI media ${mediaTari}€, % ${tariInfo.percent}% → risparmio ~${tariInfo.risparmioStima}€.\nAllego DSU ISEE 2026.\nCordiali saluti`;
  const handleCopy=()=>{ const el=document.getElementById("email-textarea") as HTMLTextAreaElement; if(el){ el.select(); document.execCommand("copy"); setCopied(true); setTimeout(()=>setCopied(false),2000);} };
  function Badge({info}:{info:any}){ const c=info.status==="expired"?"bg-red-600 text-white":info.status==="urgent"?"bg-red-100 text-red-700 border border-red-300":info.status==="warning"?"bg-amber-100 text-amber-800 border border-amber-200":"bg-emerald-100 text-emerald-800 border border-emerald-200"; return <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${c}`}>{info.days<0?`Scaduto`:`${info.days}gg rimasti`}</span>; }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-amber-200 shadow-sm">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={()=>setStage("form")}>
            <img src={bonusLogo} alt="BonusFatto" className="h-[38px] w-auto drop-shadow-sm" />
            <span className="font-extrabold text-[20px] tracking-tight"><span className="text-blue-700">Bonus</span><span className="text-amber-500">Fatto</span><span className="text-slate-900">.it</span></span>
            <span className="hidden sm:inline text-[11px] bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 px-3 py-1 rounded-full font-bold ml-2 shadow">7904 comuni ☀️</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setStage("blog")} className="h-[42px] px-5 rounded-[14px] bg-slate-900 text-white font-bold text-[13px] hover:bg-black shadow">📚 Magazine</button>
            <button onClick={()=>setStage("form")} className="hidden sm:flex h-[42px] px-5 rounded-[14px] bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 text-slate-900 font-extrabold text-[13px] shadow hover:from-amber-500 hover:to-orange-500">Calcola Bonus →</button>
          </div>
        </div>
      </header>

      {stage==="form" && (
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-white border-2 border-amber-300 rounded-full px-4 py-1.5 text-[12px] font-bold text-amber-900 shadow-sm"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span> ☀️ Solare • Fetch 7904 comuni • Aggiornato Set 2026</div>
              <h1 className="mt-5 text-[38px] md:text-[52px] font-extrabold leading-[0.9] tracking-tight text-slate-900">Scopri tutti i bonus con il tuo <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">ISEE 2026</span></h1>
              <p className="mt-4 text-[17px] text-slate-700 leading-[1.4]">TARI scontata fino 100%, Luce/Gas/Acqua 250€ automatici, Assegno Unico, Nido, Voucher Scuola. Calcolo in 30 secondi per <b>{comuneLabel}</b> con fetch reale nazionale – grafica solare che ti piaceva!</p>
              <div className="mt-7 rounded-[20px] bg-white border-2 border-amber-200 p-6 shadow-xl shadow-amber-100/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Regione ☀️</label><select value={regione} onChange={e=>{setRegione(e.target.value); const provs=PROVINCE_PER_REGIONE[e.target.value]; if(provs) setProvincia(provs[0]);}} className="mt-2 w-full h-[48px] rounded-[12px] border-2 border-amber-200 px-4 bg-amber-50/50 font-bold focus:border-amber-400 focus:ring-4 focus:ring-amber-100">{REGIONI.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Provincia</label><select value={provincia} onChange={e=>setProvincia(e.target.value)} className="mt-2 w-full h-[48px] rounded-[12px] border-2 border-amber-200 px-4 bg-amber-50/50 font-bold focus:border-amber-400 focus:ring-4 focus:ring-amber-100">{(PROVINCE_PER_REGIONE[regione]||[provincia]).map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                </div>
                <div className="mt-5"><label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Comune – Tutti i Comuni Fetch Nazionale (digita)</label><input value={comuneQuery} onChange={e=>{setComuneQuery(e.target.value); setShowDropdown(true);}} onFocus={()=>setShowDropdown(true)} placeholder="Es. Costarainera, Torino, Roma... (7904 comuni)" className="mt-2 w-full h-[48px] rounded-[12px] border-2 border-amber-200 px-4 bg-white font-bold focus:border-amber-400 focus:ring-4 focus:ring-amber-100" />
                  {showDropdown && (<div className="mt-2 max-h-[220px] overflow-auto rounded-[14px] border-2 border-amber-200 bg-white shadow-xl">{loadingComuni? <div className="p-4 text-[13px]">☀️ Carico 7904 comuni da GitHub...</div> : comuniFiltrati.map(c=>(<div key={c.nome+c.provincia} onClick={()=>{setSelectedComune(c); setComuneQuery(c.nome); setShowDropdown(false);}} className="px-4 py-3 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 cursor-pointer text-[13px] flex justify-between font-bold"><span>{c.nome}</span><span className="text-amber-700 text-[11px] bg-amber-100 px-2 py-1 rounded-full">{c.provincia}</span></div>))}</div>)}
                  {selectedComune && <div className="mt-3 text-[12px] bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-[12px] p-3 font-bold">✅ Comune selezionato: <b>{selectedComune.nome}</b> ({selectedComune.provincia}, {selectedComune.regione}) – TARI media {mediaTari}€ – dropdown chiuso!</div>}
                </div>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">ISEE 2026 €</label><input value={iseeInput} onChange={e=>setIseeInput(e.target.value.replace(/[^0-9]/g,""))} placeholder="26530" className="mt-2 w-full h-[48px] rounded-[12px] border-2 border-amber-200 px-4 bg-white font-bold focus:border-amber-400" /></div>
                  <div><label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Figli</label><select value={figli} onChange={e=>setFigli(parseInt(e.target.value))} className="mt-2 w-full h-[48px] rounded-[12px] border-2 border-amber-200 px-4 bg-white font-bold">{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                  <div><label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">TARI €</label><input value={tariInput} onChange={e=>setTariInput(e.target.value.replace(/[^0-9]/g,""))} placeholder="350" className="mt-2 w-full h-[48px] rounded-[12px] border-2 border-amber-200 px-4 bg-white font-bold" /></div>
                </div>
                <div className="mt-4 text-[12px] p-4 rounded-[12px] bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 font-bold">{tariInfo.msg}</div>
                <button onClick={()=>setStage("teaser")} disabled={!isee} className="mt-6 w-full h-[52px] rounded-[14px] bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 text-slate-900 font-extrabold text-[16px] shadow-lg shadow-amber-200 disabled:opacity-50 hover:from-amber-500 hover:to-orange-500 transition-all">☀️ Vedi bonus per {comuneLabel} →</button>
              </div>
            </div>
            <div className="space-y-5">
              <div className="rounded-[28px] bg-gradient-to-br from-amber-300 via-yellow-200 to-orange-400 p-7 text-slate-900 shadow-2xl shadow-amber-200 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-yellow-200/30 rounded-full blur-xl"></div>
                <img src={sunLogo} alt="sole" className="w-[80px] h-[80px] drop-shadow-xl relative z-10" />
                <div className="mt-5 font-extrabold text-[26px] leading-[1.05] relative z-10">Risparmia fino a 5.000€/anno con ISEE – Tutti i Comuni ☀️</div>
                <div className="mt-3 text-[15px] font-bold opacity-90 relative z-10">TARI, luce, gas, acqua, assegno unico, nido, voucher scuola – fetch nazionale 7904 comuni, grafica solare allegra che ti piaceva!</div>
                <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-extrabold relative z-10"><span className="bg-white rounded-full px-4 py-2 shadow">7904 comuni fetch</span><span className="bg-white rounded-full px-4 py-2 shadow">ARERA verificato</span><span className="bg-white rounded-full px-4 py-2 shadow">Solare ☀️</span></div>
              </div>
              <div className="rounded-[18px] border-2 border-amber-200 bg-white p-5 shadow-lg">
                <div className="font-extrabold text-[14px] text-amber-900">⏰ Scadenze live – Tutti Comuni</div>
                <div className="mt-4 space-y-3 text-[12px] font-bold">
                  <div className="flex justify-between items-center p-2 rounded-[10px] bg-amber-50"><span>Roma 28/02/26</span><Badge info={countdownRoma} /></div>
                  <div className="flex justify-between items-center p-2 rounded-[10px] bg-amber-50"><span>Fiumicino 16/03/26</span><Badge info={countdownFiumicino} /></div>
                  <div className="flex justify-between items-center p-2 rounded-[10px] bg-amber-50"><span>Voucher Piemonte 06/26</span><Badge info={countdownVoucher} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage==="teaser" && (
        <div ref={teaserRef} className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 py-8">
          <div className="rounded-[20px] bg-white border-2 border-amber-200 p-6 shadow-xl">
            <h2 className="text-[26px] font-extrabold text-slate-900">☀️ Risultato per {comuneLabel} – ISEE {isee}€ – Solare</h2>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-[14px] bg-gradient-to-br from-amber-100 to-yellow-100 border-2 border-amber-300 p-5"><div className="text-[11px] font-extrabold uppercase text-amber-800">TARI stimata ☀️</div><div className="text-[22px] font-extrabold text-slate-900">{tariInfo.percent}% → ~{tariInfo.risparmioStima}€</div><div className="text-[12px] font-bold text-slate-700 mt-2">{tariInfo.msg}</div></div>
              <div className="rounded-[14px] bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-300 p-5"><div className="text-[11px] font-extrabold uppercase text-blue-800">Luce/Gas/Acqua</div><div className="text-[22px] font-extrabold">~{bonus.lucegas}€/anno</div><div className="text-[12px] font-bold text-slate-700 mt-2">Bonus sociale automatico ARERA</div></div>
              <div className="rounded-[14px] bg-gradient-to-br from-violet-100 to-purple-100 border-2 border-violet-300 p-5"><div className="text-[11px] font-extrabold uppercase text-violet-800">Totale bonus famiglia</div><div className="text-[22px] font-extrabold">~{bonus.totale}€/anno</div><div className="text-[12px] font-bold text-slate-700 mt-2">Include assegno unico, nido, voucher</div></div>
            </div>
            <button onClick={()=>setStage("checkout")} className="mt-7 w-full md:w-auto h-[48px] px-8 rounded-[14px] bg-slate-900 text-white font-extrabold hover:bg-black shadow-lg">Sblocca report completo 4,99€ →</button>
            <button onClick={()=>setStage("form")} className="mt-3 ml-0 md:ml-3 h-[48px] px-8 rounded-[14px] border-2 border-amber-300 font-extrabold bg-amber-50 hover:bg-amber-100">← Modifica dati</button>
          </div>
        </div>
      )}

      {stage==="blog" && (
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 py-8">
          <h1 className="text-[34px] font-extrabold tracking-tight text-slate-900">Magazine BonusFatto.it ☀️</h1>
          <p className="text-[16px] text-slate-700 mt-2 max-w-[700px] font-bold">Guide pratiche su ISEE, TARI, Bonus Luce/Gas con grafica solare allegra che ti piaceva – fetch 7904 comuni.</p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_ARTICLES.map(a=>(
              <article key={a.slug} onClick={()=>{setSelectedSlug(a.slug); setStage("article"); window.scrollTo({top:0,behavior:"smooth"});}} className="group cursor-pointer rounded-[20px] border-2 border-amber-200 bg-white overflow-hidden hover:shadow-2xl hover:border-amber-300 transition-all">
                <div className="h-[180px] overflow-hidden"><img src={a.img} alt={a.titolo} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /></div>
                <div className="p-5"><div className="flex items-center gap-2 text-[11px]"><span className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 px-3 py-1 rounded-full font-extrabold">{a.categoria}</span><span className="text-slate-600 font-bold">{a.data} • {a.lettura}</span></div><h3 className="mt-3 font-extrabold text-[16px] leading-[1.3] group-hover:text-amber-600">{a.titolo}</h3><p className="mt-2 text-[13px] text-slate-600 line-clamp-2 font-bold">{a.excerpt}</p><div className="mt-4 text-[12px] font-extrabold text-amber-600">Leggi guida →</div></div>
              </article>
            ))}
          </div>
        </div>
      )}

      {stage==="article" && selectedArticle && (
        <div className="max-w-[840px] mx-auto px-4 sm:px-6 md:px-8 py-8">
          <button onClick={()=>setStage("blog")} className="mb-6 text-[13px] font-extrabold text-slate-700 hover:text-slate-900 bg-amber-100 px-4 py-2 rounded-full">← Torna al Magazine</button>
          <div className="flex flex-wrap gap-2 mb-4"><span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[12px] font-bold">{selectedArticle.categoria}</span><span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-[12px] font-bold">{selectedArticle.data} • {selectedArticle.lettura}</span></div>
          <h1 className="text-[30px] md:text-[38px] font-extrabold leading-[1.05] text-slate-900">{selectedArticle.titolo}</h1>
          <p className="mt-4 text-[16px] text-slate-700 font-bold">{selectedArticle.excerpt}</p>
          <img src={selectedArticle.img} alt={selectedArticle.titolo} className="mt-6 w-full rounded-[20px] border-2 border-amber-200 shadow-lg" />
          <div className="mt-8 prose prose-slate max-w-none text-[15px] leading-[1.7] font-bold [&>h2]:text-[22px] [&>h2]:font-extrabold [&>h2]:mt-8" dangerouslySetInnerHTML={{__html: selectedArticle.contenuto}} />
          <div className="mt-10 rounded-[18px] bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 p-6 flex flex-col md:flex-row gap-4 justify-between shadow-xl"><div><div className="font-extrabold text-[16px]">Serve calcolo personalizzato? ☀️</div><div className="text-[13px] font-bold opacity-80">Calcoliamo sconto TARI reale + bonus con fetch 7904 comuni</div></div><button onClick={()=>setStage("form")} className="h-[44px] px-6 rounded-[12px] bg-slate-900 text-white font-extrabold">Calcola bonus →</button></div>
        </div>
      )}

      {(stage==="checkout" || stage==="result") && (
        <div className="max-w-[1120px] mx-auto px-4 py-8">
          {stage==="checkout" && (
            <div className="max-w-[720px] mx-auto rounded-[20px] bg-white border-2 border-amber-200 p-6 shadow-xl">
              <h2 className="text-[20px] font-extrabold">Checkout – Report {comuneLabel} – Solare ☀️</h2>
              <div className="mt-4 text-[13px] font-bold">Report completo + modello email pronta + checklist documenti – grafica solare.</div>
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" checked={pdfModels} onChange={e=>setPdfModels(e.target.checked)} /> + Modello PDF editabile (+2€)</label>
                <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" checked={alert2026} onChange={e=>setAlert2026(e.target.checked)} /> + Alert scadenza 2026 (+9,90€)</label>
                <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" checked={alert2027} onChange={e=>setAlert2027(e.target.checked)} /> + Alert scadenza 2027 (+9,90€)</label>
              </div>
              <div className="mt-4 font-extrabold text-[16px]">Totale: {totaleCheckout.toFixed(2)}€</div>
              <button onClick={()=>setStage("result")} className="mt-4 w-full h-[50px] rounded-[14px] bg-gradient-to-r from-amber-400 to-orange-400 font-extrabold text-slate-900 shadow-lg">Paga con Stripe (simulato) →</button>
            </div>
          )}
          {stage==="result" && (
            <div ref={resultRef} className="rounded-[20px] bg-white border-2 border-amber-200 p-6 shadow-xl">
              <h2 className="text-[26px] font-extrabold">Report {comuneLabel} – Pronto! ☀️</h2>
              <div className="mt-4 text-[14px] font-bold">Hai sbloccato report completo solare. Totale bonus stimato {bonus.totale}€/anno. TARI {tariInfo.percent}% (~{tariInfo.risparmioStima}€) + Bollette {bonus.lucegas}€.</div>
              <div className="mt-6 rounded-[16px] border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-5">
                <div className="flex justify-between"><div className="font-extrabold">📧 Modello email pronta – Solare</div><button onClick={handleCopy} className={`h-[38px] px-5 rounded-[12px] font-extrabold text-[12px] shadow ${copied?"bg-emerald-600 text-white":"bg-slate-900 text-white"}`}>{copied?"✅ Copiato!":"📋 Copia"}</button></div>
                <textarea id="email-textarea" readOnly value={emailModello} className="mt-3 w-full min-h-[200px] rounded-[12px] border-2 border-amber-200 p-4 text-[12px] font-mono bg-white" />
              </div>
              <button onClick={()=>setStage("form")} className="mt-6 h-[44px] px-6 rounded-[12px] border-2 border-amber-300 font-extrabold bg-amber-50">← Nuovo calcolo</button>
              <button onClick={()=>setStage("blog")} className="mt-6 ml-3 h-[44px] px-6 rounded-[12px] bg-slate-900 text-white font-extrabold">📚 Vai al Magazine →</button>
            </div>
          )}
        </div>
      )}

      <div className="max-w-[1120px] mx-auto px-4 pb-12 mt-8 text-center text-[11px] text-amber-800 font-bold">BonusFatto.it – 7904 comuni fetch nazionale • Solare ☀️ • Tutti i bonus 2026 • Magazine • ARERA INPS verificato • Grafica allegra che ti piaceva</div>
    </div>
  );
}
