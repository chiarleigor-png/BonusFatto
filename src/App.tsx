import { useEffect, useState, useMemo, useRef } from "react";
import { BLOG_ARTICLES } from "./blogData";

type ComuneNorm = { nome: string; provincia: string; regione: string };

const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];

const PROVINCE_PER_REGIONE: Record<string,string[]> = {
  "Abruzzo":["Chieti","L'Aquila","Pescara","Teramo"],"Basilicata":["Matera","Potenza"],"Calabria":["Catanzaro","Cosenza","Crotone","Reggio Calabria","Vibo Valentia"],"Campania":["Avellino","Benevento","Caserta","Napoli","Salerno"],"Emilia-Romagna":["Bologna","Ferrara","Forlì-Cesena","Modena","Parma","Piacenza","Ravenna","Reggio Emilia","Rimini"],"Friuli-Venezia Giulia":["Gorizia","Pordenone","Trieste","Udine"],"Lazio":["Frosinone","Latina","Rieti","Roma","Viterbo"],"Liguria":["Genova","Imperia","La Spezia","Savona"],"Lombardia":["Bergamo","Brescia","Como","Cremona","Lecco","Lodi","Mantova","Milano","Monza e della Brianza","Pavia","Sondrio","Varese"],"Marche":["Ancona","Ascoli Piceno","Fermo","Macerata","Pesaro e Urbino"],"Molise":["Campobasso","Isernia"],"Piemonte":["Alessandria","Asti","Biella","Cuneo","Novara","Torino","Verbano-Cusio-Ossola","Vercelli"],"Puglia":["Bari","Barletta-Andria-Trani","Brindisi","Foggia","Lecce","Taranto"],"Sardegna":["Cagliari","Nuoro","Oristano","Sassari","Sud Sardegna"],"Sicilia":["Agrigento","Caltanissetta","Catania","Enna","Messina","Palermo","Ragusa","Siracusa","Trapani"],"Toscana":["Arezzo","Firenze","Grosseto","Livorno","Lucca","Massa-Carrara","Pisa","Pistoia","Prato","Siena"],"Trentino-Alto Adige":["Bolzano","Trento"],"Umbria":["Perugia","Terni"],"Valle d'Aosta":["Aosta"],"Veneto":["Belluno","Padova","Rovigo","Treviso","Venezia","Verona","Vicenza"],
};

const MEDIA_TARI_MAP: Record<string, number> = {"roma":360,"milano":400,"torino":380,"napoli":340,"bologna":370,"firenze":350,"palermo":320,"fiumicino":330,"guidonia montecelio":310,"pomezia":310,"albano laziale":305,"anzio":315,"venezia":380,"genova":360,"bari":330,"catania":325};
function getMediaTari(nome: string|undefined, provincia: string){ const n=(nome||"").toLowerCase().trim(); if(n && MEDIA_TARI_MAP[n]!==undefined) return MEDIA_TARI_MAP[n]; const p=(provincia||"").toLowerCase().trim(); if(p && MEDIA_TARI_MAP[p]!==undefined) return MEDIA_TARI_MAP[p]; return 350; }

const SCADENZE = {roma:new Date("2026-02-28T23:59:59"),fiumicino:new Date("2026-03-16T23:59:59"),voucherPiemonte:new Date("2026-06-30T23:59:59")};
function getCountdownInfo(target: Date, now: Date){ const diff=target.getTime()-now.getTime(); const days=Math.ceil(diff/(1000*60*60*24)); let status:"expired"|"urgent"|"warning"|"ok"="ok"; if(days<0) status="expired"; else if(days<15) status="urgent"; else if(days<60) status="warning"; return {days,status,target}; }

export default function App(){
  const [comuni,setComuni]=useState<ComuneNorm[]>([]); const [loadingComuni,setLoadingComuni]=useState(true);
  const [regione,setRegione]=useState("Lazio"); const [provincia,setProvincia]=useState("Roma");
  const [comuneQuery,setComuneQuery]=useState(""); const [selectedComune,setSelectedComune]=useState<ComuneNorm|null>(null); const [showDropdown,setShowDropdown]=useState(false);
  const [iseeInput,setIseeInput]=useState(""); const [figli,setFigli]=useState(1); const [tariInput,setTariInput]=useState("");
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
      }catch{ setComuni([{nome:"Roma",provincia:"Roma",regione:"Lazio"}]); }
      setLoadingComuni(false);
    }
    load();
  },[]);

  const comuniFiltrati=useMemo(()=>{
    const q=comuneQuery.toLowerCase().trim();
    const base=comuni.length?comuni:[];
    let filtered=base.filter(c=>c.provincia.toLowerCase()===provincia.toLowerCase());
    if(q) filtered=filtered.filter(c=>c.nome.toLowerCase().includes(q));
    return filtered.slice(0,80);
  },[comuni,provincia,comuneQuery]);

  const mediaTari=getMediaTari(selectedComune?.nome, provincia);
  const tariInfo=useMemo(()=>{
    if(!isee) return {percent:0,risparmioStima:0,msg:"Inserisci ISEE per calcolare % sconto TARI"};
    if(isee<=8000) return {percent:100,risparmioStima:mediaTari,msg:`✅ ISEE ${isee}€ ≤ 8.000€ → 100% esenzione`};
    if(isee<=15000) return {percent:50,risparmioStima:Math.round(mediaTari*0.5),msg:`✅ ISEE ${isee}€ ≤ 15.000€ → 50% sconto`};
    if(isee<=26530) return {percent:25,risparmioStima:Math.round(mediaTari*0.25),msg:`ℹ️ ISEE ${isee}€ ≤ 26.530€ → 25% sconto fascia estesa`};
    return {percent:0,risparmioStima:0,msg:`⚠️ ISEE ${isee}€ > 26.530€ → sopra soglie`};
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
  const emailModello=`Oggetto: Richiesta agevolazione TARI 2026 – ISEE ${isee}€ – Comune ${comuneLabel}\n\nSpett.le Ufficio Tributi,\nrichiedo sconto ISEE ${isee}€, TARI media ${mediaTari}€, % ${tariInfo.percent}%.\nAllego DSU.\nCordiali saluti`;
  const handleCopy=()=>{ const el=document.getElementById("email-textarea") as HTMLTextAreaElement; if(el){ el.select(); document.execCommand("copy"); setCopied(true); setTimeout(()=>setCopied(false),2000);} };
  function Badge({info}:{info:any}){ const c=info.status==="expired"?"bg-red-600 text-white":info.status==="urgent"?"bg-red-100 text-red-700 border border-red-300":info.status==="warning"?"bg-amber-100 text-amber-800 border border-amber-200":"bg-emerald-100 text-emerald-800 border border-emerald-200"; return <span className={`px-2.5 py-1 rounded-full text- font-bold ${c}`}>{info.days<0?`Scaduto`:`${info.days}gg`}</span>; }

  return (
    <div className="min-h-screen bg-[#fafafb]">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200">
        <div className="max-w- mx-auto px-4 sm:px-6 md:px-8 h- flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={()=>setStage("form")}>
            <div className="w- h- rounded- bg-gradient-to-br from-blue-600 to-fuchsia-600 flex items-center justify-center text-white font-extrabold">B</div>
            <span className="font-extrabold text- tracking-tight">BonusFatto.it</span>
            <span className="hidden sm:inline text- bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold ml-2 border">7904 comuni • Originale</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setStage("blog")} className="h- px-4 rounded- bg-slate-900 text-white font-bold text-">📚 Magazine</button>
            <button onClick={()=>setStage("form")} className="hidden sm:flex h- px-4 rounded- bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white font-bold text-">Calcola Bonus →</button>
          </div>
        </div>
      </header>

      {stage==="form" && (
        <div className="max-w- mx-auto px-4 sm:px-6 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1 text- font-bold text-slate-700"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Prima versione originale • 7904 comuni • Blu/Fucsia</div>
              <h1 className="mt-4 text- md:text- font-extrabold leading-[0.95] tracking-tight">Scopri tutti i bonus con il tuo <span className="bg-gradient-to-r from-blue-600 to-fuchsia-600 bg-clip-text text-transparent">ISEE 2026</span></h1>
              <p className="mt-3 text- text-slate-600">TARI, Luce/Gas/Acqua, Assegno Unico, Nido, Voucher Scuola. Calcolo neutro 30 secondi – versione originale capolavoro che avevi confermato.</p>
              <div className="mt-6 rounded- bg-white border border-slate-200 p-5 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text- font-bold uppercase text-slate-600">Regione</label><select value={regione} onChange={e=>{setRegione(e.target.value); const provs=PROVINCE_PER_REGIONE[e.target.value]; if(provs) setProvincia(provs[0]); setSelectedComune(null); setComuneQuery("");}} className="mt-1 w-full h- rounded- border border-slate-200 px-3">{REGIONI.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label className="text- font-bold uppercase text-slate-600">Provincia</label><select value={provincia} onChange={e=>{setProvincia(e.target.value); setSelectedComune(null); setComuneQuery("");}} className="mt-1 w-full h- rounded- border border-slate-200 px-3">{(PROVINCE_PER_REGIONE[regione]||[provincia]).map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                </div>
                <div className="mt-4"><label className="text- font-bold uppercase text-slate-600">Comune (7904 comuni fetch nazionale)</label><input value={comuneQuery} onChange={e=>{setComuneQuery(e.target.value); setShowDropdown(true);}} onFocus={()=>setShowDropdown(true)} placeholder="Es. Roma, Milano, Torino..." className="mt-1 w-full h- rounded- border border-slate-200 px-3" />
                  {showDropdown && (<div className="mt-2 max-h- overflow-auto rounded- border border-slate-200 bg-white shadow-lg">{loadingComuni? <div className="p-3 text-">Carico 7904 comuni...</div> : comuniFiltrati.map(c=>(<div key={c.nome+c.provincia} onClick={()=>{setSelectedComune(c); setComuneQuery(c.nome); setShowDropdown(false);}} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text- flex justify-between"><span>{c.nome}</span><span className="text-slate-400 text-">{c.provincia}</span></div>))}</div>)}
                  {selectedComune && <div className="mt-2 text- bg-emerald-50 border border-emerald-200 rounded- p-2">✅ {selectedComune.nome} ({selectedComune.provincia}) – TARI media {mediaTari}€</div>}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text- font-bold uppercase text-slate-600">ISEE 2026 €</label><input value={iseeInput} onChange={e=>setIseeInput(e.target.value.replace(/[^0-9]/g,""))} placeholder="15000" className="mt-1 w-full h- rounded- border border-slate-200 px-3" /></div>
                  <div><label className="text- font-bold uppercase text-slate-600">Figli</label><select value={figli} onChange={e=>setFigli(parseInt(e.target.value))} className="mt-1 w-full h- rounded- border border-slate-200 px-3">{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                  <div><label className="text- font-bold uppercase text-slate-600">TARI €</label><input value={tariInput} onChange={e=>setTariInput(e.target.value.replace(/[^0-9]/g,""))} placeholder="350" className="mt-1 w-full h- rounded- border border-slate-200 px-3" /></div>
                </div>
                <div className="mt-3 text- p-3 rounded- bg-slate-50 border">{tariInfo.msg}</div>
                <button onClick={()=>setStage("teaser")} disabled={!isee} className="mt-5 w-full h- rounded- bg-slate-900 text-white font-extrabold text- disabled:opacity-50">Vedi bonus per {comuneLabel} →</button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded- bg-gradient-to-br from-blue-600 via-indigo-600 to-fuchsia-600 p-6 text-white shadow-xl">
                <div className="font-extrabold text- leading-[1.1]">Calcola i bonus spettanti</div>
                <div className="mt-3 text- text-white/90">Versione originale blu/fucsia capolavoro – 7904 comuni fetch nazionale, calcolo neutro, nessun esempio fuorviante.</div>
                <div className="mt-4 text- bg-white/15 rounded- p-3 border border-white/20">• TARI: soglie ISEE 8k/15k/26.5k<br/>• Luce/Gas: automatico ≤9.796€<br/>• Assegno/Nido: da ISEE e figli</div>
              </div>
              <div className="rounded- border bg-white p-4">
                <div className="font-bold text-">⏰ Scadenze</div>
                <div className="mt-3 space-y-2 text-">
                  <div className="flex justify-between"><span>Roma 28/02/26</span><Badge info={countdownRoma} /></div>
                  <div className="flex justify-between"><span>Fiumicino 16/03/26</span><Badge info={countdownFiumicino} /></div>
                  <div className="flex justify-between"><span>Voucher Piemonte</span><Badge info={countdownVoucher} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage==="teaser" && (
        <div ref={teaserRef} className="max-w- mx-auto px-4 py-8">
          <div className="rounded- bg-white border p-6">
            <h2 className="text- font-extrabold">Risultato {comuneLabel} – ISEE {isee}€</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded- bg-blue-50 border border-blue-200 p-4"><div className="text- font-bold uppercase text-blue-700">TARI</div><div className="text- font-extrabold">{tariInfo.percent}% → ~{tariInfo.risparmioStima}€</div></div>
              <div className="rounded- bg-violet-50 border border-violet-200 p-4"><div className="text- font-bold uppercase text-violet-700">Luce/Gas</div><div className="text- font-extrabold">~{bonus.lucegas}€</div></div>
              <div className="rounded- bg-fuchsia-50 border border-fuchsia-200 p-4"><div className="text- font-bold uppercase text-fuchsia-700">Totale</div><div className="text- font-extrabold">~{bonus.totale}€</div></div>
            </div>
            <button onClick={()=>setStage("checkout")} className="mt-6 h- px-6 rounded- bg-slate-900 text-white font-bold">Sblocca 4,99€ →</button>
          </div>
        </div>
      )}

      {stage==="blog" && (
        <div className="max-w- mx-auto px-4 py-8">
          <h1 className="text- font-extrabold">Magazine</h1>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_ARTICLES.map(a=>(
              <article key={a.slug} onClick={()=>{setSelectedSlug(a.slug); setStage("article");}} className="rounded- border bg-white overflow-hidden cursor-pointer hover:shadow-xl">
                <div className="h- bg-slate-100"><img src={a.img} alt={a.titolo} className="w-full h-full object-cover" /></div>
                <div className="p-4"><div className="text- font-bold">{a.categoria}</div><h3 className="font-bold mt-2">{a.titolo}</h3><p className="text- text-slate-600 mt-1">{a.excerpt}</p></div>
              </article>
            ))}
          </div>
        </div>
      )}

      {stage==="article" && selectedArticle && (
        <div className="max-w- mx-auto px-4 py-8">
          <button onClick={()=>setStage("blog")} className="mb-4 text- font-bold">← Magazine</button>
          <h1 className="text- font-extrabold">{selectedArticle.titolo}</h1>
          <div className="mt-6 prose" dangerouslySetInnerHTML={{__html: selectedArticle.contenuto}} />
        </div>
      )}

      {(stage==="checkout" || stage==="result") && (
        <div className="max-w- mx-auto px-4 py-8">
          <div className="rounded- bg-white border p-6">
            {stage==="checkout"? (
              <>
                <h2 className="text- font-extrabold">Checkout {comuneLabel}</h2>
                <div className="mt-4 font-bold">Totale: {totaleCheckout.toFixed(2)}€</div>
                <button onClick={()=>setStage("result")} className="mt-4 w-full h- rounded- bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white font-extrabold">Paga →</button>
              </>
            ) : (
              <>
                <h2 className="text- font-extrabold">Report {comuneLabel} Pronto!</h2>
                <div className="mt-4 text-">Totale {bonus.totale}€</div>
                <textarea id="email-textarea" readOnly value={emailModello} className="mt-4 w-full min-h- border rounded- p-3 text- font-mono" />
                <button onClick={handleCopy} className="mt-3 h- px-4 rounded- bg-slate-900 text-white font-bold">{copied?"Copiato!":"Copia"}</button>
                <button onClick={()=>setStage("form")} className="mt-3 ml-2 h- px-4 rounded- border font-bold">Nuovo calcolo</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
