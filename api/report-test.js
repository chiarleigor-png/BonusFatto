import PDFDocument from 'pdfkit';
import { calculate, euro } from '../src/benefits.js';

function clean(value, max = 400) { return String(value ?? '').trim().slice(0, max); }
function yesNo(v) { return v === 'yes' ? 'Sì' : v === 'no' ? 'No' : 'Non indicato'; }
function housing(v) { return v === 'owner' ? 'Abitazione principale di proprietà / diritto reale' : v === 'rent' ? 'Abitazione in affitto' : v === 'other' ? 'Altra situazione abitativa' : 'Non indicata'; }

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Metodo non consentito.' }); }
  try {
    const input = req.body?.input;
    const profile = req.body?.profile || input?.profile || {};
    if (!input || !Number.isFinite(Number(input.isee)) || !input?.municipality?.name) return res.status(400).json({ error: 'Dati analisi non validi.' });
    const safeInput = { isee: Number(input.isee), children: Number(input.children) || 0, municipality: { name: clean(input.municipality.name, 120) }, profile };
    const result = calculate(safeInput);
    const doc = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 48, left: 48, right: 48 }, info: { Title: 'BonusFatto - Relazione TEST', Author: 'BonusFatto.it' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    const done = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });

    const blue = '#2563EB', green = '#16A34A', dark = '#172033', muted = '#667085', border = '#DDE3EC', light = '#F7F9FC';
    const ensure = (h = 80) => { if (doc.y + h > 760) doc.addPage(); };
    const title = (t) => { doc.font('Helvetica-Bold').fontSize(20).fillColor(dark).text(t); doc.moveDown(.45); };
    const body = (t) => { doc.font('Helvetica').fontSize(9.4).fillColor(dark).text(t, { lineGap: 3 }); doc.moveDown(.45); };
    const kv = (rows) => { const x=48,w=499,left=190,p=8; for(const [k,v] of rows){ const val=String(v??'—'); const h=Math.max(doc.heightOfString(String(k),{width:left-p*2}),doc.heightOfString(val,{width:w-left-p*2,lineGap:2}))+p*2; ensure(h+5); const y=doc.y; doc.rect(x,y,w,h).fillAndStroke(light,border); doc.moveTo(x+left,y).lineTo(x+left,y+h).strokeColor(border).stroke(); doc.fillColor(muted).font('Helvetica-Bold').fontSize(8).text(String(k),x+p,y+p,{width:left-p*2}); doc.fillColor(dark).font('Helvetica').fontSize(8.6).text(val,x+left+p,y+p,{width:w-left-p*2,lineGap:2}); doc.y=y+h; } doc.moveDown(.8); };
    const badge = (text) => { ensure(28); const width=Math.min(499,doc.widthOfString(text)+22),y=doc.y; doc.roundedRect(48,y,width,20,5).fillAndStroke('#ECFDF3',green); doc.fillColor(green).font('Helvetica-Bold').fontSize(7.5).text(text,58,y+6,{width:width-20}); doc.y=y+27; };

    doc.font('Helvetica-Bold').fontSize(28).fillColor(blue).text('Bonus', { continued:true }).fillColor(green).text('Fatto.it');
    doc.moveDown(.3); title('Relazione personalizzata 2026 · TEST GRATUITO');
    body('Documento generato in modalità test gratuita, senza pagamento.');
    kv([['Comune', safeInput.municipality.name], ['ISEE ordinario', euro(safeInput.isee)], ['ISEE prestazioni familiari/inclusione', profile.familyIsee !== '' && profile.familyIsee != null ? euro(profile.familyIsee) : 'Non distinto / non disponibile'], ['Componenti del nucleo', profile.household ?? 'Non indicato'], ['Figli/minori rilevati', safeInput.children]]);
    doc.roundedRect(48, doc.y, 499, 58, 7).fillAndStroke('#ECFDF3', green); doc.fillColor(green).font('Helvetica-Bold').fontSize(9).text('RISULTATO IN SINTESI',60,doc.y+12); doc.fillColor(dark).font('Helvetica').fontSize(10).text(`${result.benefits.length} agevolazioni individuate per il profilo corrente.`,60,doc.y+30); doc.y += 72;

    doc.addPage(); title('1. Bonus e agevolazioni individuate');
    for (const b of result.benefits) {
      ensure(120); badge(b.eligibility === 'graduatoria' || b.eligibility === 'potenzialmente-assegnabile' ? 'POTENZIALMENTE ASSEGNABILE' : 'PROFILO COMPATIBILE');
      doc.font('Helvetica-Bold').fontSize(13).fillColor(dark).text(b.name); doc.moveDown(.25);
      kv([['Esito / importo', Number.isFinite(Number(b.amount)) ? `${euro(Number(b.amount))}${b.period ? ` · ${b.period}` : ''}` : b.amount === 'spetta' ? 'Spetta' : b.amount === 'compatibile' ? 'Compatibile' : 'Importo variabile'], ['Perché compare', b.description]]);
    }

    doc.addPage(); title('2. Profilo utilizzato');
    kv([['Componenti nucleo', profile.household ?? 'Non indicato'], ['Età minori', Array.isArray(profile.childAges) && profile.childAges.length ? profile.childAges.join(', ') : 'Nessun minore rilevato'], ['Presenza persona 60+', yesNo(profile.over60)], ['Presenza persona 65+', yesNo(profile.over65)], ['Disabilità nel nucleo', yesNo(profile.disability)], ['Persona 18–59 senza lavoro disponibile a formazione', yesNo(profile.unemployed)], ['Abitazione', housing(profile.housing)], ['Utenza luce idonea', yesNo(profile.electricitySupply)], ['Utenza gas idonea', yesNo(profile.gasSupply)], ['Utenza acqua idonea', yesNo(profile.waterSupply)], ['Reddito familiare ADI', profile.adiFamilyIncome !== '' && profile.adiFamilyIncome != null ? euro(profile.adiFamilyIncome) : 'Non richiesto / non disponibile'], ['Patrimonio mobiliare ADI', profile.adiMovableAssets !== '' && profile.adiMovableAssets != null ? euro(profile.adiMovableAssets) : 'Non richiesto / non disponibile'], ['Patrimonio immobiliare ADI', profile.adiRealEstateAssets !== '' && profile.adiRealEstateAssets != null ? euro(profile.adiRealEstateAssets) : 'Non richiesto / non disponibile']]);
    body('Questa relazione di test serve esclusivamente a verificare il funzionamento del motore e del flusso di compilazione.');

    doc.end();
    const pdf = await done;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="BonusFatto_Relazione_TEST.pdf"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(pdf);
  } catch (error) {
    console.error('BonusFatto report test failed', error?.message || error);
    return res.status(500).json({ error: 'Impossibile generare la relazione di test.' });
  }
}
