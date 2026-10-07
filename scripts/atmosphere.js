/**
 * Corridor atmosphere: motes drifting through the stack, drawn behind the work cards.
 *
 * Loaded lazily by corridor-motion.js, so a browser without WebGL, or a reader who never reaches
 * the corridor, never downloads it. The corridor itself is plain DOM and does not depend on this.
 *
 * The cards travel across the stage, so the air drifts the same way — more slowly, so it parallaxes
 * against them — and an orthographic camera keeps the dust in the same flat plane as the cards.
 */
import {
  Scene, OrthographicCamera, WebGLRenderer, BufferGeometry, BufferAttribute,
  Points, ShaderMaterial, Color, AdditiveBlending, NormalBlending
} from 'three';

const COUNT = 420;
const TRAVEL = 3200;  // px the air drifts over the whole corridor — slower than the cards, so it
                      // parallaxes against them instead of moving with them
const WIDE = 1.6;     // how much wider than the stage the field is, so a wrap never shows an edge

const VERTEX = /* glsl */`
  uniform float uProgress;
  uniform float uTime;
  uniform float uSpan;
  uniform float uTravel;
  uniform float uSize;
  uniform float uHeight;

  attribute float aSeed;
  attribute float aScale;
  attribute float aDepth;

  varying float vAlpha;

  void main() {
    // The air keeps its own, slower pace and drifts the way the cards travel, so it parallaxes
    // against them. Both axes are stored normalised and widened here, so a resize never has to
    // rebuild the field.
    float lane = position.x * uSpan;
    vec3 motes;
    motes.x = mod(lane - uProgress * uTravel + uSpan * 0.5, uSpan) - uSpan * 0.5;
    motes.y = position.y * uHeight;
    motes.z = 0.0;

    // Each mote keeps its own phase, so the field never pulses in lockstep.
    float phase = aSeed * 6.2831853;
    motes.x += sin(uTime * 0.21 + phase) * 26.0;
    motes.y += cos(uTime * 0.17 + phase * 1.7) * 20.0;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(motes, 1.0);
    gl_PointSize = max(aScale * uSize * (0.55 + aDepth * 0.95), 0.7);

    // Fade at both ends of the wrap, so a mote never appears or vanishes on a hard edge. The fade
    // starts outside the stage, so the air is at full strength right up to where the cards leave.
    float edge = smoothstep(0.5, 0.33, abs(motes.x) / uSpan);
    vAlpha = edge * (0.3 + aDepth * 0.7);
  }
`;

const FRAGMENT = /* glsl */`
  uniform vec3 uTint;
  uniform float uStrength;

  varying float vAlpha;

  void main() {
    vec2 round = gl_PointCoord - 0.5;
    float falloff = dot(round, round);
    if (falloff > 0.25) discard;
    // Soft edge, so a mote reads as a lit speck and not as a square.
    float alpha = smoothstep(0.25, 0.0, falloff);
    gl_FragColor = vec4(uTint, alpha * vAlpha * uStrength);
  }
`;

export function createAtmosphere(canvas) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  if (!renderer || !renderer.getContext()) return null;

  renderer.setClearAlpha(0);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -100, 100);

  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const scales = new Float32Array(COUNT);
  const depths = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i += 1) {
    positions[i * 3] = Math.random() - 0.5;
    positions[i * 3 + 1] = Math.random() - 0.5;
    positions[i * 3 + 2] = 0;
    seeds[i] = Math.random();
    scales[i] = 0.5 + Math.random() * 1.7;
    depths[i] = Math.random();
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  geometry.setAttribute('aScale', new BufferAttribute(scales, 1));
  geometry.setAttribute('aDepth', new BufferAttribute(depths, 1));

  const material = new ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSpan: { value: 1600 },
      uTravel: { value: TRAVEL },
      uSize: { value: 2.6 },
      uHeight: { value: 800 },
      uTint: { value: new Color(1, 0.97, 0.93) },
      uStrength: { value: 0.5 }
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending
  });

  const motes = new Points(geometry, material);
  // The vertex shader moves every mote, so the static bounding sphere would cull them.
  motes.frustumCulled = false;
  scene.add(motes);

  let dark = true;
  let width = 1;
  let height = 1;

  function applyTheme() {
    material.blending = dark ? AdditiveBlending : NormalBlending;
    // On paper the motes are dust in the light: darker than the page, never glowing.
    material.uniforms.uTint.value.setRGB(...(dark ? [1, 0.97, 0.93] : [0.44, 0.44, 0.47]));
    material.uniforms.uStrength.value = dark ? 0.5 : 0.34;
    material.needsUpdate = true;
  }

  function resize(nextWidth, nextHeight, pixelRatio) {
    width = Math.max(1, Math.round(nextWidth));
    height = Math.max(1, Math.round(nextHeight));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    // One world unit is one CSS pixel, so the field lines up with the cards behind it.
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    // Wider than the stage, so the air is still at full strength where the cards leave frame.
    material.uniforms.uSpan.value = width * WIDE;
    material.uniforms.uHeight.value = height;
    material.uniforms.uSize.value = 2.6 * pixelRatio;
  }

  applyTheme();
  resize(width, height, Math.min(window.devicePixelRatio || 1, 2));

  return {
    setTheme(isDark) {
      if (dark === isDark) return;
      dark = isDark;
      applyTheme();
    },
    resize,
    update(state) {
      material.uniforms.uProgress.value = state.progress;
      material.uniforms.uTime.value = state.time;
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    }
  };
}
