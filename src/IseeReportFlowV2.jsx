import { useMemo, useState } from 'react';
import { calculate, euro } from './benefits.js';

const ENTRY_KEY = 'bonusfatto_report_entry';
const ANALYSIS_KEY = 'bonusfatto_report_analysis';
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

function safeParse(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function parseEuro(value) {
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function firstMoney(flat, patterns) {
  for (const pattern of patterns) {
    const match = flat.match(pattern);
    if (match) {
      const value = parseEuro(match[1]);
      if (value !== null) return value;
    }
  }
  return null;
}

function fiscalCodeBirthDate(cf, now = new Date()) {
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(cf || '')) return null;
  const code = cf.toUpperCase();
  const yy = Number(code.slice(6, 8));
  const monthMap = { A:0, B:1, C:2, D:3, E:4, H:5, L:6, M:7, P:8, R:9, S:10, T:11 };
  const month = monthMap[code[8]];
  let day = Number(code.slice(9, 11));
  if (!Number.isInteger(month) || !Number.isFinite(day)) return null;
  if (day > 40) day -= 40;
  const currentYY = now.getFullYear() % 100;
  let year = yy <= currentYY ? 2000 + yy : 1900 + yy;
  let date = new Date(year, month, day);
  if (date > now || now.getFullYear() - year > 110) {
    year -= 100;
    date = new Date(year, month, day);
  }
  return date;
}

function ageAt(date, now = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  let age = now.getFullYear() - date.getFullYear();
  const beforeBirthday = now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function householdFiscalCodes(text) {
  const flat = String(text || '').replace(/\s+/g, ' ');
  const start = flat.search(/NUCLEO\s+FAMILIARE\s+DEL\s+DICHIARANTE/i);
  const end = flat.search(/(?:è\s+stato\s+calcolato\s+il\s+seguente\s+indicatore|ISEE\s+ORDINARIO)/i);
  const section = start >= 0 ? flat.slice(start, end > start ? end : Math.min(flat.length, start + 2500)) : flat.slice(0, 3000);
  const matches = section.match(/[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/gi) || [];
  return [...new Set(matches.map((x) => x.toUpperCase()))];
}

function extractIseeFields(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  const ordinaryIsee = firstMoney(flat, [
    /ISEE\s+ORDINARIO[^\d]{0,220}(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i,
    /indicatore\s+della\s+situazione\s+economica\s+equivalente\s*\(ISEE\)[^\d]{0,180}(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i,
  ]);
  const familyIsee = firstMoney(flat, [
    /SPECIFICHE\s+PRESTAZIONI\s+FAMILIARI\s+E\s+PER\s+L['’]INCLUSIONE[^]{0,900}?indicatore\s+della\s+situazione\s+economica\s+equivalente[^\d]{0,120}(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i,
  ]);
  const familyIncome = firstMoney(flat, [/Somma\s+dei\s+redditi\s+dei\s+componenti\s+del\s+nucleo\s+(?:Euro|€)?\s*\+?\s*([0-9.]+,[0-9]{2})/i]);
  const movableAssets = firstMoney(flat, [/Patrimonio\s+mobiliare\s+del\s+nucleo\s+(?:Euro|€)?\s*\+?\s*([0-9.]+,[0-9]{2})/i]);
  const realEstateAssets = firstMoney(flat, [/Patrimonio\s+immobiliare\s+del\s+nucleo\s+(?:Euro|€)?\s*\+?\s*([0-9.]+,[0-9]{2})/i]);

  const fiscalCodes = householdFiscalCodes(text);
  const ages = fiscalCodes.map((cf) => ageAt(fiscalCodeBirthDate(cf))).filter(Number.isFinite);
  const childAges = ages.filter((age) => age >= 0 && age < 18).sort((a,b) => a-b);
  const household = fiscalCodes.length || null;

  return {
    isee: ordinaryIsee,
    familyIsee,
    familyIncome,
    movableAssets,
    realEstateAssets,
    fiscalCodes,
    ages,
    childAges,
    household,
    demographicsKnown: fiscalCodes.length > 0,
    hasOver60: ages.some((age) => age >= 60),
    hasOver65: ages.some((age) => age >= 65),
    hasAdult18to59: ages.some((age) => age >= 18 && age <= 59),
    year2026: /\b2026\b/.test(flat),
  };
}

async function readPdfText(file) {
  const pdfjs = await import(/* @vite-ignore */ PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n += 1) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || '').join(' '));
  }
  return pages.join('\n');
}

function SelectField({ label, value, onChange, children }) {
  return <label className="bfq-field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} required>{children}</select></label>;
}
function NumberField({ label, value, onChange, min = 0, max, step = '0.01' }) {
  return <label className="bfq-field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} required /></label>;
}
function FlowShell({ children }) {
  return <div className="app-shell bfq-shell"><header className="site-header"><span className="brand"><span className="brand-mark">B</span><span>BonusFatto<span className="brand-dot">.it</span></span></span></header><main>{children}</main><footer className="site-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Analisi con relazione</span></footer></div>;
}

function PdfSummary({ entry, fields }) {
  const manual = Number(entry?.isee);
  const pdfIsee = Number(fields.isee);
  const mismatch = Number.isFinite(manual) && Number.isFinite(pdfIsee) && Math.abs(manual - pdfIsee) > 0.01;
  const rows = [
    ['ISEE ordinario', fields.isee != null ? euro(fields.isee) : null],
    ['ISEE prestazioni familiari/inclusione', fields.familyIsee != null ? euro(fields.familyIsee) : null],
    ['Componenti nucleo', fields.household != null ? String(fields.household) : null],
    ['Minori rilevati', fields.demographicsKnown ? String(fields.childAges.length) : null],
    ['Età minori', fields.childAges.length ? fields.childAges.join(', ') : fields.demographicsKnown ? 'Nessuno' : null],
    ['Presenza 60+', fields.demographicsKnown ? (fields.hasOver60 ? 'Sì' : 'No') : null],
    ['Presenza 65+', fields.demographicsKnown ? (fields.hasOver65 ? 'Sì' : 'No') : null],
    ['Somma redditi nucleo', fields.familyIncome != null ? euro(fields.familyIncome) : null],
    ['Patrimonio mobiliare', fields.movableAssets != null ? euro(fields.movableAssets) : null],
    ['Patrimonio immobiliare', fields.realEstateAssets != null ? euro(fields.realEstateAssets) : null],
  ].filter(([,v]) => v != null);
  return <div className="bfq-extracted"><div className="bfq-extracted-head"><span>✓</span><div><strong>Dati recuperati dall’attestazione</strong><small>Questi dati non vengono richiesti di nuovo.</small></div></div><div className="bfq-data-grid">{rows.map(([k,v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>{mismatch ? <div className="bfq-isee-warning"><strong>ISEE corretto dall’attestazione.</strong> Hai inserito {euro(manual)}, ma il documento riporta {euro(pdfIsee)}. Usiamo il valore dell’attestazione.</div> : <div className="bfq-isee-ok">Il valore ISEE inserito coincide con quello dell’attestazione.</div>}</div>;
}

function Questions({ entry, fields, onBack, onComplete }) {
  const knownChildren = fields.demographicsKnown ? fields.childAges.length : Math.max(0, Math.min(5, Number(entry?.figli) || 0));
  const [answers, setAnswers] = useState({
    household: fields.household ?? '', children: knownChildren, childAges: fields.demographicsKnown ? fields.childAges : Array.from({length:knownChildren},()=>''),
    ageBand: fields.demographicsKnown ? (fields.hasOver65 ? '65plus' : fields.hasOver60 ? '60-64' : 'none') : '',
    disability:'', unemployed:'', disadvantage:'', housing:'', annualRent:'', electricitySupply:'', gasSupply:'', waterSupply:'', residentAllItaly:'', dedicatedIncompatible:'', nursery:'', event2026:'', motherWork:'', motherIncome:'', maternityBenefit:'', adiResidence:'', adiFamilyIncome:fields.familyIncome ?? '', adiMovableAssets:fields.movableAssets ?? '', adiRealEstateAssets:fields.realEstateAssets ?? '', adiVehicles:'', adiResignation:'', renovation:'', renovationAmount:'', renovationEligible:''
  });
  const [error,setError]=useState('');
  const effectiveIsee = Number(fields.isee);
  const adiIsee = Number.isFinite(Number(fields.familyIsee)) ? Number(fields.familyIsee) : effectiveIsee;
  const children = Number(answers.children);
  const childAges = answers.childAges.map(Number).filter(Number.isFinite);
  const hasYoung = childAges.some((age)=>age<=3);
  const showAdi = Number.isFinite(adiIsee) && adiIsee <= 10140 && (children>0 || answers.disability==='yes' || answers.ageBand==='60-64' || answers.ageBand==='65plus' || answers.disadvantage==='yes');
  const set=(name,value)=>setAnswers((cur)=>({...cur,[name]:value}));
  function setChildren(value){const count=Math.max(0,Math.min(5,Number(value)||0));setAnswers((cur)=>({...cur,children:count,childAges:Array.from({length:count},(_,i)=>cur.childAges[i]??'')}));}
  function setChildAge(i,value){setAnswers((cur)=>{const a=[...cur.childAges];a[i]=value;return {...cur,childAges:a};});}

  function submit(e){
    e.preventDefault(); setError('');
    const household=Number(answers.household); const allChildAges=answers.childAges.map(Number);
    if(!Number.isFinite(effectiveIsee)) return setError('Non siamo riusciti a leggere il valore ISEE dall’attestazione.');
    if(!Number.isInteger(household)||household<1) return setError('Indica il numero dei componenti del nucleo.');
    if(!fields.demographicsKnown && children>0 && allChildAges.some((a)=>!Number.isFinite(a)||a<0||a>40)) return setError('Indica l’età dei figli.');
    if(!answers.disability||!answers.housing) return setError('Completa i dati personali mancanti.');
    if(fields.hasAdult18to59 && !answers.unemployed) return setError('Indica la situazione lavorativa/formativa richiesta.');
    if(!answers.disadvantage) return setError('Indica se ricorre una condizione di svantaggio rilevante.');
    if(![answers.electricitySupply,answers.gasSupply,answers.waterSupply].every((v)=>v==='yes'||v==='no')) return setError('Completa le domande sulle utenze.');
    if(effectiveIsee<=15000 && (!answers.residentAllItaly||!answers.dedicatedIncompatible)) return setError('Completa le domande per Carta Dedicata a Te.');
    if(children>0 && (!answers.event2026||!answers.nursery||!answers.motherWork||!answers.maternityBenefit)) return setError('Completa le domande dedicate alla famiglia.');
    if(answers.motherWork && answers.motherWork!=='none' && !answers.motherIncome) return setError('Completa il dato sul reddito della madre.');
    if(answers.housing==='rent' && !Number.isFinite(Number(answers.annualRent))) return setError('Inserisci il canone annuo di affitto.');
    if(!answers.renovation) return setError('Indica se hai sostenuto spese di ristrutturazione nel 2026.');
    if(answers.renovation==='yes' && (!Number.isFinite(Number(answers.renovationAmount))||!answers.renovationEligible)) return setError('Completa i dati sulle ristrutturazioni.');
    if(showAdi){const nums=[answers.adiFamilyIncome,answers.adiMovableAssets,answers.adiRealEstateAssets].map(Number);if(nums.some((v)=>!Number.isFinite(v)||v<0)||!answers.adiResidence||!answers.adiVehicles||!answers.adiResignation)return setError('Completa i dati mancanti per ADI.');}

    const profile={children,childAges:allChildAges,household,over60:answers.ageBand==='60-64'||answers.ageBand==='65plus'?'yes':'no',over65:answers.ageBand==='65plus'?'yes':'no',disability:answers.disability,unemployed:answers.unemployed||'no',disadvantage:answers.disadvantage,housing:answers.housing,annualRent:answers.housing==='rent'?Number(answers.annualRent):0,electricitySupply:answers.electricitySupply,gasSupply:answers.gasSupply,waterSupply:answers.waterSupply,residentAllItaly:answers.residentAllItaly||'no',dedicatedIncompatible:answers.dedicatedIncompatible||'yes',nursery:answers.nursery||'no',event2026:answers.event2026==='none'?'':answers.event2026,motherWork:answers.motherWork==='none'?'':answers.motherWork,motherIncome:answers.motherIncome||'no',maternityBenefit:answers.maternityBenefit||'no',familyIsee:Number.isFinite(Number(fields.familyIsee))?Number(fields.familyIsee):'',adiResidence:showAdi?answers.adiResidence:'',adiFamilyIncome:showAdi?Number(answers.adiFamilyIncome):'',adiMovableAssets:showAdi?Number(answers.adiMovableAssets):'',adiRealEstateAssets:showAdi?Number(answers.adiRealEstateAssets):'',adiVehicles:showAdi?answers.adiVehicles:'',adiResignation:showAdi?answers.adiResignation:'',renovation:answers.renovation,renovationAmount:answers.renovation==='yes'?Number(answers.renovationAmount):0,renovationEligible:answers.renovation==='yes'?answers.renovationEligible:'no'};
    const input={isee:effectiveIsee,children,municipality:{name:entry.comune},profile};
    onComplete({input,profile,extracted:fields});
  }

  return <section className="bfq-page page-enter"><button className="text-button" type="button" onClick={onBack}>← Cambia attestazione</button><div className="bfq-title"><span className="eyebrow">PASSAGGIO 2</span><h1>Completiamo solo ciò che manca.</h1><p>Età, minori, componenti e dati economici vengono recuperati automaticamente dall’attestazione quando disponibili.</p></div><PdfSummary entry={entry} fields={fields}/><form onSubmit={submit} className="bfq-form">
    <section className="bfq-section"><div className="bfq-section-head"><span>1</span><div><h2>Dati personali mancanti</h2><p>Solo informazioni che l’attestazione non certifica.</p></div></div><div className="bfq-fields">
      {fields.household==null && <NumberField label="Componenti del nucleo" value={answers.household} onChange={(v)=>set('household',v)} min={1} max={20} step="1"/>}
      {!fields.demographicsKnown && <><SelectField label="Figli a carico" value={answers.children} onChange={setChildren}>{[0,1,2,3,4,5].map((n)=><option key={n} value={n}>{n}</option>)}</SelectField><SelectField label="Età più elevata nel nucleo" value={answers.ageBand} onChange={(v)=>set('ageBand',v)}><option value="">Seleziona</option><option value="none">Nessuno ha 60 anni</option><option value="60-64">Almeno una persona ha 60–64 anni</option><option value="65plus">Almeno una persona ha 65 anni o più</option></SelectField></>}
      <SelectField label="Disabilità nel nucleo" value={answers.disability} onChange={(v)=>set('disability',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
      {fields.hasAdult18to59 && <SelectField label="Persona 18–59 senza lavoro disponibile a formazione" value={answers.unemployed} onChange={(v)=>set('unemployed',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>}
      <SelectField label="Condizione di svantaggio rilevante per ADI" value={answers.disadvantage} onChange={(v)=>set('disadvantage',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
      <SelectField label="Abitazione" value={answers.housing} onChange={(v)=>set('housing',v)}><option value="">Seleziona</option><option value="owner">Abitazione principale di proprietà / diritto reale</option><option value="rent">In affitto</option><option value="other">Altro</option></SelectField>
      {answers.housing==='rent' && <NumberField label="Canone annuo di affitto" value={answers.annualRent} onChange={(v)=>set('annualRent',v)}/>} 
    </div></section>
    {!fields.demographicsKnown && children>0 && <section className="bfq-section"><div className="bfq-section-head"><span>2</span><div><h2>Età dei figli</h2><p>Richiesta solo perché non siamo riusciti a ricavarla dal documento.</p></div></div><div className="bfq-fields">{answers.childAges.map((age,i)=><NumberField key={i} label={`Figlio ${i+1}`} value={age} onChange={(v)=>setChildAge(i,v)} min={0} max={40} step="1"/>)}</div></section>}
    <section className="bfq-section"><div className="bfq-section-head"><span>3</span><div><h2>Utenze domestiche</h2><p>Servono per stabilire quali bonus sociali spettano.</p></div></div><div className="bfq-fields"><SelectField label="Luce idonea" value={answers.electricitySupply} onChange={(v)=>set('electricitySupply',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField><SelectField label="Gas idoneo" value={answers.gasSupply} onChange={(v)=>set('gasSupply',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField><SelectField label="Acqua idonea" value={answers.waterSupply} onChange={(v)=>set('waterSupply',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField></div></section>
    {effectiveIsee<=15000 && <section className="bfq-section"><div className="bfq-section-head"><span>4</span><div><h2>Carta Dedicata a Te</h2></div></div><div className="bfq-fields"><SelectField label="Tutti i componenti residenti in Italia" value={answers.residentAllItaly} onChange={(v)=>set('residentAllItaly',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField><SelectField label="Prestazioni incompatibili nel nucleo" value={answers.dedicatedIncompatible} onChange={(v)=>set('dedicatedIncompatible',v)}><option value="">Seleziona</option><option value="no">No</option><option value="yes">Sì</option></SelectField></div></section>}
    {children>0 && <section className="bfq-section"><div className="bfq-section-head"><span>5</span><div><h2>Famiglia</h2></div></div><div className="bfq-fields"><SelectField label="Evento nel 2026" value={answers.event2026} onChange={(v)=>set('event2026',v)}><option value="">Seleziona</option><option value="none">Nessuno</option><option value="birth">Nascita</option><option value="adoption">Adozione</option><option value="foster">Affidamento</option></SelectField>{hasYoung && <SelectField label="Frequenza asilo nido" value={answers.nursery} onChange={(v)=>set('nursery',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>}<SelectField label="Situazione lavorativa della madre" value={answers.motherWork} onChange={(v)=>set('motherWork',v)}><option value="">Seleziona</option><option value="none">Non applicabile / non lavora</option><option value="employee">Lavoratrice dipendente</option><option value="self">Lavoratrice autonoma</option></SelectField>{answers.motherWork&&answers.motherWork!=='none'&&<SelectField label="Reddito personale da lavoro entro 40.000 €" value={answers.motherIncome} onChange={(v)=>set('motherIncome',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>}<SelectField label="Indennità di maternità già percepita" value={answers.maternityBenefit} onChange={(v)=>set('maternityBenefit',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField></div></section>}
    {showAdi && <section className="bfq-section"><div className="bfq-section-head"><span>6</span><div><h2>Assegno di Inclusione</h2><p>I dati economici già presenti nell’ISEE non vengono richiesti di nuovo.</p></div></div><div className="bfq-fields"><SelectField label="Requisiti soggiorno/residenza soddisfatti" value={answers.adiResidence} onChange={(v)=>set('adiResidence',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>{fields.familyIncome==null&&<NumberField label="Reddito familiare annuo" value={answers.adiFamilyIncome} onChange={(v)=>set('adiFamilyIncome',v)}/>} {fields.movableAssets==null&&<NumberField label="Patrimonio mobiliare" value={answers.adiMovableAssets} onChange={(v)=>set('adiMovableAssets',v)}/>} {fields.realEstateAssets==null&&<NumberField label="Patrimonio immobiliare" value={answers.adiRealEstateAssets} onChange={(v)=>set('adiRealEstateAssets',v)}/>}<SelectField label="Veicoli incompatibili" value={answers.adiVehicles} onChange={(v)=>set('adiVehicles',v)}><option value="">Seleziona</option><option value="no">No</option><option value="yes">Sì</option></SelectField><SelectField label="Dimissioni volontarie rilevanti" value={answers.adiResignation} onChange={(v)=>set('adiResignation',v)}><option value="">Seleziona</option><option value="no">No</option><option value="yes">Sì</option></SelectField></div></section>}
    <section className="bfq-section"><div className="bfq-section-head"><span>7</span><div><h2>Ristrutturazioni</h2></div></div><div className="bfq-fields"><SelectField label="Spese agevolabili nel 2026" value={answers.renovation} onChange={(v)=>set('renovation',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>{answers.renovation==='yes'&&<><NumberField label="Spesa sostenuta" value={answers.renovationAmount} onChange={(v)=>set('renovationAmount',v)}/><SelectField label="Intervento agevolabile e documentato" value={answers.renovationEligible} onChange={(v)=>set('renovationEligible',v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No / da verificare</option></SelectField></>}</div></section>
    {error&&<p className="checkout-error" role="alert">{error}</p>}<button className="primary" type="submit" style={{width:'100%',marginTop:20}}>Prepara anteprima gratuita</button>
  </form></section>;
}

function Preview({data,onBack,onOpen}){
  const result=useMemo(()=>calculate(data.input),[data]);
  return <section className="bfq-page page-enter"><button className="text-button" type="button" onClick={onBack}>← Modifica risposte</button><div className="bfq-title"><span className="eyebrow">ANTEPRIMA PRONTA</span><h1>Abbiamo individuato <span>{result.benefits.length} agevolazioni</span>.</h1><p>Modalità test gratuita: nessun pagamento richiesto.</p></div><div className="bfq-preview-grid">{result.benefits.map((b,i)=><article className="bf-preview-card-v3" key={b.id||i}><div className="bf-card-blurred"><div className="bf-card-index">{String(i+1).padStart(2,'0')}</div><div><span className="category">AGEVOLAZIONE INDIVIDUATA</span><h3>{b.name}</h3><p>Dettagli disponibili nel risultato completo.</p></div></div><div className="bf-preview-lock-overlay"><span className="bf-preview-lock-pill">🔒 Anteprima</span></div></article>)}</div><article className="plan-card featured" style={{maxWidth:720,margin:'24px auto 0'}}><span className="plan-badge">TEST GRATUITO</span><h2>Apri risultato e relazione</h2><div className="plan-price">0,00 €</div><p>Nessun checkout e nessun addebito durante i test.</p><button className="primary" type="button" onClick={onOpen} style={{width:'100%'}}>Apri analisi gratuita</button></article></section>;
}

function Result({data,onBack}){
  const result=useMemo(()=>calculate(data.input),[data]);
  async function downloadReport(){
    const response=await fetch('/api/report-test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(!response.ok){alert('Relazione di test non disponibile.');return;}
    const blob=await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='BonusFatto_Relazione_TEST.pdf'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="results page-enter"><button className="text-button" type="button" onClick={onBack}>← Torna all’anteprima</button><div className="paid-banner">✓ Modalità test gratuita · 0 €</div><div className="result-heading"><div><span className="eyebrow">RISULTATO COMPLETO</span><h1><span>{result.benefits.length} agevolazioni</span><br/>individuate.</h1><p className="lead">{data.input.municipality.name} · ISEE {euro(data.input.isee)}</p></div></div><div className="bonus-list">{result.benefits.map((b,i)=><article className="bonus-card" key={b.id||i}><div className={`bonus-icon color-${i%3}`}>✓</div><div className="bonus-body"><span className="category">{b.category}</span><h3>{b.name}</h3><p>{b.description}</p></div><div className="bonus-amount"><strong>{euro(b.amount)}</strong><span>{b.period||''}</span></div></article>)}</div><button className="primary" type="button" onClick={downloadReport} style={{marginTop:24}}>Scarica relazione PDF di test</button></section>;
}

export default function IseeReportFlowV2(){
  const [entry]=useState(()=>safeParse(sessionStorage.getItem(ENTRY_KEY),null));
  const [stage,setStage]=useState('upload'); const [file,setFile]=useState(null); const [fields,setFields]=useState(null); const [analysis,setAnalysis]=useState(null); const [reading,setReading]=useState(false); const [error,setError]=useState('');
  if(!entry?.comune)return <FlowShell><section className="bfq-page"><div className="bfq-title"><h1>Dati del calcolo non disponibili.</h1><p>Torna alla home e avvia nuovamente l’Analisi con relazione.</p></div></section></FlowShell>;
  if(stage==='questions'&&fields)return <FlowShell><Questions entry={entry} fields={fields} onBack={()=>setStage('upload')} onComplete={(data)=>{sessionStorage.setItem(ANALYSIS_KEY,JSON.stringify(data));setAnalysis(data);setStage('preview');}}/></FlowShell>;
  if(stage==='preview'&&analysis)return <FlowShell><Preview data={analysis} onBack={()=>setStage('questions')} onOpen={()=>setStage('result')}/></FlowShell>;
  if(stage==='result'&&analysis)return <FlowShell><Result data={analysis} onBack={()=>setStage('preview')}/></FlowShell>;
  async function analyse(){if(!file)return;setReading(true);setError('');try{const text=await readPdfText(file);if(!text.trim())throw new Error('Il PDF non contiene testo leggibile.');const extracted=extractIseeFields(text);if(!extracted.year2026)throw new Error('Non risulta un’attestazione ISEE 2026.');if(extracted.isee==null)throw new Error('Non siamo riusciti a leggere il valore ISEE ordinario.');setFields(extracted);setStage('questions');}catch(err){setError(err?.message||'Non è stato possibile leggere il PDF.');}finally{setReading(false);}}
  return <FlowShell><section className="bfq-page page-enter"><div className="bfq-title"><span className="eyebrow">ANALISI CON RELAZIONE · TEST GRATUITO</span><h1>Carica il tuo <span>ISEE 2026</span>.</h1><p>Il sistema recupera automaticamente tutti i dati leggibili e ti chiede soltanto quelli mancanti.</p></div><article className="bfq-upload-card"><span className="plan-badge">PASSAGGIO 1</span><h2>Attestazione ISEE 2026</h2><p>Carica soltanto l’attestazione PDF. Non serve la DSU.</p><label className="bfq-file-label"><span>Seleziona il PDF</span><input type="file" accept="application/pdf,.pdf" onChange={(e)=>{const selected=e.target.files?.[0]||null;setError('');setFields(null);setFile(null);setAnalysis(null);if(!selected)return;if(!(selected.type==='application/pdf'||selected.name.toLowerCase().endsWith('.pdf'))){setError('Carica un PDF.');e.target.value='';return;}if(selected.size>10*1024*1024){setError('Il PDF supera 10 MB.');e.target.value='';return;}setFile(selected);}}/></label>{file&&<div className="bfq-file-ok"><strong>✓ PDF selezionato</strong><span>{file.name}</span></div>}{error&&<p className="checkout-error" role="alert">{error}</p>}<button className="primary" type="button" disabled={!file||reading} onClick={analyse} style={{width:'100%',marginTop:18}}>{reading?'Lettura dell’attestazione…':'Leggi ISEE e continua · 0 €'}</button></article></section></FlowShell>;
}
