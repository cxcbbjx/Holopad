import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

export default function LiquidEther({
  colors = ['#1e2a4a', '#3b82f6', '#06b6d4'],
  speed = 0.25,
  intensity = 0.3,
  mouse = true,
  style,
  ...props
}) {
  const containerRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer;
    let gl;
    try {
      renderer = new Renderer({ dpr: window.devicePixelRatio || 1, alpha: true, antialias: true });
      gl = renderer.gl;
    } catch (e) {
      return;
    }
    if (!gl) return;
    const canvas = gl.canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
    const fragment = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec3  iResolution;
uniform float iTime;
uniform vec2  iMouse;
uniform float uIntensity;
uniform vec3  uC0;
uniform vec3  uC1;
uniform vec3  uC2;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d){
  return a + b * cos(6.28318 * (c * t + d));
}

void main(){
  vec2 uv = vUv * iResolution.xy / min(iResolution.x, iResolution.y);
  vec2 m = iMouse;
  float t = iTime * 0.2;

  vec2 flow = uv;
  flow.x += sin(uv.y * 1.4 + t * 2.0) * 0.25;
  flow.y += cos(uv.x * 1.3 - t * 1.6) * 0.25;
  flow += (m - vec2(0.5)) * 0.6;

  float n = 0.0;
  n += noise(flow * 1.0 + t * 2.0);
  n += 0.5 * noise(flow * 2.0 - t * 1.5);
  n += 0.25 * noise(flow * 4.0 + t * 1.0);
  n /= 1.75;

  float v = smoothstep(0.2, 0.8, n);
  vec3 base = mix(uC0, uC1, v);
  base = mix(base, uC2, 0.35 + 0.35 * sin(t + n * 3.0));

  float glow = pow(1.0 - length(uv - m * iResolution.xy / min(iResolution.x, iResolution.y)), 2.0);
  vec3 col = base + uIntensity * vec3(0.2, 0.3, 0.4) * glow;

  gl_FragColor = vec4(col, 1.0);
}
`;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iResolution: { value: new Float32Array([canvas.width, canvas.height, canvas.width / canvas.height]) },
        iTime: { value: 0 },
        iMouse: { value: new Float32Array([canvas.width * 0.5, canvas.height * 0.5]) },
        uIntensity: { value: intensity },
        uC0: { value: new Float32Array(hexToRGB(colors[0] || '#1e2a4a')) },
        uC1: { value: new Float32Array(hexToRGB(colors[1] || '#3b82f6')) },
        uC2: { value: new Float32Array(hexToRGB(colors[2] || '#06b6d4')) }
      }
    });
    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      renderer.setSize(container.clientWidth, container.clientHeight);
      const res = program.uniforms.iResolution.value;
      res[0] = canvas.width;
      res[1] = canvas.height;
      res[2] = canvas.width / canvas.height;
    }
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    resize();

    function onMouseMove(e) {
      if (!mouse) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const res = program.uniforms.iResolution.value;
      program.uniforms.iMouse.value[0] = x * res[0];
      program.uniforms.iMouse.value[1] = (1 - y) * res[1];
    }
    function onTouchMove(e) {
      if (!mouse || !e.touches || e.touches.length < 1) return;
      const t = e.touches[0];
      const rect = container.getBoundingClientRect();
      const x = (t.clientX - rect.left) / rect.width;
      const y = (t.clientY - rect.top) / rect.height;
      const res = program.uniforms.iResolution.value;
      program.uniforms.iMouse.value[0] = x * res[0];
      program.uniforms.iMouse.value[1] = (1 - y) * res[1];
    }
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('touchmove', onTouchMove);

    function render(t) {
      rafRef.current = requestAnimationFrame(render);
      program.uniforms.iTime.value = t * 0.001 * speed;
      renderer.render({ scene: mesh });
    }
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('touchmove', onTouchMove);
      if (canvas && canvas.parentElement) canvas.parentElement.removeChild(canvas);
      try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
    };
  }, [colors, speed, intensity, mouse]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', ...(style || {}) }} {...props} />;
}

function hexToRGB(hex) {
  const c = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [r, g, b];
}
