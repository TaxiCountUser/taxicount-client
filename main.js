// TaxiCount — landing: scroll suau + progrés → vídeo del recorregut, línia de recorregut, idioma.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
window.__tcReady = true; // l'script inline d'index.html treu html.js (= tot visible) si això no arriba en 4 s (CDN caigut)

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// ?q=high / ?q=low força la qualitat (per provar el mode escriptori en finestres petites i a l'inrevés).
const forcedQ = new URLSearchParams(location.search).get('q');
const mobile = forcedQ ? forcedQ === 'low' : (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);
const sections = [...document.querySelectorAll('.stop')];
const navItems = [...document.querySelectorAll('.route li')];
const routeFill = document.getElementById('route-fill');
const N_STOPS = sections.length; // una secció per parada

// ---------- Idioma (ca per defecte, es a un toc) ----------
const I18N = {
  ca: {
    hero_h: 'Parla i apunta la carrera.',
    hero_p: 'L\'app per portar els comptes del taxi: carreres, despeses, km i jornada, sense escriure.',
    hero_scroll: 'Segueix el recorregut', top_enter: 'Entrar',
    cta_play: 'Descarrega l\'app a Google Play',
    nav_0: 'Sortida', nav_1: 'La veu', nav_2: 'La jornada', nav_3: 'La flota', nav_4: 'El trimestre', nav_5: 'Al volant', nav_6: 'El preu', nav_7: 'Puja',
    s1_h: 'Registra una carrera parlant a TaxiCount.',
    s1_p: 'Import, pagament, origen, destí i el nom dels teus clients: ho dius en el teu idioma i queda apuntat.',
    s2_h: 'Quan acabes, el dia ja està quadrat.',
    s2_p: 'Apuntes els km en sortir i acabar la jornada. Al final del dia tens el que has fet, el que has gastat, el que t\'ha quedat per quilòmetre i el registre de jornada per al control horari.',
    s3_h: 'Tots els cotxes i tots els conductors, en una pantalla.',
    s3_p: 'Vehicles, conductors, xat de flota i avisos: el titular de la flota ho veu tot des de l\'app o la web.',
    s4_h: 'A final de trimestre, l\'informe ja el tens fet.',
    s4_p: 'Excel i PDF per client, per conductor i per dia. El passes a la gestoria i llestos.',
    s5_h: 'Fet per un taxista que encara condueix.',
    s5_p: 'Soc taxista, la quarta generació de la meva família. Vaig fer aquesta app per deixar enrere l\'agenda de paper, i la faig servir cada dia a la meva feina.',
    s6_h: 'Pagues només pels conductors que tens.',
    s6_p: '15 dies de prova sense pagar res. Després, 3 € al mes per conductor, o 30 € si pagues l\'any. Amb el codi TAXICOUNT50, el primer any et surt a 15 €.',
    s7_h: 'Puja al taxi.',
    s7_p: 'Descarrega l\'app, dicta la primera carrera i deixa que faci els comptes.',
    s1_dictat: '«Figueres a Roses, cinquanta euros, targeta.»',
    chip_targeta: 'targeta',
    s3_f1: 'Cada carrera amb el seu cotxe i el seu conductor', s3_f2: 'Xat entre el titular i cada conductor', s3_f3: 'Recordatoris d\'ITV, assegurança i manteniment', s3_f4: 'Els números de cada cotxe, al dia',
    meter_label: 'TARIFA', meter_per: 'per conductor al mes', meter_year: 'A l\'any', meter_year_short: '1r any', meter_trial: 'Prova', meter_trial_v: '15 dies gratis', meter_promo: 'Codi',
    cta_web: 'Prova-la al navegador',
    rep_cap: 'Primera pàgina d\'un informe PDF real, amb dades de prova.',
    rep_alt: 'Primera pàgina d\'un informe PDF de TaxiCount: carreres i despeses per conductor i el resum per mètode de pagament',
    alt_veu: 'Pantalla de TaxiCount gravant una carrera dictada',
    alt_jornada: 'Pantalla de TaxiCount amb el resum de la jornada',
    alt_flota: 'Panell del titular amb els cotxes i les carreres de la flota',
    meter_aria: '15 dies gratis; 3 € per conductor al mes o 30 € l\'any; amb el codi TAXICOUNT50, 15 € el primer any',
    foot_privacy: 'Política de privacitat',
    title: 'TaxiCount — Parla i apunta la carrera',
  },
  es: {
    hero_h: 'Habla y apunta la carrera.',
    hero_p: 'La app para llevar las cuentas del taxi: carreras, gastos, km y jornada, sin escribir.',
    hero_scroll: 'Sigue el recorrido', top_enter: 'Entrar',
    cta_play: 'Descarga la app en Google Play',
    nav_0: 'Salida', nav_1: 'La voz', nav_2: 'La jornada', nav_3: 'La flota', nav_4: 'El trimestre', nav_5: 'Al volante', nav_6: 'El precio', nav_7: 'Sube',
    s1_h: 'Registra una carrera hablando a TaxiCount.',
    s1_p: 'Importe, pago, origen, destino y el nombre de tus clientes: lo dices en tu idioma y queda apuntado.',
    s2_h: 'Cuando acabas, el día ya está cuadrado.',
    s2_p: 'Apuntas los km al salir y acabar la jornada. Al final del día tienes lo que has hecho, lo que has gastado, lo que te ha quedado por kilómetro y el registro de jornada para el control horario.',
    s3_h: 'Todos los coches y todos los conductores, en una pantalla.',
    s3_p: 'Vehículos, conductores, chat de flota y avisos: el titular de la flota lo ve todo desde la app o la web.',
    s4_h: 'A final de trimestre, el informe ya lo tienes hecho.',
    s4_p: 'Excel y PDF por cliente, por conductor y por día. Se lo pasas a la gestoría y listo.',
    s5_h: 'Hecha por un taxista que sigue conduciendo.',
    s5_p: 'Soy taxista, la cuarta generación de mi familia. Hice esta app para dejar atrás la agenda de papel, y la uso cada día en mi trabajo.',
    s6_h: 'Pagas solo por los conductores que tienes.',
    s6_p: '15 días de prueba sin pagar nada. Después, 3 € al mes por conductor, o 30 € si pagas el año. Con el código TAXICOUNT50, el primer año te sale a 15 €.',
    s7_h: 'Sube al taxi.',
    s7_p: 'Descarga la app, dicta la primera carrera y deja que haga las cuentas.',
    s1_dictat: '«Figueres a Roses, cincuenta euros, tarjeta.»',
    chip_targeta: 'tarjeta',
    s3_f1: 'Cada carrera con su coche y su conductor', s3_f2: 'Chat entre el titular y cada conductor', s3_f3: 'Recordatorios de ITV, seguro y mantenimiento', s3_f4: 'Los números de cada coche, al día',
    meter_label: 'TARIFA', meter_per: 'por conductor al mes', meter_year: 'Al año', meter_year_short: '1er año', meter_trial: 'Prueba', meter_trial_v: '15 días gratis', meter_promo: 'Código',
    cta_web: 'Pruébala en el navegador',
    rep_cap: 'Primera página de un informe PDF real, con datos de prueba.',
    rep_alt: 'Primera página de un informe PDF de TaxiCount: carreras y gastos por conductor y el resumen por método de pago',
    alt_veu: 'Pantalla de TaxiCount grabando una carrera dictada',
    alt_jornada: 'Pantalla de TaxiCount con el resumen de la jornada',
    alt_flota: 'Panel del titular con los coches y las carreras de la flota',
    meter_aria: '15 días gratis; 3 € por conductor al mes o 30 € al año; con el código TAXICOUNT50, 15 € el primer año',
    foot_privacy: 'Política de privacidad',
    title: 'TaxiCount — Habla y apunta la carrera',
  },
};
function setLang(lang) {
  const d = I18N[lang] || I18N.ca;
  document.querySelectorAll('[data-i18n]').forEach((el) => { const k = el.dataset.i18n; if (d[k]) el.textContent = d[k]; });
  // Captures de l'app en el mateix idioma que la web (maquetes de assets/shots/mock/, ?lang=es).
  const sl = lang === 'es' ? 'es' : 'ca';
  document.querySelectorAll('img[data-shot]').forEach((im) => { const b = `assets/shots/${im.dataset.shot}-${sl}-`; if (im.src.includes(b)) return; im.srcset = [300, 380, 560, 760, 1140].map((w) => `${b}${w}.jpg ${w}w`).join(', '); im.src = `${b}760.jpg`; });
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => { const k = el.dataset.i18nAlt; if (d[k]) el.alt = d[k]; });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { const k = el.dataset.i18nAria; if (d[k]) el.setAttribute('aria-label', d[k]); });
  document.documentElement.lang = lang; document.title = d.title;
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  try { localStorage.setItem('tc_lang', lang); } catch {}
}
let lang = 'ca';
try { lang = localStorage.getItem('tc_lang') || ((navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'ca'); } catch {}
setLang(lang);
document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

// ---------- Fons: vídeo real controlat per l'scroll ----------
// El vídeo (vista del conductor, gravat pel fundador a Figueres) avança amb l'scroll: p ∈ [0,1] → currentTime.
// Com que no es reprodueix sinó que es «recorre», n'hi ha prou amb 15/12 fps (meitat de pes, mateixa nitidesa).
// Escriptori (1920, ~31 MB): es serveix per trossos (Range) en lloc de baixar-lo sencer. Mòbil (720, ~10 MB): sencer
// com a blob, perquè el seek sigui instantani i funcioni a iOS. En canviar el vídeo, puja el ?v= (mateix nom = memòria cau).
const ride = { video: document.getElementById('ride-video'), ready: false, p: 0, target: 0, duration: 0, step: 1 / 15 };
// Temps del vídeo per a un progrés p. Màxim = l'últim fotograma (no la durada: un seek al final pot fer «ended» i encallar-se).
const rideTime = (p) => (reduced ? 0 : Math.max(0, Math.min(ride.duration - ride.step, p * ride.duration)));
async function startVideo() {
  const v = ride.video;
  if (!v || !v.canPlayType || !v.canPlayType('video/mp4')) return; // es queda el fotograma fix (poster)
  const big = window.innerWidth >= 900 && !mobile;
  // Escriptori: 15 fps, fotograma clau cada 6. Mòbil: 12 fps, clau cada 2 (Android anava a salts amb -g 12).
  const src = big ? 'assets/video/ride-1080.mp4?v=3' : 'assets/video/ride-720.mp4?v=4';
  ride.step = big ? 1 / 15 : 1 / 12;
  // El vídeo no ha de competir amb el text, les fonts i les captures: es comença a baixar després del load.
  if (document.readyState !== 'complete') await new Promise((ok) => window.addEventListener('load', ok, { once: true }));
  try {
    if (big) v.src = src;
    else { const res = await fetch(src, { priority: 'low' }); if (!res.ok) throw new Error(res.status); v.src = URL.createObjectURL(await res.blob()); }
    await new Promise((ok, ko) => { v.addEventListener('loadedmetadata', ok, { once: true }); v.addEventListener('error', ko, { once: true }); v.load(); });
    ride.duration = v.duration; ride.ready = true;
    // On és ARA l'usuari: si ha baixat fins al final abans que el vídeo carregués, ja no hi ha més scroll que l'actualitzi.
    ride.target = rideTime(ride.p);
    v.pause();
    v.addEventListener('seeked', () => { seeking = false; });
    // Descodificador perdut (Android l'allibera amb poca memòria o en tornar d'una altra app): es torna a carregar el mateix fitxer.
    let retries = 0;
    v.addEventListener('error', () => { if (retries++ > 2) return; seeking = false; const s = v.src; v.removeAttribute('src'); v.load(); v.src = s; v.load(); });
    const wake = () => { seeking = false; };
    document.addEventListener('visibilitychange', wake); window.addEventListener('pageshow', wake);
    rideLoop();
    console.info('[landing] vídeo del recorregut llest', src, ride.duration.toFixed(1) + ' s');
  } catch (e) {
    // Sense vídeo es queda el fotograma fix (poster).
    console.warn('[landing] vídeo no disponible: fotograma fix', e);
  }
}
// Un sol seek alhora (el següent espera el 'seeked'), però amb temps límit: si el 'seeked' no arriba mai (Android adorm
// el vídeo aturat, iOS a l'últim fotograma, xarxa encallada a escriptori), abans el vídeo es quedava clavat per sempre.
let seeking = false, seekAt = 0;
const SEEK_TIMEOUT = 700;
function rideLoop(now = performance.now()) {
  const v = ride.video;
  if (seeking && now - seekAt > SEEK_TIMEOUT) seeking = false;
  // Seek al fotograma sencer més proper: res de seeks entre dos fotogrames (no canvien la imatge i saturen el descodificador).
  const t = Math.round(ride.target / ride.step) * ride.step;
  if (!seeking && Math.abs(v.currentTime - t) > ride.step / 2) {
    seeking = true; seekAt = now;
    v.currentTime = t;
  }
  requestAnimationFrame(rideLoop);
}
startVideo();

// ---------- Scroll ----------
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  window.tcLenis = lenis; // per depurar / situar-se a una parada des de la consola
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function setProgress(p) {
  ride.p = p; // es guarda sempre, també abans que el vídeo estigui llest
  if (ride.ready) ride.target = rideTime(p);
  routeFill.style.height = `${(p * 100).toFixed(2)}%`;
  const stop = Math.min(N_STOPS - 1, Math.floor(p * N_STOPS + 0.0001));
  navItems.forEach((li, i) => { li.classList.toggle('is-active', i === stop); li.classList.toggle('is-done', i < stop); });
}

if (reduced) {
  // Sense moviment: cada secció visible fixa la càmera a la seva parada (talls, sense recorregut).
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const i = Number(en.target.dataset.stop);
      setProgress((i + 0.999) / N_STOPS);
      en.target.classList.add('is-in');
    });
  }, { threshold: 0.5 });
  sections.forEach((s) => io.observe(s));
  setProgress(0.12); sections[0].classList.add('is-in');
} else {
  ScrollTrigger.create({
    trigger: document.body, start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => setProgress(st.progress),
  });
  // Revelació UNA sola vegada (sense treure la classe en sortir: evita parpellejos en refresh/resize).
  sections.forEach((s) => {
    ScrollTrigger.create({
      trigger: s, start: 'top 70%',
      onEnter: () => enterStop(s), onEnterBack: () => enterStop(s),
    });
  });
  sections[0].classList.add('is-in');
  setProgress(0);
}

// ---------- Animacions de parada (una sola vegada per secció) ----------
function enterStop(s) {
  if (s.classList.contains('is-in')) return;
  s.classList.add('is-in');
  const amount = s.querySelector('.meter-drop');
  if (amount) meterDrop(s, amount);
}
function meterDrop(s, el) {
  const from = parseFloat(el.dataset.from.replace(',', '.')), to = parseFloat(el.dataset.to.replace(',', '.'));
  const whole = Number.isInteger(from) && Number.isInteger(to);
  const fmt = (v) => (whole ? String(Math.round(v)) : v.toFixed(2).replace('.', ','));
  if (reduced) { el.textContent = fmt(to); return; }
  const obj = { v: from };
  gsap.timeline({ delay: 1.1 })
    .to(obj, { v: to, duration: 1.4, ease: 'steps(30)', onUpdate: () => { el.textContent = fmt(obj.v); } })
    .fromTo(el, { textShadow: '0 0 30px rgba(255,193,7,.95)' }, { textShadow: '0 0 18px rgba(255,193,7,.45)', duration: .8 }, '<+0.9');
}
if (reduced) sections.forEach((s) => { if (s.classList.contains('is-in')) { const a = s.querySelector('.meter-drop'); if (a) meterDrop(s, a); } });

// Navegació pel recorregut i enllaços interns amb scroll suau
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (ev) => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = document.querySelector(id); if (!el) return;
    ev.preventDefault();
    if (lenis) lenis.scrollTo(el, { duration: 1.4 }); else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
});
