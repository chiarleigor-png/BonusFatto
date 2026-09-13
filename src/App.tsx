import { useEffect, useState, useMemo } from "react";

type Comune = { nome: string; provincia: string; regione: string };

const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];

const PROVINCE: Record<string,string[]> = {
  "Lazio": ["Frosinone","Latina","Rieti","Roma","Viterbo"],
  "Lombardia": ["Bergamo","Brescia","Milano","Monza e della Brianza"],
  "Liguria": ["Genova","Imperia","La Spezia","Savona"]
};

const FALLBACK: Comune[] = [
  {nome:"Roma", provincia:"Roma", regione:"Lazio"},
  {nome:"Fiumicino", provincia:"Roma", regione:"Lazio"},
  {nome:"Pomezia", provincia:"Roma", regione:"Lazio"},
  {nome:"Affile", provincia:"Roma", regione:"Lazio"},
  {nome:"Agosta", provincia:"Roma", regione:"Lazio"},
  {nome:"Albano Laziale", provincia:"Roma", regione:"Lazio"},
];

export default function App(){
  const [comuni,setComuni]=useState<Comune[]>(FALLBACK);
  const [regione,setRegione]=useState("Lazio");
  const [provincia,setProvincia]=useState("Roma");
  const [q,setQ]=useState("");
  const [sel,setSel]=useState<Comune|null>(null);
  const [show,setShow]=useState(false);
  const [isee,setIsee]=useState("15000");
  const [figli,setFigli]=useState("1");
  const [stage,setStage]=useState<"form"|"teaser"|"checkout"|"result">("form");
  const [pdf,setPdf]=useState(false);
  const [alert2026,setAlert2026]=useState(false);
  const [alert2027,setAlert2027]=useState(false);

  const iseeN = parseInt(isee)||0;
  const figliN = parseInt(figli)||0;

  useEffect(()=>{
    fetch("https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json")
     .then(r=>r.json())
     .then(d=>setComuni(d.map((c:any)=>({nome:c.nome, provincia:c.provincia?.nome||"", regione:c.regione?.nome||""}))))
     .catch(()=>setComuni(FALLBACK));
  },[]);

  const filtrati = useMemo(()=>{
    let f=comuni;
    if(regione) f=f.filter(c=>c.regione===regione);
    if(provincia) f=f.filter(c=>c.provincia===provincia);
    if(q) f=f.filter(c=>c.nome.toLowerCase().includes(q.toLowerCase()));
    return f.slice(0,40);
  },[comuni,regione,provincia,q]);

  const mediaTari = 350;
  const percTari = iseeN? (iseeN<=8000?100: iseeN<=15000?50: iseeN<=26530?25:0) : 0;
  const risparmioTari = Math.round(mediaTari*percTari/100);
  const bonusBollette = (iseeN<=9530 || figliN>=4)? 250 : 0;
  const totale = 4.99 + (pdf?2:0) + (alert2026?9.9:0) + (alert2027?9.9:0);

  // FORM - UGUALE SCREENSHOT
  if(stage==="form"){
    return (
      <div className="min-h-screen bg-[#FFF9E6] p-4">
        <div className="max-w- mx-auto grid lg:grid-cols-[1fr_380px] gap-6">
          <div>
            <h1 className="text- font-extrabold leading-[1.05]">Scopri tutti i bonus a cui hai diritto con il tuo ISEE</h1>
            <p className="text- mt-2">Inserisci il tuo ISEE e scopri subito tutti i bonus, lo sconto TARI e il bonus luce e gas per il tuo Comune</p>
            <div className="mt-3 flex gap-2 text- font-bold flex-wrap">
              <span className="bg-white border px-2 py-1 rounded-full">1. Tutti i bonus ISEE</span>
              <span className="bg-white border px-2 py-1 rounded-full">2. Sconto TARI fino al 100%</span>
              <span className="bg-[#FFE082] border px-2 py-1 rounded-full">3. Bonus luce e gas ~250€/anno</span>
            </div>
          </div>
          <div className="bg-white rounded- border p-4 shadow-sm">
            <div className="font-bold text-">1. Dove abiti?</div>
            <div className="mt-3 space-y-3">
              <select value={regione} onChange={e=>{setRegione(e.target.value); setProvincia(""); setSel(null);}} className="w-full h- border rounded- px-2 text-">{REGIONI.map(r=><option key={r}>{r}</option>)}</select>
              <select value={provincia} onChange={e=>setProvincia(e.target.value)} className="w-full h- border rounded- px-2 text-"><option>Roma</option>{(PROVINCE[regione]||[]).map(p=><option key={p}>{p}</option>)}</select>
              <div className="grid grid-cols-2 gap-2">
                <input value={isee} onChange={e=>setIsee(e.target.value)} placeholder="Es. 15000" className="h- border rounded- px-2 text-" />
                <select value={figli} onChange={e=>setFigli(e.target.value)} className="h- border rounded- px-2 text-"><option value="1">1 figli</option><option value="2">2 figli</option><option value="3">3 figli</option><option value="4">4 figli</option></select>
              </div>
              <input value={q} onChange={e=>{setQ(e.target.value); setShow(true);}} onFocus={()=>setShow(true)} placeholder="Es. Fiumicino, Pomezia..." className="w-full h- border rounded- px-2 text-" />
              {show && <div className="border rounded- max-h- overflow-auto">{filtrati.map(c=><div key={c.nome} onMouseDown={()=>{setSel(c); setQ(c.nome); setShow(false);}} className="px-3 py-2 text- hover:bg-yellow-50 cursor-pointer flex justify-between"><span>{c.nome}</span><span className="text- text-slate-400">{c.provincia}</span></div>)}</div>}
              {sel && <div className="text- bg-green-50 border border-green-200 rounded p-2">✅ {sel.nome} selezionato – TARI {percTari}% → {risparmioTari}€ + Bollette {bonusBollette}€</div>}
              <button onClick={()=>setStage("teaser")} disabled={!sel||!isee} className="w-full h- rounded- bg-[#FF8F00] text-white font-bold disabled:opacity-40">Calcola – vai al totale stimato</button>
              <div className="text- text-center text-slate-400">7904 comuni disponibili • fetch GitHub + fallback</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TEASER - CON CIFRE SFOCATE + PULSANTE CHECKOUT
  if(stage==="teaser"){
    return (
      <div className="min-h-screen bg-[#FFF9E6] p-4">
        <div className="max-w- mx-auto bg-white rounded- border p-6">
          <h2 className="text- font-bold">Risultato per {sel?.nome} – ISEE {isee}€</h2>
          <p className="text- text-slate-500">Le cifre esatte sono sfocate – sblocca per vederle</p>

          <div className="mt-4 relative">
            <div className="grid grid-cols-3 gap-3 blur- select-none">
              <div className="border rounded- p-4 text-center"><div className="text-">TARI</div><div className="font-bold text-">{percTari}%</div><div>~{risparmioTari}€</div></div>
              <div className="border rounded- p-4 text-center"><div className="text-">BOLLETTE</div><div className="font-bold text-">{bonusBollette}€</div><div>/anno</div></div>
              <div className="border rounded- p-4 text-center"><div className="text-">TOTALE</div><div className="font-bold text-">{risparmioTari+bonusBollette+1200}€</div></div>
            </div>
            <div className="absolute inset-0 bg-white/70 backdrop-blur- rounded- flex flex-col items-center justify-center">
              <div className="font-bold text-">🔒 Risultati nascosti</div>
              <div className="text-">Sblocca con 4,99€</div>
            </div>
          </div>

          <div className="mt-4 bg-slate-50 border rounded- p-3 text-">
            Hai diritto a <b>7 bonus</b>: bonus psicologo 2026, bonus mamme, carta dedicata a te, detrazione 730 ristrutturazione, assegno unico maggiorato, bonus bollette, sconto TARI
          </div>

          <button onClick={()=>setStage("checkout")} className="mt-5 w-full h- rounded- bg-slate-900 text-white font-extrabold text-">🔓 Sblocca report – Vai al checkout 4,99€ →</button>
          <button onClick={()=>setStage("form")} className="mt-3 w-full h- rounded- border font-bold text-">← Modifica</button>
        </div>
      </div>
    );
  }

  // CHECKOUT - CON 9,90€ + PULSANTE PAGAMENTO
  if(stage==="checkout"){
    return (
      <div className="min-h-screen bg-[#FFF9E6] p-4">
        <div className="max-w- mx-auto bg-white rounded- border p-6">
          <h2 className="font-bold text-">Checkout – {sel?.nome}</h2>
          <p className="text- text-slate-500">Report completo + bonus bollette + TARI per 7904 comuni</p>

          <div className="mt-5 space-y-3 text-">
            <div className="flex justify-between border-b pb-2"><span>Report base 4,99€</span><span>4,99€</span></div>
            <label className="flex justify-between items-center bg-slate-50 p-3 rounded- border cursor-pointer">
              <span><input type="checkbox" checked={pdf} onChange={e=>setPdf(e.target.checked)} className="mr-2" />Modello PDF email pronta</span><span>+2,00€</span>
            </label>
            <label className="flex justify-between items-center bg-amber-50 p-3 rounded- border border-amber-300 cursor-pointer">
              <span><input type="checkbox" checked={alert2026} onChange={e=>setAlert2026(e.target.checked)} className="mr-2" />🔔 Alert scadenza 2026</span><span className="font-bold">+9,90€</span>
            </label>
            <label className="flex justify-between items-center bg-amber-50 p-3 rounded- border border-amber-300 cursor-pointer">
              <span><input type="checkbox" checked={alert2027} onChange={e=>setAlert2027(e.target.checked)} className="mr-2" />🔔 Alert scadenza 2027</span><span className="font-bold">+9,90€</span>
            </label>
            <div className="flex justify-between font-extrabold text- border-t pt-3"><span>Totale</span><span>{totale.toFixed(2)}€</span></div>
          </div>

          <button onClick={()=>setStage("result")} className="mt-6 w-full h- rounded- bg-gradient-to-r from-blue-600 to-violet-600 text-white font-extrabold text- shadow-xl">
            💳 Paga {totale.toFixed(2)}€ con Stripe →
          </button>
          <p className="text- text-center text-slate-400 mt-2">Pagamento sicuro – Ricevi PDF via email</p>
          <button onClick={()=>setStage("teaser")} className="mt-3 w-full h- rounded- border font-bold text-">← Torna</button>
        </div>
      </div>
    );
  }

  // RESULT - DOPO PAGAMENTO
  return (
    <div className="min-h-screen bg-[#FFF9E6] p-4">
      <div className="max-w- mx-auto bg-white rounded- border p-6">
        <h2 className="font-bold text-">✅ Pagato {totale.toFixed(2)}€ – Sbloccato!</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="border rounded- p-3"><div className="font-bold text-">{percTari}%</div><div className="text-">TARI ~{risparmioTari}€</div></div>
          <div className="border rounded- p-3"><div className="font-bold text-">{bonusBollette}€</div><div className="text-">Bollette</div></div>
          <div className="border rounded- p-3"><div className="font-bold text-">{risparmioTari+bonusBollette}€</div><div className="text-">Risparmio</div></div>
        </div>
        <div className="mt-4 bg-slate-900 text-white rounded- p-4 text-">Hai diritto a 7 bonus: bonus psicologo 2026, bonus mamme, carta dedicata a te, detrazione 730 ristrutturazione, assegno unico maggiorato, bonus bollette {bonusBollette}€, sconto TARI {percTari}%</div>
        <button onClick={()=>setStage("form")} className="mt-4 w-full h- rounded- border font-bold text-">← Nuovo calcolo</button>
      </div>
    </div>
  );
}
