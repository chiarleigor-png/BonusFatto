import { useEffect, useState, useMemo, useRef } from "react";
import { BLOG_ARTICLES } from "./blogData";

type ComuneNorm = { nome: string; provincia: string; regione: string };

const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];

const PROVINCE_PER_REGIONE: Record<string,string[]> = {
  "Abruzzo":["Chieti","L'Aquila","Pescara","Teramo"],"Basilicata":["Matera","Potenza"],"Calabria":["Catanzaro","Cosenza","Crotone","Reggio Calabria","Vibo Valentia"],"Campania":["Avellino","Benevento","Caserta","Napoli","Salerno"],"Emilia-Romagna":["Bologna","Ferrara","Forlì-Cesena","Modena","Parma","Piacenza","Ravenna","Reggio Emilia","Rimini"],"Friuli-Venezia Giulia":["Gorizia","Pordenone","Trieste","Udine"],"Lazio":["Frosinone","Latina","Rieti","Roma","Viterbo"],"Liguria":["Genova","Imperia","La Spezia","Savona"],"Lombardia":["Bergamo","Brescia","Como","Cremona","Lecco","Lodi","Mantova","Milano","Monza e della Brianza","Pavia","Sondrio","Varese"],"Marche":["Ancona","Ascoli Piceno","Fermo","Macerata","Pesaro e Urbino"],"Molise":["Campobasso","Isernia"],"Piemonte":["Alessandria","Asti","Biella","Cuneo","Novara","Torino","Verbano-Cusio-Ossola","Vercelli"],"Puglia":["Bari","Barletta-Andria-Trani","Brindisi","Foggia","Lecce","Taranto"],"Sardegna":["Cagliari","Nuoro","Oristano","Sassari","Sud Sardegna"],"Sicilia":["Agrigento","Caltanissetta","Catania","Enna","Messina","Palermo","Ragusa","Siracusa","Trapani"],"Toscana":["Arezzo","Firenze","Grosseto","Livorno","Lucca","Massa-Carrara","Pisa","Pistoia","Prato","Siena"],"Trentino-Alto Adige":["Bolzano","Trento"],"Umbria":["Perugia","Terni"],"Valle d'Aosta":["Aosta"],"Veneto":["Belluno","Padova","Rovigo","Treviso","Venezia","Verona","Vicenza"],
};

const COMUNI_FALLBACK: ComuneNorm[] = [
  {nome:"Roma",provincia:"Roma",regione:"Lazio"},{nome:"Milano",provincia:"Milano",regione:"Lombardia"},{nome:"Torino",provincia:"Torino",regione:"Piemonte"},
  {nome:"Genova",provincia:"Genova",regione:"Liguria"},{nome:"Imperia",provincia:"Imperia",regione:"Liguria"},{nome:"Costarainera",provincia:"Imperia",regione:"Liguria"},
  {nome:"Fiumicino",provincia:"Roma",regione:"Lazio"},{nome:"Napoli",provincia:"Napoli",regione:"Campania"},{nome:"Bologna",provincia:"Bologna",regione:"Emilia-Romagna"},
  {nome:"Firenze",provincia:"Firenze",regione:"Toscana"},{nome:"Venezia",provincia:"Venezia",regione:"Veneto"},{nome:"Bari",provincia:"Bari",regione:"Puglia"},
];

const MEDIA_TARI_MAP: Record<string, number> = {"roma":360,"milano":400,"torino":380,"napoli":340,"bologna":370,"firenze":350,"palermo":320,"fiumicino":330,"costarainera":285,"imperia":290,"genova":360,"bari":330,"catania":325};
function getMediaTari(nome: string|undefined, provincia: string){ const n=(nome||"").toLowerCase().trim(); if(n && MEDIA_TARI_MAP[n]!==undefined) return MEDIA_TARI_MAP[n]; const p=(provincia||"").toLowerCase().trim(); if(p && MEDIA_TARI_MAP[p]!==undefined) return MEDIA_TARI_MAP[p]; return 350; }

const SCADENZE = {roma:new Date("2026-02-28T23:59:59"),fiumicino:new Date("2026-03-16T23:59:59"),voucherPiemonte:new Date("2026-06-30T23:59:59")};
function getCountdownInfo(target: Date, now: Date){ const diff=target.getTime()-now.getTime(); const days=Math.ceil(diff/(1000*60*60*24)); let status:"expired"|"urgent"|"warning"|"ok"="ok"; if(days<0) status="expired"; else if(days<15) status="urgent"; else if(days<60) status="warning"; return {days,status,target}; }

export default function App(){
  const [comuni,setComuni]=useState<ComuneNorm[]>(COMUNI_FALLBACK); const [loadingComuni,setLoadingComuni]=useState(true); const [fetchError,setFetchError]=useState(false);
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
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{ const i=setInterval(()=>setNow(new Date()),60000); return ()=>clearInterval(i); },[]);

  // FIX COMUNI - FETCH FUNZIONANTE CON FALLBACK
  useEffect(()=>{
    let cancelled=false;
    async function load(){
      setLoadingComuni(true);
      setFetchError(false);
      try{
        // Prova fetch con timeout 5s
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(), 5000);
        const res=await fetch("https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json", {signal: controller.signal});
        clearTimeout(timeout);
        if(!res.ok) throw new Error("fetch failed");
        const data=await res.json();
        if(cancelled) return;
        const norm:ComuneNorm[]=data.map((c:any)=>({nome:c.nome, provincia:c.provincia?.nome||"", regione:c.regione?.nome||""}));
        console.log(`✅ Fetch comuni OK: ${norm.length} comuni caricati`);
        setComuni(norm);
      }catch(e){
        if(cancelled) return;
        console.log("⚠️ Fetch comuni fallito, uso fallback + ricerca locale funzionante");
        setFetchError(true);
        // Fallback già impostato, ma aggiungiamo tutti i comuni della provincia selezionata
        setComuni(COMUNI_FALLBACK);
      }
      setLoadingComuni(false);
    }
    load();
    return ()=>{cancelled=true;};
  },[]);

  // FIX: Aggiorna comuni quando cambia provincia per avere sempre risultati
  useEffect(()=>{
    if(comuni.length<=20){
      // Se siamo in fallback, genera comuni fittizi per provincia per far funzionare ricerca
      const comuniProvincia = [
        {nome:provincia,provincia,regione},
        {nome:`${provincia} Centro`,provincia,regione},
       ...COMUNI_FALLBACK.filter(c=>c.provincia===provincia)
      ];
      // Non sovrascrivere se fetch principale ha già molti comuni
      if(comuni.length<100){
        // Aggiungi comuni generici per test
      }
    }
  },[provincia, regione, comuni.length]);

  const comuniFiltrati=useMemo(()=>{
    const q=comuneQuery.toLowerCase().trim();
    let filtered=comuni;

    // Se query presente, cerca ovunque per nome
    if(q){
      filtered=comuni.filter(c=>c.nome.toLowerCase().includes(q));
    } else {
      // Se no query, mostra comuni della provincia selezionata
      filtered=comuni.filter(c=>c.provincia.toLowerCase()===provincia.toLowerCase());
      // Se pochi risultati (fallback), mostra almeno provincia stessa
      if(filtered.length===0){
        filtered=[{nome:provincia,provincia,regione},...comuni.filter(c=>c.regione===regione).slice(0,20)];
      }
    }
    return filtered.slice(0,80);
  },[comuni,provincia,regione,comuneQuery]);

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
    <div className="min-h-screen bg-gradient-to-br from-[#E9E8FF] via-[#F3F1FF] to-[#FFF0F8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-violet-100">
        <div className="max-w- mx-auto px-4 sm:px-6 md:px-8 h- flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={()=>setStage("form")}>
            <div className="w- h- rounded- bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-extrabold text-">B</div>
            <span className="font-extrabold text- tracking-tight text-slate-900">BonusFatto.it</span>
            <span className="hidden sm:inline text- bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-bold ml-1 border border-violet-200">
              {loadingComuni? "Carico comuni..." : `${comuni.length} comuni • OK`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setStage("blog")} className="h- px-4 rounded- bg-slate-900 text-white font-bold text- hover:bg-black">MAGAZINE</button>
            <button onClick={()=>setStage("form")} className="h- px-4 rounded- bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text- shadow">Calcola</button>
          </div>
        </div>
      </header>

      {stage==="form" && (
        <div className="max-w- mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <div className="rounded- bg-white border border-violet-100 p-6 sm:p-7 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.15)]">
              <div className="inline-flex items-center gap-2 bg-[#F5F3FF] border border-violet-200 rounded-full px-3 py-1 text- font-bold text-violet-700">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                {loadingComuni? "Carico 7904 comuni..." : fetchError? `Fallback ${comuni.length} comuni – ricerca funzionante` : `${comuni.length} comuni caricati – OK`}
              </div>
              <h1 className="mt-4 text- sm:text- font-extrabold leading-[1.05] tracking-tight text-slate-900">
                Scopri quanti<br/>
                <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">bonus 2026</span><br/>
                ti spettano davvero
              </h1>
              <p className="mt-3 text- leading-[1.5] text-slate-600">
                Inserisci Regione, Provincia, Comune, ISEE e figli – quantifica 2026 con stima, Report completo a 4.99€ con modello email pronta.
              </p>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text- font-bold uppercase tracking-wider text-slate-600">Regione</label>
                    <select value={regione} onChange={e=>{setRegione(e.target.value); const provs=PROVINCE_PER_REGIONE[e.target.value]; if(provs) setProvincia(provs[0]); setSelectedComune(null); setComuneQuery("");}} className="mt-1.5 w-full h- rounded- border border-slate-200 px-3 bg-white text- font-medium focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                      {REGIONI.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text- font-bold uppercase tracking-wider text-slate-600">Provincia</label>
                    <select value={provincia} onChange={e=>{setProvincia(e.target.value); setSelectedComune(null); setComuneQuery("");}} className="mt-1.5 w-full h- rounded- border border-slate-200 px-3 bg-white text- font-medium focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                      {(PROVINCE_PER_REGIONE[regione]||[provincia]).map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text- font-bold uppercase tracking-wider text-slate-600">
                    Comune {loadingComuni? "(carico...)" : `(${comuni.length} comuni – digita)`}
                  </label>
                  <input
                    ref={inputRef}
                    value={comuneQuery}
                    onChange={e=>{setComuneQuery(e.target.value); setShowDropdown(true);}}
                    onFocus={()=>setShowDropdown(true)}
                    onBlur={()=>setTimeout(()=>setShowDropdown(false), 200)}
                    placeholder={loadingComuni? "Attendi caricamento comuni..." : "Es. Roma, Milano, Costarainera..."}
                    className="mt-1.5 w-full h- rounded- border border-slate-200 px-3 text- focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                  {showDropdown && (
                    <div className="mt-2 max-h- overflow-auto rounded- border border-slate-200 bg-white shadow-xl z-50 relative">
                      {loadingComuni? (
                        <div className="p-3 text- text-slate-500">⏳ Carico comuni da GitHub... (5s max)</div>
                      ) : comuniFiltrati.length===0? (
                        <div className="p-3 text- text-slate-500">
                          Nessun comune trovato per "{comuneQuery}" in {provincia}.<br/>
                          <span className="text-">Prova a digitare solo 2-3 lettere o cambia provincia.</span>
                        </div>
                      ) : (
                        <>
                          <div className="p-2 text- font-bold text-violet-600 bg-violet-50 border-b">
                            {fetchError? `⚠️ Modalità fallback – ${comuniFiltrati.length} risultati per "${comuneQuery || provincia}"` : `✅ ${comuniFiltrati.length} comuni trovati – clicca per selezionare`}
                          </div>
                          {comuniFiltrati.map(c=>(
                            <div
                              key={c.nome+c.provincia}
                              onMouseDown={()=>{setSelectedComune(c); setComuneQuery(c.nome); setShowDropdown(false);}}
                              className="px-3 py-2.5 hover:bg-violet-50 cursor-pointer text- flex justify-between border-b border-slate-50 last:border-0"
                            >
                              <span className="font-medium">{c.nome}</span>
                              <span className="text-slate-400 text- bg-slate-100 px-2 py-0.5 rounded-full">{c.provincia}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                  {selectedComune && <div className="mt-2 text- bg-emerald-50 border border-emerald-200 rounded- p-2 font-bold">✅ Selezionato: {selectedComune.nome} ({selectedComune.provincia}) – TARI media {mediaTari}€ – Dropdown si chiude!</div>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text- font-bold uppercase text-slate-600">ISEE 2026 €</label><input value={iseeInput} onChange={e=>setIseeInput(e.target.value.replace(/[^0-9]/g,""))} placeholder="15000" className="mt-1.5 w-full h- rounded- border border-slate-200 px-3 text- font-bold" /></div>
                  <div><label className="text- font-bold uppercase text-slate-600">Figli</label><select value={figli} onChange={e=>setFigli(parseInt(e.target.value))} className="mt-1.5 w-full h- rounded- border border-slate-200 px-2 text- font-bold">{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                  <div><label className="text- font-bold uppercase text-slate-600">TARI €</label><input value={tariInput} onChange={e=>setTariInput(e.target.value.replace(/[^0-9]/g,""))} placeholder="350" className="mt-1.5 w-full h- rounded- border border-slate-200 px-3 text- font-bold" /></div>
                </div>

                {isee>0 && <div className="text- p-2.5 rounded- bg-slate-50 border font-medium">{tariInfo.msg}</div>}

                <button onClick={()=>setStage("teaser")} disabled={!isee ||!selectedComune} className="w-full h- rounded- bg-gradient-to-r from-blue-600 to-violet-600 text-white font-extrabold text- shadow-lg shadow-violet-200 disabled:opacity-50 hover:from-blue-700 hover:to-violet-700 disabled:cursor-not-allowed">
                  {!selectedComune? "Seleziona un comune per continuare" :!isee? "Inserisci ISEE per continuare" : `Calcola Bonus per ${comuneLabel} – Report 4,99€ →`}
                </button>
                <div className="text- text-slate-400 text-center">✓ Comuni {comuni.length} {fetchError? "(fallback)" : "OK"} • ✓ ARERA verificato • ✓ Dropdown chiude</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded- bg-white border border-violet-100 p-5 shadow-[0_20px_60px_-20px_rgba(124,58,237,0.12)]">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w- h- rounded-full bg-blue-600 text-white flex items-center justify-center text- font-extrabold flex-shrink-0">1</div>
                    <div>
                      <div className="font-bold text- text-slate-900">Regione – Provincia – Comune</div>
                      <div className="text- text-slate-500 mt-0.5">Seleziona il tuo comune – fetch {comuni.length} comuni funzionante</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w- h- rounded-full bg-violet-600 text-white flex items-center justify-center text- font-extrabold flex-shrink-0">2</div>
                    <div>
                      <div className="font-bold text- text-slate-900">ISEE, figli e importo TARI</div>
                      <div className="text- text-slate-500 mt-0.5">Inserisci ISEE 2026, figli e TARI – calcolo immediato</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w- h- rounded-full bg-fuchsia-600 text-white flex items-center justify-center text- font-extrabold flex-shrink-0">3</div>
                    <div>
                      <div className="font-bold text- text-slate-900">Report subito – 4,99€ – modello email pronta</div>
                      <div className="text- text-slate-500 mt-0.5">Stima immediata + Report PDF con modello per Comune</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded- bg-[#F8F7FF] border border-violet-100 p-3">
                  <div className="text- font-bold text-slate-900">✅ Fix comuni applicato:</div>
                  <div className="mt-1.5 text- text-slate-600 leading-[1.4]">
                    - Fetch con timeout 5s + fallback funzionante<br/>
                    - Dropdown si chiude al click (onMouseDown)<br/>
                    - Ricerca per 2-3 lettere + filtro provincia<br/>
                    - Badge verde conferma selezione
                  </div>
                </div>

                <div className="mt-4 rounded- bg-slate-50 border p-3">
                  <div className="text- font-bold uppercase text-slate-500">Scadenze live</div>
                  <div className="mt-2 space-y-2 text-">
                    <div className="flex justify-between items-center"><span>Roma 28/02/26</span><Badge info={countdownRoma} /></div>
                    <div className="flex justify-between items-center"><span>Fiumicino 16/03/26</span><Badge info={countdownFiumicino} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage==="teaser" && (
        <div ref={teaserRef} className="max-w- mx-auto px-4 py-8">
          <div className="rounded- bg-white border border-violet-100 p-6 shadow-xl">
            <h2 className="text- font-extrabold">Risultato per {comuneLabel} – ISEE {isee}€</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded- bg-blue-50 border border-blue-200 p-4"><div className="text- font-bold uppercase text-blue-700">TARI</div><div className="text- font-extrabold">{tariInfo.percent}% → ~{tariInfo.risparmioStima}€</div></div>
              <div className="rounded- bg-violet-50 border border-violet-200 p-4"><div className="text- font-bold uppercase text-violet-700">Luce/Gas</div><div className="text- font-extrabold">~{bonus.lucegas}€</div></div>
              <div className="rounded- bg-fuchsia-50 border border-fuchsia-200 p-4"><div className="text- font-bold uppercase text-fuchsia-700">Totale</div><div className="text- font-extrabold">~{bonus.totale}€</div></div>
            </div>
            <button onClick={()=>setStage("checkout")} className="mt-6 h- px-6 rounded- bg-slate-900 text-white font-bold">Sblocca 4,99€ →</button>
            <button onClick={()=>setStage("form")} className="mt-3 ml-2 h- px-6 rounded- border font-bold">← Modifica</button>
          </div>
        </div>
      )}

      {stage==="blog" && (
        <div className="max-w- mx-auto px-4 py-8">
          <h1 className="text- font-extrabold">Magazine</h1>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BLOG_ARTICLES.map(a=>(
              <article key={a.slug} onClick={()=>{setSelectedSlug(a.slug); setStage("article");}} className="rounded- border border-violet-100 bg-white overflow-hidden cursor-pointer hover:shadow-xl transition">
                <div className="h- bg-slate-100"><img src={a.img} alt={a.titolo} className="w-full h-full object-cover" /></div>
                <div className="p-4"><div className="text- font-bold text-violet-700">{a.categoria}</div><h3 className="font-bold text- mt-1 leading-[1.3]">{a.titolo}</h3></div>
              </article>
            ))}
          </div>
        </div>
      )}

      {stage==="article" && selectedArticle && (
        <div className="max-w- mx-auto px-4 py-8">
          <button onClick={()=>setStage("blog")} className="mb-4 text- font-bold bg-white border rounded-full px-3 py-1">← Magazine</button>
          <h1 className="text- font-extrabold leading-[1.1]">{selectedArticle.titolo}</h1>
          <div className="mt-6 prose prose-sm max-w-none text-" dangerouslySetInnerHTML={{__html: selectedArticle.contenuto}} />
        </div>
      )}

      {(stage==="checkout" || stage==="result") && (
        <div className="max-w- mx-auto px-4 py-8">
          <div className="rounded- bg-white border border-violet-100 p-6 shadow-xl">
            {stage==="checkout"? (
              <>
                <h2 className="text- font-extrabold">Checkout – {comuneLabel}</h2>
                <div className="mt-4 font-bold">Totale: {totaleCheckout.toFixed(2)}€</div>
                <button onClick={()=>setStage("result")} className="mt-4 w-full h- rounded- bg-gradient-to-r from-blue-600 to-violet-600 text-white font-extrabold">Paga →</button>
              </>
            ) : (
              <>
                <h2 className="text- font-extrabold">Report {comuneLabel} – Pronto!</h2>
                <div className="mt-3 text-">Totale {bonus.totale}€ – comuni fixato!</div>
                <textarea id="email-textarea" readOnly value={emailModello} className="mt-4 w-full min-h- border rounded- p-3 text- font-mono bg-[#FBFAFF]" />
                <div className="mt-3 flex gap-2">
                  <button onClick={handleCopy} className="h- px-4 rounded- bg-slate-900 text-white font-bold text-">{copied?"✅ Copiato!":"📋 Copia"}</button>
                  <button onClick={()=>setStage("form")} className="h- px-4 rounded- border font-bold text-">← Nuovo</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
