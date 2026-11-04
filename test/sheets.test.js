import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../app/sheets.js';

function setup(spots = 2) {
  const st = S.emptyState();
  const sheet = S.createSheet(st, { title: 'Pottery', when: '2026-12-01T18:00', spots });
  return { st, sheet };
}

test('create sheet validates input', () => {
  const st = S.emptyState();
  assert.throws(() => S.createSheet(st, { title: ' ', spots: 3 }));
  assert.throws(() => S.createSheet(st, { title: 'x', spots: 0 }));
  assert.throws(() => S.createSheet(st, { title: 'x', spots: 1.5 }));
  assert.equal(S.createSheet(st, { title: 'x', spots: '4' }).spots, 4);
});

test('sign up confirms until full, then waitlists in order', () => {
  const { st, sheet } = setup(2);
  assert.equal(S.signUp(st, sheet.id, 'Ann').status, 'confirmed');
  assert.equal(S.signUp(st, sheet.id, 'Bo').status, 'confirmed');
  assert.equal(S.spotsLeft(st, sheet.id), 0);
  const c = S.signUp(st, sheet.id, 'Cy');
  assert.equal(c.status, 'waiting');
  assert.equal(c.position, 1);
  assert.equal(S.signUp(st, sheet.id, 'Di').position, 2);
});

test('rejects empty and duplicate names', () => {
  const { st, sheet } = setup();
  assert.throws(() => S.signUp(st, sheet.id, '  '));
  S.signUp(st, sheet.id, 'Ann');
  assert.throws(() => S.signUp(st, sheet.id, 'ann'));
  assert.throws(() => S.signUp(st, 'nope', 'Bo'));
});

test('cancel moves first waiting person up and renumbers', () => {
  const { st, sheet } = setup(1);
  const a = S.signUp(st, sheet.id, 'Ann');
  S.signUp(st, sheet.id, 'Bo');
  S.signUp(st, sheet.id, 'Cy');
  const promoted = S.cancel(st, a.id);
  assert.equal(promoted.name, 'Bo');
  assert.equal(promoted.status, 'confirmed');
  assert.deepEqual(S.confirmedFor(st, sheet.id).map((s) => s.name), ['Bo']);
  const w = S.waitlistFor(st, sheet.id);
  assert.deepEqual(w.map((s) => [s.name, s.position]), [['Cy', 1]]);
});

test('cancel with empty waitlist frees a spot', () => {
  const { st, sheet } = setup(2);
  const a = S.signUp(st, sheet.id, 'Ann');
  assert.equal(S.cancel(st, a.id), null);
  assert.equal(S.spotsLeft(st, sheet.id), 2);
});

test('leaving waitlist renumbers and does not promote anyone', () => {
  const { st, sheet } = setup(1);
  S.signUp(st, sheet.id, 'Ann');
  const b = S.signUp(st, sheet.id, 'Bo');
  S.signUp(st, sheet.id, 'Cy');
  assert.equal(S.leaveWaitlist(st, b.id), null);
  assert.deepEqual(S.confirmedFor(st, sheet.id).map((s) => s.name), ['Ann']);
  assert.deepEqual(S.waitlistFor(st, sheet.id).map((s) => [s.name, s.position]), [['Cy', 1]]);
});

test('delete sheet removes its signups only', () => {
  const { st, sheet } = setup();
  const other = S.createSheet(st, { title: 'Carpool', spots: 3 });
  S.signUp(st, sheet.id, 'Ann');
  S.signUp(st, other.id, 'Bo');
  S.deleteSheet(st, sheet.id);
  assert.equal(st.sheets.length, 1);
  assert.deepEqual(st.signups.map((s) => s.name), ['Bo']);
});

test('save/load round trips through storage and survives junk', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(S.load(storage), S.emptyState());
  const { st, sheet } = setup();
  S.signUp(st, sheet.id, 'Ann');
  S.save(storage, st);
  assert.deepEqual(S.load(storage), st);
  mem.set('sign-me-up', '{bad');
  assert.deepEqual(S.load(storage), S.emptyState());
});
