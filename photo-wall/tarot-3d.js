import * as THREE from "three";

// Cards are deliberately small enough to sit in a true 78-card circle with breathing room.
const CARD_W = 0.62;
const CARD_H = CARD_W * 1.7;
const CARD_D = 0.045;
const CARD_RADIUS = 9.25;
const TABLE_TOP = -0.095;
const CARD_Y = TABLE_TOP + CARD_D / 2;

function textureFromSvg(svg, renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 544;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const image = new Image();
  image.onload = () => {
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    texture.needsUpdate = true;
  };
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return texture;
}

export function createTarotScene({ cards, backSvg, onPick }) {
  const host = document.getElementById("scene");
  const mobile = innerWidth < 700;
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !mobile,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.2 : 1.65));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.id = "tarot3d";
  renderer.domElement.setAttribute("aria-label", "拖动旋转圆形牌环，点击卡牌抽牌");
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.1, 90);
  const world = new THREE.Group();
  scene.add(world);
  scene.add(new THREE.HemisphereLight(0xd5d0ff, 0x100b20, 2.2));

  const key = new THREE.DirectionalLight(0xffdfae, 3.1);
  key.position.set(-5, 13, 8);
  key.castShadow = !mobile;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.00025;
  scene.add(key);

  const violet = new THREE.PointLight(0x927aff, 46, 25, 2);
  violet.position.set(6, 4, -5);
  scene.add(violet);
  const cyan = new THREE.PointLight(0x58c4d4, 24, 20, 2);
  cyan.position.set(-8, 3, 4);
  scene.add(cyan);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(10.55, 10.72, 0.52, 128),
    new THREE.MeshStandardMaterial({ color: 0x120d22, roughness: 0.3, metalness: 0.5 })
  );
  base.scale.z = 0.88;
  base.position.y = -0.39;
  base.receiveShadow = true;
  base.castShadow = !mobile;
  world.add(base);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(10.36, 10.36, 0.035, 128),
    new THREE.MeshStandardMaterial({ color: 0x21183a, roughness: 0.62, metalness: 0.14, emissive: 0x201044, emissiveIntensity: 0.26 })
  );
  felt.scale.z = 0.88;
  felt.position.y = TABLE_TOP - 0.0175;
  felt.receiveShadow = true;
  world.add(felt);

  function ring(radius, tube, color, opacity) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 192),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.z = 0.88;
    mesh.position.y = TABLE_TOP + 0.004;
    world.add(mesh);
  }
  ring(10.24, 0.027, 0xe6c985, 0.74);
  ring(9.98, 0.012, 0x9980ff, 0.62);
  ring(8.5, 0.012, 0xe6c985, 0.34);
  ring(3.7, 0.016, 0xe6c985, 0.34);
  ring(3.54, 0.009, 0x9980ff, 0.48);
  ring(2.55, 0.011, 0xe6c985, 0.24);

  const starShape = new THREE.Shape();
  for (let i = 0; i <= 12; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 6;
    const radius = i % 2 ? 0.72 : 1.52;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
  }
  const star = new THREE.Mesh(
    new THREE.ShapeGeometry(starShape),
    new THREE.MeshBasicMaterial({ color: 0xc3a4ff, transparent: true, opacity: 0.19, side: THREE.DoubleSide, depthWrite: false })
  );
  star.rotation.x = -Math.PI / 2;
  star.position.y = TABLE_TOP + 0.009;
  world.add(star);

  const ornament = new THREE.Group();
  ornament.position.y = TABLE_TOP + 0.015;
  const runeMat = new THREE.MeshBasicMaterial({ color: 0xc0a5ff, transparent: true, opacity: 0.27 });
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12;
    const longMark = i % 2 === 0;
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(longMark ? 0.22 : 0.1, 0.008, 0.016),
      runeMat
    );
    mark.position.set(Math.sin(angle) * 10.02, 0, Math.cos(angle) * 10.02);
    mark.rotation.y = angle;
    ornament.add(mark);
  }
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const stone = new THREE.Mesh(
      new THREE.OctahedronGeometry(i % 3 === 0 ? 0.11 : 0.07, 0),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xe6c985 : 0x9f85ff, transparent: true, opacity: 0.84 })
    );
    stone.position.set(Math.sin(angle) * 10.25, 0.04, Math.cos(angle) * 10.25);
    ornament.add(stone);
  }
  world.add(ornament);

  // Three instanced meshes draw all 78 backs in only a few draw calls.
  const backTexture = textureFromSvg(backSvg, renderer);
  const cardBodyGeometry = new THREE.BoxGeometry(CARD_W, CARD_D, CARD_H);
  const cardBackGeometry = new THREE.PlaneGeometry(CARD_W - 0.022, CARD_H - 0.022);
  const topBackGeometry = cardBackGeometry.clone();
  topBackGeometry.rotateX(-Math.PI / 2);
  topBackGeometry.translate(0, CARD_D / 2 + 0.0015, 0);
  const bottomBackGeometry = cardBackGeometry.clone();
  bottomBackGeometry.rotateX(Math.PI / 2);
  bottomBackGeometry.translate(0, -CARD_D / 2 - 0.0015, 0);
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x967a4c, roughness: 0.34, metalness: 0.72 });
  const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture, toneMapped: false, side: THREE.DoubleSide });
  const deckBodies = new THREE.InstancedMesh(cardBodyGeometry, edgeMaterial, 78);
  const deckTops = new THREE.InstancedMesh(topBackGeometry, backMaterial, 78);
  const deckBottoms = new THREE.InstancedMesh(bottomBackGeometry, backMaterial, 78);
  deckBodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  deckTops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  deckBottoms.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  deckBodies.castShadow = !mobile;
  deckBodies.receiveShadow = !mobile;
  world.add(deckBodies, deckTops, deckBottoms);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const matrixObject = new THREE.Object3D();
  const deckPoses = Array.from({ length: 78 }, () => ({ x: 0, y: CARD_Y, z: 0, r: 0, visible: true }));
  const cardGroups = [];
  const drawAnimations = new Map();
  const picked = [];
  let deckOrder = cards.map(card => card.id);
  let pickEnabled = false;
  let shuffleAt = 0;
  const shuffleDuration = 1750;
  let hoverIndex = -1;
  let drag = null;
  let spinVelocity = 0;
  let tiltVelocity = 0;
  let last = 0;
  let disposed = false;
  const emergeAnimations = new Map();

  function writeInstance(mesh, index, pose, scale = 1) {
    matrixObject.position.set(pose.x, pose.y, pose.z);
    matrixObject.rotation.set(0, pose.r, 0);
    matrixObject.scale.setScalar(pose.visible ? scale : 0);
    matrixObject.updateMatrix();
    mesh.setMatrixAt(index, matrixObject.matrix);
  }
  function updateDeckCard(index) {
    const pose = deckPoses[index];
    const scale = (pose.scale || 1) * (index === hoverIndex ? 1.08 : 1);
    writeInstance(deckBodies, index, pose, scale);
    writeInstance(deckTops, index, pose, scale);
    writeInstance(deckBottoms, index, pose, scale);
    deckBodies.instanceMatrix.needsUpdate = true;
    deckTops.instanceMatrix.needsUpdate = true;
    deckBottoms.instanceMatrix.needsUpdate = true;
  }
  function updateAllCards() {
    for (let i = 0; i < 78; i++) {
      const pose = deckPoses[i];
      const scale = (pose.scale || 1) * (i === hoverIndex ? 1.08 : 1);
      writeInstance(deckBodies, i, pose, scale);
      writeInstance(deckTops, i, pose, scale);
      writeInstance(deckBottoms, i, pose, scale);
    }
    deckBodies.instanceMatrix.needsUpdate = true;
    deckTops.instanceMatrix.needsUpdate = true;
    deckBottoms.instanceMatrix.needsUpdate = true;
  }

  function ringPose(index) {
    const angle = index / 78 * Math.PI * 2;
    return {
      x: Math.sin(angle) * CARD_RADIUS,
      y: CARD_Y + index * 0.00015,
      z: Math.cos(angle) * CARD_RADIUS,
      r: angle,
      visible: true
    };
  }
  function arrangeRing() {
    for (let i = 0; i < 78; i++) Object.assign(deckPoses[i], ringPose(i), { scale: 1 });
    updateAllCards();
  }
  arrangeRing();

  function textureForCard(card) {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 544;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const image = new Image();
    image.onload = () => {
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      texture.needsUpdate = true;
    };
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(window.TAROT.svg(card));
    return texture;
  }

  function makeDrawnCard(card, reversed) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(cardBodyGeometry, edgeMaterial);
    body.castShadow = !mobile;
    body.receiveShadow = !mobile;
    group.add(body);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W - 0.022, CARD_H - 0.022), backMaterial);
    back.rotation.x = -Math.PI / 2;
    back.position.y = CARD_D / 2 + 0.0015;
    group.add(back);
    const artTexture = textureForCard(card);
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W - 0.022, CARD_H - 0.022),
      new THREE.MeshBasicMaterial({ map: artTexture, toneMapped: false, side: THREE.DoubleSide })
    );
    art.rotation.x = Math.PI / 2;
    art.position.y = -CARD_D / 2 - 0.0015;
    group.add(art);
    group.position.y = CARD_Y;
    group.scale.setScalar(1.5);
    group.userData.reversed = reversed;
    world.add(group);
    cardGroups.push(group);
    return group;
  }

  function readPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(deckBodies, false);
  }

  renderer.domElement.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
    spinVelocity = 0;
    tiltVelocity = 0;
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener("pointermove", event => {
    if (drag) {
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) drag.moved = true;
      world.rotation.y += dx * 0.0047;
      world.rotation.x = THREE.MathUtils.clamp(world.rotation.x + dy * 0.0022, -0.18, 0.18);
      spinVelocity = THREE.MathUtils.clamp(dx * 0.0004, -0.035, 0.035);
      tiltVelocity = THREE.MathUtils.clamp(dy * 0.00018, -0.012, 0.012);
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      return;
    }
    const hit = readPointer(event)[0];
    const next = pickEnabled && hit ? hit.instanceId : -1;
    if (next !== hoverIndex) {
      const previous = hoverIndex;
      hoverIndex = next;
      if (previous >= 0) updateDeckCard(previous);
      if (hoverIndex >= 0) updateDeckCard(hoverIndex);
    }
    renderer.domElement.style.cursor = pickEnabled && hoverIndex >= 0 ? "pointer" : "grab";
  });
  renderer.domElement.addEventListener("pointerup", event => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    if (moved || !pickEnabled) return;
    const hit = readPointer(event)[0];
    if (hit && hit.instanceId != null && deckPoses[hit.instanceId]?.visible) onPick(hit.instanceId);
  });
  renderer.domElement.addEventListener("pointercancel", () => { drag = null; });

  function selectedTarget(index, count) {
    return { x: (index - (count - 1) / 2) * 1.58, z: 0.45, r: 0 };
  }
  function draw(index, card, reversed, pickIndex, total) {
    const from = { ...deckPoses[index] };
    deckPoses[index].visible = false;
    updateDeckCard(index);
    const mesh = makeDrawnCard(card, reversed);
    mesh.position.set(from.x, from.y, from.z);
    mesh.rotation.y = from.r;
    const target = selectedTarget(pickIndex, total);
    const start = mesh.position.clone();
    const destination = new THREE.Vector3(target.x, CARD_Y + pickIndex * 0.001, target.z);
    const middle = start.clone().lerp(destination, 0.5);
    middle.y += 1.35;
    const item = { mesh, start, middle, destination, startRotation: from.r, targetRotation: target.r, startAt: performance.now(), duration: 820, reversed, revealed: false };
    picked[pickIndex] = item;
    drawAnimations.set(mesh, item);
  }
  function reveal(index) {
    const item = picked[index];
    if (!item || item.revealed) return;
    item.revealed = true;
    item.flipAt = performance.now();
    const glow = new THREE.PointLight(0xf1d69a, 1.55, 3, 2);
    glow.position.set(0, 0.8, 0);
    item.mesh.add(glow);
  }
  function reset() {
    cardGroups.forEach(group => {
      world.remove(group);
      group.traverse(object => {
        if (object.geometry && object.geometry !== cardBodyGeometry) object.geometry.dispose();
        if (object.material && object.material !== edgeMaterial && object.material !== backMaterial) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
    });
    cardGroups.length = 0;
    picked.length = 0;
    drawAnimations.clear();
    emergeAnimations.clear();
    hoverIndex = -1;
    pickEnabled = false;
    arrangeRing();
  }
  function setDeck(deck) { deckOrder = deck.slice(); }
  function emerge() {
    const now = performance.now();
    for (let i = 0; i < 78; i++) {
      const target = ringPose(i);
      Object.assign(deckPoses[i], { x: 0, y: 2.8, z: 0, r: (i - 39) * 0.08, visible: true, scale: 0.15 });
      emergeAnimations.set(i, { target, startsAt: now + i * 5, duration: 820 });
    }
    updateAllCards();
  }

  function animate(now) {
    if (disposed) return;
    requestAnimationFrame(animate);
    const dt = Math.min((now - (last || now)) / 1000, 0.04);
    last = now;

    if (Math.abs(spinVelocity) > 0.00008) {
      world.rotation.y += spinVelocity;
      spinVelocity *= Math.exp(-3.6 * dt);
    }
    if (Math.abs(tiltVelocity) > 0.00005) {
      world.rotation.x = THREE.MathUtils.clamp(world.rotation.x + tiltVelocity, -0.18, 0.18);
      tiltVelocity *= Math.exp(-4.2 * dt);
    }

    if (emergeAnimations.size) {
      for (const [index, item] of emergeAnimations) {
        const t = THREE.MathUtils.clamp((now - item.startsAt) / item.duration, 0, 1);
        const ease = t * t * (3 - 2 * t);
        const pose = deckPoses[index];
        pose.x = THREE.MathUtils.lerp(0, item.target.x, ease);
        pose.z = THREE.MathUtils.lerp(0, item.target.z, ease);
        pose.y = THREE.MathUtils.lerp(2.8, item.target.y, ease) + Math.sin(t * Math.PI) * 1.2;
        pose.r = THREE.MathUtils.lerp((index - 39) * 0.08, item.target.r, ease);
        pose.scale = THREE.MathUtils.lerp(0.15, 1, ease);
        if (t >= 1) { Object.assign(pose, item.target, { scale: 1 }); emergeAnimations.delete(index); }
      }
      updateAllCards();
    }

    if (shuffleAt) {
      const p = Math.min((now - shuffleAt) / shuffleDuration, 1);
      const gather = THREE.MathUtils.smoothstep(p, 0, 0.34);
      const scatter = THREE.MathUtils.smoothstep(p, 0.68, 1);
      for (let i = 0; i < 78; i++) {
        const basePose = ringPose(i);
        const angle = i * 0.72 + p * Math.PI * 6;
        const pile = { x: Math.sin(i * 2.4) * 0.15, z: Math.cos(i * 1.9) * 0.12, r: (i % 7 - 3) * 0.08 };
        const orbit = { x: Math.cos(angle) * 1.45, z: Math.sin(angle) * 0.7, r: angle };
        const pose = deckPoses[i];
        if (p < 0.34) {
          pose.x = THREE.MathUtils.lerp(basePose.x, pile.x, gather);
          pose.z = THREE.MathUtils.lerp(basePose.z, pile.z, gather);
          pose.r = THREE.MathUtils.lerp(basePose.r, pile.r, gather);
        } else if (p < 0.68) {
          const spread = THREE.MathUtils.smoothstep(p, 0.34, 0.68);
          pose.x = THREE.MathUtils.lerp(pile.x, orbit.x, spread);
          pose.z = THREE.MathUtils.lerp(pile.z, orbit.z, spread);
          pose.r = THREE.MathUtils.lerp(pile.r, orbit.r, spread);
        } else {
          pose.x = THREE.MathUtils.lerp(orbit.x, basePose.x, scatter);
          pose.z = THREE.MathUtils.lerp(orbit.z, basePose.z, scatter);
          pose.r = THREE.MathUtils.lerp(orbit.r, basePose.r, scatter);
        }
        pose.y = CARD_Y + Math.sin(p * Math.PI) * 0.13 + i * 0.00015;
        pose.visible = true;
      }
      updateAllCards();
      if (p >= 1) { shuffleAt = 0; arrangeRing(); }
    }

    for (const [mesh, item] of drawAnimations) {
      const t = Math.min((now - item.startAt) / item.duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      if (t < 0.5) mesh.position.copy(item.start).lerp(item.middle, ease * 2);
      else mesh.position.copy(item.middle).lerp(item.destination, (ease - 0.5) * 2);
      mesh.rotation.y = THREE.MathUtils.lerp(item.startRotation, item.targetRotation, ease);
      if (t >= 1) drawAnimations.delete(mesh);
    }
    for (const item of picked) {
      if (!item?.revealed) continue;
      const t = Math.min((now - item.flipAt) / 900, 1);
      const ease = t * t * (3 - 2 * t);
      item.mesh.rotation.x = Math.PI * ease;
      item.mesh.rotation.z = item.reversed ? Math.PI * ease : 0;
    }
    violet.intensity = 44 + Math.sin(now * 0.00065) * 3;
    renderer.render(scene, camera);
  }

  function resize() {
    const isMobile = innerWidth < 700;
    camera.aspect = innerWidth / innerHeight;
    camera.fov = isMobile ? 52 : 53;
    camera.position.set(0, isMobile ? 20 : 16, isMobile ? 10 : 10);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.2 : 1.65));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = !isMobile;
  }
  addEventListener("resize", resize, { passive: true });
  resize();

  document.body.classList.add("three-ready");
  requestAnimationFrame(animate);
  return {
    setDeck,
    shuffle() { pickEnabled = false; shuffleAt = performance.now(); },
    emerge,
    enablePicking() { pickEnabled = true; renderer.domElement.style.cursor = "grab"; },
    setSpread() { reset(); },
    draw,
    reveal,
    reset,
    destroy() {
      disposed = true;
      removeEventListener("resize", resize);
      renderer.dispose();
      backTexture.dispose();
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
      });
      renderer.domElement.remove();
      document.body.classList.remove("three-ready");
    }
  };
}
