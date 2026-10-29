/**
 * Programări „Consultanță Notarială VIDEO Internațional” — Gorun & Asociații
 * Backend Google Apps Script conectat la Google Calendar-ul notarului.
 *
 * Instalare:
 *  1. Cu contul Google al notarului, deschideți script.google.com → Proiect nou.
 *     Copiați acest fișier în Code.gs, iar în Setări proiect bifați „Afișați fișierul manifest
 *     appsscript.json” și înlocuiți-i conținutul cu cel din appsscript.json de lângă acest fișier.
 *  2. Completați CONFIG de mai jos.
 *  3. Rulați o dată funcția `test` din editor și acceptați permisiunile (Calendar + Gmail).
 *  4. Implementare → Implementare nouă → Tip: Aplicație web
 *       Executare ca: Eu        Cine are acces: Oricine
 *  5. Copiați URL-ul care se termină în /exec în pagina HTML, la BOOKING_CONFIG.scriptUrl.
 *  După orice modificare a codului: Implementare → Gestionați implementările → Editare → Versiune nouă
 *  (URL-ul rămâne același).
 *
 * Cum se blochează ore: orice eveniment din calendar (concediu, ședință, sărbătoare, eveniment
 * pe toată ziua) face intervalele suprapuse „Ocupat”. Pagina publică vede doar liber/ocupat,
 * niciodată titlul sau detaliile evenimentelor.
 */

const CONFIG = {
  CALENDAR_ID: 'primary',          // sau ID-ul unui calendar dedicat (Setări calendar → Integrare calendar)
  TIMEZONE: 'Europe/Bucharest',
  WORK_DAYS: [1, 2, 3, 4, 5],      // 1 = luni … 7 = duminică
  START_HOUR: 9,                   // primul interval începe la 09:00
  END_HOUR: 17,                    // ultimul interval se termină la 17:00
  SLOT_MINUTES: 60,                // durata unei consultanțe
  MIN_NOTICE_HOURS: 24,            // nu se pot face programări mai devreme de atât
  MAX_DAYS_AHEAD: 42,              // cât de departe în viitor se poate programa
  NOTIFY_EMAIL: '',                // ex. 'contact@gorunsiasociatii.com' — primește email la fiecare programare
  INVITE_CLIENT: true,             // clientul primește invitație Google Calendar pe email
  EVENT_TITLE: 'Consultanță VIDEO Internațional',
};

/* ---------------- Puncte de intrare ---------------- */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action !== 'availability') return json({ ok: false, error: 'unknown_action' });
  if (!isKey(p.from) || !isKey(p.to)) return json({ ok: false, error: 'bad_range' });

  const slots = buildSlots(p.from, p.to).map(function (s) {
    return { start: s.start.toISOString(), end: s.end.toISOString(), status: s.free ? 'free' : 'busy' };
  });
  return json({ ok: true, timezone: CONFIG.TIMEZONE, slotMinutes: CONFIG.SLOT_MINUTES, slots: slots });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  }
  if (data.website) return json({ ok: true }); // capcană anti-spam (câmp ascuns)

  const client = {
    nume: clean(data.nume, 120),
    email: clean(data.email, 160),
    telefon: clean(data.telefon, 40),
    tara: clean(data.tara, 80),
    subiect: clean(data.subiect, 80),
    limba: clean(data.limba, 20),
    mesaj: clean(data.mesaj, 2000),
    timezone: clean(data.timezone, 60),
  };
  if (!client.nume || !client.tara || !client.subiect || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email) || data.gdpr !== 'da') {
    return json({ ok: false, error: 'missing_fields' });
  }

  const start = new Date(data.start);
  if (isNaN(start)) return json({ ok: false, error: 'invalid_slot' });
  const key = Utilities.formatDate(start, CONFIG.TIMEZONE, 'yyyy-MM-dd');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    // Verificăm din nou, sub lacăt, ca două persoane să nu poată lua aceeași oră
    const slot = buildSlots(key, key).filter(function (s) { return s.start.getTime() === start.getTime(); })[0];
    if (!slot) return json({ ok: false, error: 'invalid_slot' });
    if (!slot.free) return json({ ok: false, error: 'slot_taken' });

    const description = [
      'Programare din pagina „Consultanță Notarială VIDEO Internațional”.',
      '',
      'Nume: ' + client.nume,
      'Email: ' + client.email,
      'Telefon: ' + (client.telefon || '-'),
      'Țara: ' + client.tara,
      'Fus orar client: ' + (client.timezone || '-'),
      'Subiect: ' + client.subiect,
      'Limba: ' + (client.limba || 'Română'),
      '',
      'Mesaj:',
      client.mesaj || '-',
    ].join('\n');

    const event = getCalendar().createEvent(
      CONFIG.EVENT_TITLE + ' — ' + client.nume + ' (' + client.tara + ')',
      slot.start,
      slot.end,
      {
        description: description,
        guests: CONFIG.INVITE_CLIENT ? client.email : '',
        sendInvites: CONFIG.INVITE_CLIENT,
      }
    );
    // Pentru link Google Meet automat: activați serviciul avansat „Google Calendar API”
    // și folosiți Calendar.Events.patch cu conferenceData (createRequest, type "hangoutsMeet").

    if (CONFIG.NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: CONFIG.NOTIFY_EMAIL,
        replyTo: client.email,
        subject: 'Programare nouă: ' + CONFIG.EVENT_TITLE + ' — ' + Utilities.formatDate(slot.start, CONFIG.TIMEZONE, 'dd.MM.yyyy HH:mm'),
        body: description,
      });
    }

    return json({ ok: true, id: event.getId(), start: slot.start.toISOString(), end: slot.end.toISOString() });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Logica de program ---------------- */

// Toate intervalele dintre două zile (YYYY-MM-DD, ora României), marcate liber/ocupat
function buildSlots(fromKey, toKey) {
  const tz = CONFIG.TIMEZONE;
  const days = [];
  let cursor = parse(fromKey, '12:00'); // amiaza evită problemele la schimbarea orei
  const last = parse(toKey, '12:00');
  while (cursor <= last && days.length < 21) {
    days.push(Utilities.formatDate(cursor, tz, 'yyyy-MM-dd'));
    cursor = new Date(cursor.getTime() + 24 * 3600 * 1000);
  }

  const slots = [];
  days.forEach(function (key) {
    const dow = Number(Utilities.formatDate(parse(key, '12:00'), tz, 'u')); // 1 = luni … 7 = duminică
    if (CONFIG.WORK_DAYS.indexOf(dow) === -1) return;
    for (let m = CONFIG.START_HOUR * 60; m + CONFIG.SLOT_MINUTES <= CONFIG.END_HOUR * 60; m += CONFIG.SLOT_MINUTES) {
      const start = parse(key, pad(Math.floor(m / 60)) + ':' + pad(m % 60));
      slots.push({ start: start, end: new Date(start.getTime() + CONFIG.SLOT_MINUTES * 60000), free: true });
    }
  });
  if (!slots.length) return slots;

  const now = Date.now();
  const earliest = now + CONFIG.MIN_NOTICE_HOURS * 3600 * 1000;
  const latest = now + CONFIG.MAX_DAYS_AHEAD * 24 * 3600 * 1000;
  const events = getCalendar().getEvents(slots[0].start, slots[slots.length - 1].end);

  slots.forEach(function (s) {
    const t = s.start.getTime();
    if (t < earliest || t > latest) { s.free = false; return; }
    s.free = !events.some(function (ev) {
      return ev.getStartTime() < s.end && ev.getEndTime() > s.start;
    });
  });
  return slots;
}

/* ---------------- Utilitare ---------------- */

function getCalendar() {
  const cal = CONFIG.CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!cal) throw new Error('Calendarul nu a fost găsit: ' + CONFIG.CALENDAR_ID);
  return cal;
}

function parse(key, hhmm) {
  return Utilities.parseDate(key + ' ' + hhmm, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
}

function isKey(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function pad(n) {
  return (n < 10 ? '0' : '') + n;
}

function clean(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Rulați din editor pentru a acorda permisiunile și a verifica programul săptămânii curente
function test() {
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const inAWeek = Utilities.formatDate(new Date(Date.now() + 7 * 24 * 3600 * 1000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const out = JSON.parse(doGet({ parameter: { action: 'availability', from: today, to: inAWeek } }).getContent());
  Logger.log('%s intervale, %s libere', out.slots.length, out.slots.filter(function (s) { return s.status === 'free'; }).length);
  MailApp.getRemainingDailyQuota(); // cere permisiunea de trimitere email
}
