// スクロールに合わせて、ひとつの道具（ドーナツ = Mochido の印）が出来上がり、iPhone のホーム画面に置かれるまで。
// 01 Idea 線だけの骨組み → 02 Design 生地 → 03 Build グレーズ → 04 Polish スプリンクルと光
// → 05 Ship 小さくなってアイコンになり、iPhone のホーム画面へ
import * as THREE from 'three';
import { RoomEnvironment } from '/assets/vendor/RoomEnvironment.js';

const lab = document.querySelector('.lab');
const stage = document.querySelector('.lab-stage');
const canvas = document.querySelector('.lab-canvas');
const capEls = [...document.querySelectorAll('.cap')];
const stepEls = [...document.querySelectorAll('.hud-steps li')];
const statEls = Object.fromEntries([...document.querySelectorAll('[data-stat]')].map(el => [el.dataset.stat, el]));
const calm = matchMedia('(prefers-reduced-motion: reduce)');
// 確認用: ?stage=4.5 でその場面に止める
const fixedStage = parseFloat(new URLSearchParams(location.search).get('stage'));

const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = t => t * t * (3 - 2 * t);
const range = (v, a, b) => clamp01((v - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}

if (renderer) start();
else wireTextOnly();

/* WebGL が無いときも、文字の出し入れだけはスクロールで動かす */
function wireTextOnly() {
  const tick = () => { updateText(scrollStage()); requestAnimationFrame(tick); };
  tick();
}

function scrollStage() {
  if (!Number.isNaN(fixedStage)) return Math.min(5, Math.max(0, fixedStage));
  const r = lab.getBoundingClientRect();
  const total = r.height - innerHeight;
  const p = total > 0 ? clamp01(-r.top / total) : 0;
  return clamp01((p - 0.035) / 0.93) * 5; // 0..5
}

/* ---------- 文字と HUD ---------- */
function updateText(s) {
  stage.style.setProperty('--intro', (1 - range(s, 0.05, 0.3)).toFixed(3));
  const lastCap = capEls.length - 1;
  // 字幕はいつもどれか 1 つを出しておく（段が変わるところで入れ替える）
  const active = s < 0.22 ? 0 : s >= 4.5 ? lastCap : 1 + Math.min(lastCap - 2, Math.floor(s));
  capEls.forEach((el, i) => el.classList.toggle('is-on', i === active));
  stepEls.forEach((el, i) => {
    const f = clamp01(s - i);
    el.classList.toggle('is-on', (s >= i && s < i + 1) || (i === 4 && s >= 4));
    el.classList.toggle('is-done', f >= 1 && i < 4);
    el.style.setProperty('--fill', f.toFixed(3));
  });
}
function setStat(key, val) {
  const el = statEls[key];
  if (el && el.textContent !== val) el.textContent = val;
}

function roundRect(w, h, r) {
  const s = new THREE.Shape(), x = w / 2, y = h / 2;
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y); s.lineTo(-x + r, y);
  s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

/* ---------- 3D ---------- */
function start() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // 光
  const hemi = new THREE.HemisphereLight(0xfff1f6, 0x1a1020, 0.6);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 6, 4);
  const rim = new THREE.DirectionalLight(0xf7a8c4, 0);
  rim.position.set(-4, 2.5, -4);
  const fill = new THREE.DirectionalLight(0xbba5e6, 0);
  fill.position.set(4, 0.5, -2);
  scene.add(hemi, key, rim, fill);

  // 床のグリッド（エディタの画面っぽさ。磨く段で消える）
  const grid = new THREE.GridHelper(16, 32, 0x8a6a7c, 0x3a2a35);
  grid.position.y = -0.62;
  grid.material.transparent = true;
  grid.material.depthWrite = false;
  scene.add(grid);

  // ドーナツ: 平らに置いて少し手前に傾ける。中の spin がくるくる回る
  const donut = new THREE.Group();
  const spin = new THREE.Group();
  donut.add(spin);
  scene.add(donut);

  const R = 1, TUBE = 0.43, FLAT = 0.82;

  // 01 骨組み
  const wireSrc = new THREE.TorusGeometry(R, TUBE, 14, 44);
  wireSrc.scale(1, 1, FLAT);
  const wireGeo = new THREE.WireframeGeometry(wireSrc);
  const wireCount = wireGeo.attributes.position.count;
  const wireMat = new THREE.LineBasicMaterial({ color: 0xf7a8c4, transparent: true, opacity: 0.9, depthWrite: false });
  const wire = new THREE.LineSegments(wireGeo, wireMat);
  spin.add(wire);

  // 02 生地（少しでこぼこ）
  const doughGeo = new THREE.TorusGeometry(R, TUBE, 72, 180);
  doughGeo.scale(1, 1, FLAT);
  {
    const p = doughGeo.attributes.position, n = new THREE.Vector3(), v = new THREE.Vector3();
    doughGeo.computeVertexNormals();
    const nor = doughGeo.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); n.fromBufferAttribute(nor, i);
      const th = Math.atan2(v.y, v.x);
      const bump = 0.008 * Math.sin(th * 9 + v.z * 7) + 0.005 * Math.sin(th * 23 + v.z * 13) + 0.004 * Math.sin(v.x * 17 + v.y * 11);
      v.addScaledVector(n, bump);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    doughGeo.computeVertexNormals();
    // 継ぎ目（輪の始まりと終わり・管の始まりと終わり）の法線をそろえて、線が見えないようにする
    const RS = 72, TS = 180, at = (j, i) => j * (TS + 1) + i, a = new THREE.Vector3(), b = new THREE.Vector3();
    const join = (x, y) => {
      a.fromBufferAttribute(p, x); b.fromBufferAttribute(p, y); a.add(b).multiplyScalar(0.5);
      p.setXYZ(x, a.x, a.y, a.z); p.setXYZ(y, a.x, a.y, a.z);
      a.fromBufferAttribute(nor, x); b.fromBufferAttribute(nor, y); a.add(b).normalize();
      nor.setXYZ(x, a.x, a.y, a.z); nor.setXYZ(y, a.x, a.y, a.z);
    };
    for (let j = 0; j <= RS; j++) join(at(j, 0), at(j, TS));
    for (let i = 0; i <= TS; i++) join(at(0, i), at(RS, i));
    nor.needsUpdate = true;
    p.needsUpdate = true;
  }
  const clay = new THREE.Color(0xb9aeb5), baked = new THREE.Color(0xd8975a);
  const doughMat = new THREE.MeshPhysicalMaterial({ color: clay.clone(), roughness: 0.78, sheen: 1, sheenColor: new THREE.Color(0xffd6a8), sheenRoughness: 0.55, transparent: true, opacity: 0, envMapIntensity: 0.4 });
  const dough = new THREE.Mesh(doughGeo, doughMat);
  spin.add(dough);

  // 03 グレーズ: 上から垂れるように広がる。境目はシェーダーで切る
  const edgeAt = th => -0.03 + 0.06 * Math.sin(th * 5 + 1.3) + 0.035 * Math.sin(th * 11 + 0.4) - 0.16 * Math.pow(Math.max(0, Math.sin(th * 7 + 0.5)), 14);
  const glazeGeo = new THREE.TorusGeometry(R, TUBE + 0.034, 96, 240);
  glazeGeo.scale(1, 1, FLAT);
  const grow = { value: 0 };
  const glazeMat = new THREE.MeshPhysicalMaterial({ color: 0xf38db2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new THREE.Color(0xffd3e2), envMapIntensity: 0.5 });
  glazeMat.onBeforeCompile = shader => {
    shader.uniforms.uGrow = grow;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform float uGrow;')
      .replace('void main() {', `void main() {
        float th = atan(vLocal.y, vLocal.x);
        float edge = -0.03 + 0.06 * sin(th * 5.0 + 1.3) + 0.035 * sin(th * 11.0 + 0.4) - 0.16 * pow(max(0.0, sin(th * 7.0 + 0.5)), 14.0);
        if (vLocal.z < mix(0.42, edge, uGrow)) discard;`);
  };
  const glaze = new THREE.Mesh(glazeGeo, glazeMat);
  glaze.visible = false;
  spin.add(glaze);

  // 04 スプリンクル
  const SPR = 150;
  const sprGeo = new THREE.CapsuleGeometry(0.017, 0.075, 4, 10);
  const sprMat = new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6, envMapIntensity: 0.6 });
  const sprinkles = new THREE.InstancedMesh(sprGeo, sprMat, SPR);
  const palette = [0xffffff, 0xffd98a, 0x9fe0c8, 0xbba5e6, 0x8fc3ff, 0xff8fa8, 0xfff3c4];
  const sprData = [];
  {
    const up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    let i = 0, guard = 0;
    while (i < SPR && guard++ < 20000) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 2;
      const rr = TUBE + 0.034;
      const z = rr * FLAT * Math.sin(ph);
      if (z < edgeAt(th) + 0.05) continue;
      const ring = R + rr * Math.cos(ph);
      const pos = new THREE.Vector3(ring * Math.cos(th), ring * Math.sin(th), z);
      const n = new THREE.Vector3(Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph) / FLAT).normalize();
      pos.addScaledVector(n, 0.012);
      const rnd = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5);
      const tan = new THREE.Vector3().crossVectors(n, rnd).normalize();
      const qEnd = new THREE.Quaternion().setFromUnitVectors(up, tan);
      const qStart = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      sprData.push({ pos, from: pos.clone().add(new THREE.Vector3(0, 0, 2.2 + Math.random() * 1.6)), qEnd, qStart, delay: Math.random() });
      sprinkles.setColorAt(i, c.set(palette[i % palette.length]));
      i++;
    }
  }
  sprinkles.count = sprData.length;
  spin.add(sprinkles);
  const sprMatrix = new THREE.Matrix4(), sprQ = new THREE.Quaternion(), sprP = new THREE.Vector3(), sprS = new THREE.Vector3();
  let sprLast = -1;
  function placeSprinkles(t) {
    let landed = 0;
    sprData.forEach(d => { if (t >= d.delay * 0.62 + 0.38) landed++; });
    if (t === sprLast) return landed;
    sprLast = t;
    sprData.forEach((d, i) => {
      const k = clamp01((t - d.delay * 0.62) / 0.38);
      const e = k <= 0 ? 0 : 1 - Math.pow(1 - k, 3);
      sprP.lerpVectors(d.from, d.pos, e);
      sprQ.slerpQuaternions(d.qStart, d.qEnd, e);
      const sc = k <= 0 ? 0.0001 : 1;
      sprS.set(sc, sc, sc);
      sprMatrix.compose(sprP, sprQ, sprS);
      sprinkles.setMatrixAt(i, sprMatrix);
    });
    sprinkles.instanceMatrix.needsUpdate = true;
    return landed;
  }

  /* ---------- 05 iPhone ---------- */
  const PW = 2.2, PH = 4.55, PR = 0.38;
  const phone = new THREE.Group();
  phone.visible = false;
  scene.add(phone);
  const bodyGeo = new THREE.ExtrudeGeometry(roundRect(PW, PH, PR), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 5, curveSegments: 20 });
  bodyGeo.translate(0, 0, -0.14);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x2c2430, metalness: 0.75, roughness: 0.3, clearcoat: 0.7, envMapIntensity: 1.1 });
  phone.add(new THREE.Mesh(bodyGeo, bodyMat));
  const SW = PW - 0.1, SH = PH - 0.1;
  const screenGeo = new THREE.ShapeGeometry(roundRect(SW, SH, PR - 0.05), 24);
  {
    const uv = screenGeo.attributes.uv, pos = screenGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / SW + 0.5, pos.getY(i) / SH + 0.5);
  }
  const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: wallpaperTexture(SW, SH), toneMapped: false }));
  screen.position.z = 0.045;
  phone.add(screen);

  // ホーム画面のマス（4 列 × 4 段 + ドック）
  const ICON_Z = 0.112;
  const colX = [-0.72, -0.24, 0.24, 0.72];
  const rowY = [1.5, 0.9, 0.3, -0.3];
  const DOCK_Y = -1.83;
  const slots = [];
  rowY.forEach(y => colX.forEach(x => slots.push(new THREE.Vector3(x, y, ICON_Z))));
  const dockSlots = colX.map(x => new THREE.Vector3(x, DOCK_Y, ICON_Z));
  const DONUT_SLOT = 5;
  const TOOL_SLOTS = [0, 2, 7, 8, 10, 13, 15];

  const tileGeo = new THREE.ExtrudeGeometry(roundRect(0.36, 0.36, 0.09), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.022, bevelSegments: 4, curveSegments: 10 });
  tileGeo.translate(0, 0, -0.025);
  const glyphGeo = new THREE.PlaneGeometry(0.25, 0.25);
  const glyphCache = {};
  const glyphMat = (kind, opacity = 1) => {
    const keyName = kind + opacity;
    if (!glyphCache[keyName]) glyphCache[keyName] = new THREE.MeshBasicMaterial({ map: glyphTexture(kind), transparent: true, opacity, depthWrite: false });
    return glyphCache[keyName];
  };
  function makeTile(kind, color, opts = {}) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(tileGeo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: opts.env ?? 0.9 })));
    if (kind) {
      const face = new THREE.Mesh(glyphGeo, glyphMat(kind, opts.glyph ?? 1));
      face.position.z = 0.052;
      g.add(face);
    }
    g.scale.setScalar(0.0001);
    return g;
  }

  // 主役の道具: ドーナツのまわりに浮かんでから、ホーム画面のマスへ飛んでいく
  const toolDefs = [
    ['timer', 0xf7a8c4], ['grid', 0xbba5e6], ['train', 0x8fc3ff],
    ['dumbbell', 0x9fe0c8], ['calendar', 0xffd98a], ['note', 0xffb89a], ['heart', 0xff8fa8],
  ];
  const toolItems = toolDefs.map(([kind, color], i) => {
    const g = makeTile(kind, color);
    scene.add(g);
    return { g, phase: i / toolDefs.length * Math.PI * 2, bob: Math.random() * 6, slot: slots[TOOL_SLOTS[i]] };
  });

  // ほかのマスは控えめな色のアイコンで埋める（ふつうのホーム画面に見えるように）
  const fillerKinds = ['note', 'calendar', 'grid', 'timer', 'heart', 'train', 'dumbbell', 'grid'];
  const fillerColors = [0x5d4b66, 0x4e5f73, 0x6b5560, 0x55665e, 0x6a5f7d, 0x5f5163, 0x4f5768, 0x6c5a52];
  const fillers = [];
  slots.forEach((p, i) => {
    if (i === DONUT_SLOT || TOOL_SLOTS.includes(i)) return;
    const g = makeTile(fillerKinds[fillers.length % 8], fillerColors[fillers.length % 8], { glyph: 0.7, env: 0.6 });
    g.position.copy(p);
    phone.add(g);
    fillers.push(g);
  });
  dockSlots.forEach((p, i) => {
    const g = makeTile(['grid', 'note', 'timer', 'heart'][i], [0x6a5a74, 0x5a6a78, 0x745a66, 0x5f6e66][i], { glyph: 0.75, env: 0.6 });
    g.position.copy(p);
    phone.add(g);
    fillers.push(g);
  });
  // ドーナツのアイコンの台
  const donutBase = makeTile(null, 0xfff0f5, { env: 0.7 });
  donutBase.position.copy(slots[DONUT_SLOT]).setZ(ICON_Z - 0.01);
  phone.add(donutBase);

  /* ---------- カメラの道筋（段の終わりごとのキー） ---------- */
  const keys = [
    { pos: [0, 5.4, 2.6], tilt: 0.12 },
    { pos: [0, 4.4, 3.9], tilt: 0.2 },
    { pos: [0.5, 3.4, 4.6], tilt: 0.3 },
    { pos: [-0.35, 2.9, 4.9], tilt: 0.38 },
    { pos: [0, 2.0, 6.2], tilt: 0.56 },
    { pos: [0, 0.35, 10.4], tilt: 0.56 },
  ];
  const camPos = new THREE.Vector3(), target = new THREE.Vector3(), tmp = new THREE.Vector3();
  const baseQ = new THREE.Quaternion(), orbitQ = new THREE.Quaternion(), slotPos = new THREE.Vector3();
  const euler = new THREE.Euler();

  let width = 0, height = 0;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === width && h === height) return;
    width = w; height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(lab);

  const triDough = doughGeo.index.count / 3, triGlaze = glazeGeo.index.count / 3, triSpr = sprGeo.index.count / 3;
  const triTile = tileGeo.attributes.position.count / 3, triPhone = bodyGeo.attributes.position.count / 3;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let cur = scrollStage(), last = performance.now(), time = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const goal = scrollStage();
    cur = calm.matches ? goal : cur + (goal - cur) * (1 - Math.exp(-dt * 7));
    if (Math.abs(goal - cur) < 0.0005) cur = goal;
    updateText(goal);
    if (!visible) return;
    if (!calm.matches) time += dt;
    const s = Math.min(5, Math.max(0, cur));

    const t1 = range(s, 0, 1), t2 = range(s, 1, 2), t3 = range(s, 2, 3), t4 = range(s, 3, 4), t5 = range(s, 4, 5);

    // 01 骨組みを描いていく
    wire.geometry.setDrawRange(0, Math.floor(wireCount * smooth(range(t1, 0.02, 0.9)) / 2) * 2);
    wireMat.opacity = 0.9 * (1 - smooth(range(t2, 0.05, 0.6)));
    wire.visible = wireMat.opacity > 0.01;

    // 02 生地が現れて、焼き色がつく
    doughMat.opacity = smooth(range(t2, 0.05, 0.6));
    doughMat.transparent = doughMat.opacity < 1;
    doughMat.depthWrite = doughMat.opacity > 0.5;
    dough.visible = doughMat.opacity > 0.01;
    doughMat.color.copy(clay).lerp(baked, smooth(range(t2, 0.45, 1)));

    // 03 グレーズ
    grow.value = smooth(t3);
    glaze.visible = t3 > 0.001;

    // 04 スプリンクルが降って、光が当たる
    const landed = t4 > 0 ? placeSprinkles(t4) : 0;
    sprinkles.visible = t4 > 0;
    const lit = smooth(range(t4, 0.3, 1));
    renderer.toneMappingExposure = lerp(0.9, 1.1, lit);
    rim.intensity = lerp(0, 3.2, lit);
    fill.intensity = lerp(0, 1.4, lit);
    key.intensity = lerp(1.6, 2.2, lit);
    hemi.intensity = lerp(0.6, 0.35, lit);
    doughMat.envMapIntensity = lerp(0.4, 1.15, lit);
    glazeMat.envMapIntensity = lerp(0.5, 1.5, lit);
    sprMat.envMapIntensity = lerp(0.6, 1.3, lit);
    grid.material.opacity = 0.55 * (1 - smooth(range(t4, 0.3, 0.9))) * smooth(range(s, 0, 0.4));
    grid.visible = grid.material.opacity > 0.01;
    stage.style.setProperty('--glow', lit.toFixed(3));

    // カメラ
    const k = Math.min(4, Math.floor(s)), f = smooth(s - k);
    const a = keys[k], b = keys[Math.min(5, k + 1)];
    const aspect = width / height;
    const wide = aspect > 1.05;
    const near = wide ? 1 : 1 + (1.05 - aspect) * 1.75;
    const dist = lerp(near, wide ? 1 : 1 + (1.05 - aspect) * 1.9, smooth(range(t5, 0.2, 1)));
    camPos.set(lerp(a.pos[0], b.pos[0], f), lerp(a.pos[1], b.pos[1], f), lerp(a.pos[2], b.pos[2], f)).multiplyScalar(dist);
    const d = camPos.length();
    const visH = 2 * tanHalf * d, visW = visH * aspect;
    // 広い画面では 1200px の枠の右寄り（枠の 68% のところ）にドーナツを置く
    const gutter = Math.min(40, Math.max(16, width * 0.04));
    const edge = Math.max(gutter, (width - 1200) / 2 + gutter);
    const fx = (edge + (width - 2 * edge) * 0.68) / width;
    target.set(wide ? -(fx - 0.5) * visW : 0, wide ? 0 : lerp(-0.08, -0.09, smooth(range(t5, 0.3, 1))) * visH, 0);
    camera.position.copy(camPos).add(target);
    camera.lookAt(target);
    stage.style.setProperty('--gx', wide ? `${(fx * 100).toFixed(1)}%` : '50%');
    stage.style.setProperty('--gy', wide ? '52%' : '36%');

    // 05 iPhone がせり上がってくる
    const rise = smooth(range(t5, 0.06, 0.6));
    phone.visible = t5 > 0.06;
    phone.position.set(0, lerp(-7.5, 0, rise), lerp(-1.4, 0, rise));
    phone.rotation.set(lerp(0.3, -0.04, rise), lerp(-0.75, -0.2, rise) + Math.sin(time * 0.5) * 0.035 * rise, lerp(0.08, 0, rise));
    phone.updateMatrixWorld();

    // ドーナツ: 小さくなってアイコンのマスへ
    const fly = smooth(range(t5, 0.22, 0.78));
    const tilt = lerp(a.tilt, b.tilt, f);
    baseQ.setFromEuler(euler.set(-Math.PI / 2 + tilt, 0, 0));
    slotPos.copy(slots[DONUT_SLOT]).setZ(ICON_Z + 0.09);
    phone.localToWorld(slotPos);
    tmp.set(0, lit * 0.08 + Math.sin(time * 1.2) * 0.03 * lit, 0);
    donut.position.lerpVectors(tmp, slotPos, fly);
    donut.quaternion.slerpQuaternions(baseQ, phone.quaternion, fly);
    donut.scale.setScalar(lerp(1, 0.112, fly));
    spin.rotation.z = time * lerp(0.16, 0.35, fly) + s * 0.55;
    donutBase.scale.setScalar(easeOutBack(range(t5, 0.62, 0.85)) || 0.0001);

    // 道具: 浮かんで、マスへ
    toolItems.forEach((it, i) => {
      const appear = clamp01((t5 - i * 0.025) / 0.18);
      const go = smooth(range(t5, 0.3 + i * 0.03, 0.72 + i * 0.03));
      it.g.visible = appear > 0;
      it.g.scale.setScalar(appear <= 0 ? 0.0001 : easeOutBack(appear));
      const ang = it.phase + time * 0.22;
      const rx = wide ? 2.3 : 1.75, rz = wide ? 1.55 : 1.3;
      tmp.set(Math.cos(ang) * rx, 0.22 + Math.sin(ang * 2 + it.bob) * 0.12 + Math.sin(time * 1.4 + it.bob) * 0.05, Math.sin(ang) * rz);
      slotPos.copy(it.slot);
      phone.localToWorld(slotPos);
      it.g.position.lerpVectors(tmp, slotPos, go);
      it.g.lookAt(camera.position);
      it.g.rotateZ(Math.sin(time * 0.9 + it.bob) * 0.12 * (1 - go));
      orbitQ.copy(it.g.quaternion);
      it.g.quaternion.slerpQuaternions(orbitQ, phone.quaternion, go);
    });
    fillers.forEach((g, i) => {
      const k2 = clamp01((t5 - 0.5 - i * 0.012) / 0.2);
      g.scale.setScalar(k2 <= 0 ? 0.0001 : easeOutBack(k2));
    });

    renderer.render(scene, camera);

    // HUD の数字
    const shown = t5 > 0 ? toolItems.filter(it => it.g.visible).length : 0;
    const poly = Math.round((t1 > 0 && t2 < 0.6 ? (wireCount / 2) * smooth(range(t1, 0.02, 0.9)) : 0)
      + triDough * doughMat.opacity + triGlaze * grow.value + triSpr * landed
      + triTile * shown + (phone.visible ? triPhone + triTile * fillers.length * range(t5, 0.5, 0.9) : 0));
    setStat('poly', poly.toLocaleString('en-US'));
    setStat('spr', `${landed}`);
    setStat('lights', `${t4 > 0.35 ? 4 : 2}`);
    setStat('build', `${Math.round(clamp01(s / 5) * 100)}%`);
  }
  requestAnimationFrame(frame);
}

/* ホーム画面の壁紙: 時計、ダイナミックアイランド、ページの点、ドックのガラス */
function wallpaperTexture(sw, sh) {
  const W = 600, H = Math.round(W * sh / sw);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2e1b33'); bg.addColorStop(0.55, '#1c1420'); bg.addColorStop(1, '#130e16');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const blob = (x, y, r, col) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  };
  blob(W * 0.82, H * 0.22, W * 0.75, 'rgba(247,168,196,0.42)');
  blob(W * 0.12, H * 0.68, W * 0.7, 'rgba(187,165,230,0.32)');
  const toPx = y => (0.5 - y / sh) * H;
  // ダイナミックアイランドと時計
  g.fillStyle = '#000';
  g.beginPath(); g.roundRect(W / 2 - 92, 26, 184, 52, 26); g.fill();
  g.fillStyle = '#fff';
  g.font = '600 34px -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif';
  g.textBaseline = 'middle';
  g.fillText('9:41', 62, 52);
  // ページの点
  [W / 2 - 14, W / 2 + 14].forEach((x, i) => { g.fillStyle = i ? 'rgba(255,255,255,.35)' : '#fff'; g.beginPath(); g.arc(x, toPx(-1.32), 6, 0, 7); g.fill(); });
  // ドックのガラス
  g.fillStyle = 'rgba(255,255,255,0.13)';
  g.beginPath(); g.roundRect(28, toPx(-1.83) - 70, W - 56, 140, 54); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* タイルの絵（白い線の小さなアイコン）を canvas で描く */
function glyphTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.strokeStyle = g.fillStyle = '#ffffff';
  g.lineWidth = 20; g.lineCap = 'round'; g.lineJoin = 'round';
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  switch (kind) {
    case 'timer':
      g.beginPath(); g.arc(128, 136, 78, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(128, 136); g.lineTo(128, 92); g.moveTo(128, 136); g.lineTo(160, 154); g.stroke();
      g.beginPath(); g.moveTo(104, 34); g.lineTo(152, 34); g.stroke();
      break;
    case 'grid':
      [[52, 52], [136, 52], [52, 136], [136, 136]].forEach(([x, y]) => { rr(x, y, 68, 68, 18); g.fill(); });
      break;
    case 'train':
      rr(62, 36, 132, 150, 34); g.stroke();
      g.beginPath(); g.moveTo(62, 112); g.lineTo(194, 112); g.stroke();
      g.beginPath(); g.arc(98, 148, 9, 0, 7); g.arc(158, 148, 9, 0, 7); g.fill();
      g.beginPath(); g.moveTo(92, 214); g.lineTo(76, 236); g.moveTo(164, 214); g.lineTo(180, 236); g.stroke();
      break;
    case 'dumbbell':
      g.lineWidth = 24;
      g.beginPath(); g.moveTo(40, 104); g.lineTo(40, 152); g.moveTo(78, 74); g.lineTo(78, 182); g.moveTo(178, 74); g.lineTo(178, 182); g.moveTo(216, 104); g.lineTo(216, 152); g.moveTo(78, 128); g.lineTo(178, 128); g.stroke();
      break;
    case 'calendar':
      rr(46, 58, 164, 152, 30); g.stroke();
      g.beginPath(); g.moveTo(46, 104); g.lineTo(210, 104); g.moveTo(92, 34); g.lineTo(92, 74); g.moveTo(164, 34); g.lineTo(164, 74); g.stroke();
      [[94, 146], [128, 146], [162, 146], [94, 178]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); });
      break;
    case 'note':
      [0, 1, 2].forEach(i => {
        const y = 74 + i * 56;
        g.beginPath(); g.arc(70, y, 11, 0, 7); g.fill();
        g.beginPath(); g.moveTo(108, y); g.lineTo(200 - i * 26, y); g.stroke();
      });
      break;
    case 'heart':
      g.beginPath(); g.moveTo(128, 206);
      g.bezierCurveTo(48, 150, 40, 104, 62, 78); g.bezierCurveTo(86, 50, 120, 58, 128, 92);
      g.bezierCurveTo(136, 58, 170, 50, 194, 78); g.bezierCurveTo(216, 104, 208, 150, 128, 206); g.fill();
      break;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
