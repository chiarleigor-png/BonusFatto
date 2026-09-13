import { useEffect, useState, useMemo } from "react";

type ComuneNorm = { nome: string; provincia: string; regione: string };
const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];
const PROVINCE_PER_REGIONE: Record<string,string[]> = {"Lazio":["Frosinone","Latina","Rieti","Roma","Viterbo"],"Lombardia":["Bergamo","Brescia","Como","Cremona","Lecco","Lodi","Mantova","Milano","Monza e della Brianza","Pavia","Sondrio","Varese"],"Liguria":["Genova","Imperia","La Spezia","Savona"]};
const FALLBACK: ComuneNorm[] = [{nome:"Roma",provincia:"Roma",regione:"Lazio"},{nome:"Affile",provincia:"Roma",regione:"Lazio"},{nome:"Agosta",provincia:"Roma",regione:"Lazio"},{nome:"Albano Laziale",provincia:"Roma",regione:"Lazio"},{nome:"Fiumicino",provincia:"Roma",regione:"Lazio"},{nome:"Pomezia",provincia:"Roma",regione:"Lazio"}];
const MEDIA_TARI: Record<string,number> = {"roma":360,"fiumicino":330,"albano laziale":305,"affile":280};

export default function App(){
  const [comuni,setComuni]=useState<ComuneNorm[]>(FALLBACK); const [loading,setLoading]=useState(true);
  const [regione,setRegione]=useState("Lazio"); const [provincia,setProvincia]=useState("Roma"); const [q,setQ]=useState(""); const [sel,setSel]=useState<ComuneNorm|null>(null); const [show,setShow]=useState(false);
  const [isee,setIsee]=useState("15000"); const [figli,setFigli]=useState("1"); const [stage,setStage]=useState<"form"|"teaser"|"checkout"|"result">("form");
  const iseeNum = parseInt(isee)||0; const figliNum = parseInt(figli)||0;

  useEffect(()=>{ (async()=>{try{const r=await fetch("https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json");const d=await r.json();setComuni(d.map((c:any)=>({nome:c.nome,provincia:c.provincia?.nome||"",regione:c.regione?.nome||""})));}catch{}setLoading(false);})(); },[]);

  const filtrati = useMemo(()=>{let f=comuni; if(regione) f=f.filter(c=>c.regione===regione); if(provincia) f=f.filter(c=>c.provincia===provincia); if(q) f=f.filter(c=>c.nome.toLowerCase().includes(q.toLowerCase())); return f.slice(0,50);},[comuni,regione,provincia,q]);
  const media = MEDIA_TARI[(sel?.nome||provincia).toLowerCase()]||350;
  const tariPerc = iseeNum? (iseeNum<=8000?100:iseeNum<=15000?50:iseeNum<=26530?25:0):0;
  const risparmioTari = Math.round(media*tariPerc/100);
  const bonusBollette = (iseeNum && (iseeNum<=9530 || (figliNum>=4 && iseeNum<=20000)))?250:0;

  return (
    <div className="min-h-screen bg-[#FFF9E6]">
      <div className="max-w- mx-auto p-4">
        {stage==="form" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div>
              <h1 className="text- font-extrabold">Scopri tutti i bonus a cui hai diritto con il tuo ISEE</h1>
              <p className="text- mt-2">Inserisci ISEE e scopri subito bonus, sconto TARI e bonus luce e gas per il tuo Comune – 7904 comuni</p>
              <div className="mt-3 flex gap-2 text- font-bold">
                <span className="bg-white border px-2 py-1 rounded-full">1. Tutti i bonus ISEE</span>
                <span className="bg-white border px-2 py-1 rounded-full">2. Sconto TARI fino al 100%</span>
                <span className="bg-[#FFE082] border px-2 py-1 rounded-full">3. Bonus luce e gas ~250€/anno</span>
              </div>
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
                {show && <div className="max-h- overflow-auto border rounded-">{filtrati.map(c=><div key={c.nome} onMouseDown={()=>{setSel(c); setQ(c.nome); setShow(false);}} className="px-2 py-1 text- hover:bg-yellow-50 cursor-pointer">{c.nome} - {c.provincia}</div>)}</div>}
                {sel && <div className="text- bg-green-50 border border-green-200 rounded p-2">✅ {sel.nome} – TARI {tariPerc}% → {risparmioTari}€ + Bollette {bonusBollette}€</div>}
                {/* PULSANTE CALCOLA CHE PORTA AL TEASER */}
                <button onClick={()=>setStage("teaser")} disabled={!sel||!isee} className="w-full h- rounded- bg-[#FF8F00] text-white font-bold text- disabled:opacity-40">Calcola – vai al totale stimato</button>
              </div>
            </div>
          </div>
        )}

        {stage==="teaser" && (
          <div className="max-w- mx-auto bg-white rounded- border p-6">
            <h2 className="text- font-bold">Risultato per {sel?.nome} – ISEE {isee}€</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-">
              <div className="border rounded- p-3"><div className="text-">TARI</div><div className="font-bold">{tariPerc}% → ~{risparmioTari}€</div></div>
              <div className="border rounded- p-3"><div className="text-">BOLLETTE</div><div className="font-bold">~{bonusBollette}€/anno</div></div>
              <div className="border rounded- p-3"><div className="text-">TOTALE</div><div className="font-bold">~{risparmioTari+bonusBollette}€</div></div>
            </div>
            {/* QUI C'È IL PULSANTE CHECKOUT CHE MANCAVA */}
            <button onClick={()=>setStage("checkout")} className="mt-6 w-full h- rounded- bg-slate-900 text-white font-bold text-">Sblocca report completo – Checkout 4,99€ →</button>
            <button onClick={()=>setStage("form")} className="mt-3 w-full h- rounded- border font-bold text-">← Modifica dati</button>
          </div>
        )}

        {stage==="checkout" && (
          <div className="max-w- mx-auto bg-white rounded- border p-6">
            <h2 className="text- font-bold">Checkout – Report {sel?.nome}</h2>
            <p className="text- text-slate-600 mt-2">Report completo con tutti i 7 bonus: bonus psicologo 2026, bonus mamme, carta dedicata a te, detrazione 730 ristrutturazione, assegno unico maggiorato + TARI + bollette</p>
            <div className="mt-4 border rounded- p-3 text-">
              <div className="flex justify-between"><span>Report completo 4,99€</span><span>4,99€</span></div>
              <div className="flex justify-between font-bold mt-2 border-t pt-2"><span>Totale</span><span>4,99€</span></div>
            </div>
            {/* PULSANTE CHECKOUT STRIPE */}
            <button onClick={()=>setStage("result")} className="mt-4 w-full h- rounded- bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold">Paga con Stripe 4,99€ →</button>
            <button onClick={()=>setStage("teaser")} className="mt-3 w-full h- rounded- border font-bold text-">← Torna al risultato</button>
          </div>
        )}

        {stage==="result" && (
          <div className="max-w- mx-auto bg-white rounded- border p-6">
            <h2 className="text- font-bold">Hai diritto a 7 bonus!</h2>
            <div className="mt-3 text- bg-slate-900 text-white rounded- p-3">Hai diritto a 7 bonus: bonus psicologo 2026, bonus mamme, carta dedicata a te, detrazione 730 per ristrutturazione, assegno unico maggiorato, bonus bollette {bonusBollette}€, sconto TARI {tariPerc}% (~{risparmioTari}€) per {sel?.nome}</div>
            <button onClick={()=>setStage("form")} className="mt-4 h- px-5 rounded- border font-bold text-">← Nuovo calcolo</button>
          </div>
        )}
      </div>
    </div>
  );
}
