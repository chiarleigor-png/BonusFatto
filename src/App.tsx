
import { useEffect, useState, useMemo } from "react";

type Comune = { nome: string; provincia: string; regione: string };

const FALLBACK: Comune[] = [
  {nome:"Roma", provincia:"Roma", regione:"Lazio"},
  {nome:"Milano", provincia:"Milano", regione:"Lombardia"},
  {nome:"Collegno", provincia:"Torino", regione:"Piemonte"},
  {nome:"Costarainera", provincia:"Imperia", regione:"Liguria"},
  {nome:"Brignano Gera d'Adda", provincia:"Bergamo", regione:"Lombardia"},
];

// MOTORE BONUS CON ETA' - 14 bonus mappati per ISEE + ETA
const BONUS_ETA = [
  { id: 'sociale', nome: 'Bonus Sociale Luce/Gas/Acqua', isee_max: 9530, isee_max_4_figli: 15000, eta_min: 0, eta_max: 120, importo: '500€/anno', cat: 'Bollette', eta_label: 'Tutte le età' },
  { id: 'unico_0_21', nome: 'Assegno Unico Figli 0-21 anni', isee_max: 45000, eta_min: 0, eta_max: 21, rif: 'figlio', importo: '199€/mese ISEE 0', cat: 'Famiglia', eta_label: 'Figlio 0-21 anni' },
  { id: 'asilo_0_3', nome: 'Bonus Asilo Nido 0-3 anni', isee_max: 40000, eta_min: 0, eta_max: 3, rif: 'figlio', importo: '3000€/anno', cat: 'Famiglia', eta_label: 'Bimbo 0-3 anni' },
  { id: 'mensa_0_3', nome: 'Mensa Nido 0-3 esenzione ISEE 0', isee_max: 3000, eta_min: 0, eta_max: 3, rif: 'figlio', importo: 'Esenzione totale', cat: 'Scuola', eta_label: 'Bimbo 0-3 anni' },
  { id: 'mensa_3_14', nome: 'Mensa Scolastica 3-14 esenzione', isee_max: 10000, eta_min: 3, eta_max: 14, rif: 'figlio', importo: 'Esenzione con ISEE 0', cat: 'Scuola', eta_label: 'Figlio 3-14 anni' },
  { id: 'centro_estivo', nome: 'Bonus Centri Estivi 3-14', isee_max: 15000, eta_min: 3, eta_max: 14, rif: 'figlio', importo: '500€/figlio', cat: 'Scuola', eta_label: 'Figlio 3-14 anni' },
  { id: 'trasporto_u26', nome: 'Bonus Trasporto Under 26', isee_max: 15000, eta_min: 0, eta_max: 26, importo: 'Gratis ISEE 0-5000', cat: 'Trasporti', eta_label: 'Under 26' },
  { id: 'cultura_18', nome: 'Bonus Cultura 18App 500€', isee_max: 35000, eta_min: 18, eta_max: 18, importo: '500€', cat: 'Cultura', eta_label: '18 anni' },
  { id: 'psicologo', nome: 'Bonus Psicologo', isee_max: 50000, eta_min: 0, eta_max: 120, importo: 'Fino a 1500€', cat: 'Salute', eta_label: 'Tutte le età' },
  { id: 'over65', nome: 'Carta Acquisti Over 65', isee_max: 8000, eta_min: 65, eta_max: 120, importo: '80€ ogni 2 mesi', cat: 'Over 65', eta_label: 'Over 65' },
  { id: 'trasporto_o65', nome: 'Trasporto Over 65 Gratis', isee_max: 15000, eta_min: 65, eta_max: 120, importo: 'Gratis', cat: 'Over 65', eta_label: 'Over 65' },
  { id: 'tari', nome: 'Bonus TARI', isee_max: 15000, eta_min: 0, eta_max: 120, importo: '25-100%', cat: 'TARI', eta_label: 'Tutte le età' },
  { id: 'adi', nome: 'Assegno di Inclusione', isee_max: 6000, eta_min: 18, eta_max: 67, importo: '500€+280€ affitto', cat: 'Reddito', eta_label: '18-67 anni' },
  { id: 'carta_bimbi', nome: 'Carta Acquisti Bimbi 0-3', isee_max: 8000, eta_min: 0, eta_max: 3, rif: 'figlio', importo: '80€ ogni 2 mesi', cat: 'Famiglia', eta_label: 'Bimbo 0-3 anni' },
];

function calcolaBonus({ isee, etaDichiarante, etaFigli }: { isee: number, etaDichiarante: number, etaFigli: number[] }) {
  return BONUS_ETA.filter(b => {
    // ISEE
    const iseeOk = isee <= b.isee_max || ((b as any).isee_max_4_figli && etaFigli.length>=4 && isee <= (b as any).isee_max_4_figli);
    if (!iseeOk) return false;
    // ETA
    if (b.rif === 'figlio') {
      if (etaFigli.length===0) return false;
      return etaFigli.some(e => e >= b.eta_min && e <= b.eta_max);
    } else {
      return etaDichiarante >= b.eta_min && etaDichiarante <= b.eta_max;
    }
  });
}

export default function App(){
  const [comuni,setComuni]=useState<Comune[]>(FALLBACK);
  const [q,setQ]=useState("");
  const [sel,setSel]=useState<Comune|null>(null);
  const [show,setShow]=useState(false);
  const [isee,setIsee]=useState("0");
  const [etaDichiarante,setEtaDichiarante]=useState("35");
  const [etaFigliStr,setEtaFigliStr]=useState("8");
  const [numComponenti,setNumComponenti]=useState("3");
  const [stage,setStage]=useState<"form"|"result">("form");

  const iseeN = parseInt(isee)||0;
  const etaDichN = parseInt(etaDichiarante)||0;
  const etaFigli = useMemo(()=>etaFigliStr.split(',').map(s=>parseInt(s.trim())).filter(n=>!isNaN(n)),[etaFigliStr]);

  useEffect(()=>{
    fetch("https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json")
     .then(r=>r.json())
     .then(d=>setComuni(d.map((c:any)=>({nome:c.nome, provincia:c.provincia?.nome||"", regione:c.regione?.nome||""}))))
     .catch(()=>setComuni(FALLBACK));
  },[]);

  const filtrati = useMemo(()=>{
    if(!q) return comuni.slice(0,20);
    return comuni.filter(c=>c.nome.toLowerCase().includes(q.toLowerCase())).slice(0,20);
  },[comuni,q]);

  const bonusTrovati = useMemo(()=>calcolaBonus({ isee: iseeN, etaDichiarante: etaDichN, etaFigli }),[iseeN, etaDichN, etaFigli]);

  if(stage==="result"){
    return (
      <div className="min-h-screen bg-[#FFF9E6] p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border p-6">
          <h2 className="text-xl font-bold">✅ {sel?.nome} - ISEE {isee}€ - Dichiarante {etaDichN} anni - Figli: {etaFigli.join(', ')||'nessuno'}</h2>
          <div className="mt-2 text-sm text-slate-600">{bonusTrovati.length} bonus trovati su 7894 comuni per questa combinazione di età:</div>
          <div className="mt-4 grid gap-2">
            {bonusTrovati.map(b=>(
              <div key={b.id} className="border rounded-lg p-3 flex justify-between bg-green-50">
                <div><div className="font-bold">{b.nome}</div><div className="text-xs text-slate-500">{b.cat} - {b.eta_label}</div></div>
                <div className="font-bold text-green-700">{b.importo}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>setStage("form")} className="mt-4 w-full h-12 rounded-lg border font-bold">← Modifica età e ricalcola</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF9E6] p-4">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_400px] gap-6">
        <div>
          <h1 className="text-3xl font-extrabold">Tutti i bonus per ISEE + Età - 7894 comuni</h1>
          <p className="mt-2 text-slate-600">Inserisci ISEE, età dichiarante e età figli per filtrare i bonus legati all'età (0-3, 3-14, Under 26, Over 65, 18 anni)</p>
          <div className="mt-6 bg-white border rounded-xl p-4">
            <div className="font-bold">Esempi bonus legati all'età:</div>
            <div className="mt-2 text-sm grid gap-1">
              <div>👶 <b>0-3 anni:</b> Asilo Nido 3000€, Carta Acquisti Bimbi 80€, Mensa Nido esenzione</div>
              <div>🧒 <b>3-14 anni:</b> Mensa esenzione ISEE 0, Centri Estivi 500€/figlio</div>
              <div>🎓 <b>Under 26:</b> Trasporto gratis con ISEE 0-5000</div>
              <div>🎂 <b>18 anni:</b> 18App 500€ cultura</div>
              <div>👴 <b>Over 65:</b> Carta Acquisti 80€ + Trasporto gratis</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="font-bold">1. Dove abiti? (7894 comuni)</div>
          <input value={q} onChange={e=>{setQ(e.target.value); setShow(true);}} onFocus={()=>setShow(true)} placeholder="Cerca comune es. Collegno, Brignano Gera d'Adda..." className="mt-2 w-full h-10 border rounded-lg px-3 text-sm" />
          {show && <div className="border rounded-lg max-h-60 overflow-auto mt-1">{filtrati.map(c=><div key={c.nome} onMouseDown={()=>{setSel(c); setQ(c.nome); setShow(false);}} className="px-3 py-2 text-sm hover:bg-yellow-50 cursor-pointer flex justify-between"><span>{c.nome}</span><span className="text-xs text-slate-400">{c.provincia}</span></div>)}</div>}
          {sel && <div className="mt-2 text-sm bg-green-50 border border-green-200 rounded p-2">✅ {sel.nome} selezionato</div>}

          <div className="font-bold mt-4">2. ISEE e Nucleo</div>
          <input value={isee} onChange={e=>setIsee(e.target.value)} placeholder="ISEE es. 0, 15000, 30000" className="mt-2 w-full h-10 border rounded-lg px-3 text-sm" />
          <input value={numComponenti} onChange={e=>setNumComponenti(e.target.value)} placeholder="Numero componenti nucleo ISEE es. 3" className="mt-2 w-full h-10 border rounded-lg px-3 text-sm" />

          <div className="font-bold mt-4">3. Età dichiarante ISEE (obbligatorio per bonus età)</div>
          <input value={etaDichiarante} onChange={e=>setEtaDichiarante(e.target.value)} placeholder="Età tua / dichiarante ISEE es. 35, 70" className="mt-2 w-full h-10 border rounded-lg px-3 text-sm bg-yellow-50 border-yellow-300" />
          <div className="text-xs text-slate-500 mt-1">Serve per Over 65, Under 26, 18App, Adi</div>

          <div className="font-bold mt-4">4. Età figli / componenti con bonus età</div>
          <input value={etaFigliStr} onChange={e=>setEtaFigliStr(e.target.value)} placeholder="Età figli separati da virgola es. 2,8,14" className="mt-2 w-full h-10 border rounded-lg px-3 text-sm bg-yellow-50 border-yellow-300" />
          <div className="text-xs text-slate-500 mt-1">Es: 0,3 → trova Asilo Nido + Carta Bimbi. Es: 8 → trova Mensa 3-14 + Centro Estivo + Assegno Unico</div>

          {sel && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <div className="font-bold">✅ {bonusTrovati.length} bonus per {sel.nome} con ISEE {iseeN}€, età {etaDichN}, figli {etaFigli.join(', ')||'nessuno'}</div>
              <div className="mt-1 text-xs">{bonusTrovati.slice(0,3).map(b=>b.nome).join(', ')}{bonusTrovati.length>3?' + altri':''}</div>
            </div>
          )}

          <button onClick={()=>setStage("result")} disabled={!sel} className="mt-4 w-full h-12 rounded-lg bg-[#FF8F00] text-white font-bold disabled:opacity-40">Calcola {bonusTrovati.length} bonus per {sel?.nome || 'comune'} →</button>
          <div className="text-xs text-center text-slate-400 mt-2">Motore 7894 comuni + 14 bonus età attivi</div>
        </div>
      </div>
    </div>
  );
}
