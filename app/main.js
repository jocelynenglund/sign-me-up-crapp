import * as S from './sheets.js';

const state = S.load(localStorage);
const app = document.getElementById('app');
let error = '';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const persist = () => S.save(localStorage, state);
const run = (fn) => { try { error = ''; fn(); persist(); } catch (e) { error = e.message; } render(); };
const currentId = () => location.hash.slice(1);

function renderList() {
  app.innerHTML = `
    <form id="new">
      <h2>New sheet</h2>
      <label>Title <input name="title" placeholder="Pottery class" required></label>
      <label>Date / time <input name="when" type="datetime-local"></label>
      <label>Number of spots <input name="spots" type="number" min="1" value="8" required></label>
      <button>Create sheet</button>
    </form>
    ${error ? `<p class="error">${esc(error)}</p>` : ''}
    <h2>Sheets</h2>
    ${state.sheets.length ? state.sheets.map((s) => {
      const left = S.spotsLeft(state, s.id), w = S.waitlistFor(state, s.id).length;
      return `<a class="sheet" href="#${s.id}"><div class="card row"><div><strong>${esc(s.title)}</strong><br><span class="muted">${esc(s.when ? new Date(s.when).toLocaleString() : 'No date')}</span></div>
        <div><span class="badge ${left ? '' : 'full'}">${left ? `${left} of ${s.spots} spots left` : `Full${w ? ` · ${w} waiting` : ''}`}</span></div></div></a>`;
    }).join('') : '<p class="muted">No sheets yet. Make one above.</p>'}`;
  app.querySelector('#new').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    run(() => { const sh = S.createSheet(state, Object.fromEntries(f)); location.hash = sh.id; });
  };
}

function renderSheet(sheet) {
  const going = S.confirmedFor(state, sheet.id), wait = S.waitlistFor(state, sheet.id), left = S.spotsLeft(state, sheet.id);
  app.innerHTML = `
    <p><a href="#">&larr; All sheets</a></p>
    <div class="card"><div class="row"><h2>${esc(sheet.title)}</h2><button class="link" id="del">Delete sheet</button></div>
      <p class="muted">${esc(sheet.when ? new Date(sheet.when).toLocaleString() : 'No date')} · ${left} of ${sheet.spots} spots left</p></div>
    <form id="join"><label>Your name <input name="name" required></label>
      <button>${left ? 'Sign me up' : 'Join the waitlist'}</button></form>
    ${error ? `<p class="error">${esc(error)}</p>` : ''}
    <h3>Going (${going.length}/${sheet.spots})</h3>
    <ul>${going.map((s) => `<li>${esc(s.name)} <button class="link" data-cancel="${s.id}">Cancel</button></li>`).join('') || '<li class="muted">Nobody yet</li>'}</ul>
    <h3>Waitlist (${wait.length})</h3>
    <ul>${wait.map((s) => `<li>${s.position}. ${esc(s.name)} <button class="link" data-cancel="${s.id}">Leave waitlist</button></li>`).join('') || '<li class="muted">Empty</li>'}</ul>`;
  app.querySelector('#join').onsubmit = (e) => {
    e.preventDefault();
    run(() => S.signUp(state, sheet.id, new FormData(e.target).get('name')));
  };
  app.querySelector('#del').onclick = () => { if (confirm('Delete this sheet?')) run(() => { S.deleteSheet(state, sheet.id); location.hash = ''; }); };
  app.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = () => run(() => S.cancel(state, b.dataset.cancel)));
}

function render() {
  const sheet = state.sheets.find((s) => s.id === currentId());
  sheet ? renderSheet(sheet) : renderList();
}
window.addEventListener('hashchange', () => { error = ''; render(); });
render();
