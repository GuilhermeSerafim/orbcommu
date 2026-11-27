const periodo = (() => {
  const get = id => document.getElementById(id);
  const zone = 'America/Sao_Paulo';
  const localDate = new Intl.DateTimeFormat('sv-SE',{timeZone:zone,dateStyle:'short'});
  const display = new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'UTC'});
  const monthLabel = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
  const today = () => localDate.format(Date.now());
  const civil = day => new Date(day + 'T00:00:00Z');
  const iso = date => date.toISOString().slice(0,10);
  function addDays(day,n) {
    const d = civil(day);
    d.setUTCDate(d.getUTCDate()+n);
    return iso(d);
  }
  // Primeiro instante do dia em São Paulo, mesmo se o navegador estiver em outro fuso.
  function firstInstant(day) {
    const utc = civil(day).getTime();
    let lo = utc - 86400000, hi = utc + 86400000;
    while (lo < hi) {
      const mid = Math.floor((lo+hi)/2);
      if (localDate.format(mid) < day) lo = mid+1;
      else hi = mid;
    }
    return lo;
  }

  let first = '', last = '', month = '', choosingEnd = false;
  function expand(open) {
    if (open && first && first < today()) reset();
    get('calendar').hidden = !open;
    get('rangeToggle').setAttribute('aria-expanded',String(open));
    if (open) {
      month = (first || today()).slice(0,7) + '-01';
      render();
    }
  }
  function reset() {
    first = last = '';
    choosingEnd = false;
    get('rangeText').textContent = 'Selecionar período';
    expand(false);
  }
  function select(day) {
    if (day < today()) { expand(true); return; }
    if (choosingEnd) {
      [first,last] = [first,day].sort();
    } else first = last = day;
    choosingEnd = !choosingEnd;
    const from = display.format(civil(first));
    get('rangeText').textContent = first === last ? from : from + ' a ' + display.format(civil(last));
    if (choosingEnd) {
      render();
      get('days').querySelector('[data-day="'+day+'"]').focus();
    } else {
      expand(false);
      get('rangeToggle').focus();
    }
  }
  function render() {
    const now = today();
    const d = civil(month);
    const cells = get('days');
    cells.replaceChildren();
    get('monthTitle').textContent = monthLabel.format(d);
    get('prevMonth').disabled = month.slice(0,7) <= now.slice(0,7);
    get('rangeHint').textContent = choosingEnd ? 'Para vários dias, escolha também o último.' : 'Escolha o primeiro dia.';
    while (iso(d).slice(0,7) === month.slice(0,7)) {
      const day = iso(d);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = d.getUTCDate();
      if (d.getUTCDate() === 1) b.style.gridColumnStart = d.getUTCDay()+1;
      b.dataset.day = day;
      b.setAttribute('aria-label',display.format(d));
      if (day === now) b.setAttribute('aria-current','date');
      b.setAttribute('aria-pressed',String(Boolean(first && first <= day && day <= last)));
      b.classList.toggle('edge',day === first || day === last);
      b.disabled = day < now;
      cells.append(b);
      d.setUTCDate(d.getUTCDate()+1);
    }
  }
  get('rangeToggle').onclick = () => expand(get('calendar').hidden);
  get('days').onclick = e => { if (e.target.dataset.day) select(e.target.dataset.day); };
  function moveMonth(offset) {
    const d = civil(month);
    d.setUTCMonth(d.getUTCMonth()+offset);
    month = iso(d);
    render();
  }
  get('prevMonth').onclick = () => moveMonth(-1);
  get('nextMonth').onclick = () => moveMonth(1);
  get('calendar').onkeydown = e => {
    if (e.key === 'Escape') { expand(false); get('rangeToggle').focus(); }
  };
  function value() {
    if (!first || first < today()) {
      reset();
      expand(true);
      get('days').querySelector('button:not(:disabled)')?.focus();
      return null;
    }
    return {start:Math.max(Date.now(),firstInstant(first)),end:firstInstant(addDays(last,1)),periodUnit:'day'};
  }
  return {value,reset};
})();
