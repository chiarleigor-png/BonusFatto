import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm';

const COLORS = {
  violet: [102, 81, 209],
  violetDark: [76, 58, 169],
  violetSoft: [245, 241, 255],
  green: [79, 113, 61],
  greenSoft: [239, 247, 233],
  amber: [153, 105, 31],
  amberSoft: [255, 248, 231],
  ink: [43, 45, 40],
  muted: [104, 106, 98],
  line: [226, 220, 205],
  white: [255, 255, 255],
};

function text(el, selector, fallback = '') {
  return el.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || fallback;
}

function collectReportData() {
  const root = document.querySelector('.results');
  if (!root || !root.querySelector('.email-card')) return null;
  const lead = text(root, '.result-heading .lead').split('·').map((v) => v.trim());
  const benefits = [...root.querySelectorAll('.bonus-card')].map((card) => ({
    category: text(card, '.category', 'Agevolazione'),
    name: text(card, 'h3', 'Bonus'),
    description: text(card, '.bonus-body p'),
    amount: text(card, '.bonus-amount strong', 'Da verificare'),
    period: text(card, '.bonus-amount span'),
  }));
  const tari = root.querySelector('.result-aside .white-card');
  return {
    municipality: lead[0] || 'Comune selezionato',
    isee: (lead[1] || 'ISEE —').replace(/^ISEE\s*/i, ''),
    children: lead[2] || '—',
    total: text(root, '.total-card > strong', '—'),
    annual: text(root, '.total-card > div b', '—'),
    benefits,
    tariStatus: text(tari, '.tari-number', 'Da verificare'),
    tariText: [...(tari?.querySelectorAll('p') || [])].map((p) => p.textContent.trim()).filter(Boolean).join(' '),
    email: root.querySelector('.email-card textarea')?.value || '',
  };
}

function roundedBox(doc, x, y, w, h, fill, stroke) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...stroke);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');
}

function addWrapped(doc, value, x, y, width, size = 9, color = COLORS.ink, style = 'normal', lineHeight = 4.5) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(String(value || ''), width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function addPageHeader(doc, data, pageNo) {
  doc.setFillColor(...COLORS.violet);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BonusFatto.it', 14, 10.5);
  doc.setFontSize(8);
  doc.text(`Relazione personalizzata · ${data.municipality}`, 196, 10.5, { align: 'right' });
  doc.setDrawColor(...COLORS.line);
  doc.line(14, 283, 196, 283);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(`BonusFatto.it · Documento informativo · Pagina ${pageNo}`, 14, 288);
}

function ensureSpace(doc, data, y, needed, pageRef) {
  if (y + needed <= 275) return y;
  doc.addPage();
  pageRef.count += 1;
  addPageHeader(doc, data, pageRef.count);
  return 26;
}

function generatePdf(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageRef = { count: 1 };
  addPageHeader(doc, data, 1);

  let y = 27;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.ink);
  doc.text('La tua relazione bonus 2026', 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.violetDark);
  doc.text('Riepilogo personalizzato delle agevolazioni individuate', 14, y);
  y += 9;

  const profileW = 56;
  const profile = [
    ['Comune', data.municipality],
    ['ISEE indicato', data.isee],
    ['Nucleo', data.children],
  ];
  profile.forEach((item, i) => {
    const x = 14 + i * 61;
    roundedBox(doc, x, y, profileW, 20, COLORS.violetSoft, [218, 210, 244]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.muted);
    doc.text(item[0].toUpperCase(), x + 4, y + 6);
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.violetDark);
    doc.text(doc.splitTextToSize(item[1], 48), x + 4, y + 13);
  });
  y += 26;

  roundedBox(doc, 14, y, 117, 32, COLORS.violetSoft, [218, 210, 244]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.violetDark);
  doc.text('Il tuo quadro in sintesi', 19, y + 8);
  addWrapped(doc, `Abbiamo individuato ${data.benefits.length} agevolazioni potenzialmente compatibili con i dati inseriti.`, 19, y + 15, 105, 9, COLORS.ink, 'normal', 4.2);

  roundedBox(doc, 136, y, 60, 32, [49, 50, 44], [49, 50, 44]);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7.5);
  doc.text('TOTALE POTENZIALE', 141, y + 7);
  doc.setFontSize(18);
  doc.text(data.total, 141, y + 17);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ipotesi annuali: ${data.annual}`, 141, y + 25);
  y += 39;

  roundedBox(doc, 14, y, 182, 28, COLORS.greenSoft, [198, 220, 187]);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.setFontSize(12);
  doc.text(`TARI 2026 · ${data.municipality}`, 19, y + 8);
  doc.setFontSize(16);
  doc.text(data.tariStatus, 19, y + 17);
  if (data.tariText) addWrapped(doc, data.tariText, 83, y + 8, 106, 8.5, COLORS.ink, 'normal', 4);
  y += 35;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.ink);
  doc.text('Bonus e agevolazioni individuate', 14, y);
  y += 7;

  data.benefits.forEach((benefit, index) => {
    const accent = index % 3 === 0 ? COLORS.violet : index % 3 === 1 ? COLORS.green : COLORS.amber;
    const soft = index % 3 === 0 ? COLORS.violetSoft : index % 3 === 1 ? COLORS.greenSoft : COLORS.amberSoft;
    const descriptionLines = doc.splitTextToSize(benefit.description || '', 136);
    const h = Math.max(24, 18 + descriptionLines.length * 4);
    y = ensureSpace(doc, data, y, h + 5, pageRef);
    roundedBox(doc, 14, y, 182, h, soft, [226, 220, 205]);
    doc.setFillColor(...accent);
    doc.roundedRect(14, y, 3.5, h, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accent);
    doc.setFontSize(7.5);
    doc.text(benefit.category.toUpperCase(), 21, y + 6);
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.ink);
    doc.text(doc.splitTextToSize(benefit.name, 112), 21, y + 13);
    doc.setFontSize(12.5);
    doc.setTextColor(...accent);
    doc.text(benefit.amount, 190, y + 10, { align: 'right' });
    if (benefit.period) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      doc.text(benefit.period, 190, y + 15, { align: 'right' });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.ink);
    doc.text(descriptionLines, 21, y + 20);
    y += h + 5;
  });

  if (data.email) {
    y = ensureSpace(doc, data, y, 60, pageRef);
    roundedBox(doc, 14, y, 182, 12, COLORS.amberSoft, [233, 211, 166]);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.amber);
    doc.setFontSize(12);
    doc.text('Email / PEC pronta per il Comune', 19, y + 8);
    y += 17;
    const emailLines = doc.splitTextToSize(data.email, 170);
    emailLines.forEach((line) => {
      y = ensureSpace(doc, data, y, 5, pageRef);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.ink);
      doc.text(line, 18, y);
      y += 4;
    });
    y += 3;
  }

  y = ensureSpace(doc, data, y, 28, pageRef);
  roundedBox(doc, 14, y, 182, 22, [246, 245, 240], [229, 226, 216]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.ink);
  doc.text('Nota importante', 19, y + 7);
  addWrapped(doc, 'Documento informativo e orientativo: non costituisce certificazione del diritto o provvedimento dell’ente. Requisiti, importi, cumulabilità, scadenze e modalità di domanda devono essere verificati sulle fonti ufficiali vigenti.', 19, y + 12, 170, 7.5, COLORS.muted, 'normal', 3.5);

  const safeTown = data.municipality.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  doc.save(`BonusFatto-Relazione-${safeTown || 'bonus'}-2026.pdf`);
}

function installDownloadButton() {
  const root = document.querySelector('.results');
  const emailCard = root?.querySelector('.email-card');
  if (!root || !emailCard) return;
  if (root.querySelector('.report-top-download')) return;

  const oldButton = [...emailCard.querySelectorAll('button')].find((button) => /stampa/i.test(button.textContent) && /pdf/i.test(button.textContent));
  if (oldButton) oldButton.style.display = 'none';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary report-top-download';
  button.innerHTML = '<span aria-hidden="true">↓</span> Scarica relazione PDF';
  button.addEventListener('click', () => {
    const data = collectReportData();
    if (!data) return;
    button.disabled = true;
    const previous = button.innerHTML;
    button.textContent = 'Generazione PDF…';
    try {
      generatePdf(data);
    } finally {
      button.disabled = false;
      button.innerHTML = previous;
    }
  });

  const banner = root.querySelector('.paid-banner');
  const holder = document.createElement('div');
  holder.className = 'report-top-actions';
  holder.appendChild(button);
  if (banner) banner.insertAdjacentElement('afterend', holder);
  else root.prepend(holder);
}

const observer = new MutationObserver(installDownloadButton);
observer.observe(document.documentElement, { subtree: true, childList: true });
installDownloadButton();

/* Load the visual-only family hero stylesheet. */
if (!document.querySelector('link[data-bf-family-hero]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/family-hero.css';
  link.dataset.bfFamilyHero = 'true';
  document.head.appendChild(link);
}
