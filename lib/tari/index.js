import b1 from './batch1_125.json' with { type: 'json' };
import b2 from './batch2_125.json' with { type: 'json' };
import b3 from './batch3_125.json' with { type: 'json' };
import b4 from './batch4_125.json' with { type: 'json' };
import top100 from '../top100Comuni.json' with { type: 'json' };

// FILTRO ANTI-FAKE: toglie 00083, 900xxx e "Comune 83"
function isReal(c) {
  const istat = String(c.istat || '');
  const nome = String(c.nome || '').toLowerCase();
  return !istat.startsWith('000') && !istat.startsWith('900') && !nome.startsWith('comune ');
}

const raw500 = [...b1, ...b2, ...b3, ...b4].filter(isReal);

// Se i batch filtrati sono meno di 100, usa direttamente il top100 pulito (100 reali)
export const TOP500 = raw500.length >= 100 ? raw500 : top100.filter(isReal);
export const TOP100 = top100.filter(isReal);
