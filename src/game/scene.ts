import * as THREE from "three";
import { ROAD_WIDTH, TRACK_LENGTH, trackCurve, trackPoint } from "./track";
import type { RaceSnapshot } from "./model";

const UP = new THREE.Vector3(0, 1, 0);
const material = (color: number, roughness = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
const mat = {
  road: material(0x424b49),
  shoulder: material(0x9e8c74),
  cream: material(0xebe0c4),
  orange: material(0xd97d4d),
  dark: material(0x171f1e),
  glass: material(0x243b3e, 0.2),
  rubber: material(0x17201e),
  metal: material(0x7e8983, 0.35),
  red: material(0xb53125),
};
function box(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  m: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeCar(color: number) {
  const car = new THREE.Group();
  const paint = material(color, 0.32);
  paint.metalness = 0.25;
  box(car, 0, 0.6, 0, 1.9, 0.55, 4.25, paint);
  box(car, 0, 0.84, 0.9, 1.84, 0.21, 2.25, paint);
  box(car, 0, 0.9, -1.4, 1.85, 0.22, 1.2, paint);
  const cabin = box(car, 0, 1.14, -0.35, 1.56, 0.68, 1.9, mat.glass);
  // A tapered cabin keeps the handmade low-poly coupe silhouette readable.
  const p = cabin.geometry.getAttribute("position");
  for (let i = 0; i < p.count; i++)
    if (p.getY(i) > 0) {
      p.setX(i, p.getX(i) * 0.8);
      p.setZ(i, p.getZ(i) * 0.65);
    }
  cabin.geometry.computeVertexNormals();
  box(car, 0, 1.5, -0.34, 1.3, 0.09, 1.22, paint);
  box(car, 0, 1.2, -1.94, 2.1, 0.12, 0.4, mat.dark);
  box(car, -0.7, 1.02, -1.9, 0.08, 0.3, 0.12, mat.dark);
  box(car, 0.7, 1.02, -1.9, 0.08, 0.3, 0.12, mat.dark);
  box(car, 0, 0.45, -2.17, 1.72, 0.21, 0.08, mat.dark);
  box(car, 0, 0.76, -2.14, 1.55, 0.1, 0.04, mat.red);
  box(car, -0.64, 0.83, 2.14, 0.42, 0.11, 0.04, mat.cream);
  box(car, 0.64, 0.83, 2.14, 0.42, 0.11, 0.04, mat.cream);
  box(car, 0, 0.51, 2.15, 1.35, 0.12, 0.04, mat.dark);
  for (const side of [-1, 1]) {
    box(car, side * 1.03, 1.03, 0.35, 0.22, 0.15, 0.35, paint);
    for (const z of [-1.35, 1.25]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.43, 0.43, 0.25, 12),
        mat.rubber,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.97, 0.43, z);
      wheel.castShadow = true;
      car.add(wheel);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.27, 8),
        mat.metal,
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      car.add(hub);
    }
  }
  // A transparent contact patch complements the directional shadow without a texture request.
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 5),
    new THREE.MeshBasicMaterial({
      color: 0x18201c,
      opacity: 0.19,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  car.add(shadow);
  const exhaust = new THREE.Group();
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x9deaff });
  for (const x of [-0.62, 0.62]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 1.4, 7),
      flameMat,
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0.4, -2.7);
    exhaust.add(flame);
  }
  exhaust.visible = false;
  car.add(exhaust);
  car.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = false;
  });
  return { group: car, paint, exhaust };
}

function strip(
  inner: number,
  outer: number,
  lift: number,
  m: THREE.Material,
  dashed = false,
  striped = false,
) {
  [inner, outer] = [Math.min(inner, outer), Math.max(inner, outer)];
  const positions: number[] = [],
    colors: number[] = [];
  const steps = 800;
  for (let i = 0; i < steps; i++) {
    if (dashed && Math.floor(i / 4) % 3 !== 0) continue;
    const a = trackPoint((TRACK_LENGTH * i) / steps),
      b = trackPoint((TRACK_LENGTH * (i + 1)) / steps);
    const p1 = a.position.clone().addScaledVector(a.right, inner),
      p2 = a.position.clone().addScaledVector(a.right, outer);
    const p3 = b.position.clone().addScaledVector(b.right, inner),
      p4 = b.position.clone().addScaledVector(b.right, outer);
    for (const p of [p1, p2, p3, p2, p4, p3])
      positions.push(p.x, p.y + lift, p.z);
    if (striped) {
      const color = new THREE.Color(
        Math.floor(i / 4) % 2 ? 0xf0dbb6 : 0xb95832,
      );
      for (let j = 0; j < 6; j++) colors.push(color.r, color.g, color.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  if (striped)
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, m);
  mesh.receiveShadow = true;
  return mesh;
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export class RacingScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(53, 1, 0.15, 1700);
  private player = makeCar(0xf5793e);
  private rivals = [makeCar(0xb5cec3), makeCar(0xd7bb78), makeCar(0xb8c1c2)];
  private observer: ResizeObserver;
  private width = 1;
  private height = 1;
  private lastPhase = "ready";
  private destroyed = false;
  private dirty = true;
  private cameraGoal = new THREE.Vector3();
  private targetGoal = new THREE.Vector3();
  private currentTarget = new THREE.Vector3();
  constructor(
    private host: HTMLElement,
    onFailure: (message: string) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Scenery is static; cars use their own contact patches. Bake the sun shadow once.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      onFailure(
        "The 3D graphics connection was lost. Reload the game to get back on track.",
      );
    });
    host.appendChild(this.renderer.domElement);
    this.buildWorld();
    this.scene.add(this.player.group, ...this.rivals.map((c) => c.group));
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  private resize() {
    this.dirty = true;
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
  private buildWorld() {
    this.scene.background = new THREE.Color(0xb4baae);
    this.scene.fog = new THREE.Fog(0xb9b5a0, 150, 900);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x547a7c) },
          bottomColor: { value: new THREE.Color(0xf1d9b1) },
        },
        vertexShader:
          "varying vec3 vPosition; void main(){vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader:
          "uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vPosition; void main(){float h=normalize(vPosition).y; gl_FragColor=vec4(mix(bottomColor,topColor,smoothstep(-0.04,0.65,h)),1.0);}",
      }),
    );
    this.scene.add(sky);
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(30, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe7bd, fog: false }),
    );
    sun.position.set(-390, 165, 850);
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0xe1ecdf, 0x6d513c, 2.5));
    const light = new THREE.DirectionalLight(0xffd7a2, 3.2);
    light.position.set(-130, 200, 180);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    Object.assign(light.shadow.camera, {
      left: -320,
      right: 320,
      top: 320,
      bottom: -320,
      near: 10,
      far: 650,
    });
    light.shadow.bias = -0.001;
    light.shadow.normalBias = 0.25;
    this.scene.add(light);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2500, 2500),
      material(0xb29a7d),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.scene.add(strip(-10, 10, 0.01, mat.shoulder));
    this.scene.add(strip(-ROAD_WIDTH / 2, ROAD_WIDTH / 2, 0.04, mat.road));
    const curb = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
    });
    for (const side of [-1, 1]) {
      this.scene.add(strip(side * 5.9, side * 6.55, 0.075, curb, false, true));
      this.scene.add(strip(side * 5.5, side * 5.6, 0.085, mat.cream));
    }
    this.scene.add(strip(-0.065, 0.065, 0.09, mat.cream, true));
    const start = trackPoint(5);
    const grid = new THREE.Group();
    grid.position.copy(start.position);
    grid.rotation.y = Math.atan2(start.tangent.x, start.tangent.z);
    for (let x = 0; x < 12; x++)
      for (let z = 0; z < 2; z++)
        box(
          grid,
          x - 5.5,
          0.1,
          z * 0.7,
          1,
          0.02,
          0.7,
          (x + z) % 2 ? mat.cream : mat.dark,
        );
    this.scene.add(grid);
    // Small gantry stays out of the driving line and marks each completed lap.
    const gantry = new THREE.Group();
    const archPoint = trackPoint(9);
    gantry.position.copy(archPoint.position);
    gantry.rotation.y = Math.atan2(archPoint.tangent.x, archPoint.tangent.z);
    for (const side of [-1, 1]) {
      box(gantry, side * 7.5, 4, 0, 0.35, 8, 0.35, mat.dark);
      box(gantry, side * 7.5, 1.4, 0, 0.9, 2.8, 0.9, mat.orange);
    }
    box(gantry, 0, 8, 0, 15.4, 1, 0.4, mat.dark);
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 1024;
    labelCanvas.height = 128;
    const ctx = labelCanvas.getContext("2d")!;
    ctx.fillStyle = "#18221f";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#ece8da";
    ctx.font = "italic 700 76px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("APEX  /  COPPER CANYON", 512, 90);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(14.8, 1),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(labelCanvas),
        side: THREE.DoubleSide,
      }),
    );
    banner.position.set(0, 8, -0.22);
    banner.rotation.y = Math.PI;
    gantry.add(banner);
    this.scene.add(gantry);
    const random = rng(1047);
    const sampleTrack = Array.from({ length: 150 }, (_, i) =>
      trackCurve.getPointAt(i / 150),
    );
    const rockMats = [0x9e7359, 0xb08360, 0x8e7360, 0xc2936d, 0x727669].map(
      (c) => material(c),
    );
    // Flat-topped, layered mesas: real geometry with hard, sunlit faces.
    for (let i = 0; i < 95; i++) {
      const x = random() * 1500 - 650,
        z = random() * 1600 - 650;
      const near = Math.min(
        ...sampleTrack.map((p) => Math.hypot(p.x - x, p.z - z)),
      );
      const radius = 22 + random() * 62,
        height = 25 + random() * 130;
      if (near < radius * 1.3 + 24) continue;
      const group = new THREE.Group();
      const stone = rockMats[Math.floor(random() * rockMats.length)];
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius * 0.72,
          radius * 1.25,
          height * 0.65,
          5 + (i % 3),
          1,
        ),
        stone,
      );
      base.position.y = height * 0.325;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius * 0.43,
          radius * 0.75,
          height * 0.37,
          5 + (i % 3),
        ),
        stone,
      );
      top.position.y = height * 0.82;
      top.rotation.y = 0.18;
      top.castShadow = true;
      group.add(top);
      group.position.set(x, -0.3, z);
      group.rotation.y = random() * Math.PI;
      this.scene.add(group);
    }
    const shrubMaterial = material(0x5d6b52);
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const shrubGeometry = new THREE.ConeGeometry(1.2, 2.4, 5);
    const rocks = new THREE.InstancedMesh(rockGeometry, rockMats[2], 450);
    const shrubs = new THREE.InstancedMesh(shrubGeometry, shrubMaterial, 450);
    const transform = new THREE.Object3D();
    for (let i = 0; i < 450; i++) {
      const distance = random() * TRACK_LENGTH,
        lane = (random() > 0.5 ? 1 : -1) * (10 + random() * 52);
      const p = trackPoint(distance, lane).position;
      transform.position.set(p.x, 0.4, p.z);
      transform.rotation.set(random(), random() * 6, random());
      const scale = 0.45 + random() * 1.8;
      transform.scale.set(scale * 1.3, scale * 0.7, scale);
      transform.updateMatrix();
      rocks.setMatrixAt(i, transform.matrix);
      transform.position.x += 2.5;
      transform.position.y = 0.7;
      transform.rotation.set(0, random() * 6, 0);
      transform.scale.setScalar(0.4 + random() * 0.7);
      transform.updateMatrix();
      shrubs.setMatrixAt(i, transform.matrix);
    }
    rocks.castShadow = true;
    shrubs.castShadow = true;
    this.scene.add(rocks, shrubs);
    const postGeometry = new THREE.BoxGeometry(0.16, 1.2, 0.16);
    const posts = new THREE.InstancedMesh(postGeometry, mat.cream, 170);
    for (let i = 0; i < 170; i++) {
      const p = trackPoint((i / 85) * TRACK_LENGTH, i % 2 ? 7.4 : -7.4);
      transform.position.copy(p.position).add(new THREE.Vector3(0, 0.6, 0));
      transform.scale.setScalar(1);
      transform.rotation.set(0, 0, 0);
      transform.updateMatrix();
      posts.setMatrixAt(i, transform.matrix);
    }
    this.scene.add(posts);
    // Chevron boards mark the sweepers visually without adding interface clutter.
    for (const distance of [200, 290, 450, 630, 850, 1000]) {
      const p = trackPoint(distance, -8.6);
      const sign = new THREE.Group();
      sign.position.copy(p.position);
      sign.rotation.y = Math.atan2(p.tangent.x, p.tangent.z);
      box(sign, 0, 1.6, 0, 0.12, 3.2, 0.12, mat.dark);
      box(sign, 0, 2.7, 0, 2, 1.1, 0.12, mat.cream);
      for (const x of [-0.4, 0.3]) {
        const a = box(sign, x, 2.92, -0.08, 0.52, 0.16, 0.05, mat.orange);
        a.rotation.z = -0.6;
        const b = box(sign, x, 2.64, -0.08, 0.52, 0.16, 0.05, mat.orange);
        b.rotation.z = 0.6;
      }
      this.scene.add(sign);
    }
  }
  setPaint(color: string) {
    this.player.paint.color.set(color);
    this.dirty = true;
  }
  render(s: RaceSnapshot, dt: number, reducedMotion: boolean) {
    if (this.destroyed) return;
    if (
      !this.dirty &&
      this.lastPhase === s.phase &&
      ["ready", "paused", "finished"].includes(s.phase)
    )
      return;
    this.dirty = false;
    const placeCar = (group: THREE.Group, distance: number, lane: number) => {
      const p = trackPoint(distance, lane);
      group.position.copy(p.position).addScaledVector(UP, 0.12);
      group.rotation.set(
        -Math.asin(p.tangent.y),
        Math.atan2(p.tangent.x, p.tangent.z),
        0,
      );
    };
    placeCar(this.player.group, s.distance, s.lane);
    this.rivals.forEach((car, i) =>
      placeCar(car.group, s.rivals[i].distance, s.rivals[i].lane),
    );
    this.player.exhaust.visible = s.boosting;
    const p = trackPoint(s.distance, s.lane);
    const ready = s.phase === "ready";
    if (ready) {
      const wide = this.width > 760;
      this.cameraGoal
        .copy(p.position)
        .addScaledVector(p.tangent, -16)
        .addScaledVector(p.right, wide ? -5.8 : -5.4)
        .add(new THREE.Vector3(0, wide ? 6.5 : 6.2, 0));
      this.targetGoal
        .copy(p.position)
        .addScaledVector(p.tangent, wide ? 12 : 9)
        .addScaledVector(p.right, wide ? -2.8 : 0)
        .add(new THREE.Vector3(0, 1, 0));
    } else {
      this.cameraGoal
        .copy(p.position)
        .addScaledVector(
          p.tangent,
          -11.5 - (s.boosting && !reducedMotion ? 1.8 : 0),
        )
        .add(new THREE.Vector3(0, 5.3, 0));
      this.targetGoal
        .copy(trackPoint(s.distance + 20, s.lane * 0.65).position)
        .add(new THREE.Vector3(0, 1, 0));
    }
    const instant =
      this.lastPhase !== s.phase || s.phase === "ready" || reducedMotion;
    const blend = instant ? 1 : 1 - Math.exp(-dt * 9);
    this.camera.position.lerp(this.cameraGoal, blend);
    this.currentTarget.lerp(this.targetGoal, blend);
    this.camera.lookAt(this.currentTarget);
    const fov = !reducedMotion && s.boosting ? 60 : 53;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, blend);
      this.camera.updateProjectionMatrix();
    }
    this.lastPhase = s.phase;
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.destroyed = true;
    this.observer.disconnect();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((m) => {
          if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
          m.dispose();
        });
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
