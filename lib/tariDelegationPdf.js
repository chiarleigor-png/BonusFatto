import PDFDocument from 'pdfkit';

function clean(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : '-';
}

function field(doc, label, value, x, y, w) {
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#173A5E').text(label, x, y, { width: w });
  doc.font('Helvetica').fontSize(9).fillColor('#243746').text(clean(value), x, y + 11, { width: w });
}

function section(doc, title, y) {
  doc.roundedRect(48, y, 499, 22, 3).fill('#173A5E');
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#FFFFFF').text(title, 56, y + 6, { width: 480, lineBreak: false });
  return y + 30;
}

function footer(doc, page, total) {
  doc.save();
  doc.moveTo(48, 776).lineTo(547, 776).lineWidth(0.5).strokeColor('#C8D6E2').stroke();
  doc.font('Helvetica').fontSize(6.5).fillColor('#647789')
    .text('BonusFatto - servizio gestito da LU.CA. S.r.l.s. - C.F./P.IVA 13023710018', 48, 784, { width: 390, lineBreak: false })
    .text(`Pagina ${page}/${total}`, 470, 784, { width: 77, align: 'right', lineBreak: false });
  doc.restore();
}

export function createTariDelegationPdf(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 46, bottom: 48, left: 48, right: 48 }, bufferPages: true, autoFirstPage: true });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const code = clean(order.order_code);
      const fullName = [order.customer_name, order.customer_surname].filter(Boolean).join(' ') || '-';

      doc.font('Helvetica-Bold').fontSize(18).fillColor('#173A5E').text('BonusFatto', 48, 46, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#173A5E').text('PRATICA TARI', 410, 47, { width: 137, align: 'right', lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor('#647789').text(`Codice pratica: ${code}`, 350, 60, { width: 197, align: 'right', lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor('#647789').text('Bonus, agevolazioni e pratiche in modo semplice.', 48, 68, { lineBreak: false });

      doc.font('Helvetica-Bold').fontSize(15).fillColor('#173A5E').text('DELEGA E PROCURA SPECIALE PER PRATICA TARI', 48, 100, { width: 499, align: 'center' });
      doc.font('Helvetica').fontSize(8.5).fillColor('#243746').text('Atto di conferimento dei poteri necessari alla predisposizione, presentazione e gestione della specifica pratica TARI indicata nel presente documento.', 70, 124, { width: 455, align: 'center' });

      let y = section(doc, '1. DATI DEL DELEGANTE / CONTRIBUENTE', 158);
      field(doc, 'Nome e cognome', fullName, 55, y, 230);
      field(doc, 'Codice fiscale', order.fiscal_code, 305, y, 230);
      y += 42;
      field(doc, 'Residenza', [order.billing_address, order.billing_zip, order.billing_city, order.billing_province].filter(Boolean).join(', '), 55, y, 300);
      field(doc, 'E-mail / PEC', order.pec || order.customer_email, 375, y, 160);
      y += 48;

      y = section(doc, '2. UTENZA / IMMOBILE INTERESSATO DALLA PRATICA', y);
      field(doc, 'Comune', order.calculation_municipality, 55, y, 230);
      field(doc, 'ISEE 2026', money(order.isee), 305, y, 230);
      y += 42;
      field(doc, 'Indirizzo immobile / utenza', order.tari_property_address || 'Se diverso dalla residenza', 55, y, 300);
      field(doc, 'Codice utenza TARI', order.tari_utility_code || 'Se disponibile', 375, y, 160);
      y += 48;

      y = section(doc, '3. SOGGETTO DELEGATO', y);
      doc.font('Helvetica').fontSize(8.4).fillColor('#243746').text('Il/la sottoscritto/a conferisce delega e procura speciale a LU.CA. Società a Responsabilità Limitata Semplificata, C.F./P.IVA 13023710018, quale gestore del servizio BonusFatto, affinché operi esclusivamente in relazione alla pratica TARI sopra identificata nei rapporti con il Comune e con il competente Ufficio Tributi.', 55, y, { width: 485, lineGap: 2 });
      y += 58;
      doc.roundedRect(55, y, 485, 42, 3).fillAndStroke('#EEF5FA', '#2F6FA3');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#173A5E').text('LIMITE DEL MANDATO', 64, y + 7, { lineBreak: false });
      doc.font('Helvetica').fontSize(7.8).fillColor('#243746').text('La presente delega è speciale e circoscritta alla pratica TARI indicata. Non attribuisce poteri generali di rappresentanza né autorizza attività estranee alla sua gestione.', 64, y + 19, { width: 465 });
      y += 52;

      y = section(doc, '4. POTERI ESPRESSAMENTE CONFERITI', y);
      const powers = [
        'predisporre e presentare l’istanza, dichiarazione, richiesta di agevolazione/riduzione o altra comunicazione TARI riferita alla pratica;',
        'trasmettere la pratica e i relativi allegati attraverso i canali ammessi dal Comune, inclusa PEC quando consentita;',
        'allegare e depositare i documenti consegnati dal delegante e quelli necessari alla trattazione della pratica;',
        'richiedere informazioni, chiarimenti e lo stato di lavorazione presso il competente Ufficio Tributi;',
        'ricevere e gestire richieste di integrazione, comunicazioni, ricevute, protocolli ed esiti relativi alla sola pratica delegata;',
        'trasmettere integrazioni e documentazione successiva, previa acquisizione dal delegante quando necessaria;',
        'ritirare o acquisire, anche in formato elettronico, atti e documenti conclusivi riferiti alla pratica.'
      ];
      doc.font('Helvetica').fontSize(7.7).fillColor('#243746');
      for (const p of powers) {
        doc.text(`• ${p}`, 58, y, { width: 478, lineGap: 1 });
        y = doc.y + 3;
      }

      doc.addPage();
      y = section(doc, '5. DICHIARAZIONI DEL DELEGANTE', 55);
      doc.font('Helvetica').fontSize(8.3).fillColor('#243746').text('Il delegante dichiara che i dati, le informazioni e i documenti forniti a BonusFatto/LU.CA. S.r.l.s. sono completi e corrispondenti al vero e si impegna a comunicare tempestivamente eventuali variazioni rilevanti. Resta in capo al delegante la responsabilità per le dichiarazioni concernenti la propria situazione personale, familiare, economica, patrimoniale e tributaria e per l’autenticità della documentazione trasmessa.', 55, y, { width: 485, lineGap: 2 });
      y = doc.y + 8;
      doc.text('Il delegante prende atto che il riconoscimento dell’agevolazione, riduzione o beneficio richiesto dipende dalla normativa applicabile e dalle determinazioni del Comune competente; il conferimento della delega non costituisce garanzia di accoglimento dell’istanza.', 55, y, { width: 485, lineGap: 2 });
      y = doc.y + 14;

      y = section(doc, '6. DOCUMENTI DA ALLEGARE', y);
      const docs = [
        '[ ] Attestazione ISEE 2026 in corso di validità',
        '[ ] Copia fronte/retro del documento di identità in corso di validità del delegante',
        '[ ] Presente delega firmata dal delegante',
        '[ ] Eventuale documentazione TARI già disponibile (avviso, bolletta, codice utenza o comunicazioni del Comune)',
        '[ ] Eventuali ulteriori documenti richiesti per la specifica agevolazione o dal Comune competente'
      ];
      doc.font('Helvetica').fontSize(8.2).fillColor('#243746');
      for (const item of docs) { doc.text(item, 58, y, { width: 478 }); y = doc.y + 6; }
      y += 5;

      y = section(doc, '7. TRATTAMENTO DEI DATI PERSONALI', y);
      doc.font('Helvetica').fontSize(8.1).fillColor('#243746').text('I dati personali sono trattati da LU.CA. S.r.l.s. per l’esecuzione del servizio richiesto e per la gestione della pratica, secondo l’informativa privacy BonusFatto. I dati e i documenti potranno essere comunicati al Comune, all’Ufficio Tributi e agli altri soggetti la cui partecipazione sia necessaria alla trattazione della specifica pratica, nei limiti delle finalità del mandato. Il trattamento necessario all’esecuzione del servizio non è subordinato a un consenso separato.', 55, y, { width: 485, lineGap: 2 });
      y = doc.y + 14;

      y = section(doc, '8. CONFERIMENTO DELLA DELEGA', y);
      doc.font('Helvetica').fontSize(8.2).fillColor('#243746').text('Ai sensi dell’art. 38 del D.P.R. 28 dicembre 2000, n. 445, il delegante conferisce i poteri sopra indicati per la formazione, presentazione e gestione della specifica istanza/pratica presso la Pubblica Amministrazione. La presente delega è accompagnata da copia non autenticata di un documento di identità in corso di validità del delegante.', 55, y, { width: 485, lineGap: 2 });
      y = doc.y + 18;

      doc.roundedRect(55, y, 205, 64, 3).strokeColor('#C8D6E2').stroke();
      doc.roundedRect(275, y, 265, 64, 3).strokeColor('#C8D6E2').stroke();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#173A5E').text('Luogo e data', 65, y + 10, { width: 185, align: 'center' });
      doc.font('Helvetica').fontSize(9).fillColor('#243746').text('______________________________', 65, y + 37, { width: 185, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#173A5E').text('FIRMA AUTOGRAFA DEL DELEGANTE', 285, y + 10, { width: 245, align: 'center' });
      doc.font('Helvetica').fontSize(9).fillColor('#243746').text('______________________________', 285, y + 37, { width: 245, align: 'center' });
      y += 78;

      doc.roundedRect(55, y, 485, 62, 3).fillAndStroke('#EAF6EF', '#6FA987');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#173A5E').text('COME RESTITUIRE IL MODULO', 64, y + 8, { lineBreak: false });
      doc.font('Helvetica').fontSize(7.8).fillColor('#243746').text('1. Stampa questa delega.  2. Firma nello spazio sopra.  3. Scansiona o fotografa in modo leggibile la delega firmata.  4. Carica nel form BonusFatto la delega firmata, il documento di identità e l’attestazione ISEE richiesti.', 64, y + 22, { width: 465, lineGap: 1 });
      y += 74;
      doc.font('Helvetica').fontSize(7).fillColor('#647789').text('Nota operativa: alcuni Comuni possono richiedere moduli propri, ulteriori dichiarazioni, documenti o modalità specifiche di presentazione. In tali casi BonusFatto utilizzerà la presente delega unitamente agli atti richiesti dal Comune.', 55, y, { width: 485 });

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        footer(doc, i + 1, range.count);
      }
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
