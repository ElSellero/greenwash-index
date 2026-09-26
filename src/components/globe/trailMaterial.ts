import { AdditiveBlending, Color } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export type TrailStyle = {
  color: string;
  /** CSS pixels. */
  width: number;
  opacity: number;
  /** Brightness at the tail end relative to the head (0–1). */
  tail: number;
  /** Light pulses running from tail to head per trail length; 0 = none. */
  pulses: number;
  dotted: boolean;
};

const UNIFORMS = /* glsl */ `
  uniform float uTime;
  uniform float uTotal;
  uniform float uTail;
  uniform float uPulses;
  uniform float uDotted;
`;

const OUTPUT = /* glsl */ `
  float s = clamp(vLineDistance / uTotal, 0.0, 1.0);
  float core = 1.0 - abs(vUv.x);
  core = core * core * (3.0 - 2.0 * core);
  if (uDotted > 0.5 && fract(vLineDistance * 70.0) > 0.42) discard;
  float fade = mix(uTail, 1.0, pow(s, 1.3));
  float pulse = uPulses > 0.0 ? pow(fract(s * uPulses - uTime * 0.35), 14.0) : 0.0;
  vec3 rgb = diffuseColor.rgb * (0.55 + 0.45 * core) + vec3(pulse * core * 0.9);
  gl_FragColor = vec4(rgb, alpha * fade * (0.2 + 0.8 * core) + pulse * core * 0.7);
`;

/** Seconds on the shared animation clock that drives every trail's pulses. */
export const trailClock = { value: 0 };

/** A LineMaterial whose trail fades toward its tail and carries light pulses toward its head. */
export const createTrailMaterial = (style: TrailStyle, totalLength: number): LineMaterial => {
  const uniforms = {
    uTime: trailClock,
    uTotal: { value: Math.max(totalLength, 1e-6) },
    uTail: { value: style.tail },
    uPulses: { value: style.pulses },
    uDotted: { value: style.dotted ? 1 : 0 },
  };
  const material = new LineMaterial({
    color: new Color(style.color).getHex(),
    linewidth: style.width,
    opacity: style.opacity,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    dashed: true,
    dashSize: 1e9,
    gapSize: 0,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${UNIFORMS}\nvoid main() {`)
      .replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );', OUTPUT);
  };
  material.customProgramCacheKey = () => 'greenwash-trail';
  return material;
};
