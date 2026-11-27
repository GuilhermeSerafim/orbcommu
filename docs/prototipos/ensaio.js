// Banco local, exclusivo do protótipo com dados fictícios.
const ensaio = (() => {
  const example = {code:'abc123', name:'Encontro Tech SP', start:0, end:8640000000000000, closedAt:null};
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('orbcommu.ensaio.eventos') : null;
  const dayMs = 86400000;
  const retentionMs = 90 * dayMs;
  const finalStates = new Set(['joined','withdrawn','expired','declined']);
  const legacyKey = 'orbcommu.ensaio.integrado.v1';
  let opening;
  let maintenance;
  let retentionTimer;
  function database() {
    if (!opening) opening = new Promise((resolve, reject) => {
      const open = indexedDB.open('orbcommu-ensaio-eventos', 1);
      open.onupgradeneeded = () => {
        const events = open.result.createObjectStore('events', {keyPath:'code'});
        events.add(example);
        events.add({...example, code:'encerrado', name:'Encontro anterior', closedAt:1});
        const requests = open.result.createObjectStore('requests', {keyPath:'id'});
        requests.createIndex('phone','phone');
        // Conserva os pedidos fictícios feitos na versão anterior desta sessão.
        try {
          const previous = JSON.parse(sessionStorage.getItem(legacyKey));
          if (Array.isArray(previous)) {
            for (const request of previous) if (request?.id && request.phone) requests.put(request);
          }
        } catch {}
      };
      open.onsuccess = () => {
        // A migração da sessão já foi confirmada no IndexedDB.
        try { sessionStorage.removeItem(legacyKey); } catch {}
        resolve(open.result);
      };
      open.onerror = () => reject(open.error);
    });
    return opening;
  }
  async function transaction(stores, mode, run) {
    const db = await database();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(stores, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error || new Error('Falha na gravação.'));
      run(tx, value => { result = value; });
    });
  }
  function purgeExpired() {
    if (maintenance) return maintenance;
    maintenance = transaction(['requests','events'],'readwrite',(tx,done) => {
      const requests = tx.objectStore('requests');
      const events = tx.objectStore('events');
      const read = requests.getAll();
      read.onsuccess = () => {
        const now = Date.now();
        let nextCheck = now + dayMs;
        let removed = 0;
        const byEdition = new Map();
        const kept = [];
        for (const request of read.result) {
          if (finalStates.has(request.status)) {
            // Versões antigas podem ter gravado o desfecho sem a data.
            if (!Number.isFinite(request.finishedAt)) {
              request.finishedAt = now;
              requests.put(request);
            }
            const deadline = request.finishedAt + retentionMs;
            if (deadline <= now) {
              requests.delete(request.id);
              removed++;
              if (request.campaignCode) {
                let people = byEdition.get(request.campaignCode);
                if (!people) {
                  people = new Map();
                  byEdition.set(request.campaignCode, people);
                }
                const joined = request.status === 'joined' || request.countedJoin;
                people.set(request.phone, Boolean(joined || people.get(request.phone)));
              }
              continue;
            }
            nextCheck = Math.min(nextCheck,deadline);
          }
          kept.push(request);
        }
        // Pedidos repetidos na mesma edição contam uma pessoa, inclusive durante a limpeza.
        for (const request of kept) {
          const people = byEdition.get(request.campaignCode);
          if (!people?.has(request.phone)) continue;
          if (people.get(request.phone) && request.status !== 'joined') {
            requests.put({...request,countedJoin:true});
          }
          people.delete(request.phone);
        }
        for (const [code,people] of byEdition) {
          if (!people.size) continue;
          const get = events.get(code);
          get.onsuccess = () => {
            const edition = get.result;
            if (!edition) return;
            edition.archivedPeople = (edition.archivedPeople || 0) + people.size;
            edition.archivedJoins = (edition.archivedJoins || 0) + [...people.values()].filter(Boolean).length;
            events.put(edition);
          };
        }
        done({removed,nextCheck});
      };
    }).then(({removed,nextCheck}) => {
      clearTimeout(retentionTimer);
      retentionTimer = setTimeout(maintain,Math.max(1,nextCheck - Date.now()));
      if (removed) {
        channel?.postMessage('retention');
        window.dispatchEvent(new Event('orb-retention'));
      }
    }).finally(() => { maintenance = null; });
    return maintenance;
  }
  function maintain() {
    purgeExpired().catch(() => {
      clearTimeout(retentionTimer);
      retentionTimer = setTimeout(maintain,60000);
    });
  }
  document.addEventListener('visibilitychange',() => {
    if (document.visibilityState === 'visible') maintain();
  });
  maintain();

  async function snapshot() {
    await purgeExpired();
    return transaction(['events','requests'],'readonly',(tx,done) => {
      const events = tx.objectStore('events').getAll();
      const requests = tx.objectStore('requests').getAll();
      requests.onsuccess = () => done({events:events.result,requests:requests.result});
    });
  }
  function state(event, now=Date.now()) {
    if (!event) return 'invalid';
    if (event.closedAt != null || now >= event.end) return 'closed';
    return now < event.start ? 'scheduled' : 'open';
  }
  const date = new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const day = new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short'});
  function eventByCode(code) {
    return transaction('events','readonly',(tx,done) => {
      const get = tx.objectStore('events').get(code);
      get.onsuccess = () => done(get.result);
    });
  }
  function createEvent(event) {
    return transaction('events','readwrite',tx => tx.objectStore('events').add({...event,openings:0}));
  }
  const sampleCode = 'resumo-exemplo';
  function prepareSample() {
    return transaction(['events','requests'],'readwrite',tx => {
      const events = tx.objectStore('events');
      const existing = events.get(sampleCode);
      existing.onsuccess = () => {
        if (existing.result) return;
        const closedAt = Date.now() - 2 * dayMs;
        const start = closedAt - dayMs;
        const name = 'Encontro Tech SP · exemplo';
        events.add({code:sampleCode,name,periodUnit:'day',start,end:closedAt,closedAt,createdAt:start,openings:80});
        const names = ['Ana','Bruno','Carla','Davi','Elisa','Fábio','Gabi','Heitor','Iara','João',
          'Lia','Mauro','Nina','Otávio','Paula','Rafa','Sara','Téo','Vera','Yuri'];
        const requests = tx.objectStore('requests');
        names.forEach((person,i) => {
          const status = i === 0 ? 'invited' : i <= 12 ? 'joined' : 'waiting';
          requests.add({id:sampleCode+'-'+i, name:person,phone:'550090000'+String(1000+i),
            source:name,campaignCode:sampleCode,requestedAt:start+i*60000,status,
            opened:'',note:'',messages:[],inviteSent:status !== 'waiting',
            sentBy:status !== 'waiting' ? 'Joana' : null,confirmedAt:status !== 'waiting' ? closedAt : null,
            finishedAt:status === 'joined' ? closedAt+3600000 : null});
        });
      };
    });
  }
  async function recordOpening(code) {
    await transaction('events','readwrite',tx => {
      const events = tx.objectStore('events');
      const get = events.get(code);
      get.onsuccess = () => {
        const event = get.result;
        if (!event) return;
        if (event.openings == null) event.partialOpenings = true;
        event.openings = (event.openings || 0) + 1;
        events.put(event);
      };
    });
    channel?.postMessage('results');
  }
  function closeEvent(code) {
    return transaction('events','readwrite',tx => {
      const store = tx.objectStore('events');
      const get = store.get(code);
      get.onsuccess = () => {
        if (get.result && state(get.result) !== 'closed') store.put({...get.result, closedAt:Date.now()});
      };
    });
  }
  async function submit(input) {
    await purgeExpired();
    const result = await transaction(['events','requests'],'readwrite',(tx,done) => {
      const requests = tx.objectStore('requests');
      function save(event) {
        if (input.campaignCode !== null && state(event) !== 'open') { done({blocked:true,event}); return; }
        const found = requests.index('phone').getAll(input.phone);
        found.onsuccess = () => {
          if (found.result.some(r => !['withdrawn','expired','declined'].includes(r.status))) return;
          requests.add({id:crypto.randomUUID(), phone:input.phone, name:input.name, note:input.reason,
            requestedAt:Date.now(), campaignCode:input.campaignCode, source:event?.name || 'Link geral',
            status:'pending', messages:[], opened:'', inviteSent:false, confirmedAt:null});
        };
      }
      if (input.campaignCode === null) save(null);
      else {
        const get = tx.objectStore('events').get(input.campaignCode);
        get.onsuccess = () => save(get.result);
      }
    });
    if (!result?.blocked) channel?.postMessage('requests');
    return result;
  }
  function updateRequest(id,progress) {
    return transaction('requests','readwrite',tx => {
      const store = tx.objectStore('requests');
      const get = store.get(id);
      get.onsuccess = () => {
        if (!get.result || finalStates.has(get.result.status)) return;
        const updated = {...get.result,...progress};
        if (finalStates.has(updated.status)) updated.finishedAt = Date.now();
        store.put(updated);
      };
    });
  }
  return {snapshot, state, date, day, eventByCode, createEvent, closeEvent, submit, updateRequest, channel,
    sampleCode,prepareSample,recordOpening};
})();
