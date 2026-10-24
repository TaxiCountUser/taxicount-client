// TaxiCount — landing (pas 2): scroll suau + progrés → escena, línia de recorregut, idioma.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { hasWebGL, createScene, STOPS } from './scene.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// ?q=high / ?q=low força la qualitat (per provar el mode escriptori en finestres petites i a l'inrevés).
const forcedQ = new URLSearchParams(location.search).get('q');
const mobile = forcedQ ? forcedQ === 'low' : (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);
const sections = [...document.querySelectorAll('.stop')];
const navItems = [...document.querySelectorAll('.route li')];
const routeFill = document.getElementById('route-fill');

// ---------- Idioma (ca per defecte, es a un toc) ----------
const I18N = {
  ca: {
    hero_h: 'Parla i apunta la carrera.',
    hero_p: 'Dicta el teu servei i TaxiCount l\'apunta. L\'app dels taxistes.',
    hero_scroll: 'Descobreix TaxiCount', top_enter: 'Entrar',
    cta_play: 'Descarrega-la a Google Play', cta_trial: 'Prova 15 dies gratis',
    nav_0: 'Sortida', nav_1: 'La veu', nav_2: 'La jornada', nav_3: 'La flota', nav_4: 'El trimestre', nav_5: 'Al volant', nav_6: 'El preu', nav_7: 'Puja',
    s1_h: 'Registra una carrera parlant a TaxiCount.',
    s1_p: 'Import, pagament, origen, destí i el nom dels teus clients: ho dius en el teu idioma i queda apuntat.',
    s2_h: 'Inicies el dia, acabes el dia. La resta ja està fet.',
    s2_p: 'Kilòmetres, despeses, registre de jornada i el resum de cada dia, sense papers.',
    s3_h: 'Tots els cotxes i tots els conductors, en una pantalla.',
    s3_p: 'Vehicles, conductors, xat de flota i avisos: el titular de la flota ho veu tot des de l\'app o la web.',
    s4_h: 'El trimestre, resolt.',
    s4_p: 'Informes Excel i PDF per client, per conductor i per dia, a punt per la gestoria.',
    s5_h: 'Fet per un taxista que encara condueix.',
    s5_p: 'Soc la quarta generació de taxistes de la meva família, per deixar enrere l\'agenda de paper he creat aquesta aplicació.',
    s6_h: 'Pagues pels conductors que tens. Ni un més.',
    s6_p: 'Prova-ho 15 dies gratis. Després 3 € per conductor al mes o 30 € l\'any. Amb el codi «TAXICOUNT50» et surt a 15 € l\'any.',
    s7_h: 'Puja al taxi.',
    s7_p: 'Descarrega-la, dicta la primera carrera i deixa que faci els comptes.',
    s1_k: 'Parada 1 · La veu', s2_k: 'Parada 2 · La jornada', s3_k: 'Parada 3 · La flota', s4_k: 'Parada 4 · El trimestre', s5_k: 'Parada 5 · Al volant', s6_k: 'Parada 6 · El preu',
    s1_dictat: 'Figueres a Roses, cinquanta euros, targeta',
    chip_origen: 'Origen', chip_desti: 'Destí', chip_import: 'Import', chip_pagament: 'Pagament', chip_targeta: 'Targeta',
    s2_f1: 'Resum diari de despeses i beneficis', s2_f2: 'El que guanyes per cada km', s2_f3: 'Els km que has recorregut', s2_f4: 'Registre de jornada per al control horari',
    s3_f1: 'Cada carrera amb el seu cotxe i el seu conductor', s3_f2: 'Xat entre el titular i cada conductor', s3_f3: 'Recordatoris d\'ITV, assegurança i manteniment', s3_f4: 'Revisa la comptabilitat en temps real',
    rep_title: 'Informe trimestral', rep_client: 'per client', rep_conductor: 'per conductor', rep_dia: 'per dia',
    meter_label: 'TARIFA', meter_per: 'per conductor al mes', meter_year: 'Anual', meter_year_short: 'l\'any', meter_trial: 'Prova', meter_trial_v: '15 dies gratis', meter_promo: 'Codi',
    foot_privacy: 'Política de privacitat',
    title: 'TaxiCount — Parla i apunta la carrera',
  },
  es: {
    hero_h: 'Habla y apunta la carrera.',
    hero_p: 'Dicta tu servicio y TaxiCount lo apunta. La app de los taxistas.',
    hero_scroll: 'Descubre TaxiCount', top_enter: 'Entrar',
    cta_play: 'Descárgala en Google Play', cta_trial: 'Prueba 15 días gratis',
    nav_0: 'Salida', nav_1: 'La voz', nav_2: 'La jornada', nav_3: 'La flota', nav_4: 'El trimestre', nav_5: 'Al volante', nav_6: 'El precio', nav_7: 'Sube',
    s1_h: 'Registra una carrera hablando a TaxiCount.',
    s1_p: 'Importe, pago, origen, destino y el nombre de tus clientes: lo dices en tu idioma y queda apuntado.',
    s2_h: 'Empiezas el día, acabas el día. El resto ya está hecho.',
    s2_p: 'Kilómetros, gastos, registro de jornada y el resumen de cada día, sin papeles.',
    s3_h: 'Todos los coches y todos los conductores, en una pantalla.',
    s3_p: 'Vehículos, conductores, chat de flota y avisos: el titular de la flota lo ve todo desde la app o la web.',
    s4_h: 'El trimestre, resuelto.',
    s4_p: 'Informes Excel y PDF por cliente, por conductor y por día, listos para la gestoría.',
    s5_h: 'Hecha por un taxista que sigue conduciendo.',
    s5_p: 'Soy la cuarta generación de taxistas de mi familia, para dejar atrás la agenda de papel he creado esta aplicación.',
    s6_h: 'Pagas por los conductores que tienes. Ni uno más.',
    s6_p: 'Pruébalo 15 días gratis. Después 3 € por conductor al mes o 30 € al año. Con el código «TAXICOUNT50» te sale a 15 € al año.',
    s7_h: 'Sube al taxi.',
    s7_p: 'Descárgala, dicta la primera carrera y deja que haga las cuentas.',
    s1_k: 'Parada 1 · La voz', s2_k: 'Parada 2 · La jornada', s3_k: 'Parada 3 · La flota', s4_k: 'Parada 4 · El trimestre', s5_k: 'Parada 5 · Al volante', s6_k: 'Parada 6 · El precio',
    s1_dictat: 'Figueres a Roses, cincuenta euros, tarjeta',
    chip_origen: 'Origen', chip_desti: 'Destino', chip_import: 'Importe', chip_pagament: 'Pago', chip_targeta: 'Tarjeta',
    s2_f1: 'Resumen diario de gastos y beneficios', s2_f2: 'Lo que ganas por cada km', s2_f3: 'Los km que has recorrido', s2_f4: 'Registro de jornada para el control horario',
    s3_f1: 'Cada carrera con su coche y su conductor', s3_f2: 'Chat entre el titular y cada conductor', s3_f3: 'Recordatorios de ITV, seguro y mantenimiento', s3_f4: 'Revisa la contabilidad en tiempo real',
    rep_title: 'Informe trimestral', rep_client: 'por cliente', rep_conductor: 'por conductor', rep_dia: 'por día',
    meter_label: 'TARIFA', meter_per: 'por conductor al mes', meter_year: 'Anual', meter_year_short: 'al año', meter_trial: 'Prueba', meter_trial_v: '15 días gratis', meter_promo: 'Código',
    foot_privacy: 'Política de privacidad',
    title: 'TaxiCount — Habla y apunta la carrera',
  },
};
function setLang(lang) {
  const d = I18N[lang] || I18N.ca;
  document.querySelectorAll('[data-i18n]').forEach((el) => { const k = el.dataset.i18n; if (d[k]) el.textContent = d[k]; });
  document.querySelectorAll('[data-type]').forEach((el) => { const k = el.dataset.type; if (d[k]) { el.dataset.full = d[k]; if (el.closest('.stop')?.classList.contains('typed-done')) el.textContent = d[k]; else el.textContent = ''; } });
  document.documentElement.lang = lang; document.title = d.title;
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  try { localStorage.setItem('tc_lang', lang); } catch {}
}
let lang = 'ca';
try { lang = localStorage.getItem('tc_lang') || ((navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'ca'); } catch {}
setLang(lang);
document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

// ---------- Fons: vídeo real controlat per l'scroll; escena 3D com a reserva ----------
// El vídeo (vista del conductor) avança amb l'scroll: p ∈ [0,1] → currentTime. Es carrega sencer com a
// blob perquè el «seek» sigui instantani i funcioni a iOS; el fitxer està codificat amb un fotograma
// clau cada 12 (ffmpeg -g 12) perquè cada salt sigui barat. ?bg=3d força l'escena 3D. En canviar el vídeo, puja el ?v= (el navegador el guarda amb el mateix nom).
let scene3d = null;
const ride = { video: document.getElementById('ride-video'), ready: false, target: 0, duration: 0 };
const force3d = new URLSearchParams(location.search).get('bg') === '3d';
function start3d() {
  if (scene3d || document.documentElement.classList.contains('no-webgl')) return;
  document.documentElement.classList.remove('video-mode');
  if (hasWebGL()) {
    try {
      scene3d = createScene(document.getElementById('scene'), { reducedMotion: reduced, mobile });
      scene3d.start();
      window.tcScene = scene3d; // per depurar des de la consola
    } catch (e) {
      console.error('[landing] escena 3D no disponible, versió estàtica', e);
      document.documentElement.classList.add('no-webgl');
    }
  } else {
    document.documentElement.classList.add('no-webgl');
  }
}
async function startVideo() {
  const v = ride.video;
  if (force3d) return start3d();
  if (!v || !v.canPlayType || !v.canPlayType('video/mp4')) { document.documentElement.classList.add('video-mode'); return; }
  document.documentElement.classList.add('video-mode');
  const src = window.innerWidth >= 900 && !mobile ? 'assets/video/ride-1080.mp4?v=2' : 'assets/video/ride-720.mp4?v=2';
  try {
    const res = await fetch(src); if (!res.ok) throw new Error(res.status);
    v.src = URL.createObjectURL(await res.blob());
    await new Promise((ok, ko) => { v.addEventListener('loadedmetadata', ok, { once: true }); v.addEventListener('error', ko, { once: true }); v.load(); });
    ride.duration = v.duration; ride.ready = true;
    v.pause(); v.currentTime = 0;
    rideLoop();
    console.info('[landing] vídeo del recorregut llest', src, ride.duration.toFixed(1) + ' s');
  } catch (e) {
    // Sense vídeo es queda el fotograma fix (poster): a la web pública NO es serveixen els models 3D.
    console.warn('[landing] vídeo no disponible: fotograma fix', e);
  }
}
let seeking = false;
function rideLoop() {
  const v = ride.video;
  if (!seeking && Math.abs(v.currentTime - ride.target) > 0.02) {
    seeking = true;
    const done = () => { seeking = false; };
    v.addEventListener('seeked', done, { once: true });
    v.currentTime = ride.target;
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
  scene3d?.setProgress(p);
  if (ride.ready) ride.target = reduced ? 0 : Math.min(ride.duration - 0.05, p * ride.duration);
  routeFill.style.height = `${(p * 100).toFixed(2)}%`;
  const stop = Math.min(STOPS.length - 1, Math.floor(p * STOPS.length + 0.0001));
  navItems.forEach((li, i) => { li.classList.toggle('is-active', i === stop); li.classList.toggle('is-done', i < stop); });
}

if (reduced) {
  // Sense moviment: cada secció visible fixa la càmera a la seva parada (talls, sense recorregut).
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const i = Number(en.target.dataset.stop);
      setProgress((i + 0.999) / STOPS.length);
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
  const typed = s.querySelector('.typed');
  if (typed) typewrite(s, typed);
  const amount = s.querySelector('.meter-drop');
  if (amount) meterDrop(s, amount);
}
function typewrite(s, el) {
  const full = el.dataset.full || el.textContent; el.textContent = '';
  if (reduced) { el.textContent = full; s.classList.add('typed-done'); return; }
  let i = 0;
  const tick = () => {
    i++; el.textContent = full.slice(0, i);
    if (i < full.length) setTimeout(tick, full[i - 1] === ',' ? 260 : 38 + Math.random() * 40);
    else setTimeout(() => s.classList.add('typed-done'), 350);
  };
  setTimeout(tick, 500);
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
if (reduced) sections.forEach((s) => { if (s.classList.contains('is-in')) { const t = s.querySelector('.typed'); if (t) typewrite(s, t); const a = s.querySelector('.meter-drop'); if (a) meterDrop(s, a); } });

// Navegació pel recorregut i enllaços interns amb scroll suau
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (ev) => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = document.querySelector(id); if (!el) return;
    ev.preventDefault();
    if (lenis) lenis.scrollTo(el, { duration: 1.4 }); else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
});
