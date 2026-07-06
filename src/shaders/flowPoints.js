/**
 * GLSL do fluxo de informação: pequenas partículas percorrendo as conexões.
 * O trajeto inteiro é resolvido no vertex shader (aStart → aEnd + arco),
 * então o CPU não toca em nada por frame — só uTime avança.
 */

export const flowVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uCurvature;

  attribute vec3 aStart;
  attribute vec3 aEnd;
  attribute float aOffset;   // fase inicial (0..1)
  attribute float aSpeed;    // duração relativa do percurso
  attribute float aScale;

  varying float vFade;

  void main() {
    // progresso cíclico ao longo da conexão
    float t = fract(aOffset + uTime * aSpeed);

    vec3 pos = mix(aStart, aEnd, t);
    float sag = distance(aStart, aEnd) * uCurvature;
    pos.y += sin(t * 3.14159) * sag;

    // leve serpenteio perpendicular — orgânico, nunca trilho de circuito
    vec3 dir = normalize(aEnd - aStart + vec3(0.0001));
    vec3 side = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
    pos += side * sin(t * 12.0 + aOffset * 40.0) * 0.05;

    // nasce e morre suavemente nas pontas
    vFade = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.85, t);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * uPixelRatio * (30.0 / -mv.z);
  }
`

export const flowFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vFade;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float glow = smoothstep(0.5, 0.0, d);
    glow *= glow;
    gl_FragColor = vec4(uColor, glow * vFade * uOpacity);
  }
`
