import { useNavigate } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, RotateCw, SlidersHorizontal, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { StageHandle } from "@/components/tes/stage";
import {
  ENGINEERING_PARTS,
  FLOWS,
  PARTS,
  SCENES,
  UNIT_PARTS,
  VIEWS,
  sceneStats,
  type FlowId,
  type PartId,
  type SceneId,
} from "@/lib/tes/content";
import { useTes } from "@/lib/tes/store";

const SHELLS = [
  { id: "open", label: "Cutaway" },
  { id: "closed", label: "Closed" },
  { id: "xray", label: "X-ray" },
] as const;

const WALLS = [
  { id: "all", label: "Both walls" },
  { id: "process", label: "Process" },
  { id: "storage", label: "Storage" },
] as const;

export function Hud({ stageRef, children }: { stageRef: React.RefObject<StageHandle | null>; children: React.ReactNode }) {
  const navigate = useNavigate();
  const scene = useTes((s) => s.scene);
  const view = useTes((s) => s.view);
  const shell = useTes((s) => s.shell);
  const isolate = useTes((s) => s.isolate);
  const flow = useTes((s) => s.flow);
  const audience = useTes((s) => s.audience);
  const explode = useTes((s) => s.explode);
  const spin = useTes((s) => s.spin);
  const running = useTes((s) => s.running);
  const selected = useTes((s) => s.selected);
  const present = useTes((s) => s.present);
  const panel = useTes((s) => s.panel);
  const setScene = useTes((s) => s.setScene);
  const setView = useTes((s) => s.setView);
  const setShell = useTes((s) => s.setShell);
  const setIsolate = useTes((s) => s.setIsolate);
  const setFlow = useTes((s) => s.setFlow);
  const setAudience = useTes((s) => s.setAudience);
  const setExplode = useTes((s) => s.setExplode);
  const setSpin = useTes((s) => s.setSpin);
  const setRunning = useTes((s) => s.setRunning);
  const setSelected = useTes((s) => s.setSelected);
  const setPresent = useTes((s) => s.setPresent);
  const setPanel = useTes((s) => s.setPanel);
  const [speech, setSpeech] = useState<"idle" | "playing">("idle");
  const [more, setMore] = useState(false);
  const [power, setPower] = useState(176);
  const [water, setWater] = useState(368);

  useEffect(() => {
    if (window.matchMedia("(min-width: 960px)").matches) setPanel(true);
  }, [setPanel]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000;
      setPower(168 + Math.sin(t * 0.7) * 14 + (scene === "facility" ? 3600 : 0));
      setWater(352 + Math.sin(t * 0.45 + 1) * 22 + (scene === "facility" ? 2400 : 0));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, scene]);

  useEffect(() => {
    if (scene !== "teardown") return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const next = useTes.getState().explode + dt * 0.18;
      if (next >= 1) {
        useTes.getState().setExplode(1);
        return;
      }
      useTes.getState().setExplode(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  const part = PARTS[selected] ?? PARTS.overview;
  const list = scene === "facility"
    ? (["overview", "bank", "water-zone", "power-zone", "control-room"] as PartId[])
    : scene === "teardown"
      ? (["stack", "hub-1"] as PartId[])
      : audience === "engineering"
        ? [...UNIT_PARTS, ...ENGINEERING_PARTS]
        : UNIT_PARTS;

  const goScene = (id: SceneId) => {
    const dest = SCENES.find((item) => item.id === id);
    setScene(id);
    if (dest) navigate({ to: dest.to });
  };

  const listen = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${part.title}. ${part.body} CIVIS Tech Global. www.civistechglobal.com.`,
    );
    utterance.rate = 0.96;
    utterance.onend = () => setSpeech("idle");
    setSpeech("playing");
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className="studio"
      data-present={present ? "true" : "false"}
      data-panel={panel ? "true" : "false"}
      data-more={more ? "true" : "false"}
    >
      <header className="topbar">
        <a className="brand" href="https://www.civistechglobal.com" target="_blank" rel="noreferrer">
          <img src="/brand/civis-mark.svg" alt="" className="mark" />
          <span>
            <strong>TES</strong>
            <em>Trinium Energy System</em>
          </span>
        </a>
        <p className="tagline">Reliable power. Recoverable water. Carbon utilization.</p>
        <a className="site" href="https://www.civistechglobal.com">
          <span className="site-full">civistechglobal.com</span>
          <span className="site-short">CIVIS</span>
        </a>
      </header>

      <div className="stage-wrap">
        <div className="viewport-col">
          <div className="viewport">
            {children}
            {present ? (
              <button type="button" className="present-exit" onClick={() => setPresent(false)}>
                Show menus
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="caption"
            aria-expanded={panel}
            aria-controls="dossier"
            onClick={() => setPanel(!panel)}
          >
            <strong>{part.title}</strong>
            <span className="stats">{sceneStats(scene)}</span>
            <span className="live">{running ? `${Math.round(power)} kW` : "Standby"}</span>
            <span className="live">{running ? `${Math.round(water)} gal/day` : "Idle"}</span>
          </button>
        </div>

        <aside className="dossier" id="dossier">
          <div className="dossier-head">
            <div>
              <p className="kicker">CIVIS Tech Global</p>
              <h1>{part.title}</h1>
            </div>
            <button type="button" className="icon-btn" aria-label="Close notes" onClick={() => setPanel(false)}>
              <X aria-hidden="true" />
            </button>
          </div>
          <p>{part.body}</p>
          <button type="button" className="listen" onClick={listen}>
            <Volume2 aria-hidden="true" />
            {speech === "playing" ? "Speaking" : "Listen"}
          </button>
          <ul className="parts">
            {list.map((id) => (
              <li key={id}>
                <button type="button" aria-pressed={selected === id} className={selected === id ? "part on" : "part"} onClick={() => setSelected(id)}>
                  {PARTS[id].title}
                </button>
              </li>
            ))}
          </ul>
          <p className="fine">
            Visual reconstruction of the reference Blender model. Not a fabrication drawing, P&ID, or release of controlled dimensions.
          </p>
        </aside>
      </div>

      <footer className="dock">
        <div className="chip-row" role="tablist" aria-label="Scene">
          {SCENES.map((item) => (
            <button key={item.id} type="button" aria-pressed={scene === item.id} className={scene === item.id ? "chip on" : "chip"} onClick={() => goScene(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="chip-row" aria-label="Camera">
          {VIEWS[scene].map((item) => (
            <button key={item.id} type="button" aria-pressed={view === item.id} className={view === item.id ? "chip on" : "chip"} onClick={() => setView(item.id)}>
              {item.label}
            </button>
          ))}
          <button type="button" className="chip" onClick={() => stageRef.current?.yaw(-1)}>
            <RotateCcw aria-hidden="true" /> Left
          </button>
          <button type="button" className="chip" onClick={() => stageRef.current?.yaw(1)}>
            <RotateCw aria-hidden="true" /> Right
          </button>
          <button type="button" aria-pressed={spin} className={spin ? "chip on" : "chip"} onClick={() => setSpin(!spin)}>
            Spin
          </button>
        </div>
        <div className="chip-row">
          <button type="button" aria-pressed={running} className={running ? "chip on" : "chip"} onClick={() => setRunning(!running)}>
            {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            {running ? "Running" : "Run"}
          </button>
          <button type="button" aria-pressed={panel} className={panel ? "chip on" : "chip"} onClick={() => setPanel(!panel)}>
            Notes
          </button>
          <button type="button" aria-pressed={more} className={`chip more-toggle ${more ? "on" : ""}`} onClick={() => setMore(!more)}>
            <SlidersHorizontal aria-hidden="true" />
            {more ? "Less" : "Controls"}
          </button>
          <button type="button" aria-pressed={present} className={present ? "chip on" : "chip"} onClick={() => setPresent(!present)}>
            {present ? "Show menus" : "Hide menus"}
          </button>
        </div>
        <div className="dock-extra">
          {scene === "unit" ? (
            <div className="chip-row" aria-label="Shell">
              {SHELLS.map((item) => (
                <button key={item.id} type="button" aria-pressed={shell === item.id} className={shell === item.id ? "chip on" : "chip"} onClick={() => setShell(item.id)}>
                  {item.label}
                </button>
              ))}
              {WALLS.map((item) => (
                <button key={item.id} type="button" aria-pressed={isolate === item.id} className={isolate === item.id ? "chip on" : "chip"} onClick={() => setIsolate(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="chip-row" aria-label="Flow">
            {FLOWS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={flow === item.id}
                className={flow === item.id ? "chip on" : "chip"}
                onClick={() => {
                  setFlow(item.id as FlowId);
                  if (item.id === "oxygen" || item.id === "thermal") setAudience("engineering");
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="chip-row">
            <button type="button" aria-pressed={audience === "engineering"} className={audience === "engineering" ? "chip on" : "chip"} onClick={() => setAudience(audience === "engineering" ? "doe" : "engineering")}>
              {audience === "engineering" ? "Engineering" : "DOE view"}
            </button>
          </div>
        </div>
      </footer>
      {scene !== "facility" ? (
        <div className="explode-bar">
          <label className="explode">
            Explode
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={explode}
              aria-valuetext={`${Math.round(explode * 100)} percent`}
              onChange={(event) => setExplode(Number(event.target.value))}
            />
            <span className="explode-pct">{Math.round(explode * 100)}%</span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
