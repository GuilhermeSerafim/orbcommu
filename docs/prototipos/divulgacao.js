const byId = id => document.getElementById(id);
const participant = byId('participant');
const admin = byId('admin');
const origin = window.origin === 'null' ? '*' : window.origin;
let selected = null;
let participantCode = 'abc123';
let activeView = 'campaigns';
let statusTimer;
let editionRefresh = 0;

function publicUrl(code) {
  const url = new URL('participante/index.html',location.href);
  if (code !== null) url.searchParams.set('evento',code);
  return url.href;
}

async function refreshQueue() {
  const {requests:records} = await ensaio.snapshot();
  records.sort((a,b) => a.requestedAt - b.requestedAt || String(a.id).localeCompare(String(b.id)));
  admin.contentWindow.postMessage({type:'orb-add',records},origin);
}
function reportError() {
  byId('notice').textContent = 'Não foi possível acessar os dados do ensaio neste navegador.';
}
function show(view) {
  activeView = view;
  byId('campaigns').hidden = view !== 'campaigns';
  admin.hidden = view !== 'admin';
  participant.hidden = view !== 'event' && view !== 'general';
  if (!participant.hidden) {
    const url = publicUrl(view === 'general' ? null : participantCode);
    if (participant.src !== url || participant.dataset.revisit === 'true') participant.src = url;
    participant.dataset.revisit = 'false';
  }
  if (view === 'admin') refreshQueue().catch(reportError);
  if (view === 'campaigns' && selected) updateEdition().catch(reportError);
  document.querySelectorAll('[data-view]').forEach(button => {
    button.setAttribute('aria-pressed',String(button.dataset.view === view));
  });
}
document.querySelector('nav').addEventListener('click',event => {
  const button = event.target.closest('[data-view]');
  if (button) show(button.dataset.view);
});
window.addEventListener('message', event => {
  if (event.origin !== window.origin || !event.data) return;
  if (event.source === participant.contentWindow && event.data.type === 'orb-refresh') {
    participant.dataset.revisit = 'true';
    refreshQueue().catch(reportError);
  }
  if (event.source !== admin.contentWindow) return;
  if (event.data.type === 'orb-ready') refreshQueue().catch(reportError);
  if (event.data.type === 'orb-progress') {
    ensaio.updateRequest(event.data.id,event.data.progress).then(() => {
      ensaio.channel?.postMessage('results');
      if (activeView === 'campaigns' && selected) return updateEdition();
    }).catch(reportError);
  }
});
ensaio.channel?.addEventListener('message', event => {
  if (event.data === 'requests' || event.data === 'retention') refreshQueue().catch(reportError);
  if (activeView === 'campaigns' && ['events','requests','results'].includes(event.data)) updateEdition().catch(reportError);
});
window.addEventListener('orb-retention',() => refreshQueue().catch(reportError));

function drawQR(url) {
  const code = qrcode(0,'M');
  code.addData(url);
  code.make();
  const modules = code.getModuleCount();
  const cell = 10;
  const canvas = byId('qr');
  canvas.width = canvas.height = (modules + 8) * cell;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#152b23';
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (code.isDark(row,col)) ctx.fillRect((col+4)*cell,(row+4)*cell,cell,cell);
    }
  }
}
function renderResults(edition,requests) {
  const people = new Set();
  const joined = new Set();
  for (const request of requests) {
    if (request.campaignCode !== edition.code) continue;
    people.add(request.phone);
    if (request.status === 'joined' || request.countedJoin) joined.add(request.phone);
  }
  byId('openingCount').textContent = edition.openings ?? '—';
  byId('coverage').hidden = edition.openings != null && !edition.partialOpenings;
  const totalPeople = (edition.archivedPeople || 0) + people.size;
  const totalJoined = (edition.archivedJoins || 0) + joined.size;
  const percent = totalPeople ? Math.round(100 * totalJoined / totalPeople) : 0;
  byId('joinPercent').textContent = totalPeople ? percent+'%' : '';
  byId('joinProgress').hidden = !totalPeople;
  byId('joinProgress').value = percent;
  const caption = totalJoined + ' de ' + totalPeople + (totalPeople === 1 ? ' pessoa que pediu entrada' : ' pessoas que pediram entrada') +
    (totalJoined === 1 ? ' já entrou no grupo.' : ' já entraram no grupo.');
  byId('joinCaption').textContent = totalPeople ? caption : 'Ainda não há pedidos de entrada por esta divulgação.';
}
async function updateEdition() {
  const revision = ++editionRefresh;
  const {events:allEvents,requests} = await ensaio.snapshot();
  if (revision !== editionRefresh) return;
  const events = allEvents.filter(e => e.code !== 'abc123' && e.code !== 'encerrado');
  events.sort((a,b) => b.createdAt - a.createdAt);
  const picker = byId('editions');
  picker.replaceChildren(new Option('Nova divulgação',''), ...events.map(e => new Option(e.name,e.code)));
  if (!events.some(e => e.code === ensaio.sampleCode)) picker.add(new Option('Encontro Tech SP · exemplo',ensaio.sampleCode));
  picker.value = selected || '';
  byId('picker').hidden = false;
  const edition = events.find(e => e.code === selected);
  byId('create').hidden = Boolean(edition);
  byId('ready').hidden = !edition;
  byId('heading').textContent = edition?.name || 'Divulgar um evento';
  clearTimeout(statusTimer);
  if (!edition) return;
  renderResults(edition,requests);
  participantCode = edition.code;
  const state = ensaio.state(edition);
  byId('state').textContent = {open:'Recebendo pedidos',scheduled:'Abertura agendada',closed:'Divulgação encerrada'}[state];
  const daily = edition.periodUnit === 'day';
  const date = instant => (daily ? ensaio.day : ensaio.date).format(instant);
  const until = date(daily ? edition.end-1 : edition.end);
  byId('period').textContent = state === 'scheduled' ? 'De ' + date(edition.start) + ' até ' + until :
    state === 'open' ? 'Até ' + until : 'Encerrada em ' + date(edition.closedAt ?? edition.end);
  byId('material').hidden = byId('finish').hidden = state === 'closed';
  if (state === 'closed') return;
  const url = publicUrl(edition.code);
  byId('eventUrl').value = byId('openEvent').href = url;
  drawQR(url);
  const next = state === 'scheduled' ? edition.start : edition.end;
  statusTimer = setTimeout(() => updateEdition().catch(reportError),Math.min(2147483647,Math.max(1,next-Date.now())));
}
async function selectEdition(code) {
  selected = code;
  byId('notice').textContent = '';
  if (code === ensaio.sampleCode) {
    await ensaio.prepareSample();
    await refreshQueue();
  }
  await updateEdition();
}
byId('editions').onchange = event => selectEdition(event.target.value || null).catch(reportError);
const create = byId('create');
byId('editionName').oninput = event => event.target.setCustomValidity('');
create.onsubmit = async event => {
  event.preventDefault();
  const now = Date.now();
  const name = byId('editionName').value.trim();
  if (!name) byId('editionName').setCustomValidity('Informe o nome do evento.');
  if (!create.reportValidity()) return;
  const range = periodo.value();
  if (!range) return;
  const button = create.querySelector('.primary');
  if (button.disabled) return;
  button.disabled = true;
  try {
    const code = crypto.randomUUID();
    await ensaio.createEvent({code,name,...range,createdAt:now,closedAt:null});
    selected = code;
    byId('notice').textContent = '';
    create.reset();
    periodo.reset();
    await updateEdition();
    ensaio.channel?.postMessage('events');
    byId('heading').focus();
  } catch { reportError(); } finally { button.disabled = false; }
};
byId('openEvent').onclick = event => {
  event.preventDefault();
  participant.dataset.revisit = 'true';
  show('event');
};
byId('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(byId('eventUrl').value);
    byId('notice').textContent = 'Link copiado.';
  } catch {
    const input = byId('eventUrl');
    input.focus();
    input.select();
    byId('notice').textContent = document.execCommand('copy') ? 'Link copiado.' : 'Link selecionado. Use a opção Copiar do navegador.';
  }
};
byId('download').onclick = () => {
  const link = document.createElement('a');
  link.href = byId('qr').toDataURL('image/png');
  link.download = 'orbcommu-' + selected + '.png';
  link.click();
};
const confirmDialog = byId('confirm');
byId('finish').onclick = () => {
  confirmDialog.returnValue = '';
  byId('consequence').textContent = 'O link e o QR de “' + byId('heading').textContent + '” deixarão de receber pedidos definitivamente. Quem já enviou continua na fila.';
  confirmDialog.showModal();
};
confirmDialog.onclose = async () => {
  if (confirmDialog.returnValue !== 'close') return;
  try {
    await ensaio.closeEvent(selected);
    await updateEdition();
    ensaio.channel?.postMessage('events');
    byId('notice').textContent = 'Divulgação encerrada.';
    byId('heading').focus();
  } catch { reportError(); }
};
admin.src = 'vistoria/index.html?ensaio=1';
const openSample = new URLSearchParams(location.search).get('exemplo') === 'resumo';
selectEdition(openSample ? ensaio.sampleCode : null).catch(reportError);
