import { useEffect, useState, useMemo } from "react";

type ComuneNorm = { nome: string; provincia: string; regione: string };
const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];
const PROVINCE_PER_REGIONE: Record<string,string[]> = {"Lazio":["Frosinone","Latina","Rieti","Roma","Viterbo"],"Lombardia":["Milano","Bergamo"],"Liguria":["Genova","Imperia"]};
const FALLBACK: ComuneNorm[] = [{nome:"Roma",provincia:"Roma",regione:"Lazio"},{nome:"Fiumicino",provincia:"Roma",regione:"Lazio"},{nome:"Pomezia",provincia:"Roma",regione:"Lazio"},{nome:"Affile",provincia:"Roma",regione:"Lazio"}];
const MEDIA_TARI: Record<string,number> = {"roma":360,"fiumicino":330};

export default function App(){
  const [comuni,setComuni]=useState<ComuneNorm[]>(FALLBACK); const [loading,setLoading]=useState(true);
  const [regione,setRegione]=useState("Lazio"); const [provincia,setProvincia]=useState("Roma"); const [q,setQ]=useState(""); const [sel,setSel]=useState<ComuneNorm|null>(null); const [show,setShow]=useState(false);
  const [isee,setIsee]=useState("15000"); const [figli,setFigli]=useState("1");
  const [stage,setStage]=useState<"form"|"teaser"|"checkout"|"result">("form");
  const [pdf,setPdf]=useState(false); const [a2026,setA2026]=useState(false); const [a2027,setA2027]=useState(false);

  const iseeNum = parseInt(isee)||0; const figliNum = parseInt(figli)||0;

  useEffect(()=>{ (async()=>{try{const r=await fetch("https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json");const d=await r.json();setComuni(d.map((c:any)=>({nome:c.nome,provincia:c.provincia?.nome||"",regione:c.regione?.nome||""})));}catch{}setLoading(false);})(); },[]);

  const filtrati = useMemo(()=>{let f=comuni; if(regione) f=f.filter(c=>c.regione===regione); if(provincia) f=f.filter(c=>c.provincia===provincia); if(q) f=f.filter(c=>c.nome.toLowerCase().includes(q.toLowerCase())); return f.slice(0,50);},[comuni,regione,provincia,q]);
  const media = MEDIA_TARI[(sel?.nome||"").toLowerCase()]||350;
  const tariPerc = iseeNum? (iseeNum<=8000?100:iseeNum<=15000?50:iseeNum<=26530?25:0):0;
  const risparmioTari = Math.round(media*tariPerc/100);
  const bonusBollette = (iseeNum && (iseeNum<=9530 || figliNum>=4))?250:0;
  const totale = 4.99 + (pdf?2:0) + (a2026?9.9:0) + (a2027?9.9:0);

  return (
    <div className="min-h-screen bg-[#FFF9E6] p-4">
      <div className="max-w- mx-auto">
        <div className="font-bold mb-4">BonusFatto.it – 7904 comuni</div>

        {stage==="form" && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            <div><h1 className="text- font-extrabold">Scopri tutti i bonus con ISEE</h1><p className="text- mt-2">Bonus TARI + luce e gas per il tuo Comune</p></div>
            <div className="bg-white rounded- border p-4">
              <div className="font-bold">1. Dove abiti?</div>
              <div className="mt-3 space-y-3">
                <select value={regione} onChange={e=>setRegione(e.target.value)} className="w-full h- border rounded px-2 text-">{REGIONI.map(r=><option key={r}>{r}</option>)}</select>
                <select value={provincia} onChange={e=>setProvincia(e.target.value)} className="w-full h- border rounded px-2 text-"><option>Roma</option></select>
                <div className="grid grid-cols-2 gap-2">
                  <input value={isee} onChange={e=>setIsee(e.target.value)} placeholder="ISEE" className="h- border rounded px-2 text-" />
                  <select value={figli} onChange={e=>setFigli(e.target.value)} className="h- border rounded px-2 text-"><option value="1">1 figlio</option><option value="2">2 figli</option></select>
                </div>
                <input value={q} onChange={e=>{setQ(e.target.value); setShow(true);}} onFocus={()=>setShow(true)} placeholder="Cerca comune..." className="w-full h- border rounded px-2 text-" />
                {show && <div className="border rounded max-h- overflow-auto">{filtrati.map(c=><div key={c.nome} onMouseDown={()=>{setSel(c); setQ(c.nome); setShow(false);}} className="p-2 text- hover:bg-yellow-50 cursor-pointer">{c.nome}</div>)}</div>}
                <button onClick={()=>setStage("teaser")} disabled={!sel} className="w-full h- bg-[#FF8F00] text-white font-bold rounded- disabled:opacity-40">Calcola – vai al totale stimato →</button>
              </div>
            </div>
          </div>
        )}

        {stage==="teaser" && (
          <div className="max-w- mx-auto bg-white rounded- border p-6">
            <h2 className="text- font-bold">Anteprima per {sel?.nome}</h2>
            <p className="text- text-slate-500 mt-1">Sblocca per vedere le cifre esatte – ora sono sfocate come da originale</p>

            {/* QUI CIFRE SFOCATE COME DA ORIGINALE */}
            <div className="mt-4 relative">
              <div className="grid grid-cols-3 gap-3 blur- select-none pointer-events-none">
                <div className="border rounded- p-3 text-center"><div className="text-">TARI</div><div className="font-bold text-">{tariPerc}%</div><div className="text-">~{risparmioTari}€</div></div>
                <div className="border rounded- p-3 text-center"><div className="text-">BOLLETTE</div><div className="font-bold text-">{bonusBollette}€</div><div className="text-">/anno</div></div>
                <div className="border rounded- p-3 text-center"><div className="text-">TOTALE</div><div className="font-bold text-">{risparmioTari+bonusBollette+1200}€</div><div className="text-">stimato</div></div>
              </div>
              {/* OVERLAY CHE DICE SBLOCCA */}
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur- rounded-">
                <div className="text-center">
                  <div className="text- font-bold">🔒 Risultati sfocati</div>
                  <div className="text-">Sblocca con 4,99€ per vedere tutto</div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded- p-3 text-">
              Hai diritto a <b>7 bonus</b>: bonus psicologo 2026, bonus mamme, carta dedicata a te, detrazione 730 ristrutturazione, assegno unico maggiorato + TARI + bollette
            </div>

            {/* PULSANTE CHECKOUT CHE NON COMPARIVA - ORA C'È */}
            <button onClick={()=>setStage("checkout")} className="mt-4 w-full h- rounded- bg-slate-900 text-white font-extrabold text- shadow-xl">
              🔓 Sblocca report completo – Checkout 4,99€ →
            </button>
            <button onClick={()=>setStage("form")} className="mt-3 w-full h- rounded- border font-bold text-">← Modifica</button>
          </div>
        )}

        {stage==="checkout" && (
          <div className="max-w- mx-auto bg-white rounded- border p-6">
            <h2 className="font-bold">Checkout – Report {sel?.nome}</h2>
            <div className="mt-4 space-y-2 text-">
              <div className="flex justify-between border-b pb-2"><span>Report base</span><span>4,99€</span></div>
              <label className="flex justify-between bg-slate-50 p-2 rounded cursor-pointer"><span><input type="checkbox" checked={pdf} onChange={e=>setPdf(e.target.checked)} /> Modello PDF</span><span>+2,00€</span></label>
              <label className="flex justify-between bg-amber-50 p-2 rounded border border-amber-200 cursor-pointer"><span><input type="checkbox" checked={a2026} onChange={e=>setA2026(e.target.checked)} /> 🔔 Alert 2026</span><span className="font-bold">+9,90€</span></label>
              <label className="flex justify-between bg-amber-50 p-2 rounded border border-amber-200 cursor-pointer"><span><input type="checkbox" checked={a2027} onChange={e=>setA2027(e.target.checked)} /> 🔔 Alert 2027</span><span className="font-bold">+9,90€</span></label>
              <div className="flex justify-between font-bold text- border-t pt-3"><span>Totale</span><span>{totale.toFixed(2)}€</span></div>
            </div>
            {/* PULSANTE PAGAMENTO CHE NON COMPARIVA */}
            <button onClick={()=>setStage("result")} className="mt-5 w-full h- rounded- bg-gradient-to-r from-blue-600 to-violet-600 text-white font-extrabold text-">
              💳 Paga {totale.toFixed(2)}€ con Stripe →
            </button>
          </div>
        )}

        {stage==="result" && (
          <div className="max-w- mx-auto bg-white rounded- border p-6">
            <h2 className="font-bold text-">Pagato {totale.toFixed(2)}€ – Report sbloccato!</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="border rounded p-3 text-center"><div className="font-bold">{tariPerc}%</div><div className="text-">~{risparmioTari}€ TARI</div></div>
              <div className="border rounded p-3 text-center"><div className="font-bold">{bonusBollette}€</div><div className="text-">Bollette</div></div>
              <div className="border rounded p-3 text-center"><div className="font-bold">{risparmioTari+bonusBollette}€</div><div className="text-">Totale</div></div>
            </div>
            <div className="mt-4 text- bg-slate-900 text-white rounded p-3">Hai diritto a 7 bonus: bonus psicologo 2026, bonus mamme, carta dedicata a te, detrazione 730 ristrutturazione, assegno unico maggiorato, bonus bollette, sconto TARI</div>
          </div>
        )}
      </div>
    </div>
  );
}
