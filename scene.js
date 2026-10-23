// TaxiCount — escena 3D realista: carrer de nit amb models reals de Sketchfab (CC-BY, crèdits al
// peu) instanciats al llarg de la corba (edificis, fanals, semàfors, parades, papereres, cotxes
// aparcats), voreres amb paviment CC0 (ambientCG), asfalt moll (CC0 Poly Haven) amb reflexos,
// HDRI nocturn (CC0 Poly Haven), fons de blocs amb finestres enceses, taxi glTF, rastre de llum
// ambre que creix amb l'scroll i mòbil flotant amb captures reals. Colors de marca: negre càlid #1E1B16, crema #FEF7EC, ambre #FFC107.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const NEGRE = 0x1E1B16, CREMA = 0xFEF7EC, AMBRE = 0xFFC107;
const TEX = 'assets/tex/';
const TAXI_MODEL = 'assets/models/taxi/scene.glb'; // «2008 Baird Silver Coronet Taxicab» d'Andrew Duong (Sketchfab, CC-BY), repintat ambre + WebP/Draco

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

// Parades: u sobre la corba (per longitud d'arc) i càmera (d darrere, h alçada, s lateral).
export const STOPS = [
// d positiu = càmera DARRERE del taxi (la càmera és P - T·d): seguim el taxi en el sentit de la marxa.
  { u: 0.02, cam: { d: 11, h: 4.0, s: 3.0 }, look: 'taxi' },
  { u: 0.16, cam: { d: 6.5, h: 2.2, s: 3.4 }, look: 'taxi' },
  { u: 0.29, cam: { d: 6.0, h: 2.6, s: -3.4 }, look: 'taxi' },
  { u: 0.43, cam: { d: 13, h: 17, s: 7 }, look: 'taxi' },
  { u: 0.57, cam: { d: 7.5, h: 3.0, s: -4.5 }, look: 'taxi' },
  { u: 0.71, cam: { d: -0.4, h: 1.25, s: 0.35 }, look: 'ahead' },
  { u: 0.85, cam: { d: 8, h: 1.9, s: 3.4 }, look: 'taxi' },
  { u: 0.985, cam: { d: 9, h: 4.5, s: 0 }, look: 'taxi' },
];
const TRAVEL_CAM = { d: 9, h: 3.4, s: 2.6 };
const SHOTS = { 1: 'veu', 2: 'jornada', 3: 'flota', 4: 'portada' };

// Textura radial per a halos (fanals, fars, llum de sostre) i bassals de llum al terra.
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.12)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createScene(canvas, opts = {}) {
  const reduced = !!opts.reducedMotion;
  const mobile = !!opts.mobile;
  const high = !mobile;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0c0a);
  scene.fog = new THREE.FogExp2(0x0f0d0b, mobile ? 0.026 : 0.02);

  const camera = new THREE.PerspectiveCamera(mobile ? 60 : 48, window.innerWidth / window.innerHeight, 0.1, 220);

  const texLoader = new THREE.TextureLoader();
  const loadTex = (name, srgb = false, repeat = 1) => {
    const t = texLoader.load(TEX + name);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
    t.anisotropy = mobile ? 2 : 8;
    return t;
  };
  const glow = glowTexture();

  // ---------- Llum i entorn (HDRI nocturn → reflexos i llum ambient real) ----------
  scene.add(new THREE.HemisphereLight(0x2a2830, 0x060504, 0.22));
  const pmrem = new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader();
  new RGBELoader().load(TEX + 'night_city_1k.hdr', (hdr) => {
    const env = pmrem.fromEquirectangular(hdr).texture;
    scene.environment = env; scene.environmentIntensity = mobile ? 0.14 : 0.18;
    hdr.dispose(); pmrem.dispose();
  }, undefined, (e) => console.warn('[landing] HDRI no carregat', e));
  const taxiLight = new THREE.PointLight(AMBRE, 10, 16, 2); scene.add(taxiLight);

  // ---------- Recorregut ----------
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 64), new THREE.Vector3(0, 0, 36), new THREE.Vector3(0, 0, 10),
    new THREE.Vector3(0, 0, -14), new THREE.Vector3(3, 0, -30), new THREE.Vector3(8, 0, -44),
    new THREE.Vector3(8, 0, -62), new THREE.Vector3(8, 0, -80), new THREE.Vector3(4, 0, -98),
    new THREE.Vector3(0, 0, -116), new THREE.Vector3(0, 0, -130),
  ], false, 'catmullrom', 0.4);
  route.arcLengthDivisions = 400;
  const up = new THREE.Vector3(0, 1, 0);

  // ---------- Terra: asfalt moll (PBR) sobre un reflector borrós a escriptori ----------
  // Asfalt moll: material PBR amb reflexos de l'HDRI + «reflexos» estirats de les llums (sprites
  // additius sota el terra, que és semitransparent). És el que es veu de nit amb terra humit.
  const streakMat = (color, opacity) => new THREE.SpriteMaterial({ map: glow, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity });
  function addStreak(parent, x, y, z, color, opacity, sx, sy) { const sp = new THREE.Sprite(streakMat(color, opacity)); sp.position.set(x, y, z); sp.scale.set(sx, sy, 1); parent.add(sp); return sp; }
  {
    const size = 520;
    const asphalt = new THREE.MeshStandardMaterial({
      map: loadTex('asphalt_color.jpg', true, 48), normalMap: loadTex('asphalt_normal.jpg', false, 48),
      roughnessMap: loadTex('asphalt_rough.jpg', false, 48), roughness: high ? 0.38 : 0.6, metalness: 0.02,
      envMapIntensity: 0.55, transparent: true, opacity: 0.8, normalScale: new THREE.Vector2(0.5, 0.5),
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), asphalt);
    ground.rotation.x = -Math.PI / 2; ground.renderOrder = 5; scene.add(ground);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: 0x050403 }));
    under.rotation.x = -Math.PI / 2; under.position.y = -9; scene.add(under); // fons sota els reflexos
  }

  // ---------- Carrer: voreres amb vorada, línies i passos de vianants ----------
  // Calçada de 7 m (el taxi va pel centre), vorera de 4 m aixecada 14 cm i edificis arran de vorera.
  const SIDE_IN = 3.6, SIDE_OUT = 7.6, KERB_H = 0.14;
  const L = route.getLength();
  const N_RIB = Math.max(200, Math.round(L / 0.8));
  const sideAt = (u, out = new THREE.Vector3()) => out.crossVectors(up, route.getTangentAt(u)).normalize();
  // Cinta al llarg del recorregut: edgeFn(u, p, side) → [pA, pB] (dos vèrtexs per mostra).
  function ribbon(edgeFn, uvAcross = 1, uvAlong = 1.5) {
    const pos = [], uvs = [], idx = [];
    for (let i = 0; i <= N_RIB; i++) {
      const u = i / N_RIB, p = route.getPointAt(u), sd = sideAt(u);
      const [a, b] = edgeFn(u, p, sd);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const s = (u * L) / uvAlong; uvs.push(s, 0, s, uvAcross);
      if (i < N_RIB) { const o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const pavingMat = new THREE.MeshStandardMaterial({
    map: loadTex('paving_color.jpg', true), normalMap: loadTex('paving_normal.jpg'), roughnessMap: loadTex('paving_rough.jpg'),
    roughness: 0.82, metalness: 0, envMapIntensity: 0.3, normalScale: new THREE.Vector2(0.6, 0.6), side: THREE.DoubleSide,
  });
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xcfc6b2, side: THREE.DoubleSide, toneMapped: true });
  const streetGroup = new THREE.Group(); scene.add(streetGroup);
  for (const sgn of [-1, 1]) {
    streetGroup.add(new THREE.Mesh(ribbon((u, p, sd) => [
      p.clone().addScaledVector(sd, sgn * SIDE_IN).setY(KERB_H), p.clone().addScaledVector(sd, sgn * SIDE_OUT).setY(KERB_H),
    ], (SIDE_OUT - SIDE_IN) / 1.5), pavingMat));
    streetGroup.add(new THREE.Mesh(ribbon((u, p, sd) => [
      p.clone().addScaledVector(sd, sgn * SIDE_IN).setY(0), p.clone().addScaledVector(sd, sgn * SIDE_IN).setY(KERB_H),
    ], 0.1), kerbMat));
    streetGroup.add(new THREE.Mesh(ribbon((u, p, sd) => [ // línia lateral contínua
      p.clone().addScaledVector(sd, sgn * (SIDE_IN - 0.35)).setY(0.012), p.clone().addScaledVector(sd, sgn * (SIDE_IN - 0.23)).setY(0.012),
    ], 1), lineMat));
  }
  const dummy = new THREE.Object3D();
  const placeOnRoute = (obj, u, off, yaw = 0, y = 0) => { // posa `dummy` a la corba: off lateral (+ = dreta), yaw relatiu a la tangent
    const p = route.getPointAt(u), t = route.getTangentAt(u), sd = sideAt(u);
    obj.position.copy(p).addScaledVector(sd, off).setY(y);
    obj.rotation.set(0, Math.atan2(t.x, t.z) + yaw, 0);
    obj.updateMatrix();
  };
  { // línia central discontínua
    const n = Math.floor(L / 6);
    const dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 2.4).rotateX(-Math.PI / 2), lineMat, n);
    for (let i = 0; i < n; i++) { placeOnRoute(dummy, (i + 0.5) / n, 0, 0, 0.012); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); dashes.setMatrixAt(i, dummy.matrix); }
    dashes.instanceMatrix.needsUpdate = true; streetGroup.add(dashes);
  }
  const CROSSINGS = [0.3, 0.63];
  { // passos de vianants: 7 franges travesseres
    const stripes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.6, 2 * SIDE_IN - 0.4).rotateX(-Math.PI / 2), lineMat, CROSSINGS.length * 7);
    let k = 0;
    for (const uc of CROSSINGS) for (let i = -3; i <= 3; i++) { placeOnRoute(dummy, uc + (i * 1.1) / L, 0, 0, 0.012); dummy.updateMatrix(); stripes.setMatrixAt(k++, dummy.matrix); }
    stripes.instanceMatrix.needsUpdate = true; streetGroup.add(stripes);
  }
  const nearCrossing = (u, m = 7) => CROSSINGS.some((c) => Math.abs(c - u) * L < m);

  // ---------- Fons llunyà: blocs amb finestres enceses (només a més de 40 m del carrer) ----------
  const FACADES = [
    { id: 'facade009', tileW: 12 * 1.4, tileH: 5 * 3.4, em: 1.2, weight: 0.42 },
    { id: 'facade001', tileW: 17 * 1.3, tileH: 11 * 3.1, em: 1.0, weight: 0.24 },
    { id: 'facade006', tileW: 15 * 1.4, tileH: 11 * 3.2, em: 1.0, weight: 0.2 },
    { id: 'facade005', tileW: 33 * 0.8, tileH: 25 * 1.5, em: 0.9, weight: 0.14 },
  ];
  const WIDTHS = [6, 8, 10], HEIGHTS = [12, 18, 26, 36, 48];
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.95 });
  const facadeMats = FACADES.map((f) => new THREE.MeshStandardMaterial({
    map: loadTex(`${f.id}_color.jpg`, true), normalMap: loadTex(`${f.id}_normal.jpg`),
    roughnessMap: loadTex(`${f.id}_rough.jpg`), roughness: 0.78, metalness: 0.05,
    emissive: new THREE.Color(0xffffff), emissiveMap: loadTex(`${f.id}_emission.jpg`, true), emissiveIntensity: f.em,
    envMapIntensity: 0.22, normalScale: new THREE.Vector2(0.5, 0.5),
  }));
  function boxForFacade(w, h, f) {
    const g = new THREE.BoxGeometry(w, h, w); g.translate(0, h / 2, 0);
    const uv = g.attributes.uv, nrm = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const ny = nrm.getY(i);
      if (Math.abs(ny) > 0.5) { uv.setXY(i, 0.02, 0.02); continue; }
      uv.setXY(i, uv.getX(i) * (w / f.tileW), uv.getY(i) * (h / f.tileH));
    }
    uv.needsUpdate = true;
    return g;
  }
  const samples = route.getSpacedPoints(300);
  { const p0 = route.getPointAt(0), t0 = route.getTangentAt(0).normalize();
    for (let k = 1; k <= 8; k++) samples.push(p0.clone().addScaledVector(t0, -k * 4)); }
  const clearOfRoute = (x, z, half) => samples.every((p) => Math.abs(p.x - x) > half + 4.2 || Math.abs(p.z - z) > half + 4.2);
  let seedN = 7; const rnd = () => (seedN = (seedN * 48271) % 2147483647) / 2147483647;
  {
    const radius = mobile ? 8 : 12, pitch = 13;
    const buckets = new Map();
    const pickFacade = () => { let r = rnd(); for (let i = 0; i < FACADES.length; i++) { r -= FACADES[i].weight; if (r <= 0) return i; } return 0; };
    for (let i = -radius; i <= radius; i++) for (let j = -radius; j <= radius + 4; j++) {
      const cx = i * pitch, cz = j * pitch - 40;
      const n = 1 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const wi = Math.floor(rnd() * WIDTHS.length), half = WIDTHS[wi] / 2;
        const x = cx + (rnd() - 0.5) * (pitch - 2 * half - 3), z = cz + (rnd() - 0.5) * (pitch - 2 * half - 3);
        if (!clearOfRoute(x, z, half + 30)) continue; // només fons: la primera línia és de models reals
        const hi = 1 + Math.floor(rnd() * 4);
        const key = `${pickFacade()}-${wi}-${Math.min(hi, HEIGHTS.length - 1)}`;
        (buckets.get(key) || buckets.set(key, []).get(key)).push({ x, z, rot: Math.round(rnd() * 3) * Math.PI / 2 });
      }
    }
    for (const [key, list] of buckets) {
      const [fi, wi, hi] = key.split('-').map(Number);
      const mesh = new THREE.InstancedMesh(boxForFacade(WIDTHS[wi], HEIGHTS[hi], FACADES[fi]), [facadeMats[fi], facadeMats[fi], roofMat, roofMat, facadeMats[fi], facadeMats[fi]], list.length);
      list.forEach((b, idx) => { dummy.position.set(b.x, 0, b.z); dummy.rotation.set(0, b.rot, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); mesh.setMatrixAt(idx, dummy.matrix); });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); scene.add(mesh);
    }
  }

  // ---------- Models reals (Sketchfab, CC-BY: crèdits al peu) instanciats al llarg del carrer ----------
  const CITY = 'assets/models/city/';
  const draco = new DRACOLoader(); draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  const gltfLoader = new GLTFLoader(); gltfLoader.setDRACOLoader(draco);
  const loadGLB = (url) => new Promise((res, rej) => gltfLoader.load(url, (g) => res(g.scene), undefined, rej));
  // Normalitza un model: alçada objectiu (o llargada), base a y=0, centrat; torna peces {geometry, material, matrix} per instanciar.
  function prepareParts(root, { height, length, hide, keepOnly, yaw = 0, tint, emissiveBoost, alignLongZ = false } = {}) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    root.traverse((o) => { if (o.isMesh && !(hide && hide.test(o.name))) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const s = height ? height / size.y : length / Math.max(size.x, size.z);
    if (alignLongZ && size.x > size.z) yaw += Math.PI / 2; // eix llarg → z local
    const norm = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeScale(s, s, s)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z));
    const parts = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (hide && hide.test(o.name)) return;
      if (keepOnly && !keepOnly.test(o.name)) return;
      const m = tint ? o.material.clone() : o.material; m.envMapIntensity = 0.9;
      if (tint) m.color.copy(tint);
      if (emissiveBoost && (m.emissiveMap || m.emissive.getHex())) { m.emissiveIntensity = emissiveBoost; }
      if (m.transparent && m.opacity >= 0.999 && !m.alphaMap) { m.transparent = false; m.alphaTest = 0.5; } // decals amb alpha: sense ordenació
      parts.push({ geometry: o.geometry, material: m, matrix: norm.clone().multiply(o.matrixWorld) });
    });
    const nb = new THREE.Box3(); parts.forEach((p) => { nb.union(p.geometry.boundingBox.clone().applyMatrix4(p.matrix)); });
    return { parts, box: nb, size: nb.getSize(new THREE.Vector3()) };
  }
  // Crea un InstancedMesh per peça amb les transformacions donades (matrius de món de cada còpia).
  function instance(model, mats, parent = scene) {
    const g = new THREE.Group();
    for (const p of model.parts) {
      const im = new THREE.InstancedMesh(p.geometry, p.material, mats.length);
      const m = new THREE.Matrix4();
      mats.forEach((w, i) => { m.multiplyMatrices(w, p.matrix); im.setMatrixAt(i, m); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); g.add(im);
    }
    parent.add(g); return g;
  }
  const worldMat = (u, off, yaw = 0, y = 0, sc = 1) => { placeOnRoute(dummy, u, off, yaw, y); dummy.scale.set(sc, sc, sc); dummy.updateMatrix(); return dummy.matrix.clone(); };
  const faceRoad = (off) => (off > 0 ? -Math.PI / 2 : Math.PI / 2); // gir perquè el «davant» del model (+z local) miri a la calçada
  const lampHeads = []; // posicions de món dels caps de fanal (halo + bassal + reflex)

  async function buildCity() {
    const want = mobile ? ['building_brick', 'building_rowhouse', 'prop_lamp', 'prop_cars', 'prop_trafficlight', 'prop_busstop']
      : ['building_brick', 'building_rowhouse', 'prop_lamp', 'prop_cars', 'prop_trafficlight', 'prop_busstop', 'prop_trashcan'];
    const roots = {};
    await Promise.all(want.map(async (n) => { try { roots[n] = await loadGLB(CITY + n + '.glb'); } catch (e) { console.warn('[landing] no s\'ha pogut carregar', n, e); } }));

    // --- Edificis: primera línia arran de vorera, seguint la corba ---
    const kinds = [];
    // Variants de color (materials clonats amb tint) per no repetir sempre el mateix edifici.
    if (roots.building_brick) {
      kinds.push({ m: prepareParts(roots.building_brick, { height: 19, emissiveBoost: 1.4 }), w: 0.3, h: [0.85, 1.25] });
      kinds.push({ m: prepareParts(roots.building_brick, { height: 21, emissiveBoost: 1.2, tint: new THREE.Color(0xc9b9a2) }), w: 0.18, h: [0.9, 1.3] });
      kinds.push({ m: prepareParts(roots.building_brick, { height: 17, emissiveBoost: 1.5, tint: new THREE.Color(0x8a7f78) }), w: 0.14, h: [0.9, 1.2] });
    }
    if (roots.building_rowhouse) {
      const hide = /Road|Dirt|Drainage|Pathway|Sidewalk/i;
      kinds.push({ m: prepareParts(roots.building_rowhouse, { height: 12.5, hide, emissiveBoost: 1 }), w: 0.22, h: [0.95, 1.05] });
      kinds.push({ m: prepareParts(roots.building_rowhouse, { height: 13, hide, emissiveBoost: 1, tint: new THREE.Color(0x9a948d) }), w: 0.16, h: [0.95, 1.1] });
    }
    if (kinds.length) {
      const pick = () => { let r = rnd() * kinds.reduce((a, k) => a + k.w, 0); for (const k of kinds) { r -= k.w; if (r <= 0) return k; } return kinds[0]; };
      const lists = kinds.map(() => []);
      for (const sgn of [-1, 1]) for (let row = 0; row < 2; row++) {
        let s = 2 + rnd() * 6;
        while (s < L - 4) {
          const k = pick(), ki = kinds.indexOf(k);
          const sc = k.h[0] + rnd() * (k.h[1] - k.h[0]) + row * 0.6; // segona fila més alta
          const yaw = faceRoad(sgn), rot = new THREE.Matrix4().makeRotationY(yaw);
          const bb = k.m.box.clone().applyMatrix4(rot), sz = bb.getSize(new THREE.Vector3()); // mida ja girada: x = al llarg del carrer, z = fondària
          const along = sz.z * sc, depth = sz.x * sc; // local z = al llarg del carrer, x = cap a la vorera
          const u = Math.min(0.999, (s + along / 2) / L);
          if (row === 0 && !nearCrossing(u, along / 2 + 1) || row === 1) {
            const off = sgn * (SIDE_OUT + 0.3 + depth / 2 + row * (depth + 6 + rnd() * 6));
            lists[ki].push(worldMat(u, off, yaw, KERB_H, sc));
          }
          s += along + 0.6 + rnd() * 2.5;
        }
      }
      kinds.forEach((k, i) => { if (lists[i].length) instance(k.m, lists[i]); });
    }

    // --- Fanals reals (el braç cap a la calçada) + halo, bassal i reflex ---
    if (roots.prop_lamp) {
      const lamp = prepareParts(roots.prop_lamp, { height: 6.2 });
      // el cap (material emissiu) ens diu cap a on va el braç
      const headPart = lamp.parts.find((p) => p.material.emissiveMap || p.material.emissive.getHex());
      const hb = (headPart || lamp.parts[0]).geometry.boundingBox.clone().applyMatrix4((headPart || lamp.parts[0]).matrix);
      const hc = hb.getCenter(new THREE.Vector3());
      const armYaw = Math.atan2(hc.x, hc.z); // direcció del braç en local
      const n = Math.max(10, Math.round(L / 13)), mats = [];
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, sgn = i % 2 ? 1 : -1;
        const off = sgn * (SIDE_IN + 0.45);
        const yaw = faceRoad(off) - armYaw;
        mats.push(worldMat(u, off, yaw, KERB_H));
        const hw = hc.clone().applyMatrix4(mats[mats.length - 1]);
        lampHeads.push(hw);
      }
      instance(lamp, mats);
    }
    for (const hw of lampHeads) {
      const s = new THREE.Sprite(haloMat); s.position.set(hw.x, hw.y + 0.05, hw.z); s.scale.set(1.6, 1.6, 1); scene.add(s);
      dummy.position.set(hw.x, 0.03, hw.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      const pool = new THREE.Mesh(poolGeo, poolMat); pool.position.set(hw.x, 0.03, hw.z); scene.add(pool);
      addStreak(scene, hw.x, -3.2, hw.z, 0xfff1cf, 0.4, 0.9, 6);
    }

    // --- Semàfors als passos de vianants ---
    if (roots.prop_trafficlight) {
      const tl = prepareParts(roots.prop_trafficlight, { height: 2.9 });
      const mats = [];
      for (const uc of CROSSINGS) for (const sgn of [-1, 1]) mats.push(worldMat(uc - 2.2 / L, sgn * (SIDE_IN + 0.5), sgn > 0 ? Math.PI : 0, KERB_H));
      instance(tl, mats);
    }
    // --- Parades de bus (obertes cap a la calçada) ---
    if (roots.prop_busstop) {
      const bs = prepareParts(roots.prop_busstop, { height: 2.7 });
      instance(bs, [worldMat(0.22, SIDE_IN + 1.9, Math.PI / 2 + Math.PI, KERB_H), worldMat(0.74, -(SIDE_IN + 1.9), -Math.PI / 2 + Math.PI, KERB_H)]);
    }
    // --- Papereres arran de façana ---
    if (roots.prop_trashcan) {
      const tc = prepareParts(roots.prop_trashcan, { height: 1.05 });
      const mats = []; const n = Math.round(L / 24);
      for (let i = 0; i < n; i++) { const u = (i + rnd()) / n, sgn = rnd() < 0.5 ? -1 : 1; mats.push(worldMat(u, sgn * (SIDE_OUT - 0.9), rnd() * Math.PI * 2, KERB_H)); }
      instance(tc, mats);
    }
    // --- Cotxes aparcats a les dues vorades (del pack: cada cotxe és un clúster de malles) ---
    if (roots.prop_cars) {
      const root = roots.prop_cars; root.updateMatrixWorld(true);
      const meshes = []; root.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); meshes.push(o); } });
      const bodies = meshes.filter((o) => /Body_Body/i.test(o.name));
      const centers = bodies.map((b) => b.geometry.boundingBox.clone().applyMatrix4(b.matrixWorld).getCenter(new THREE.Vector3()));
      const nearest = (v) => { let bi = 0, bd = Infinity; centers.forEach((c, i) => { const d = (c.x - v.x) ** 2 + (c.z - v.z) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
      const groups = bodies.map(() => new THREE.Group());
      const addTo = (ci, o, geometry) => { const c = new THREE.Mesh(geometry || o.geometry, o.material); c.matrix.copy(o.matrixWorld); c.matrixAutoUpdate = false; groups[ci].add(c); };
      const tmpV = new THREE.Vector3();
      // Subgeometria compacta amb només els vèrtexs usats (si no, la caixa englobant seria la de tot el pack).
      const subGeometry = (g, ids) => {
        const map = new Map(), newIdx = [];
        for (const i of ids) { let n = map.get(i); if (n === undefined) { n = map.size; map.set(i, n); } newIdx.push(n); }
        const ng = new THREE.BufferGeometry();
        for (const name of Object.keys(g.attributes)) {
          const a = g.attributes[name], arr = new a.array.constructor(map.size * a.itemSize);
          for (const [oi, ni] of map) for (let c = 0; c < a.itemSize; c++) arr[ni * a.itemSize + c] = a.array[oi * a.itemSize + c];
          ng.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
        }
        ng.setIndex(newIdx); ng.computeBoundingBox(); return ng;
      };
      for (const o of meshes) {
        const sz = o.geometry.boundingBox.getSize(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().extractRotation(o.matrixWorld)).length();
        if (sz < 7) { addTo(nearest(o.geometry.boundingBox.getCenter(tmpV).applyMatrix4(o.matrixWorld)), o); continue; }
        // Malla compartida entre cotxes (vidres/fars de tot el pack): reparteix els triangles pel cotxe més proper.
        const g = o.geometry, pos = g.attributes.position, idx = g.index;
        const triN = idx ? idx.count / 3 : pos.count / 3, per = bodies.map(() => []);
        for (let t = 0; t < triN; t++) {
          const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          tmpV.set((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3).applyMatrix4(o.matrixWorld);
          per[nearest(tmpV)].push(a, b, c);
        }
        per.forEach((ids, ci) => { if (ids.length) addTo(ci, o, subGeometry(g, ids)); });
      }
      const cars = groups.filter((g) => g.children.length >= 3);
      const tint = new THREE.Color(0x6a6a6a);
      const models = cars.map((g) => prepareParts(g, { length: 4.3, tint, alignLongZ: true }));
      models.forEach((m) => m.parts.forEach((p) => { if (p.material.transparent) { p.material.opacity = Math.min(p.material.opacity, 0.6); p.material.depthWrite = false; } }));
      const lists = models.map(() => []);
      const n = Math.round(L / 6.8);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        for (const sgn of [-1, 1]) {
          if (rnd() < 0.42 || nearCrossing(u, 6)) continue;
          if ((sgn > 0 && Math.abs(u - 0.22) * L < 9) || (sgn < 0 && Math.abs(u - 0.74) * L < 9)) continue; // parades de bus
          if (u < 0.04 || u > 0.96) continue;
          const ci = Math.floor(rnd() * models.length);
          // el cotxe mira al llarg del carrer: per la dreta en el sentit del taxi, per l'esquerra al contrari
          lists[ci].push(worldMat(u, sgn * (SIDE_IN - 1.05), sgn > 0 ? 0 : Math.PI, 0));
        }
      }
      models.forEach((m, i) => { if (lists[i].length) instance(m, lists[i]); });
    }
    console.info('[landing] carrer construït:', Object.keys(roots).join(', '));
  }
  const haloMat = new THREE.SpriteMaterial({ map: glow, color: 0xfff1cf, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 });
  const poolMat = new THREE.MeshBasicMaterial({ map: glow, color: 0xffe9b8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.14 });
  const poolGeo = new THREE.PlaneGeometry(8, 8); poolGeo.rotateX(-Math.PI / 2);
  buildCity().catch((e) => console.error('[landing] error construint el carrer', e));

  // ---------- Taxi: glTF si existeix, primitives mentrestant ----------
  const taxi = new THREE.Group(); scene.add(taxi);
  const taxiRig = new THREE.Group(); taxi.add(taxiRig); // el model s'ajusta aquí (escala/orientació)
  const amberPaint = new THREE.MeshPhysicalMaterial({ color: AMBRE, roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.4 });
  function primitiveTaxi() {
    const g = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x0f0e0c, roughness: 0.08, metalness: 0.2, envMapIntensity: 1.8 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.75, 0.6, 4.1, 4, 0.18), amberPaint); body.position.y = 0.6;
    const cabin = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.52, 2.0, 4, 0.2), glass); cabin.position.set(0, 1.14, -0.2);
    g.add(body, cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.28, 18); wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0c0a, roughness: 0.9 });
    for (const [x, z] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]]) { const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, 0.32, z); g.add(w); }
    return g;
  }
  function dressTaxi(length, height, ownSign) {
    // Fars, pilots i halos: igual per al model real i per al de reserva. El rètol de sostre només si el model no en porta.
    const signY = ownSign ? height - 0.08 : height + 0.12;
    if (!ownSign) {
      const sign = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.2, 0.3, 2, 0.05), new THREE.MeshBasicMaterial({ color: AMBRE }));
      sign.position.set(0, signY, -0.1); taxi.add(sign); taxi.userData.sign = sign;
    } else taxi.userData.sign = null;
    const signHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: AMBRE, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: ownSign ? 0.35 : 0.45 }));
    signHalo.position.set(0, signY, -0.1); signHalo.scale.set(1.0, 0.7, 1); taxi.add(signHalo);
    const headMat = new THREE.SpriteMaterial({ map: glow, color: 0xfff6dc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 });
    const tailMat = new THREE.SpriteMaterial({ map: glow, color: 0xff4a2a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 });
    for (const x of [-0.58, 0.58]) {
      const h = new THREE.Sprite(headMat); h.position.set(x, 0.62, length / 2 + 0.05); h.scale.set(1.1, 0.7, 1); taxi.add(h);
      const t = new THREE.Sprite(tailMat); t.position.set(x, 0.66, -length / 2 - 0.03); t.scale.set(0.5, 0.3, 1); taxi.add(t);
    }
    const head = new THREE.SpotLight(0xfff3d6, high ? 60 : 25, 26, 0.5, 0.55, 1.5);
    head.position.set(0, 0.75, length / 2); head.target.position.set(0, 0, length / 2 + 14); taxi.add(head, head.target);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 14), new THREE.MeshBasicMaterial({ map: glow, color: 0xfff0d0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.03, length / 2 + 6); taxi.add(pool);
    for (const x of [-0.58, 0.58]) { addStreak(taxi, x, -0.9, length / 2 + 0.05, 0xfff6dc, 0.6, 0.9, 2.2); addStreak(taxi, x, -0.8, -length / 2, 0xff4a2a, 0.5, 0.5, 1.6); }
    addStreak(taxi, 0, -signY, -0.1, AMBRE, 0.45, 1.2, 2.6); // reflex del llum de sostre
  }
  taxiRig.add(primitiveTaxi()); dressTaxi(4.1, 1.42, false);
  {
    const draco = new DRACOLoader(); draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    const gltf = new GLTFLoader(); gltf.setDRACOLoader(draco);
    gltf.load(TAXI_MODEL, (g) => {
      const model = g.scene;
      // Normalitza: 4,4 m de llarg sobre l'eix z, base a y=0, davant cap a +z.
      const box = new THREE.Box3().setFromObject(model); const size = box.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.z);
      if (size.x > size.z) model.rotation.y = Math.PI / 2;
      model.rotation.y += Math.PI; // el Baird ve mirant a -z: el davant ha d'anar cap a +z (sentit de la marxa)
      const s = 4.4 / longest; model.scale.setScalar(s);
      const box2 = new THREE.Box3().setFromObject(model); const c = box2.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -box2.min.y, -c.z);
      const h = (box2.max.y - box2.min.y);
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = false;
        const m = o.material; if (!m) return;
        m.envMapIntensity = 1.4;
        const name = `${o.name} ${m.name}`.toLowerCase();
        if (m.map) {
          // Model texturitzat (el Baird): la textura de carrosseria ja ve en ambre; hi afegim laca de cotxe.
          if (m.name === 'lambert7SG' && !m.isMeshPhysicalMaterial) {
            const pm = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(pm, m); // copy() de Physical peta amb un Standard
            pm.clearcoat = 0.9; pm.clearcoatRoughness = 0.12; pm.envMapIntensity = 1.6; pm.transparent = false; pm.alphaTest = 0.4;
            o.material = pm;
          }
        } else if (/body|carr|paint|chassis|car_|exterior|hull|coque|karos/.test(name) || (m.color && m.metalness < 0.6 && m.roughness < 0.6 && !/glass|window|wheel|tire|rim|light|lamp|interior|chrome/.test(name))) {
          o.material = amberPaint; // model sense textures: carrosseria → ambre de marca
        }
      });
      taxiRig.clear(); taxiRig.add(model);
      taxi.children.filter((ch) => ch !== taxiRig).forEach((ch) => taxi.remove(ch));
      dressTaxi(4.4, h, true); // el Baird ja porta rètol de sostre
      console.info('[landing] taxi glTF carregat');
    }, undefined, () => console.info('[landing] sense model glTF del taxi (assets/models/taxi/scene.glb): es fa servir el de reserva'));
  }

  // ---------- Rastre de llum ----------
  const trail = (() => {
    const N = 700, w = 0.5;
    const pos = new Float32Array((N + 1) * 2 * 3), uvs = new Float32Array((N + 1) * 2 * 2), aU = new Float32Array((N + 1) * 2);
    const idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, p = route.getPointAt(u), t = route.getTangentAt(u);
      const side = new THREE.Vector3().crossVectors(up, t).normalize();
      for (let k = 0; k < 2; k++) {
        const sgn = k ? 1 : -1, o = i * 2 + k;
        pos[o * 3] = p.x + side.x * w * sgn; pos[o * 3 + 1] = 0.06; pos[o * 3 + 2] = p.z + side.z * w * sgn;
        uvs[o * 2] = k; uvs[o * 2 + 1] = u; aU[o] = u;
      }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setAttribute('aU', new THREE.BufferAttribute(aU, 1)); g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uHead: { value: 0 }, uColor: { value: new THREE.Color(AMBRE) }, uTail: { value: 0.14 } },
      vertexShader: `attribute float aU; varying float vU; varying vec2 vUv;
        void main(){ vU=aU; vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uHead; uniform float uTail; uniform vec3 uColor; varying float vU; varying vec2 vUv;
        void main(){ if(vU>uHead) discard;
          float tail = smoothstep(uHead-uTail, uHead, vU);
          float edge = 1.0 - abs(vUv.x*2.0-1.0); edge = pow(edge, 2.2);
          float a = (0.12 + 0.88*tail) * edge;
          gl_FragColor = vec4(uColor * (0.5 + 1.1*tail), a); }`,
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; scene.add(mesh);
    return mesh;
  })();

  // ---------- Mòbil flotant ----------
  const phone = new THREE.Group(); const shotMats = {};
  {
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x15130f, roughness: 0.3, metalness: 0.7, clearcoat: 0.6, transparent: true, envMapIntensity: 1.2 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.92, 1.92, 0.09, 4, 0.09), bodyMat);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0xcfcac2, transparent: true });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.82), screenMat); screen.position.z = 0.047;
    phone.add(body, screen); phone.userData = { bodyMat, screenMat };
    for (const [k, name] of Object.entries(SHOTS)) { const t = texLoader.load(`assets/shots/${name}.jpg`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; shotMats[k] = t; }
    phone.visible = false; scene.add(phone);
  }

  // ---------- Pluja fina / pols (escriptori) ----------
  let particles = null;
  if (high && !reduced) {
    const n = 700, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = (Math.random() - 0.5) * 50; arr[i * 3 + 1] = Math.random() * 14; arr[i * 3 + 2] = (Math.random() - 0.5) * 50; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    particles = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe9e2d6, size: 0.03, transparent: true, opacity: 0.35, depthWrite: false }));
    particles.frustumCulled = false; scene.add(particles);
  }

  // ---------- Postprocés: bloom fi + gra de pel·lícula (escriptori) ----------
  let composer = null;
  if (high) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.22, 0.6, 0.92)); // mitja resolució: molt més barat
    composer.addPass(new FilmPass(0.18, false));
    composer.addPass(new OutputPass());
  }

  // ---------- Scroll → taxi i càmera ----------
  const state = { progress: 0, stop: 0, hold: 0, u: 0 };
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const tmpT = new THREE.Vector3(), tmpSide = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const nStops = STOPS.length;
  const smooth = (x) => { x = THREE.MathUtils.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  // El taxi avança de manera CONTÍNUA amb l'scroll (u lineal a trossos entre parades: mai s'atura ni salta);
  // només la càmera «s'assenta» (hold → 1) a la segona meitat de cada tram per enquadrar la parada.
  function mapProgress(p) {
    const seg = Math.min(nStops - 1, Math.max(0, p * nStops));
    const i = Math.min(nStops - 1, Math.floor(seg)), f = seg - i;
    const from = i === 0 ? 0 : STOPS[i - 1].u, to = STOPS[i].u;
    const hold = i === 0 ? 1 : smooth((f - 0.4) / 0.5);
    return { u: THREE.MathUtils.lerp(from, to, f), stop: i, hold };
  }
  const camFor = (i, k) => { const c = STOPS[i].cam; return { d: THREE.MathUtils.lerp(TRAVEL_CAM.d, c.d, k), h: THREE.MathUtils.lerp(TRAVEL_CAM.h, c.h, k), s: THREE.MathUtils.lerp(TRAVEL_CAM.s, c.s, k) }; };

  let currentShot = null;
  function update(dt, t) {
    const m = mapProgress(state.progress); state.u = m.u; state.stop = m.stop; state.hold = m.hold;
    const u = THREE.MathUtils.clamp(m.u, 0.001, 0.999);
    route.getPointAt(u, tmpP); route.getTangentAt(u, tmpT).normalize();
    taxi.position.copy(tmpP); taxi.lookAt(tmpP.x + tmpT.x, 0, tmpP.z + tmpT.z);
    taxiLight.position.set(tmpP.x, 1.5, tmpP.z);
    trail.material.uniforms.uHead.value = u;
    if (taxi.userData.sign) taxi.userData.sign.material.color.setHex(Math.sin(t * 7) > 0.85 ? CREMA : AMBRE);

    const c = camFor(m.stop, m.hold);
    tmpSide.crossVectors(up, tmpT).normalize();
    const target = tmpP.clone().addScaledVector(tmpT, -c.d).addScaledVector(tmpSide, c.s); target.y = c.h;
    const look = STOPS[m.stop].look === 'ahead' && m.hold > 0.2 ? tmpP.clone().addScaledVector(tmpT, 14).setY(1.0) : tmpP.clone().setY(0.9);
    const k = reduced ? 1 : 1 - Math.exp(-dt * (m.stop === 5 ? 5.5 : 3.2));
    camPos.lerp(target, k); camLook.lerp(look, k);
    camera.position.copy(camPos); camera.lookAt(camLook);

    const shot = SHOTS[m.stop], show = shot && m.hold > 0.05;
    if (show) {
      if (currentShot !== shot) { phone.userData.screenMat.map = shotMats[m.stop]; phone.userData.screenMat.needsUpdate = true; currentShot = shot; }
      const a = THREE.MathUtils.smoothstep(m.hold, 0.05, 0.5);
      phone.visible = true; phone.userData.bodyMat.opacity = a; phone.userData.screenMat.opacity = a;
      const sideSign = STOPS[m.stop].cam.s >= 0 ? -1 : 1;
      const pp = tmpP.clone().addScaledVector(tmpSide, 1.7 * sideSign).addScaledVector(tmpT, 0.4);
      pp.y = 2.05 + Math.sin(t * 1.4) * 0.05 + (1 - a) * 0.6;
      if (m.stop === 3) { pp.copy(tmpP).addScaledVector(tmpSide, 2.5).addScaledVector(tmpT, -1); pp.y = 12 + Math.sin(t * 1.4) * 0.08; }
      phone.position.lerp(pp, reduced ? 1 : 0.15); phone.lookAt(camera.position);
    } else if (phone.visible) {
      phone.userData.bodyMat.opacity *= 0.85; phone.userData.screenMat.opacity *= 0.85;
      if (phone.userData.bodyMat.opacity < 0.02) phone.visible = false;
    }
    if (particles) {
      const arr = particles.geometry.attributes.position.array;
      for (let i = 1; i < arr.length; i += 3) { arr[i] -= dt * 2.2; if (arr[i] < 0) arr[i] = 14; }
      particles.position.set(tmpP.x, 0, tmpP.z); particles.geometry.attributes.position.needsUpdate = true;
    }
  }
  (function init() {
    route.getPointAt(0.001, tmpP); route.getTangentAt(0.001, tmpT).normalize(); tmpSide.crossVectors(up, tmpT).normalize();
    const c = camFor(0, 1);
    camPos.copy(tmpP).addScaledVector(tmpT, -c.d).addScaledVector(tmpSide, c.s); camPos.y = c.h; camLook.copy(tmpP).setY(0.9);
  })();

  const clock = new THREE.Clock();
  let raf = 0, running = false;
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05); update(dt, clock.elapsedTime);
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  function start() { if (!running) { running = true; clock.start(); frame(); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function resize() { const w = window.innerWidth, h = window.innerHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); if (composer) composer.setSize(w, h); }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  return { setProgress(p) { state.progress = THREE.MathUtils.clamp(p, 0, 1); }, get state() { return state; }, start, stop, resize, renderer, scene, camera, taxi, phone, quality: high ? 'high' : 'low' };
}
