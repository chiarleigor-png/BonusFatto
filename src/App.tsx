import { useEffect, useState, useMemo } from "react";

type ComuneNorm = { nome: string; provincia: string; regione: string };
const REGIONI = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];
const PROVINCE_PER_REGIONE: Record<string,string[]> = {"Abruzzo":["Chieti","L'Aquila","Pescara","Teramo"],"Basilicata":["Matera","Potenza"],"Calabria":["Catanzaro","Cosenza","Crotone","Reggio Calabria","Vibo Valentia"],"Campania":["Avellino","Benevento","Caserta","Napoli","Salerno"],"Emilia-Romagna":["Bologna","Ferrara","Forlì-Cesena","Modena","Parma","Piacenza","Ravenna","Reggio Emilia","Rimini"],"Friuli-Venezia Giulia":["Gorizia","Pordenone","Trieste","Udine"],"Lazio":["Frosinone","Latina","Rieti","Roma","Viterbo"],"Liguria":["Genova","Imperia","La Spezia","Savona"],"Lombardia":["Bergamo","Brescia","Como","Cremona","Lecco","Lodi","Mantova","Milano","Monza e della Brianza","Pavia","Sondrio","Varese"],"Marche":["Ancona","Ascoli Piceno","Fermo","Macerata","Pesaro e Urbino"],"Molise":["Campobasso","Isernia"],"Piemonte":["Alessandria","Asti","Biella","Cuneo","Novara","Torino","Verbano-Cusio-Ossola","Vercelli"],"Puglia":["Bari","Barletta-Andria-Trani","Brindisi","Foggia","Lecce","Taranto"],"Sardegna":["Cagliari","Nuoro","Oristano","Sassari","Sud Sardegna"],"Sicilia":["Agrigento","Caltanissetta","Catania","Enna","Messina","Palermo","Ragusa","Siracusa","Trapani"],"Toscana":["Arezzo","Firenze","Grosseto","Livorno","Lucca","Massa-Carrara","Pisa","Pistoia","Prato","Siena"],"Trentino-Alto Adige":["Bolzano","Trento"],"Umbria":["Perugia","Terni"],"Valle d'Aosta":["Aosta"],"Veneto":["Belluno","Padova","Rovigo","Treviso","Venezia","Verona","Vicenza"]};
const FALLBACK: ComuneNorm[] = [{nome:"Roma",provincia:"Roma",regione:"Lazio"},{nome:"Milano",provincia:"Milano",regione:"Lombardia"},{nome:"Affile",provincia:"Roma",regione:"Lazio"},{nome:"Agosta",provincia:"Roma",regione:"Lazio"},{nome:"Albano Laziale",provincia:"Roma",regione:"Lazio"},{nome:"Allumiere",provincia:"Roma",regione:"Lazio"},{nome:"Anguillara Sabazia",provincia:"Roma",regione:"Lazio"},{nome:"Fiumicino",provincia:"Roma",regione:"Lazio"},{nome:"Pomezia",provincia:"Roma",regione:"Lazio"}];
const MEDIA_TARI: Record<string,number> = {"roma":360,"milano":400,"fiumicino":330,"albano laziale":305,"affile":280,"agosta":280,"allumiere":290,"anguillara sabazia":310,"pomezia":310};

export default function App(){
  const [comuni,setComuni]=useState<ComuneNorm[]>(FALLBACK); const [loading,setLoading]=useState(true);
  const [regione,setRegione]=useState("Lazio"); const [provincia,setProvincia]=useState("Roma"); const [q,setQ]=useState(""); const [sel,setSel]=useState<ComuneNorm|null>(null); const [show,setShow]=useState(false);
  const [isee,setIsee]=useState("15000"); const [figli,setFigli]=useState("1"); const [stage,setStage]=useState<"form"|"result">("form");
  const iseeNum = parseInt(isee)||0; const figliNum = parseInt(figli)||0;

  useEffect(()=>{ (async()=>{try{const r=await fetch("https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json");const d=await r.json();setComuni(d.map((c:any)=>({nome:c.nome,provincia:c.provincia?.nome||"",regione:c.regione?.nome||""})));}catch{setComuni(FALLBACK);}setLoading(false);})(); },[]);

  const filtrati = useMemo(()=>{let f=comuni; if(regione) f=f.filter(c=>c.regione===regione); if(provincia) f=f.filter(c=>c.provincia===provincia); if(q) f=f.filter(c=>c.nome.toLowerCase().includes(q.toLowerCase())); return f.slice(0,50);},[comuni,regione,provincia,q]);
  const media = MEDIA_TARI[(sel?.nome||provincia).toLowerCase()]||350;
  const tariPerc = iseeNum? (iseeNum<=8000?100:iseeNum<=15000?50:iseeNum<=26530?25:0):0;
  const risparmioTari = Math.round(media*tariPerc/100);
  const bonusBollette = (iseeNum && (iseeNum<=9530 || (figliNum>=4 && iseeNum<=20000)))?250:0;
  const bonusList = [`Sconto TARI ${tariPerc}% (~${risparmioTari}€) per ${sel?.nome||provincia}`, `Bonus luce e gas ~${bonusBollette}€/anno (80€ luce + 120€ gas + 50€ acqua)`, `Assegno Unico Maggiorato`, `Bonus psicologo 2026`, `Bonus mamme`, `Carta Dedicata a Te 500€`, `Detrazione 730 ristrutturazione 50%`];

  return (
    <div className="min-h-screen bg-[#FFF9E6] p-4">
      <div className="max-w- mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div>
          <h1 className="text- font-extrabold">Scopri tutti i bonus a cui hai diritto con il tuo ISEE</h1>
          <p className="text- mt-2">Inserisci il tuo ISEE e scopri subito tutti i bonus, lo sconto TARI e il bonus luce e gas per il tuo Comune</p>
          <div className="mt-3 flex gap-2 text- font-bold flex-wrap">
            <span className="bg-white border px-2 py-1 rounded-full">1. Tutti i bonus ISEE</span>
            <span className="bg-white border px-2 py-1 rounded-full">2. Sconto TARI fino al 100%</span>
            <span className="bg-[#FFE082] border px-2 py-1 rounded-full">3. Bonus luce e gas ~250€/anno</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-">
            <div className="bg-white border rounded- p-3"><div>DATASET LIVE</div><div className="font-bold">{loading?"...":comuni.length}</div></div>
            <div className="bg-white border rounded- p-3"><div>RISPARMIO</div><div className="font-bold">~{risparmioTari+bonusBollette}€</div></div>
            <div className="bg-white border rounded- p-3"><div>SCADENZE</div><div className="font-bold">Live</div></div>
          </div>
        </div>
        <div className="bg-white rounded- border p-4">
          <div className="font-bold text-">1. Dove abiti?</div>
          <div className="mt-3 space-y-3">
            <select value={regione} onChange={e=>{setRegione(e.target.value); setProvincia(""); setSel(null);}} className="w-full h- border rounded- px-2 text-"><option>Lazio</option>{REGIONI.map(r=><option key={r}>{r}</option>)}</select>
            <select value={provincia} onChange={e=>{setProvincia(e.target.value); setSel(null);}} className="w-full h- border rounded- px-2 text-"><option>Roma</option>{(PROVINCE_PER_REGIONE[regione]||[]).map(p=><option key={p}>{p}</option>)}</select>
            <div className="grid grid-cols-2 gap-2">
              <input value={isee} onChange={e=>setIsee(e.target.value)} placeholder="Es. 15000" className="h- border rounded- px-2 text-" />
              <select value={figli} onChange={e=>setFigli(e.target.value)} className="h- border rounded- px-2 text-">{[0,1,2,3,4,5].map(n=><option key={n}>{n} figli</option>)}</select>
            </div>
            <input value={q} onChange={e=>{setQ(e.target.value); setShow(true);}} onFocus={()=>setShow(true)} placeholder="Es. Fiumicino, Pomezia..." className="w-full h- border rounded- px-2 text-" />
            {show && <div className="max-h- overflow-auto border rounded-">{filtrati.map(c=><div key={c.nome} onMouseDown={()=>{setSel(c); setQ(c.nome); setShow(false);}} className="px-2 py-1 text- hover:bg-yellow-50 cursor-pointer flex justify-between"><span>{c.nome}</span><span className="text-">{c.provincia}</span></div>)}</div>}
            <button onClick={()=>setStage("result")} className="w-full h- rounded- bg-[#FF8F00] text-white font-bold text-">Calcola – vai al totale stimato</button>
            {stage==="result" && <div className="text- bg-slate-900 text-white rounded- p-3">Hai diritto a {bonusList.length} bonus: {bonusList.join(", ")}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
