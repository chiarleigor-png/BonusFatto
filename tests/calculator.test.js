import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculate, countdown, emailTemplate } from '../src/benefits.js';
import {
  fetchMunicipalities,
  normalizeDataset,
  searchMunicipalities,
  findCapital,
} from '../src/geography.js';
const fallback = JSON.parse(
  readFileSync(new URL('../src/fallback.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''),
);
const municipality = { name: 'Roma', province: 'Roma', region: 'Lazio' };
const simulate = (isee, children = 1) => calculate({ isee, children, municipality });

test('TARI boundaries match the specified demonstration bands', () => {
  for (const [isee, expected] of [
    [0, 100],
    [8000, 100],
    [8000.01, 50],
    [15000, 50],
    [15000.01, 25],
    [26530, 25],
    [26530.01, 0],
  ])
    assert.equal(simulate(isee).tariPercent, expected);
  assert.equal(simulate(8000).benefits.find((b) => b.id === 'tari').amount, 360);
  assert.equal(
    calculate({ isee: 10000, children: 0, municipality: { name: 'Unknown' } }).tariBase,
    350,
  );
});
test('Utility thresholds include four children at exactly 20000', () => {
  const has = (i, c) => simulate(i, c).benefits.some((b) => b.id === 'utilities');
  assert.equal(has(9530, 0), true);
  assert.equal(has(9530.01, 1), false);
  assert.equal(has(20000, 4), true);
  assert.equal(has(20000.01, 4), false);
  assert.equal(has(20000, 3), false);
});
test('Every benefit and total are conditional and correctly annualized', () => {
  const result = simulate(7000, 2);
  assert.equal(result.benefits.length, 10);
  assert.equal(result.benefits.find((b) => b.id === 'children').amount, 199 * 2 * 12);
  assert.equal(result.benefits.find((b) => b.id === 'purchases').amount, 480);
  assert.equal(result.total, 14866);
  assert.equal(result.total, result.recurring + result.conditional);
  assert.equal(result.benefits.find((b) => b.id === 'renovation').amount, null);
  assert.equal(simulate(60000, 0).total, 0);
});
test('Invalid input is rejected', () => {
  for (const [i, c] of [
    [NaN, 1],
    [-1, 1],
    [1000, -1],
    [1000, 6],
    [1000, 1.5],
  ])
    assert.throws(() => simulate(i, c));
});
test('Fallback has 100+ unique municipalities and covers 20 regions', () => {
  assert.ok(fallback.length >= 100);
  assert.equal(new Set(fallback.map((c) => c.region)).size, 20);
  assert.equal(new Set(fallback.map((c) => c.id)).size, fallback.length);
  assert.equal(findCapital(fallback, 'Lazio', 'Roma').name, 'Roma');
  assert.ok(fallback.some((c) => c.name === 'Fiumicino'));
});
test('Search filters region and province, ignores case and limits to 80', () => {
  assert.equal(searchMunicipalities(fallback, 'Lazio', 'Roma', 'FIUM')[0].name, 'Fiumicino');
  assert.equal(searchMunicipalities(fallback, 'Liguria', 'Imperia', 'Roma').length, 0);
  const fake = Array.from({ length: 100 }, (_, i) => ({
    name: `Town ${i}`,
    region: 'A',
    province: 'B',
  }));
  assert.equal(searchMunicipalities(fake, 'A', 'B').length, 80);
});
test('Expired deadlines never show negative values; future deadline counts down', () => {
  assert.deepEqual(countdown('2026-02-28T23:59:59+01:00', new Date('2026-09-13').getTime()), {
    expired: true,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  assert.equal(
    countdown('2026-03-16T23:59:59+01:00', new Date('2026-03-15T23:59:59+01:00').getTime()).days,
    1,
  );
});
test('Email requests confirmation rather than asserting an entitlement', () => {
  const email = emailTemplate({ municipality, isee: 8000 });
  assert.ok(email.includes('Comune Roma'));
  assert.ok(email.includes('scadenze 2026'));
});
test('Malformed datasets are rejected; timeout handles a stalled body', async () => {
  assert.throws(() => normalizeDataset([]));
  await assert.rejects(fetchMunicipalities(async () => ({ ok: false }), 20));
  await assert.rejects(
    fetchMunicipalities(async () => ({ ok: true, json: () => new Promise(() => {}) }), 20),
    /Timeout/,
  );
});
