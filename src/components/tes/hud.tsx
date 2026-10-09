import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pause, Play, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { StageHandle } from "@/components/tes/stage";
import { DOES, FLOWS, PARTS, UNIT_PARTS, VIEWS, sceneStats, type FlowId, type PartId } from "@/lib/tes/content";
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
  const view = useTes((s) => s.view);
  const shell = useTes((s) => s.shell);
  const isolate = useTes((s) => s.isolate);
  const flow = useTes((s) => s.flow);
  const explode = useTes((s) => s.explode);
  const spin = useTes((s) => s.spin);
  const running = useTes((s) => s.running);
  const selected = useTes((s) => s.selected);
  const present = useTes((s) => s.present);
  const panel = useTes((s) => s.panel);
  const setView = useTes((s) => s.setView);
  const setShell = useTes((s) => s.setShell);
  const setIsolate = useTes((s) => s.setIsolate);
  const setFlow = useTes((s) => s.setFlow);
  const setExplode = useTes((s) => s.setExplode);
  const setSpin = useTes((s) => s.setSpin);
  const setRunning = useTes((s) => s.setRunning);
  const setSelected = useTes((s) => s.setSelected);
  const setPresent = useTes((s) => s.setPresent);
  const setPanel = useTes((s) => s.setPanel);
  const [more, setMore] = useState(false);
  const [showPad, setShowPad] = useState(true);
  const sheetRef = useRef<HTMLElement>(null);
  const dragged = useRef(false);
  const [power, setPower] = useState(176);
  const [water, setWater] = useState(368);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = (now: number) => {
      const t = now / 1000;
      setPower(168 + Math.sin(t * 0.7) * 14);
      setWater(352 + Math.sin(t * 0.45 + 1) * 22);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const part = PARTS[selected] ?? PARTS.overview;
  const list = UNIT_PARTS;

  const dragSheet = (event: ReactPointerEvent<HTMLElement>) => {
    if (window.matchMedia("(min-width: 960px)").matches) return;
    event.preventDefault();
    const startY = event.clientY;
    const parentH = sheetRef.current?.parentElement?.getBoundingClientRect().height ?? window.innerHeight;
    const startH = panel && sheetRef.current ? sheetRef.current.getBoundingClientRect().height : 0;
    let next = startH;
    let opened = panel;
    dragged.current = false;
    const move = (ev: PointerEvent) => {
      if (Math.abs(startY - ev.clientY) > 8) dragged.current = true;
      next = Math.min(parentH * 0.72, Math.max(0, startH + (startY - ev.clientY)));
      if (!sheetRef.current || next <= 48) return;
      if (!opened) {
        opened = true;
        setPanel(true);
      }
      sheetRef.current.style.height = `${next}px`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!sheetRef.current) return;
      if (next < 88) {
        sheetRef.current.style.height = "";
        setPanel(false);
        return;
      }
      const height = next > parentH * 0.5 ? parentH * 0.66 : parentH * 0.36;
      sheetRef.current.style.height = `${Math.round(height)}px`;
      setPanel(true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="studio" data-present={present ? "true" : "false"} data-panel={panel ? "true" : "false"} data-more={more ? "true" : "false"}>
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
          <span className="site-full">CIVIS Tech Global</span>
          <span className="site-short">CIVIS Tech Global</span>
        </a>
      </header>

      <div className="stage-wrap">
        <div className="viewport-col">
          <div className="viewport">
            {children}
            {showPad ? <DirPad onNudge={(dir) => stageRef.current?.nudge(dir)} /> : null}
            <button
              type="button"
              className="sheet-tab"
              onPointerDown={dragSheet}
              onClick={() => {
                if (dragged.current) return;
                setPanel(true);
              }}
            >
              <span className="grab" />
              Swipe up for notes
            </button>
            {selected !== "overview" ? (
              <aside className="callout">
                <div>
                  <strong>{part.title}</strong>
                  <p>{DOES[selected]}</p>
                </div>
                <button type="button" className="icon-btn" aria-label="Close description" onClick={() => setSelected("overview")}>
                  <X aria-hidden="true" />
                </button>
              </aside>
            ) : null}
            {present ? (
              <button type="button" className="present-exit" onClick={() => setPresent(false)}>
                Show menus
              </button>
            ) : null}
          </div>
          <button type="button" className="caption" aria-expanded={panel} aria-controls="dossier" onClick={() => setPanel(!panel)}>
            <strong>{part.title}</strong>
            <span className="does">{selected === "overview" ? sceneStats() : DOES[selected]}</span>
            <span className="live">{running ? `${Math.round(power)} kW` : "Standby"}</span>
            <span className="live">{running ? `${Math.round(water)} gal/day` : "Idle"}</span>
          </button>
        </div>

        <aside className="dossier" id="dossier" ref={sheetRef}>
          <button type="button" className="sheet-grab" aria-label="Resize notes" onPointerDown={dragSheet}>
            <span className="grab" />
          </button>
          <div className="sheet-scroll">
            <div className="note-pin">
              <div className="dossier-head">
                <div>
                  <p className="kicker">CIVIS Tech Global</p>
                  <h1>{part.title}</h1>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Close notes"
                  onClick={() => {
                    if (sheetRef.current) sheetRef.current.style.height = "";
                    setPanel(false);
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
              <p className="does">{DOES[selected]}</p>
            </div>
            <ul className="parts">
              {list.map((id) => (
                <li key={id}>
                  <button type="button" aria-pressed={selected === id} className={selected === id ? "part on" : "part"} onClick={() => setSelected(id)}>
                    {PARTS[id].title}
                  </button>
                </li>
              ))}
            </ul>
            <p className="fine">Visual reference of the TES unit.</p>
          </div>
        </aside>
      </div>

      <footer className="dock">
        <div className="chip-row dock-main">
          <button type="button" className={more ? "chip on" : "chip"} aria-expanded={more} aria-controls="functions" onClick={() => setMore(!more)}>
            <SlidersHorizontal aria-hidden="true" />
            Functions
            <ChevronDown aria-hidden="true" className={more ? "flip" : ""} />
          </button>
          <button type="button" aria-pressed={running} className={running ? "chip on" : "chip"} onClick={() => setRunning(!running)}>
            {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            {running ? "Running" : "Run"}
          </button>
          <button
            type="button"
            aria-pressed={panel}
            className={panel ? "chip on" : "chip"}
            onClick={() => {
              if (panel && sheetRef.current) sheetRef.current.style.height = "";
              setPanel(!panel);
            }}
          >
            Notes
          </button>
          <button type="button" aria-pressed={showPad} className={showPad ? "chip on" : "chip"} onClick={() => setShowPad(!showPad)}>
            Arrows
          </button>
          <button type="button" aria-pressed={present} className={present ? "chip on" : "chip"} onClick={() => setPresent(!present)}>
            {present ? "Show menus" : "Hide menus"}
          </button>
        </div>
        <div className="menu-pop" id="functions">
          <p className="menu-label">Camera</p>
          <div className="chip-row" aria-label="Camera">
            {VIEWS.map((item) => (
              <button key={item.id} type="button" aria-pressed={view === item.id} className={view === item.id ? "chip on" : "chip"} onClick={() => setView(item.id)}>
                {item.label}
              </button>
            ))}
            <button type="button" aria-pressed={spin} className={spin ? "chip on" : "chip"} onClick={() => setSpin(!spin)}>
              Spin
            </button>
          </div>
          <p className="menu-label">Shell</p>
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
          <p className="menu-label">Flows</p>
          <div className="chip-row" aria-label="Flow">
            {FLOWS.map((item) => (
              <button key={item.id} type="button" aria-pressed={flow === item.id} className={flow === item.id ? "chip on" : "chip"} onClick={() => setFlow(item.id as FlowId)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
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
    </div>
  );
}

function DirPad({ onNudge }: { onNudge: (dir: "left" | "right" | "up" | "down") => void }) {
  const hold = (dir: "left" | "right" | "up" | "down") => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onNudge(dir);
    const timer = window.setInterval(() => onNudge(dir), 120);
    const stop = () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };
  return (
    <div className="pad" role="group" aria-label="Move view">
      <button type="button" className="pad-btn up" aria-label="Move view up" onPointerDown={hold("up")}>
        <ChevronUp aria-hidden="true" />
      </button>
      <button type="button" className="pad-btn left" aria-label="Move view left" onPointerDown={hold("left")}>
        <ChevronLeft aria-hidden="true" />
      </button>
      <button type="button" className="pad-btn right" aria-label="Move view right" onPointerDown={hold("right")}>
        <ChevronRight aria-hidden="true" />
      </button>
      <button type="button" className="pad-btn down" aria-label="Move view down" onPointerDown={hold("down")}>
        <ChevronDown aria-hidden="true" />
      </button>
    </div>
  );
}
