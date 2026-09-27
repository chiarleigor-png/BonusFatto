import b1 from './batch1_125.json' with { type: 'json' };
import b2 from './batch2_125.json' with { type: 'json' };
import b3 from './batch3_125.json' with { type: 'json' };
import b4 from './batch4_125.json' with { type: 'json' };

export const TOP500 = [...b1, ...b2, ...b3, ...b4];
