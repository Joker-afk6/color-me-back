/**
 * PROLOGUE — Explorer's bedroom (script P0–P2), built as an open-front diorama.
 *  P0  Opening cinematic: the drawing's colors withdraw as ribbons out of the window.
 *  P1  Inspect teddy / crayons / window (any order); Pip arrives after two; 30 s assist highlight.
 *  P2  Take the Wonderbrush, tap the sleepy star (local gray sparkle only), go outside.
 */
import * as THREE from 'three';
import { Level, type SpawnPoint } from '../core/Level';
import { PROLOGUE, PROLOGUE_PROMPTS } from '../data/script/prologue';
import type { BedroomInspectable } from '../state/SaveData';
import { canLeaveBedroom, finishOpening, inspectBedroomObject, leaveBedroom, takeWonderbrush, wakeBedroomStar } from '../state/progression';
import { UNIT, mesh, RoundedBoxGeometry, starGeometry } from '../rendering/shapes';
import { drawingTextures, paintNoiseTexture, pencilVillageTexture } from '../rendering/textures';
import { HintLadder } from '../systems/Hints';
import { place, wonderStar, type WonderStar } from './props';
import { wordLabel, type WordLabel } from './labels';
import { keycap } from '../ui/icons';
import { createSky } from '../rendering/Sky';

const DRAWING_POS = new THREE.Vector3(3.1, 2.35, -3.96);
const WINDOW_POS = new THREE.Vector3(-0.4, 2.3, -3.98);
const BED_SIT = new THREE.Vector3(-2.78, 0, -2.0);
const BRUSH_POS = new THREE.Vector3(3.65, 0.99, -3.25);
const STAR_POS = new THREE.Vector3(0.9, 0, -0.9);
const DOOR_POS = new THREE.Vector3(4.75, 1.1, -0.8);

interface Ribbon {
  mesh: THREE.Mesh;
  total: number;
  t: number;
  speed: number;
  curve: THREE.CatmullRomCurve3;
  color: string;
}

export class BedroomLevel extends Level {
  readonly id = 'bedroom' as const;
  readonly areaName = "Explorer's Bedroom";
  override music = 'bedroom';
  override fogColor = '#d9dde2';
  override fogNear = 30;
  override fogFar = 90;
  override killY = -6;

  private drawingMat!: THREE.ShaderMaterial;
  private labels = new Map<BedroomInspectable, WordLabel>();
  private inspectPos = new Map<BedroomInspectable, THREE.Vector3>();
  private ribbons: Ribbon[] = [];
  private brushOnDesk!: THREE.Group;
  private star!: WonderStar;
  private doorGlow!: THREE.MeshStandardMaterial;
  private t = 0;
  private busy = false;

  build(): void {
    const L = this.lib;
    const root = this.root;
    const P = this.physics;

    // ── Room shell
    const floorMat = L.paint('#C99D6E', 'orange', { roughness: 0.85, map: paintNoiseTexture(11, 3, 0.18) });
    const floor = mesh(new RoundedBoxGeometry(10.4, 0.4, 7.8, 2, 0.1), floorMat, { cast: false });
    floor.position.set(0, -0.2, -0.2);
    root.add(floor);
    for (let i = -4; i <= 4; i++) {
      const seam = mesh(UNIT.box, L.paint('#A87F55', 'orange', { roughness: 0.9 }), { cast: false });
      seam.scale.set(0.03, 0.01, 7.6);
      seam.position.set(i * 1.15, 0.005, -0.2);
      root.add(seam);
    }
    P.box(0, -0.2, 10.4, 7.8, -1, 0);
    const wallMat = L.paint('#F3E3B1', 'yellow', { roughness: 0.95, map: paintNoiseTexture(12, 2, 0.08) });
    const trimMat = L.paint('#FFFFFF', 'neutral', { roughness: 0.8 });
    const wallBox = (x: number, y: number, z: number, w: number, h: number, d: number) => {
      const m = mesh(UNIT.box, wallMat);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      root.add(m);
      P.box(x, z, w, d, y - h / 2, y + h / 2, { blocksCamera: true, walkable: false });
    };
    // Back wall with a window opening x ∈ [-1.5, 0.7], y ∈ [1.5, 3.1]
    wallBox(-3.25, 2.1, -4.15, 3.5, 4.2, 0.3);
    wallBox(2.85, 2.1, -4.15, 4.3, 4.2, 0.3);
    wallBox(-0.4, 0.75, -4.15, 2.2, 1.5, 0.3);
    wallBox(-0.4, 3.65, -4.15, 2.2, 1.1, 0.3);
    // Left wall
    wallBox(-5.15, 2.1, -0.2, 0.3, 4.2, 7.8);
    // Right wall with a door opening z ∈ [-1.5, -0.1], y < 2.5
    wallBox(5.15, 2.1, -2.9, 0.3, 4.2, 2.8);
    wallBox(5.15, 2.1, 1.85, 0.3, 4.2, 3.9);
    wallBox(5.15, 3.35, -0.8, 0.3, 1.7, 1.4);
    // The (closed) door panel blocks the doorway until you use it.
    P.box(5.15, -0.8, 0.3, 1.4, 0, 2.5, { walkable: false });
    // Skirting
    for (const [x, z, w, d] of [[0, -3.98, 10, 0.06], [-4.98, -0.2, 0.06, 7.6]] as const) {
      const sk = mesh(UNIT.box, trimMat, { cast: false });
      sk.scale.set(w, 0.22, d);
      sk.position.set(x, 0.11, z);
      root.add(sk);
    }
    // Invisible front edge so nobody walks off the diorama.
    P.box(0, 3.75, 10.4, 0.3, 0, 3, { walkable: false });
    // Ceiling beam hint (keeps the cut-away readable)
    const beam = mesh(UNIT.box, L.paint('#B8875A', 'orange', { roughness: 0.9 }));
    beam.scale.set(10.6, 0.3, 0.35);
    beam.position.set(0, 4.25, -3.95);
    root.add(beam);

    // ── Window with curtains and the pencil-drawing village outside
    const frameMat = L.paint('#FFFFFF', 'neutral', { roughness: 0.6 });
    for (const [x, y, w, h] of [[-0.4, 1.5, 2.4, 0.14], [-0.4, 3.1, 2.4, 0.14], [-1.55, 2.3, 0.14, 1.7], [0.75, 2.3, 0.14, 1.7], [-0.4, 2.3, 0.08, 1.6]] as const) {
      const f = mesh(UNIT.box, frameMat);
      f.scale.set(w, h, 0.36);
      f.position.set(x, y, -4.05);
      root.add(f);
    }
    const sill = mesh(new RoundedBoxGeometry(2.7, 0.12, 0.5, 2, 0.04), frameMat);
    sill.position.set(-0.4, 1.46, -3.82);
    root.add(sill);
    const outside = mesh(UNIT.plane, L.basic('#ffffff', { map: pencilVillageTexture() }), { cast: false, receive: false });
    outside.scale.set(9, 5.6, 1);
    outside.position.set(-0.4, 2.4, -7.5);
    root.add(outside);
    const sky = createSky({ zenith: '#cfd8e3', horizon: '#e7ebf0', ground: '#cfd5dc' }, 'blue', 60);
    root.add(sky);
    this.track(sky.material as THREE.Material);
    const curtainMat = L.paint('#F6C445', 'yellow', { roughness: 0.95, side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const c = mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.3, 10, 1, true), curtainMat);
      c.scale.z = 0.35;
      c.position.set(-0.4 + side * 1.55, 2.25, -3.75);
      root.add(c);
    }
    const rod = mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.6, 8), L.paint('#8B6A4E', 'orange'));
    rod.rotation.z = Math.PI / 2;
    rod.position.set(-0.4, 3.42, -3.75);
    root.add(rod);

    // ── Bed (left wall)
    const wood = L.paint('#B98A5C', 'orange', { roughness: 0.8 });
    const bedFrame = mesh(new RoundedBoxGeometry(1.9, 0.38, 3.3, 3, 0.12), wood);
    bedFrame.position.set(-4.1, 0.19, -2.25);
    root.add(bedFrame);
    const mattress = mesh(new RoundedBoxGeometry(1.8, 0.22, 3.1, 3, 0.1), L.paint('#F7F5F0', 'neutral'));
    mattress.position.set(-4.1, 0.46, -2.25);
    root.add(mattress);
    const blanket = mesh(new RoundedBoxGeometry(1.86, 0.12, 2.1, 3, 0.06), L.paint('#E25D5D', 'red', { roughness: 0.9 }));
    blanket.position.set(-4.1, 0.6, -1.75);
    root.add(blanket);
    const pillow = mesh(new RoundedBoxGeometry(1.2, 0.26, 0.6, 3, 0.12), L.paint('#FFFFFF', 'neutral'));
    pillow.position.set(-4.1, 0.68, -3.4);
    root.add(pillow);
    const headboard = mesh(new RoundedBoxGeometry(1.95, 1.3, 0.18, 3, 0.08), wood);
    headboard.position.set(-4.1, 0.75, -3.9);
    root.add(headboard);
    P.box(-4.1, -2.25, 1.9, 3.3, 0, 0.55);
    // Nightstand + lamp
    const stand = mesh(new RoundedBoxGeometry(0.75, 0.7, 0.65, 2, 0.08), wood);
    stand.position.set(-2.6, 0.35, -3.55);
    root.add(stand);
    P.box(-2.6, -3.55, 0.75, 0.65, 0, 0.7);
    const lampBase = mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.3, 12), L.paint('#5C6470', 'neutral'));
    lampBase.position.set(-2.6, 0.85, -3.55);
    root.add(lampBase);
    const shade = mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.32, 16, 1, true), L.paint('#FFD45A', 'yellow', { side: THREE.DoubleSide, emissive: '#ffd36b', emissiveIntensity: 0.15 }));
    shade.position.set(-2.6, 1.15, -3.55);
    root.add(shade);

    // ── Desk, chair, drawing, crayons, Wonderbrush
    const desk = mesh(new RoundedBoxGeometry(2.3, 0.12, 1.05, 2, 0.05), wood);
    desk.position.set(3.1, 0.92, -3.42);
    root.add(desk);
    for (const [x, z] of [[2.05, -3.05], [4.15, -3.05], [2.05, -3.8], [4.15, -3.8]] as const) {
      const leg = mesh(UNIT.cylinderLow, wood);
      leg.scale.set(0.06, 0.9, 0.06);
      leg.position.set(x, 0.45, z);
      root.add(leg);
    }
    P.box(3.1, -3.42, 2.3, 1.05, 0, 0.98);
    const chair = mesh(new RoundedBoxGeometry(0.7, 0.5, 0.7, 2, 0.08), L.paint('#7FA8D8', 'blue'));
    chair.position.set(3.0, 0.25, -2.45);
    root.add(chair);
    P.box(3.0, -2.45, 0.7, 0.7, 0, 0.5);
    // The child's drawing (crossfades from color to gray in P0)
    const tex = drawingTextures();
    this.drawingMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: tex.color }, uGray: { value: tex.gray }, uMix: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D uColor, uGray; uniform float uMix; varying vec2 vUv;
        void main(){ vec4 a = texture2D(uColor, vUv); vec4 b = texture2D(uGray, vUv);
          // colors leave unevenly, like paint lifting off the paper
          float n = fract(sin(dot(floor(vUv * 18.0), vec2(12.9898, 78.233))) * 43758.5453);
          float k = smoothstep(n * 0.6, n * 0.6 + 0.4, uMix);
          gl_FragColor = mix(a, b, k);
          #include <colorspace_fragment>
        }`,
    });
    this.track(this.drawingMat);
    this.track(tex.color);
    this.track(tex.gray);
    const drawing = mesh(UNIT.plane, this.drawingMat, { cast: false, receive: false });
    drawing.scale.set(1.7, 1.28, 1);
    drawing.position.copy(DRAWING_POS);
    root.add(drawing);
    for (const [x, y] of [[-0.78, 0.57], [0.78, 0.57]] as const) {
      const pin = mesh(UNIT.sphereLow, L.paint('#E25D5D', 'red'), { cast: false });
      pin.scale.setScalar(0.05);
      pin.position.set(DRAWING_POS.x + x, DRAWING_POS.y + y, DRAWING_POS.z + 0.03);
      root.add(pin);
    }
    // Crayon box: every crayon has its own color key → "They are all the same gray!"
    const crayonBox = new THREE.Group();
    const box = mesh(new RoundedBoxGeometry(0.62, 0.32, 0.3, 2, 0.04), L.paint('#F5C542', 'yellow'));
    box.position.y = 0.16;
    crayonBox.add(box);
    const crayonCols: Array<[string, 'red' | 'blue' | 'yellow' | 'purple' | 'orange' | 'green']> = [
      ['#EF4444', 'red'],
      ['#3B82F6', 'blue'],
      ['#FACC15', 'yellow'],
      ['#A855F7', 'purple'],
      ['#F97316', 'orange'],
      ['#22C55E', 'green'],
    ];
    crayonCols.forEach(([hex, key], i) => {
      const m = L.paint(hex, key, { roughness: 0.6 });
      const c = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 10), m);
      c.position.set(-0.22 + i * 0.088, 0.38, 0);
      crayonBox.add(c);
      const tip = mesh(new THREE.ConeGeometry(0.04, 0.09, 10), m);
      tip.position.set(-0.22 + i * 0.088, 0.63, 0);
      crayonBox.add(tip);
    });
    place(root, crayonBox, 2.45, 0.98, -3.35, 0.15);
    // Wonderbrush lying on the desk (an "ordinary-looking brush")
    this.brushOnDesk = new THREE.Group();
    const bh = mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.62, 10), L.paint('#B58B62', 'neutral'));
    bh.rotation.z = Math.PI / 2;
    this.brushOnDesk.add(bh);
    const bf = mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.1, 12), L.paint(this.game.player?.hero === 'boy' ? '#7FA8D8' : '#F28AA0', 'neutral', { roughness: 0.35, metalness: 0.2 }));
    bf.rotation.z = Math.PI / 2;
    bf.position.x = 0.35;
    this.brushOnDesk.add(bf);
    const bt = mesh(new THREE.ConeGeometry(0.045, 0.16, 12), L.paint('#FFF1C4', 'neutral', { emissive: '#ffe6a0', emissiveIntensity: 0.5 }));
    bt.rotation.z = -Math.PI / 2;
    bt.position.x = 0.47;
    this.brushOnDesk.add(bt);
    this.brushOnDesk.position.copy(BRUSH_POS);
    this.brushOnDesk.rotation.y = 0.4;
    root.add(this.brushOnDesk);

    // ── Rug, teddy, toys
    const rug = mesh(UNIT.circle, L.paint('#B49AE0', 'purple', { roughness: 1, map: paintNoiseTexture(13, 2, 0.15) }), { cast: false });
    rug.rotation.x = -Math.PI / 2;
    rug.scale.setScalar(2.2);
    rug.position.set(0.4, 0.012, 0.0);
    root.add(rug);
    const teddy = this.buildTeddy();
    place(root, teddy, -1.7, 0, 1.0, 0.6);
    P.cyl(-1.7, 1.0, 0.42, 0, 0.9);
    const chest = mesh(new RoundedBoxGeometry(1.3, 0.75, 0.8, 3, 0.12), wood);
    chest.position.set(-4.2, 0.375, 1.6);
    root.add(chest);
    P.box(-4.2, 1.6, 1.3, 0.8, 0, 0.75);
    const blockCols: Array<[string, 'red' | 'blue' | 'yellow']> = [['#EF4444', 'red'], ['#3B82F6', 'blue'], ['#FACC15', 'yellow']];
    blockCols.forEach(([hex, key], i) => {
      const b = mesh(new RoundedBoxGeometry(0.45, 0.45, 0.45, 2, 0.06), L.paint(hex, key, { roughness: 0.7 }));
      b.position.set(2.2 + (i === 2 ? 0.2 : i * 0.5), 0.225 + (i === 2 ? 0.45 : 0), 1.7);
      b.rotation.y = i * 0.4;
      root.add(b);
    });
    P.box(2.45, 1.7, 1.1, 0.6, 0, 0.9);
    // A star poster (gray until yellow)
    const poster = mesh(starGeometry(0.5, 0.22, 0.04), L.paint('#FACC15', 'yellow'), { cast: false });
    poster.position.set(-4.97, 2.5, 0.2);
    poster.rotation.y = Math.PI / 2;
    root.add(poster);

    // ── Door (right wall)
    this.doorGlow = L.unique('#FFFFFF', 'neutral', { emissive: '#fff4c4', emissiveIntensity: 0, roughness: 0.6 });
    const door = mesh(new RoundedBoxGeometry(0.12, 2.4, 1.3, 2, 0.05), L.paint('#8A6446', 'orange', { roughness: 0.8 }));
    door.position.set(5.02, 1.2, -0.8);
    root.add(door);
    const doorFrame = mesh(new THREE.TorusGeometry(0.75, 0.07, 6, 4, Math.PI * 2), this.doorGlow, { cast: false });
    doorFrame.rotation.y = Math.PI / 2;
    doorFrame.rotation.x = Math.PI / 4;
    doorFrame.scale.set(1, 1.7, 1);
    doorFrame.position.set(4.95, 1.25, -0.8);
    root.add(doorFrame);
    const knob = mesh(UNIT.sphereLow, L.paint('#E8D9A8', 'yellow', { metalness: 0.6, roughness: 0.3 }), { cast: false });
    knob.scale.setScalar(0.07);
    knob.position.set(4.92, 1.15, -0.3);
    root.add(knob);

    // ── Sleepy star (appears in P2)
    this.star = wonderStar(L, false);
    this.star.group.position.copy(STAR_POS).add(new THREE.Vector3(0, 0.9, 0));
    this.star.group.visible = false;
    root.add(this.star.group);

    // ── Interactables + word labels (P1)
    const addInspect = (id: BedroomInspectable, word: string, pos: THREE.Vector3, labelPos: THREE.Vector3) => {
      const lbl = wordLabel(L, word);
      lbl.group.position.copy(labelPos);
      root.add(lbl.group);
      this.labels.set(id, lbl);
      this.inspectPos.set(id, pos);
      this.game.interactions.add({
        id: `inspect-${id}`,
        position: pos,
        radius: 2.1,
        label: `Look at the ${word.toLowerCase()}`,
        enabled: () => this.game.save.prologue.phase !== 'opening' && !this.game.save.prologue.inspected.includes(id) && !this.busy,
        onInteract: () => void this.inspect(id),
        noMarker: true,
      });
    };
    addInspect('teddy', 'TEDDY', new THREE.Vector3(-1.7, 0.7, 1.0), new THREE.Vector3(-1.7, 1.75, 1.0));
    addInspect('crayons', 'CRAYONS', new THREE.Vector3(2.45, 1.2, -3.0), new THREE.Vector3(2.45, 1.95, -3.2));
    addInspect('window', 'WINDOW', new THREE.Vector3(-0.4, 1.6, -3.55), new THREE.Vector3(-0.4, 3.45, -3.6));

    this.game.interactions.add({
      id: 'wonderbrush',
      position: BRUSH_POS.clone(),
      radius: 2.0,
      label: 'Take the Wonderbrush',
      enabled: () => this.game.save.prologue.phase === 'wonderbrush' && !this.game.save.prologue.hasWonderbrush && !this.busy,
      onInteract: () => void this.takeBrush(),
    });
    this.game.interactions.add({
      id: 'sleepy-star',
      position: STAR_POS.clone().add(new THREE.Vector3(0, 0.9, 0)),
      radius: 1.9,
      label: 'Tap the sleepy star',
      enabled: () => this.game.save.prologue.phase === 'wonderbrush' && this.star.group.visible && !this.game.save.prologue.bedroomStarAwake && !this.busy,
      blocked: () => (this.game.save.prologue.hasWonderbrush ? null : 'Take the Wonderbrush from the desk first!'),
      onInteract: () => void this.tapStar(),
    });
    this.game.interactions.add({
      id: 'door',
      position: DOOR_POS.clone(),
      radius: 2.0,
      label: 'Go outside to Hush Hollow',
      enabled: () => canLeaveBedroom(this.game.save) && !this.busy,
      onInteract: () => void this.leave(),
      noMarker: false,
    });

    this.cameraLimits = { yawMin: -0.85, yawMax: 0.85, pitchMin: 0.28, pitchMax: 0.95, distMin: 4, distMax: 8.5 };
  }

  private buildTeddy(): THREE.Group {
    const L = this.lib;
    const g = new THREE.Group();
    const fur = L.paint('#B07A4F', 'orange', { roughness: 0.95, rim: 0.2 });
    const light = L.paint('#E8C39E', 'orange', { roughness: 0.95 });
    const dark = L.paint('#2B2522', 'neutral', { roughness: 0.4 });
    const body = mesh(UNIT.sphere, fur);
    body.scale.set(0.36, 0.38, 0.32);
    body.position.y = 0.38;
    g.add(body);
    const belly = mesh(UNIT.sphere, light);
    belly.scale.set(0.24, 0.26, 0.15);
    belly.position.set(0, 0.36, 0.2);
    g.add(belly);
    const head = mesh(UNIT.sphere, fur);
    head.scale.setScalar(0.28);
    head.position.y = 0.86;
    g.add(head);
    for (const s of [-1, 1]) {
      const ear = mesh(UNIT.sphere, fur);
      ear.scale.set(0.1, 0.1, 0.06);
      ear.position.set(s * 0.2, 1.08, 0);
      g.add(ear);
      const eye = mesh(UNIT.sphereLow, dark, { cast: false });
      eye.scale.setScalar(0.035);
      eye.position.set(s * 0.09, 0.9, 0.25);
      g.add(eye);
      const arm = mesh(UNIT.sphere, fur);
      arm.scale.set(0.1, 0.18, 0.1);
      arm.position.set(s * 0.34, 0.45, 0.08);
      arm.rotation.z = s * 0.5;
      g.add(arm);
      const leg = mesh(UNIT.sphere, fur);
      leg.scale.set(0.13, 0.1, 0.18);
      leg.position.set(s * 0.18, 0.1, 0.18);
      g.add(leg);
    }
    const snout = mesh(UNIT.sphere, light);
    snout.scale.set(0.12, 0.09, 0.08);
    snout.position.set(0, 0.8, 0.24);
    g.add(snout);
    const nose = mesh(UNIT.sphereLow, dark, { cast: false });
    nose.scale.set(0.04, 0.03, 0.03);
    nose.position.set(0, 0.83, 0.31);
    g.add(nose);
    const bow = mesh(UNIT.torus, L.paint('#3B82F6', 'blue'));
    bow.scale.setScalar(0.08);
    bow.position.set(0, 0.62, 0.22);
    g.add(bow);
    return g;
  }

  // ───────────────────────────── Flow ─────────────────────────────

  spawn(): SpawnPoint {
    const s = this.game.save;
    if (s.prologue.phase === 'opening') return { pos: BED_SIT.clone(), yaw: Math.PI / 2, cameraYaw: 0 };
    return { pos: new THREE.Vector3(-1.9, 0, -1.4), yaw: Math.PI * 0.6, cameraYaw: 0.1 };
  }

  objective(): string {
    const s = this.game.save.prologue;
    switch (s.phase) {
      case 'opening':
        return 'Wake up…';
      case 'inspect':
        return `Look around your room. Find things that look different (${Math.min(2, s.inspected.length)}/2)`;
      case 'wonderbrush':
        if (!s.hasWonderbrush) return 'Take the Wonderbrush from the desk';
        if (!s.bedroomStarAwake) return 'Tap the sleepy star with your Wonderbrush';
        return 'Go outside to Hush Hollow (the door)';
      default:
        return 'Go outside to Hush Hollow';
    }
  }

  start(): void {
    const g = this.game;
    const s = g.save;
    // Restore visual state for the current checkpoint.
    for (const id of s.prologue.inspected) this.labels.get(id)?.setDone(true);
    for (const l of this.labels.values()) l.group.visible = s.prologue.phase !== 'opening';
    if (s.prologue.phase !== 'opening') this.drawingMat.uniforms.uMix!.value = 1;
    const pipHere = s.prologue.phase === 'wonderbrush';
    g.showPip(pipHere);
    if (s.prologue.hasWonderbrush) this.brushOnDesk.visible = false;
    g.player?.setBrushVisible(s.prologue.hasWonderbrush);
    if (s.prologue.phase === 'wonderbrush') {
      this.star.group.visible = true;
      this.star.setAwake(s.prologue.bedroomStarAwake);
    }
    if (s.prologue.phase === 'opening') void this.openingCinematic();
    else if (s.prologue.phase === 'inspect') this.beginInspect(false);
    else if (s.prologue.phase === 'wonderbrush') this.beginWonderbrushHints();
  }

  /** P0 — the colors withdraw from the drawing and fly out of the window. */
  private async openingCinematic(): Promise<void> {
    const g = this.game;
    const p = g.player!;
    p.animator.pose = 'sleeping';
    p.animator.sitHeight = 0.46;
    p.rig.root.position.z = -0.34;
    g.audio.music.play('title');
    await g.cutscene(async () => {
      g.camera.cut(new THREE.Vector3(2.75, 2.45, -2.45), DRAWING_POS);
      await g.camera.moveTo(new THREE.Vector3(2.25, 2.25, -2.1), DRAWING_POS, 3.0);
      g.audio.music.stop();
      g.sfx('mystery');
      g.soundCaption('A soft chime… the music box goes quiet');
      this.launchRibbons();
      void this.fadeDrawing(3.2);
      const lookWindow = WINDOW_POS.clone();
      await g.camera.moveTo(new THREE.Vector3(1.2, 2.55, -1.2), lookWindow, 3.0);
      await g.wait(1.0);
      g.audio.music.play('bedroom');
      p.animator.pose = 'sitting';
      await g.camera.moveTo(new THREE.Vector3(-0.7, 1.55, 0.4), new THREE.Vector3(-2.9, 0.95, -2.0), 2.4);
      p.play('stretch');
      await g.wait(1.4);
      await g.say(PROLOGUE.opening);
    });
    // End state (also reached when skipped).
    this.drawingMat.uniforms.uMix!.value = 1;
    for (const r of this.ribbons) r.mesh.visible = false;
    p.animator.pose = 'normal';
    p.animator.sitHeight = 0.26;
    p.rig.root.position.z = 0;
    p.teleport(-2.2, 0, -1.6, Math.PI * 0.55);
    g.camera.snapTo(new THREE.Vector3(-2.2, 1.25, -1.6), 0.15);
    g.state.apply(finishOpening, true);
    for (const l of this.labels.values()) l.group.visible = true;
    this.beginInspect(true);
  }

  private launchRibbons(): void {
    const cols = ['#EF4444', '#3B82F6', '#FACC15'];
    cols.forEach((hex, i) => {
      const start = DRAWING_POS.clone().add(new THREE.Vector3(-0.4 + i * 0.4, -0.2 + (i % 2) * 0.35, 0.05));
      const pts = [
        start,
        new THREE.Vector3(2.2 - i * 0.3, 2.9 + i * 0.25, -3.0),
        new THREE.Vector3(0.9, 2.2 + i * 0.2, -2.6 + i * 0.2),
        new THREE.Vector3(-0.2 + i * 0.2, 2.4 + i * 0.15, -3.6),
        new THREE.Vector3(-0.4 + (i - 1) * 0.4, 2.5, -5.5),
        new THREE.Vector3(-1.5 + i, 3.6, -9),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 90, 0.045, 6, false);
      const mat = this.lib.basic(hex, { transparent: true, opacity: 0.95 });
      const m = mesh(geo, mat, { cast: false, receive: false });
      m.geometry.setDrawRange(0, 0);
      this.root.add(m);
      this.ribbons.push({ mesh: m, total: geo.index!.count, t: -i * 0.25, speed: 0.42, curve, color: hex });
    });
  }

  private async fadeDrawing(seconds: number): Promise<void> {
    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      await this.game.wait(seconds / steps);
      this.drawingMat.uniforms.uMix!.value = i / steps;
    }
  }

  private beginInspect(first: boolean): void {
    const g = this.game;
    if (first) {
      g.toast(`${keycap('W')}${keycap('A')}${keycap('S')}${keycap('D')} walk · ${keycap('E')} look`, 5);
      g.narrator.speak(PROLOGUE_PROMPTS.inspect);
    }
    // Failure assist: after 30 s, gently highlight the closest object (never graded).
    this.hints = new HintLadder('bedroom-inspect', [
      { after: 30, run: () => this.highlightClosest() },
      { after: 25, run: () => this.highlightClosest() },
      { after: 25, run: () => this.highlightClosest() },
    ]);
  }

  private highlightClosest(): void {
    const p = this.game.player!.position;
    let best: BedroomInspectable | null = null;
    let bestD = Infinity;
    for (const [id, pos] of this.inspectPos) {
      if (this.game.save.prologue.inspected.includes(id)) continue;
      const d = pos.distanceTo(p);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    if (!best) return;
    const lbl = this.labels.get(best)!;
    lbl.setHighlight(true);
    this.game.particles.sparkles(this.inspectPos.get(best)!.clone().add(new THREE.Vector3(0, 0.4, 0)), { count: 24, color: '#fff3b0', speed: 1.8, life: 1.4 });
    this.game.soundCaption('Something sparkles nearby');
    this.game.sfx('chime');
    window.setTimeout(() => lbl.setHighlight(false), 6000);
  }

  private async inspect(id: BedroomInspectable): Promise<void> {
    const g = this.game;
    if (this.busy) return;
    this.busy = true;
    g.player?.play('interact');
    g.sfx('interact');
    this.labels.get(id)?.setDone(true);
    this.labels.get(id)?.setHighlight(false);
    this.hints?.progress();
    let pipArrives = false;
    g.state.apply((s) => {
      const r = inspectBedroomObject(s, id);
      pipArrives = r.pipArrives;
      return r.save;
    }, true);
    await g.say(PROLOGUE.inspect[id]);
    this.busy = false;
    if (pipArrives) await this.pipEntrance();
  }

  /** P1 end — Pip's playful entrance, then P2 begins. */
  private async pipEntrance(): Promise<void> {
    const g = this.game;
    const p = g.player!;
    this.busy = true;
    this.hints?.stop();
    await g.cutscene(async () => {
      const curtain = new THREE.Vector3(-1.95, 2.2, -3.5);
      g.pip.teleport(curtain);
      g.showPip(true);
      g.sfx('whoosh');
      g.pip.mood = 'excited';
      const mid = p.position.clone().lerp(curtain, 0.45).setY(2.2);
      g.pip.loopDeLoop(mid, 1.5);
      const look = p.position.clone().lerp(mid, 0.5).setY(1.6);
      void g.camera.moveTo(p.position.clone().add(new THREE.Vector3(1.6, 1.8, 3.6)), look, 1.6);
      await g.wait(1.6);
      await g.say(PROLOGUE.pipEntrance);
      g.pip.mood = 'happy';
      // P2 — Pip circles the ordinary-looking brush; sparks form a friendly star shape.
      g.pip.circle(BRUSH_POS);
      await g.camera.moveTo(new THREE.Vector3(2.6, 2.4, -0.6), BRUSH_POS, 1.8);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = i % 2 === 0 ? 0.6 : 0.26;
        g.particles.sparkles(BRUSH_POS.clone().add(new THREE.Vector3(Math.cos(a - Math.PI / 2) * r, 0.7 + Math.sin(a - Math.PI / 2) * -r, 0.2)), { count: 6, color: '#fff3b0', speed: 0.3, life: 2.2, size: 0.3, gravity: 0, upward: 0 });
      }
      g.sfx('starWake', 0.6);
      await g.wait(1.0);
      this.star.group.visible = true;
      g.particles.sparkles(this.star.group.position, { count: 30, color: '#fff3b0', speed: 1.6, life: 1.2 });
      await g.say(PROLOGUE.wonderbrush);
    });
    g.pip.circle(null);
    this.busy = false;
    this.beginWonderbrushHints();
  }

  private beginWonderbrushHints(): void {
    const g = this.game;
    this.hints = new HintLadder('bedroom-brush', [
      {
        after: 25,
        run: () => {
          const s = g.save.prologue;
          if (!s.hasWonderbrush) {
            g.pip.circle(BRUSH_POS);
            g.pipSays('The Wonderbrush is on the desk. Walk close and press E!');
            window.setTimeout(() => g.pip.circle(null), 5000);
          } else if (!s.bedroomStarAwake) {
            g.pip.circle(this.star.group.position);
            g.pipSays('Give the sleepy star a tap — press E next to it!');
            window.setTimeout(() => g.pip.circle(null), 5000);
          } else {
            g.pipSays('The door is on the right wall. Let’s go outside!');
          }
        },
      },
      { after: 30, run: () => g.pipSays(this.objective()) },
    ]);
  }

  private async takeBrush(): Promise<void> {
    const g = this.game;
    this.busy = true;
    g.player?.play('brush');
    g.sfx('pickup');
    g.particles.sparkles(BRUSH_POS, { count: 30, color: '#fff3b0', speed: 2.2, life: 1 });
    this.brushOnDesk.visible = false;
    g.player?.setBrushVisible(true);
    g.state.apply(takeWonderbrush, true);
    this.hints?.progress();
    g.toast(`You have the Wonderbrush! ${keycap('E')} to paint`, 3.5);
    g.narrator.speak(PROLOGUE_PROMPTS.tapStar);
    this.busy = false;
  }

  private async tapStar(): Promise<void> {
    const g = this.game;
    this.busy = true;
    g.player?.play('brush');
    await g.wait(0.25);
    this.star.setAwake(true);
    g.sfx('starWake');
    // A local GRAY sparkle only — the world does not restore red yet (script P2).
    g.particles.sparkles(this.star.group.position, { count: 40, colors: ['#ffffff', '#d9dde3', '#b9bfc8'], speed: 2.4, life: 1.3 });
    g.state.apply(wakeBedroomStar, true);
    g.hud.flashCheckpoint();
    this.hints?.progress();
    await g.say(PROLOGUE.starAwake);
    this.busy = false;
    g.narrator.speak(PROLOGUE_PROMPTS.door);
  }

  private async leave(): Promise<void> {
    const g = this.game;
    this.busy = true;
    g.sfx('click');
    g.state.apply(leaveBedroom, true);
    await g.changeLevel('hushHollow');
  }

  override update(dt: number): void {
    this.t += dt;
    for (const l of this.labels.values()) l.update(this.t);
    this.star.update(dt, this.t);
    if (this.star.group.visible && !this.star.awake && Math.random() < dt * 2) {
      this.game.particles.sparkles(this.star.group.position, { count: 1, color: '#fff3b0', speed: 0.5, life: 1, size: 0.25 });
    }
    // Door glows once the star is awake.
    const glow = canLeaveBedroom(this.game.save) ? 0.8 + Math.sin(this.t * 3) * 0.3 : 0;
    this.doorGlow.emissiveIntensity += (glow - this.doorGlow.emissiveIntensity) * Math.min(1, dt * 4);
    // Ribbons draw forward then let go of their tail.
    for (const r of this.ribbons) {
      if (!r.mesh.visible) continue;
      r.t += dt * r.speed;
      const head = Math.min(1, Math.max(0, r.t));
      const tail = Math.min(1, Math.max(0, r.t - 0.45));
      const segs = r.total;
      const start = Math.floor((tail * segs) / 6) * 6;
      const end = Math.floor((head * segs) / 6) * 6;
      r.mesh.geometry.setDrawRange(start, Math.max(0, end - start));
      if (r.t > 0 && r.t < 1) this.game.particles.sparkles(r.curve.getPointAt(head), { count: 1, color: r.color, speed: 0.4, life: 0.8, size: 0.3 });
      if (r.t > 1.5) r.mesh.visible = false;
    }
    this.hints?.update(dt);
  }

  override genericHint(): string {
    return this.objective();
  }
}
