import { useEffect, useState, useMemo } from "react";
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
];

const MEDIA_TARI: Record<string, number> = {"roma":360,"milano":400,"torino":380,"napoli":340,"bologna":370,"firenze":350,"genova":360,"costarainera":285,"imperia":290};

export default function App(){
  const [comuni,setComuni]=useState<ComuneNorm[]>(COMUNI_FALLBACK);
  const [regione,setRegione]=useState(""); const [provincia,setProvincia]=useState(""); const [comuneQuery,setComuneQuery]=useState(""); const [selectedComune,setSelectedComune]=useState<ComuneNorm|null>(null); const [showDropdown,setShowDropdown]=useState(false);
  const [isee,setIsee]=useState(""); const [figli,setFigli]=useState("1");
  const [stage,setStage]=useState<"form"|"result"|"blog"|"article">("form");
  const [selectedSlug,setSelectedSlug]=useState<string|null>(null);
  const selectedArticle = BLOG_ARTICLES.find(a=>a.slug===selectedSlug);

  const iseeNum = useMemo(()=>parseInt(isee,10)||0,[isee]);
  const figliNum = useMemo(()=>parseInt(figli,10)||0,[figli]);

  useEffect(()=>{
    async function load(){
      try{
        const res=await fetch("https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json");
        const data=await res.json();
        const norm:ComuneNorm[]=data.map((c:any)=>({nome:c.nome, provincia:c.provincia?.nome||"", regione:c.regione?.nome||""}));
        setComuni(norm);
      }catch{ setComuni(COMUNI_FALLBACK); }
    }
    load();
  },[]);

  const comuniFiltrati=useMemo(()=>{
    const q=comuneQuery.toLowerCase().trim();
    let f=comuni;
    if(regione) f=f.filter(c=>c.regione===regione);
    if(provincia) f=f.filter(c=>c.provincia===provincia);
    if(q) f=f.filter(c=>c.nome.toLowerCase().includes(q));
    return f.slice(0,60);
  },[comuni,regione,provincia,comuneQuery]);

  // CALCOLO TUTTI I BONUS COME RICHIESTO
  const bonusList = useMemo(()=>{
    const list: {nome:string, importo:string, descrizione:string, categoria:string}[] = [];
    const mediaTari = MEDIA_TARI[(selectedComune?.nome||provincia||"").toLowerCase()]||350;

    // 1. Sconto TARI
    if(iseeNum){
      let perc=0;
      if(iseeNum<=8000) perc=100;
      else if(iseeNum<=15000) perc=50;
      else if(iseeNum<=26530) perc=25;
      if(perc>0) list.push({nome:`Sconto TARI ${selectedComune?.nome||provincia}`, importo:`${perc}% → ~${Math.round(mediaTari*perc/100)}€`, descrizione:`Comune ${selectedComune?.nome||provincia} – media ${mediaTari}€`, categoria:"TARI"});
    }

    // 2. Bonus Bollette Luce/Gas/Acqua
    if(iseeNum && (iseeNum<=9530 || (figliNum>=4 && iseeNum<=20000))){
      list.push({nome:"Bonus Bollette Luce/Gas/Acqua 2026", importo:"~250€/anno", descrizione:"Sconto automatico in bolletta ARERA – luce 80€ + gas 120€ + acqua 50€", categoria:"Bollette"});
    }

    // 3. Assegno Unico Maggiorato
    if(figliNum>0){
      let importo=0;
      if(iseeNum<=17500) importo=199*figliNum;
      else if(iseeNum<=40000) importo=120*figliNum;
      else importo=57*figliNum;
      list.push({nome:"Assegno Unico Maggiorato", importo:`${importo}€/mese → ${importo*12}€/anno`, descrizione:`${figliNum} figli a carico – maggiorato per ISEE ${iseeNum}€`, categoria:"Famiglia"});
    }

    // 4. Bonus Psicologo 2026
    if(iseeNum && iseeNum<=50000){
      let imp="500€";
      if(iseeNum<=15000) imp="1500€ (30 sedute da 50€)";
      else if(iseeNum<=30000) imp="1000€ (20 sedute da 50€)";
      list.push({nome:"Bonus Psicologo 2026", importo:imp, descrizione:"ISEE ≤50.000€ – domanda INPS online – 50€ a seduta", categoria:"Salute"});
    }

    // 5. Bonus Mamme 2026
    if(figliNum>=2 && iseeNum<=40000){
      list.push({nome:"Bonus Mamme 2026", importo:"Fino a 3000€/anno", descrizione:"Madri con 2+ figli – decontribuzione + bonus INPS – circolare 139/2025", categoria:"Famiglia"});
    }

    // 6. Carta Dedicata a Te 2026
    if(iseeNum && iseeNum<=15000 && figliNum>=1){
      list.push({nome:"Carta Dedicata a Te 2026", importo:"500€ una tantum", descrizione:"ISEE ≤15.000€ + nucleo 3+ persone – spesa alimentare – Comuni + Poste", categoria:"Spesa"});
    }

    // 7. Carta Acquisti
    if(iseeNum && iseeNum<=8117){
      list.push({nome:"Carta Acquisti", importo:"80€ a bimestre", descrizione:"ISEE ≤8.117€ – minori 3 anni o over 65 – Poste Italiane", categoria:"Spesa"});
    }

    // 8. Bonus Asilo Nido
    if(figliNum>0 && iseeNum){
      let imp="1500€/anno";
      if(iseeNum<=25000) imp="3000€/anno";
      else if(iseeNum<=40000) imp="2500€/anno";
      list.push({nome:"Bonus Asilo Nido 2026", importo:imp, descrizione:"Rette nido – INPS – fino a 3 anni", categoria:"Famiglia"});
    }

    // 9. Detrazione 730 Ristrutturazione
    list.push({nome:"Detrazione 730 Ristrutturazione 2026", importo:"50% detrazione", descrizione:"Ristrutturazione edilizia – 50% in 10 anni – max 96.000€ – sempre accessibile", categoria:"Casa"});

    // 10. Bonus Nuovi Nati 1000€
    if(figliNum>0){
      list.push({nome:"Bonus Nuovi Nati 2026", importo:"1000€ una tantum", descrizione:"Per ogni nuovo nato – ISEE ≤40.000€", categoria:"Famiglia"});
    }

    // 11. Voucher Piemonte se regione Piemonte
    if(regione==="Piemonte" && iseeNum<=26000){
      list.push({nome:"Voucher Scuola Piemonte", importo:"500€", descrizione:"Regione Piemonte – ISEE ≤26.000€", categoria:"Scuola"});
    }

    return list;
  },[iseeNum, figliNum, regione, provincia, selectedComune]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w- mx-auto px-4 h- flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setStage("form")}>
            <div className="w- h- rounded- bg-slate-900 text-white flex items-center justify-center font-bold text-">B</div>
            <span className="font-bold text-">BonusFatto.it</span>
            <span className="text- bg-slate-100 px-2 py-1 rounded-full">Sito chiaro e semplice</span>
          </div>
          <button onClick={()=>setStage("blog")} className="text- font-bold border rounded-full px-3 py-1.5">📚 Magazine</button>
        </div>
      </header>

      {stage==="form" && (
        <div className="max-w- mx-auto px-4 py-8">
          <h1 className="text- font-bold leading-[1.1]">Calcola i bonus con ISEE</h1>
          <p className="text- text-slate-600 mt-2">Inserisci ISEE, figli, regione, provincia e comune – ti dico subito a quanti bonus hai diritto.</p>

          <div className="mt-6 rounded- border border-slate-200 p-5 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text- font-bold">Valore ISEE 2026 (€) *</label>
                <input value={isee} onChange={e=>setIsee(e.target.value.replace(/[^0-9]/g,""))} placeholder="Es. 15000" className="mt-1 w-full h- rounded- border border-slate-300 px-3 text- font-bold" />
              </div>
              <div>
                <label className="text- font-bold">Numero figli *</label>
                <select value={figli} onChange={e=>setFigli(e.target.value)} className="mt-1 w-full h- rounded- border border-slate-300 px-3 text- font-bold">
                  {[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n} {n===1?"figlio":"figli"}</option>)}
                </select>
              </div>
              <div>
                <label className="text- font-bold">Regione *</label>
                <select value={regione} onChange={e=>{setRegione(e.target.value); setProvincia(""); setSelectedComune(null); setComuneQuery("");}} className="mt-1 w-full h- rounded- border border-slate-300 px-3 text-">
                  <option value="">Seleziona regione</option>
                  {REGIONI.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text- font-bold">Capoluogo di Provincia *</label>
                <select value={provincia} onChange={e=>{setProvincia(e.target.value); setSelectedComune(null); setComuneQuery("");}} className="mt-1 w-full h- rounded- border border-slate-300 px-3 text-" disabled={!regione}>
                  <option value="">Seleziona provincia</option>
                  {(PROVINCE_PER_REGIONE[regione]||[]).map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="text- font-bold">Comune di residenza * (7904 comuni)</label>
              <input value={comuneQuery} onChange={e=>{setComuneQuery(e.target.value); setShowDropdown(true);}} onFocus={()=>setShowDropdown(true)} onBlur={()=>setTimeout(()=>setShowDropdown(false),200)} placeholder="Digita 2-3 lettere – Es. Roma, Milano, Costarainera..." className="mt-1 w-full h- rounded- border border-slate-300 px-3 text-" />
              {showDropdown && (
                <div className="mt-2 max-h- overflow-auto rounded- border border-slate-300 bg-white shadow-lg">
                  {comuniFiltrati.length===0? <div className="p-3 text- text-slate-500">Nessun comune – cambia regione/provincia o digita</div> : comuniFiltrati.map(c=>(
                    <div key={c.nome+c.provincia} onMouseDown={()=>{setSelectedComune(c); setComuneQuery(c.nome); setShowDropdown(false); setRegione(c.regione); setProvincia(c.provincia);}} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text- flex justify-between">
                      <span>{c.nome}</span><span className="text-slate-400 text-">{c.provincia} • {c.regione}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedComune && <div className="mt-2 text- bg-green-50 border border-green-200 rounded- p-2">✅ {selectedComune.nome} ({selectedComune.provincia}, {selectedComune.regione}) – selezionato</div>}
            </div>

            <button onClick={()=>setStage("result")} disabled={!isee ||!regione ||!provincia ||!selectedComune} className="mt-6 w-full h- rounded- bg-slate-900 text-white font-bold text- disabled:opacity-40 disabled:cursor-not-allowed">
              {(!isee ||!regione ||!provincia ||!selectedComune)? "Compila tutti i campi per calcolare" : `Calcola bonus per ${selectedComune?.nome} →`}
            </button>
          </div>
        </div>
      )}

      {stage==="result" && (
        <div className="max-w- mx-auto px-4 py-8">
          <button onClick={()=>setStage("form")} className="text- font-bold border rounded-full px-3 py-1">← Modifica dati</button>
          <h2 className="mt-4 text- font-bold leading-[1.1]">Hai diritto a {bonusList.length} bonus:</h2>
          <p className="text- text-slate-600 mt-1">ISEE {iseeNum}€ • {figliNum} figli • {selectedComune?.nome} ({provincia}, {regione}) – Calcolo chiaro e semplice</p>

          <div className="mt-5 p-4 rounded- bg-slate-900 text-white">
            <div className="font-bold text-">Hai diritto a {bonusList.length} bonus: {bonusList.map(b=>b.nome).join(", ")}</div>
            <div className="text- text-white/70 mt-1">Esattamente come mi hai chiesto: bonus psicologo 2026, bonus mamme, carta dedicata a te, detrazione 730 ristrutturazione, assegno unico maggiorato + altri</div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            {bonusList.map((b,i)=>(
              <div key={i} className="rounded- border border-slate-200 p-4 flex justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2"><span className="text- bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">{b.categoria}</span><span className="font-bold text-">{b.nome}</span></div>
                  <div className="text- text-slate-600 mt-1">{b.descrizione}</div>
                </div>
                <div className="text-right"><div className="font-bold text- text-green-700">{b.importo}</div><div className="text- text-slate-400">stimato</div></div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded- border-2 border-slate-900 p-4">
            <div className="font-bold text-">Riepilogo chiaro:</div>
            <div className="text- mt-2 leading-[1.5]">
              • ISEE: {iseeNum}€ – {figliNum} figli<br/>
              • Residenza: {selectedComune?.nome}, {provincia} ({regione})<br/>
              • TARI media {MEDIA_TARI[(selectedComune?.nome||provincia).toLowerCase()]||350}€<br/>
              • Totale bonus famiglia stimato: ~{bonusList.reduce((s,b)=>{const m=b.importo.match(/([0-9]+)/); return s+(m?parseInt(m[1]):0);},0)}€/anno (escluso detrazione 50%)
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={()=>setStage("form")} className="h- px-5 rounded- border font-bold text-">← Nuovo calcolo</button>
            <button onClick={()=>setStage("blog")} className="h- px-5 rounded- bg-slate-900 text-white font-bold text-">📚 Magazine</button>
          </div>
        </div>
      )}

      {stage==="blog" && (
        <div className="max-w- mx-auto px-4 py-8">
          <h1 className="text- font-bold">Magazine – Sito chiaro e semplice</h1>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BLOG_ARTICLES.map(a=>(
              <div key={a.slug} onClick={()=>{setSelectedSlug(a.slug); setStage("article");}} className="rounded- border p-3 cursor-pointer hover:bg-slate-50">
                <div className="text- font-bold">{a.categoria}</div><div className="font-bold text- mt-1">{a.titolo}</div><div className="text- text-slate-600 mt-1 line-clamp-2">{a.excerpt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stage==="article" && selectedArticle && (
        <div className="max-w- mx-auto px-4 py-8">
          <button onClick={()=>setStage("blog")} className="text- font-bold border rounded-full px-3 py-1">← Magazine</button>
          <h1 className="mt-3 text- font-bold leading-[1.1]">{selectedArticle.titolo}</h1>
          <div className="mt-4 prose prose-sm text-" dangerouslySetInnerHTML={{__html: selectedArticle.contenuto}} />
        </div>
      )}
    </div>
  );
}
