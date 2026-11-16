// Home page 3D scene (Three.js): a rotating medicine capsule, a location pin,
// a medical cross and floating tablets. It tilts slightly with the mouse.
// If WebGL or Three.js is not available, the 3D panel is simply hidden.
(function () {
  const box = document.getElementById("hero3d");
  if (!box) return;

  function fallback() {
    box.classList.add("hidden");
    const grid = document.querySelector(".hero-grid");
    if (grid) grid.classList.add("no-3d");
  }
  if (typeof THREE === "undefined") return fallback();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });   // alpha = transparent background
  } catch (err) {
    return fallback();
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  box.appendChild(renderer.domElement);

  // ---------- scene, camera, lights ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0x0e9f8e, 1.1, 30);     // teal glow from the left
  rim.position.set(-6, -2, 4);
  scene.add(rim);

  // ---------- small helpers ----------
  const TEAL = 0x0e9f8e, TEAL_LIGHT = 0x8fd8cd, WHITE = 0xffffff, NAVY = 0x14263b;
  const material = (color, extra) =>
    new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.35, metalness: 0.05 }, extra || {}));

  // A capsule (pill) built from two cylinders and two spheres, in two colours.
  function makePill(length, radius, colorTop, colorBottom) {
    const group = new THREE.Group();
    const half = length / 2;
    [[1, colorTop], [-1, colorBottom]].forEach(function (part) {
      const dir = part[0], color = part[1];
      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, half, 32), material(color));
      body.position.y = dir * half / 2;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), material(color));
      cap.position.y = dir * half;
      group.add(body, cap);
    });
    return group;
  }

  // ---------- objects ----------
  const root = new THREE.Group();          // everything lives in "root" so the mouse can tilt it
  scene.add(root);

  // 1) main capsule
  const pill = makePill(1.7, 0.62, TEAL, WHITE);
  pill.rotation.z = 0.7;
  const pillHolder = new THREE.Group();
  pillHolder.add(pill);
  root.add(pillHolder);

  // 2) location pin (navy)
  const pin = new THREE.Group();
  const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), material(NAVY));
  pinHead.position.y = 0.55;
  const pinTip = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 32), material(NAVY));
  pinTip.rotation.x = Math.PI;             // point downwards
  pinTip.position.y = 0.1;
  const pinDot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), material(WHITE));
  pinDot.position.set(0, 0.55, 0.38);
  pin.add(pinHead, pinTip, pinDot);
  pin.position.set(2.3, -1.3, 0.8);
  root.add(pin);

  // 3) medical cross
  const cross = new THREE.Group();
  [[1.3, 0.42], [0.42, 1.3]].forEach(function (size) {
    cross.add(new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], 0.42), material(TEAL_LIGHT)));
  });
  cross.position.set(-2.3, 1.5, -0.4);
  root.add(cross);

  // 4) floating tablets and small capsules
  const floaters = [];
  function addFloater(mesh, x, y, z, speed, phase) {
    mesh.position.set(x, y, z);
    root.add(mesh);
    floaters.push({ mesh: mesh, baseY: y, speed: speed, phase: phase });
  }
  const tablet1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.17, 40), material(WHITE));
  const tablet2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.13, 40), material(TEAL));
  const tablet3 = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.11, 40), material(NAVY));
  const miniPill = makePill(0.5, 0.17, NAVY, WHITE);
  addFloater(tablet1, 2.5, 1.7, -0.6, 1.1, 0.0);
  addFloater(tablet2, -2.4, -1.5, 0.4, 0.9, 1.7);
  addFloater(tablet3, -0.6, 2.3, -1.0, 1.3, 3.1);
  addFloater(miniPill, -1.4, -2.3, 0.6, 1.0, 2.4);
  miniPill.rotation.z = -0.8;

  // 5) two thin rings around the capsule
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.025, 16, 120), material(TEAL, { transparent: true, opacity: 0.55 }));
  ring.rotation.x = 1.15;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.02, 16, 120), material(TEAL, { transparent: true, opacity: 0.3 }));
  ring2.rotation.set(1.15, 0.5, 0);
  root.add(ring, ring2);

  // 6) small bubbles (fixed positions)
  [[1.2, 2.1, -1.2, 0.09], [-3.1, 0.2, -0.8, 0.12], [3.0, 0.1, -1.0, 0.1], [0.4, -2.5, -0.5, 0.08], [-1.9, 2.5, 0.2, 0.07]]
    .forEach(function (b) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(b[3], 16, 12), material(TEAL_LIGHT));
      bubble.position.set(b[0], b[1], b[2]);
      root.add(bubble);
    });

  // ---------- size ----------
  function resize() {
    const w = box.clientWidth || 400, h = box.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 1 ? 9 / camera.aspect : 9;   // zoom out on tall/narrow screens
    camera.updateProjectionMatrix();
  }
  resize();
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(box);
  else window.addEventListener("resize", resize);

  // ---------- mouse tilt ----------
  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", function (e) {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ---------- animation ----------
  function draw(now) {
    const t = now / 1000;
    pillHolder.rotation.y = t * 0.6;
    pillHolder.position.y = Math.sin(t * 1.2) * 0.12;
    pin.rotation.y = Math.sin(t * 0.8) * 0.6;
    pin.position.y = -1.3 + Math.sin(t * 1.4) * 0.1;
    cross.rotation.y = t * 0.5;
    cross.rotation.x = Math.sin(t * 0.7) * 0.3;
    ring.rotation.z = t * 0.25;
    ring2.rotation.z = -t * 0.3;
    floaters.forEach(function (f) {
      f.mesh.position.y = f.baseY + Math.sin(t * f.speed + f.phase) * 0.2;
      f.mesh.rotation.x = t * 0.6 + f.phase;
      f.mesh.rotation.y = t * 0.4;
    });
    root.rotation.y += (mouse.x * 0.35 - root.rotation.y) * 0.05;
    root.rotation.x += (mouse.y * 0.18 - root.rotation.x) * 0.05;
    renderer.render(scene, camera);
  }

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rafId = null;
  function loop(now) {
    draw(now);
    rafId = requestAnimationFrame(loop);
  }
  draw(0);
  box.classList.add("ready");                       // fade the scene in

  if (!reduceMotion) {
    rafId = requestAnimationFrame(loop);
    // stop animating when the 3D panel is scrolled out of view (saves battery)
    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { if (rafId === null) rafId = requestAnimationFrame(loop); }
        else { cancelAnimationFrame(rafId); rafId = null; }
      }).observe(box);
    }
  }
})();
