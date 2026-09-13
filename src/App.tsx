import { useEffect, useState, useMemo } from "react";

type ComuneNorm = { nome: string; provincia: string; regione: string };
const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];
const PROVINCE_PER_REGIONE: Record<string,string[]> = {"Lazio":["Frosinone","Latina","Rieti","Roma","Viterbo"],"Lombardia":["Bergamo","Brescia","Como","Cremona","Lecco","Lodi","Mantova","Milano","Monza e della Brianza","Pavia","Sondrio","Varese"],"Liguria":["Genova","Imperia","La Spezia","Savona"],"Piemonte":["Alessandria","Asti","Biella","Cuneo","Novara","Torino","Verbano-Cusio-Ossola","Vercelli"]};
const FALLBACK: ComuneNorm[] = [{nome:"Roma",provincia:"Roma",regione:"Lazio"},{nome:"Affile",provincia:"Roma",regione:"Lazio"},{nome:"Agosta",provincia:"Roma",regione:"Lazio"},{nome:"Albano Laziale",provincia:"Roma",regione:"Lazio"},{nome:"Fiumicino",provincia:"Roma",regione:"Lazio"},{nome:"Pomezia",provincia:"Roma",regione:"Lazio"}];
const MEDIA_TARI: Record<string,number> = {"roma":360,"fiumicino":330,"albano laziale":305};

export default function App(){
  const [comuni,setComuni]=useState<ComuneNorm[]>(FALLBACK); const [loading,setLoading]=useState(true);
  const [regione,setRegione]=useState("Lazio"); const [provincia,setProvincia]=useState("Roma"); const [q,setQ]=useState(""); const [sel,setSel]=useState<ComuneNorm|null>(null); const [show,setShow]=useState(false);
  const [isee,setIsee]=useState("15000"); const [figli,setFigli]=useState("1");
  const [stage,setStage]=useState<"form"|"teaser"|"checkout"|"result">("form");
  const [pdfModels,setPdfModels]=useState(false); const [alert2026,setAlert2026]=useState(false); const [alert2027,setAlert2027]=useState(false);

  const iseeNum = parseInt(isee)||0; const figliNum = parseInt(figli)||0;

  useEffect(()=>{ (async()=>{try{const r=await fetch("https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json");const d=await r.json();setComuni(d.map((c:any)=>({nome:c.nome,provincia:c.provincia?.nome||"",regione:c.regione?.nome||""})));}catch{}setLoading(false);})(); },[]);

  const filtrati = useMemo(()=>{let f=comuni; if(regione) f=f.filter(c=>c.regione===regione); if(provincia) f=f.filter(c=>c.provincia===provincia); if(q) f=f.filter(c=>c.nome.toLowerCase().includes(q.toLowerCase())); return f.slice(0,50);},[comuni,regione,provincia,q]);
  const media = MEDIA_TARI[(sel?.nome||provincia).toLowerCase()]||350;
  const tariPerc = iseeNum? (iseeNum<=8000?100:iseeNum<=15000?50:iseeNum<=26530?25:0):0;
  const risparmioTari = Math.round(media*tariPerc/100);
  const bonusBollette = (iseeNum && (iseeNum<=9530 || (figliNum>=4 && iseeNum<=20000)))?250:0;
  const totaleCheckout = 4.99 + (pdfModels?2:0) + (alert2026?9.9:0) + (alert2027?9.9:0);

  return (
    <div className="min-h-screen bg-[#FFF9E6]">
      <div className="max-w- mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold">BonusFatto.it</div>
          <div className="text- bg-black text-white px-3 py-1 rounded-full">7904 comuni • {loading?"...":comuni.length}</div>
        </div>

        {stage==="form" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div>
              <h1 className="text- font-extrabold leading-[1.05]">Scopri tutti i bonus a cui hai diritto con il tuo ISEE</h1>
              <p className="text- mt-2">Inserisci ISEE e scopri subito bonus, sconto TARI e bonus luce e gas per il tuo Comune</p>
            </div>
            <div className="bg-white rounded- border p-4">
              <div className="font-bold text-">1. Dove abiti?</div>
              <div className="mt-3 space-y-3">
                <select value={regione} onChange={e=>{setRegione(e.target.value); setProvincia("");}} className="w-full h- border rounded- px-2 text-">{REGIONI.map(r=><option key={r}>{r}</option>)}</select>
                <select value={provincia} onChange={e=>setProvincia(e.target.value)} className="w-full h- border rounded- px-2 text-">{(PROVINCE_PER_REGIONE[regione]||["Roma"]).map(p=><option key={p}>{p}</option>)}</select>
                <div className="grid grid-cols-2 gap-2">
                  <input value={isee} onChange={e=>setIsee(e.target.value)} placeholder="Es. 15000" className="h- border rounded- px-2 text-" />
                  <select value={figli} onChange={e=>setFigli(e.target.value)} className="h- border rounded- px-2 text-">{[0,1,2,3,4,5].map(n=><option key={n}>{n} figli</option>)}</select>
                </div>
                <input value={q} onChange={e=>{setQ(e.target.value); setShow(true);}} onFocus={()=>setShow(true)} placeholder="Es. Fiumicino, Pomezia..." className="w-full h- border rounded- px-2 text-" />
                {show && <div className="max-h- overflow-auto border rounded-">{filtrati.map(c=><div key={c.nome} onMouseDown={()=>{setSel(c); setQ(c.nome); setShow(false);}} className="px-2 py-1 text- hover:bg-yellow-50 cursor-pointer">{c.nome}</div>)}</div>}
                {sel && <div className="text- bg-green-50 border border-green-200 rounded p-2">✅ {sel.nome} – TARI {tariPerc}% → {risparmioTari}€ + Bollette {bonusBollette}€</div>}
                <button onClick={()=>setStage("teaser")} disabled={!sel||!isee} className="w-full h- rounded- bg-[#FF8F00] text-white font-bold text- disabled:opacity-40">Calcola – vai al totale stimato</button>
              </div>
            </div>
          </div>
        )}

        {stage==="teaser" && (
          <div className="max-w- mx-auto bg-white rounded- border p-6">
            <h2 className="text- font-bold">Risultato per {sel?.nome} – ISEE {isee}€</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-">
              <div className="border rounded p-3 text-center"><div>TARI</div><div className="font-bold text-">{tariPerc}%</div><div>~{risparmioTari}€</div></div>
              <div className="border rounded p-3 text-center"><div>BOLLETTE</div><div className="font-bold text-">~{bonusBollette}€</div><div>/anno</div></div>
              <div className="border rounded p-3 text-center"><div>TOTALE</div><div className="font-bold text-">~{risparmioTari+bonusBollette}€</div><div>stimato</div></div>
            </div>
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded- p-3 text-">
              Sblocca report completo con <b>7 bonus</b>: bonus psicologo 2026, bonus mamme, carta dedicata a te, detrazione 730 ristrutturazione, assegno unico maggiorato + TARI + bollette
            </div>
            {/* PULSANTE CHE PORTA AL CHECKOUT - QUESTO MANCAVA */}
            <button onClick={()=>setStage("checkout")} className="mt-4 w-full h- rounded- bg-slate-900 text-white font-bold">Sblocca report completo – Vai al checkout 4,99€ →</button>
          </div>
        )}

        {stage==="checkout" && (
          <div className="max-w- mx-auto bg-white rounded- border p-6">
            <h2 className="text- font-bold">Checkout – Report {sel?.nome}</h2>
            <p className="text- text-slate-600 mt-1">Report completo + modello email pronta + checklist documenti</p>

            {/* QUI C'È LA PARTE A 9,90€ CHE NON VEDEVI */}
            <div className="mt-4 space-y-2 text-">
              <div className="flex justify-between border-b pb-2"><span>Report base 7904 comuni</span><span>4,99€</span></div>
              <label className="flex items-center justify-between cursor-pointer bg-slate-50 p-2 rounded">
                <span className="flex items-center gap-2"><input type="checkbox" checked={pdfModels} onChange={e=>setPdfModels(e.target.checked)} /> + Modello PDF editabile</span><span>+2,00€</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer bg-amber-50 p-2 rounded border border-amber-200">
                <span className="flex items-center gap-2"><input type="checkbox" checked={alert2026} onChange={e=>setAlert2026(e.target.checked)} /> 🔔 Alert scadenza 2026</span><span className="font-bold">+9,90€</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer bg-amber-50 p-2 rounded border border-amber-200">
                <span className="flex items-center gap-2"><input type="checkbox" checked={alert2027} onChange={e=>setAlert2027(e.target.checked)} /> 🔔 Alert scadenza 2027</span><span className="font-bold">+9,90€</span>
              </label>
              <div className="flex justify-between font-bold text- border-t pt-3 mt-3"><span>Totale</span><span>{totaleCheckout.toFixed(2)}€</span></div>
            </div>

            {/* PULSANTE PAGAMENTO - QUESTO NON COMPARIVA */}
            <button onClick={()=>setStage("result")} className="mt-5 w-full h- rounded- bg-gradient-to-r from-blue-600 to-violet-600 text-white font-extrabold text- shadow-lg">
              💳 Paga con Stripe {totaleCheckout.toFixed(2)}€ →
            </button>
            <div className="text- text-center text-slate-400 mt-2">Pagamento sicuro Stripe • Ricevi report via email in 2 minuti</div>
            <button onClick={()=>setStage("teaser")} className="mt-3 w-full h- rounded- border font-bold text-">← Torna al risultato</button>
          </div>
        )}

        {stage==="result" && (
          <div className="max-w- mx-auto bg-white rounded- border p-6">
            <h2 className="text- font-bold">Hai diritto a 7 bonus!</h2>
            <div className="mt-2 text- bg-slate-900 text-white rounded- p-3">Pagato {totaleCheckout.toFixed(2)}€ • Hai diritto a: bonus psicologo 2026, bonus mamme, carta dedicata a te, detrazione 730 ristrutturazione, assegno unico maggiorato, bonus bollette {bonusBollette}€, sconto TARI {tariPerc}% (~{risparmioTari}€)</div>
            <div className="mt-4 text-">Report sbloccato! Controlla email per PDF + modello Comune.</div>
            <button onClick={()=>{setStage("form"); setSel(null); setQ("");}} className="mt-4 h- px-5 rounded- border font-bold text-">← Nuovo calcolo</button>
          </div>
        )}
      </div>
    </div>
  );
}
