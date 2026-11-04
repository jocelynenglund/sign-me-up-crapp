// Core logic: pure functions over a state object { sheets: [], signups: [] }.
// sheet:  { id, title, when, spots }
// signup: { id, sheetId, name, status: 'confirmed' | 'waiting', position (waitlist pos, 0 if confirmed), createdAt }

let counter = 0;
const newId = () => `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const emptyState = () => ({ sheets: [], signups: [] });

export function createSheet(state, { title, when, spots }) {
  title = String(title ?? '').trim();
  spots = Number(spots);
  if (!title) throw new Error('Title is required');
  if (!Number.isInteger(spots) || spots < 1) throw new Error('Spots must be a whole number of at least 1');
  const sheet = { id: newId(), title, when: when || '', spots };
  state.sheets.push(sheet);
  return sheet;
}

export function deleteSheet(state, sheetId) {
  state.sheets = state.sheets.filter((s) => s.id !== sheetId);
  state.signups = state.signups.filter((s) => s.sheetId !== sheetId);
}

export const confirmedFor = (state, sheetId) =>
  state.signups.filter((s) => s.sheetId === sheetId && s.status === 'confirmed');

export const waitlistFor = (state, sheetId) =>
  state.signups.filter((s) => s.sheetId === sheetId && s.status === 'waiting').sort((a, b) => a.position - b.position);

export function spotsLeft(state, sheetId) {
  const sheet = state.sheets.find((s) => s.id === sheetId);
  return sheet ? Math.max(0, sheet.spots - confirmedFor(state, sheetId).length) : 0;
}

export function signUp(state, sheetId, name) {
  const sheet = state.sheets.find((s) => s.id === sheetId);
  if (!sheet) throw new Error('Sheet not found');
  name = String(name ?? '').trim();
  if (!name) throw new Error('Name is required');
  const dupe = state.signups.some((s) => s.sheetId === sheetId && s.name.toLowerCase() === name.toLowerCase());
  if (dupe) throw new Error(`${name} is already on this sheet`);
  const full = spotsLeft(state, sheetId) === 0;
  const signup = {
    id: newId(), sheetId, name,
    status: full ? 'waiting' : 'confirmed',
    position: full ? waitlistFor(state, sheetId).length + 1 : 0,
    createdAt: Date.now(),
  };
  state.signups.push(signup);
  return signup;
}

function renumber(state, sheetId) {
  waitlistFor(state, sheetId).forEach((s, i) => { s.position = i + 1; });
}

// Cancel a signup (confirmed or waiting). If a confirmed spot frees up, first waiting person moves up.
export function cancel(state, signupId) {
  const signup = state.signups.find((s) => s.id === signupId);
  if (!signup) throw new Error('Signup not found');
  state.signups = state.signups.filter((s) => s.id !== signupId);
  let promoted = null;
  if (signup.status === 'confirmed') {
    promoted = waitlistFor(state, signup.sheetId)[0] || null;
    if (promoted) { promoted.status = 'confirmed'; promoted.position = 0; }
  }
  renumber(state, signup.sheetId);
  return promoted;
}

export const leaveWaitlist = cancel;

export function load(storage, key = 'sign-me-up') {
  try {
    const s = JSON.parse(storage.getItem(key));
    if (s && Array.isArray(s.sheets) && Array.isArray(s.signups)) return s;
  } catch {}
  return emptyState();
}

export function save(storage, state, key = 'sign-me-up') {
  storage.setItem(key, JSON.stringify(state));
}
