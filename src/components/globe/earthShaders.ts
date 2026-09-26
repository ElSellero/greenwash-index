const WORLD_VARYINGS_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** `TILE` builds the variant for high-res imagery tiles, whose image UVs differ from the globe's. */
export const EARTH_VERT = /* glsl */ `
  #ifdef TILE
    attribute vec2 globalUv;
  #endif
  varying vec2 vUv;
  varying vec2 vGlobalUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    #ifdef TILE
      vGlobalUv = globalUv;
    #else
      vGlobalUv = uv;
    #endif
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uWater;
  uniform sampler2D uClouds;
  uniform vec3 uSunDir;
  uniform float uCloudShift;
  uniform float uCloudCover;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec2 vGlobalUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float ndl = dot(n, uSunDir);
    float day = smoothstep(-0.06, 0.2, ndl);

    vec3 albedo = texture2D(uDay, vUv).rgb;
    float cloud = texture2D(uClouds, vGlobalUv + vec2(uCloudShift, 0.0)).r * uCloudCover;
    float water = texture2D(uWater, vGlobalUv).r;
    #ifdef TILE
      // NASA tiles are graded far darker than the base map: lift land with a soft, non-clipping curve and
      // repaint open sea — detected per tile pixel (near-black, blue-dominant) so coasts stay crisp — in the
      // base map's deep-ocean blue.
      vec3 s = pow(albedo, vec3(1.0 / 2.2));
      float peak = max(s.r, max(s.g, s.b));
      float sea = (1.0 - smoothstep(0.09, 0.16, peak)) * smoothstep(0.01, 0.04, s.b - max(s.r, s.g));
      vec3 lifted = pow(1.0 - pow(1.0 - s, vec3(2.2)), vec3(2.2));
      vec3 ocean = pow(vec3(0.086, 0.176, 0.345) * (0.92 + 1.5 * (s.b - 0.07)), vec3(2.2));
      albedo = mix(lifted, ocean, sea);
      water = sea;
    #endif

    float light = clamp(ndl * 1.1 + 0.05, 0.0, 1.0);
    vec3 lit = albedo * (0.04 + 1.2 * light) * (1.0 - 0.3 * cloud * day);

    vec3 h = normalize(uSunDir + v);
    float nh = max(dot(n, h), 0.0);
    vec3 glint = vec3(1.0, 0.9, 0.75) * (pow(nh, 260.0) * 0.45 + pow(nh, 28.0) * 0.022);
    lit += glint * water * light * (1.0 - cloud);

    vec3 cities = texture2D(uNight, vUv).rgb;
    vec3 night = cities * vec3(1.35, 1.1, 0.8) * 1.6 + albedo * 0.025;

    vec3 color = mix(night, lit, day);

    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    color += vec3(0.32, 0.62, 1.0) * fresnel * (0.08 + 0.55 * day);

    gl_FragColor = vec4(color, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const CLOUDS_VERT = WORLD_VARYINGS_VERT;

export const CLOUDS_FRAG = /* glsl */ `
  uniform sampler2D uClouds;
  uniform vec3 uSunDir;
  uniform float uCloudCover;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 n = normalize(vNormalW);
    float ndl = dot(n, uSunDir);
    float day = smoothstep(-0.15, 0.25, ndl);
    float c = smoothstep(0.12, 0.85, texture2D(uClouds, vUv).r);
    float twilight = smoothstep(-0.2, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.3, ndl));
    vec3 color = mix(vec3(0.05, 0.07, 0.12), vec3(1.0), day) + vec3(1.0, 0.55, 0.3) * twilight * 0.18;
    gl_FragColor = vec4(color, c * mix(0.12, 0.85, day) * uCloudCover);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vPosW;
  void main() {
    vNormalV = normalize(normalMatrix * normal);
    vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ATMOSPHERE_FRAG = /* glsl */ `
  uniform vec3 uSunDir;
  varying vec3 vNormalV;
  varying vec3 vPosW;

  void main() {
    float rim = pow(clamp(0.74 - dot(vNormalV, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.6);
    float sun = dot(normalize(vPosW), uSunDir);
    float lit = smoothstep(-0.45, 0.35, sun);
    float twilight = smoothstep(-0.45, -0.05, sun) * (1.0 - smoothstep(-0.05, 0.4, sun));
    vec3 color = mix(vec3(0.16, 0.42, 1.0), vec3(1.0, 0.5, 0.25), twilight * 0.6);
    gl_FragColor = vec4(color * rim * (0.18 + 1.1 * lit), 1.0);
  }
`;
