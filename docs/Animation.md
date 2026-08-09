import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef, type RefObject } from "react";

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

export type AuroraProps = {
  colorStops?: [string, string, string];
  /** Static amplitude, used when `amplitudeRef` isn't given. */
  amplitude?: number;
  /** Live amplitude (e.g. mic level), read every frame — updating it never
   * rebuilds the WebGL context, unlike passing a fast-changing `amplitude` prop. */
  amplitudeRef?: RefObject<number>;
  blend?: number;
  speed?: number;
};

export function Aurora({
  colorStops = ["#5227FF", "#7cff67", "#5227FF"],
  amplitude = 1.0,
  amplitudeRef,
  blend = 0.5,
  speed = 1.0,
}: AuroraProps) {
  const ctnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnRef.current;
    if (!ctn) return;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = "transparent";

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) {
      delete geometry.attributes.uv;
    }

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitudeRef?.current ?? amplitude },
        uColorStops: { value: colorStops.map((hex) => new Color(hex)) },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uBlend: { value: blend },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctn.appendChild(gl.canvas);

    const resize = () => {
      const width = ctn.offsetWidth;
      const height = ctn.offsetHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
    };
    window.addEventListener("resize", resize);
    resize();

    let animateId = 0;
    const update = (t: number) => {
      animateId = requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 0.01 * speed * 0.1;
      program.uniforms.uAmplitude.value = amplitudeRef?.current ?? amplitude;
      renderer.render({ scene: mesh });
    };
    animateId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener("resize", resize);
      if (gl.canvas.parentNode === ctn) {
        ctn.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Colors/blend/speed are read once at mount, same as the reference
    // component — only `amplitudeRef` needs to update live, and it does so
    // via a ref read each frame rather than a dependency, so the WebGL
    // context is never torn down mid-animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ctnRef} className="h-full w-full" />;
}
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Aurora } from "@/components/Aurora";
import { Icon } from "@/components/ui/icon";
import { connectCodexVoice, type CodexVoiceStatus } from "@/lib/codexVoice";
import { connectRealtime, type RealtimeConnection } from "@/lib/realtimeConnection";
import { loadVoiceMode, type VoiceMode } from "@/lib/voiceMode";

const AURORA_COLORS: [string, string, string] = ["#bfe4ff", "#38bdf8", "#bfe4ff"];

/** Mic → AnalyserNode → smoothed 0..1 level, written into `levelRef` every frame
 * (no React state per audio frame — the renderer reads the ref directly). Used
 * purely for the Aurora visual — independent of whichever pipeline is actually
 * handling the conversation. */
function useMicLevel(listening: boolean, levelRef: RefObject<number>, onDenied: (message: string) => void) {
  useEffect(() => {
    if (!listening) {
      levelRef.current = 0;
      return;
    }

    let stream: MediaStream | undefined;
    let audioContext: AudioContext | undefined;
    let raf = 0;
    let cancelled = false;

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length / 255;
          // Snappy attack, slower decay — reacts to speech instantly instead
          // of lagging behind it, while not flickering back to rest too fast.
          const prev = levelRef.current ?? 0;
          levelRef.current = avg > prev ? avg : prev * 0.85 + avg * 0.15;
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        if (!cancelled) onDenied("Microphone access was denied.");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [listening, levelRef, onDenied]);
}

/** Maps smoothed mic level (0..1) to an Aurora amplitude range that reads as motion. */
function useAmplitudeRef(levelRef: RefObject<number>) {
  const amplitudeRef = useRef(0.5);
  useEffect(() => {
    let raf = 0;
    const sync = () => {
      // sqrt curve: quiet speech still moves the aurora noticeably instead of
      // needing to shout before anything visibly changes.
      amplitudeRef.current = 0.5 + Math.sqrt(levelRef.current ?? 0) * 5;
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);
  return amplitudeRef;
}

/** Connects to the OpenAI Realtime session (via the local sidecar's ephemeral
 * key) whenever active, and always disconnects on stop/unmount. */
function useRealtimeSession(active: boolean, onError: (message: string) => void) {
  useEffect(() => {
    if (!active) return;

    let connection: RealtimeConnection | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const conn = await connectRealtime();
        if (cancelled) {
          conn.disconnect();
          return;
        }
        connection = conn;
      } catch (e) {
        if (!cancelled) onError(e instanceof Error ? e.message : "Could not start the voice session.");
      }
    })();

    return () => {
      cancelled = true;
      connection?.disconnect();
    };
  }, [active, onError]);
}

/** Chained mode: local STT -> `codex exec` -> local TTS. */
function useCodexSession(
  active: boolean,
  onStatus: (status: CodexVoiceStatus) => void,
  onError: (message: string) => void,
) {
  useEffect(() => {
    if (!active) return;
    const connection = connectCodexVoice(onStatus, onError);
    return () => connection.disconnect();
  }, [active, onStatus, onError]);
}

const CODEX_STATUS_LABEL: Record<CodexVoiceStatus, string> = {
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

export type VoiceOrbProps = {
  /** Called when the user dismisses the orb — lets the floating widget shrink back down. */
  onCollapse?: () => void;
};

export function VoiceOrb({ onCollapse }: VoiceOrbProps = {}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("realtime");
  const [codexStatus, setCodexStatus] = useState<CodexVoiceStatus>("listening");
  const levelRef = useRef(0);
  const amplitudeRef = useAmplitudeRef(levelRef);

  useEffect(() => {
    void loadVoiceMode().then(setVoiceMode);
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
    setListening(false);
  }, []);

  useMicLevel(listening, levelRef, handleError);
  useRealtimeSession(listening && voiceMode === "realtime", handleError);
  useCodexSession(listening && voiceMode === "codex", setCodexStatus, handleError);

  if (!listening) {
    return (
      <div className="flex flex-1 flex-col items-center">
        <div className="flex flex-1 items-start justify-center pt-16">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCodexStatus("listening");
              setListening(true);
            }}
            aria-label="Start listening"
            className="flex size-24 cursor-pointer items-center justify-center rounded-full p-1 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <img src="/voice-agent-icon.png" alt="" className="size-full object-contain" />
          </button>
        </div>
        <p className="pb-10 text-sm text-muted-foreground">{error ?? "Tap to speak"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex flex-1 items-start justify-center pt-16">
        <div className="flex flex-col items-center gap-8">
          <div
            className="size-72 overflow-hidden rounded-full shadow-[0_0_70px_-10px_rgba(56,189,248,0.55)]"
            style={{
              maskImage: "radial-gradient(circle, black 62%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(circle, black 62%, transparent 100%)",
            }}
          >
            <Aurora colorStops={AURORA_COLORS} amplitudeRef={amplitudeRef} blend={0.45} speed={1.2} />
          </div>
          <button
            type="button"
            onClick={() => {
              setListening(false);
              onCollapse?.();
            }}
            aria-label="Stop listening"
            className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary"
          >
            <Icon icon={Cancel01Icon} size={20} />
          </button>
        </div>
      </div>
      <p className="pb-10 text-sm text-muted-foreground">
        {voiceMode === "codex" ? CODEX_STATUS_LABEL[codexStatus] : "Listening…"}
      </p>
    </div>
  );
}
