import { useEffect, useRef, useState } from "react";
import { Icon } from "./components/Icon";
import { RaceOverlay } from "./components/RaceOverlay";
import { Modal } from "./components/Modal";
import { TrackMap } from "./components/TrackMap";
import { TouchControls } from "./components/TouchControls";
import { formatTime, MODE_DETAIL, type Mode } from "./game/model";
import { TRACK_LENGTH } from "./game/track";
import { useRacer } from "./game/useRacer";
import { readRecords, saveRecord } from "./game/storage";

const PAINTS = [
  { name: "Ember", color: "#f5793e" },
  { name: "Chalk", color: "#e4e3d5" },
  { name: "Sage", color: "#729987" },
];
type Panel = "controls" | "records" | null;
export default function App() {
  const [panel, setPanel] = useState<Panel>(null);
  const [mode, setMode] = useState<Mode>("Sport");
  const [paint, setPaint] = useState(PAINTS[0]);
  const [auto, setAuto] = useState(true);
  const [records, setRecords] = useState(readRecords);
  const [saveStatus, setSaveStatus] = useState({ saved: true, newBest: false });
  const game = useRacer(panel !== null);
  const { snapshot: state } = game;
  const phase = state.phase;
  const playing = phase === "racing" || phase === "countdown";
  const inRace = phase !== "ready";
  const shell = useRef<HTMLElement>(null);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const finishButton = useRef<HTMLButtonElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const savedThisRace = useRef(false);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (game.ready) game.paint(paint.color);
  }, [paint.color, game.ready]); // scene is retained for the lifetime of the game
  useEffect(() => {
    if (phase === "finished" && !savedThisRace.current) {
      savedThisRace.current = true;
      const result = saveRecord(mode, state.laps, state.elapsed);
      setRecords(result.records);
      setSaveStatus(result);
      setAnnouncement(
        `Race finished. Position ${state.position} of 4. Time ${formatTime(state.elapsed)}.`,
      );
      finishButton.current?.focus();
    }
    if (phase === "paused") {
      resumeButton.current?.focus();
      setAnnouncement("Race paused.");
    }
    if (phase === "racing") setAnnouncement(`Lap ${state.lap} of 3.`);
  }, [phase, state.lap]);
  function start() {
    savedThisRace.current = false;
    game.start(mode, auto);
    setAnnouncement("Race starts in three seconds.");
    shell.current?.focus();
  }
  function back() {
    game.reset();
    setAnnouncement("Ready for your next race.");
    setTimeout(() => startButton.current?.focus(), 0);
  }
  function openPanel(next: Panel) {
    if (playing) game.pause();
    setPanel(next);
  }
  const best = records[mode];
  return (
    <main
      className={`game-shell phase-${phase}`}
      ref={shell}
      tabIndex={-1}
      id="game"
      aria-label="Apex Run racing game"
    >
      <a
        className="skip-link"
        href={playing ? "#pause-race" : "#primary-action"}
      >
        Skip to race controls
      </a>
      <div className="scene-host" ref={game.host} />
      <div className="scene-shade" aria-hidden="true" />
      <header className="site-header">
        <div className="wordmark" aria-label="Apex Run">
          <svg viewBox="0 0 34 34" width="34" height="34" aria-hidden="true">
            <path
              d="M1 28 18 4h9l6 24H23l-1-7H12l5-6h4l-2-6L6 28Z"
              fill="currentColor"
            />
          </svg>
          <span>
            Apex<span className="wordmark-run">Run</span>
          </span>
        </div>
        <div className="header-tools">
          <button
            className="utility sound-button"
            onClick={() => void game.toggleSound()}
            disabled={!game.ready}
            aria-pressed={game.sound}
            aria-label={`Sound ${game.sound ? "on" : "off"}`}
            title={`Turn sound ${game.sound ? "off" : "on"}`}
          >
            <Icon name={game.sound ? "sound" : "mute"} />
            <span>Sound {game.sound ? "on" : "off"}</span>
          </button>
          <button className="utility" onClick={() => openPanel("controls")}>
            <Icon name="help" />
            <span>How to play</span>
          </button>
          {inRace && phase !== "finished" && (
            <button
              id="pause-race"
              className="icon-button pause-button"
              onClick={
                phase === "paused"
                  ? () => {
                      game.resume();
                      shell.current?.focus();
                    }
                  : game.pause
              }
              aria-label={phase === "paused" ? "Resume race" : "Pause race"}
            >
              <Icon name={phase === "paused" ? "play" : "pause"} />
            </button>
          )}
        </div>
      </header>

      {phase === "ready" && (
        <>
          <div className="lobby">
            <section className="intro" aria-labelledby="title">
              <h1 id="title">
                Chase the
                <br /> next <em>corner.</em>
              </h1>
              <p className="intro-description">
                A 3D arcade racer through Copper Canyon.
              </p>
              <div className="race-setup">
                <fieldset className="difficulty">
                  <legend>Set your pace</legend>
                  <div className="segmented">
                    {(["Cruise", "Sport", "Pro"] as Mode[]).map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="mode"
                          value={value}
                          checked={mode === value}
                          onChange={() => setMode(value)}
                        />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="mode-description">{MODE_DETAIL[mode]}</p>
                <button
                  id="primary-action"
                  className="primary-button start-button"
                  ref={startButton}
                  onClick={start}
                  disabled={!game.ready || !!game.error}
                >
                  {game.error
                    ? "Graphics unavailable"
                    : game.ready
                      ? "Start race"
                      : "Preparing the track…"}
                  <Icon name="arrow" size={24} />
                </button>
                <p className="input-hint">
                  <span className="keyboard-hint">
                    <kbd>←</kbd>
                    <kbd>→</kbd> steer <span className="hint-dot">·</span>{" "}
                    <kbd>Space</kbd> boost
                  </span>
                  <span className="mobile-hint">
                    Steer, brake, and boost with on-screen controls.
                  </span>
                </p>
              </div>
            </section>
            <aside className="circuit-preview" aria-label="Selected circuit">
              <TrackMap preview />
              <div className="circuit-heading">
                <span className="circuit-number" aria-hidden="true">
                  01
                </span>
                <h2>Copper Canyon</h2>
              </div>
              <p>Three laps. Four drivers. One open road.</p>
              <div className="circuit-meta">
                <span>
                  <Icon name="flag" size={16} />3 laps
                </span>
                <span>{(TRACK_LENGTH / 1000).toFixed(2)} km / lap</span>
                <span>Golden hour</span>
              </div>
            </aside>
          </div>
          <footer className="lobby-footer">
            <div className="car-picker">
              <span className="car-name">
                The Canyon GT <span>01</span>
              </span>
              <div className="swatches" role="group" aria-label="Car color">
                {PAINTS.map((p) => (
                  <button
                    key={p.name}
                    className={`swatch ${paint.name === p.name ? "selected" : ""}`}
                    style={{ "--swatch": p.color } as React.CSSProperties}
                    onClick={() => setPaint(p)}
                    aria-label={`${p.name} car color`}
                    aria-pressed={paint.name === p.name}
                  >
                    {paint.name === p.name && <Icon name="check" size={14} />}
                  </button>
                ))}
              </div>
            </div>
            <label className="auto-throttle">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
              />
              <span className="switch" aria-hidden="true" />
              <span>Auto-accelerate</span>
            </label>
            <button
              className="utility personal-best"
              onClick={() => openPanel("records")}
            >
              <Icon name="trophy" />
              <span>
                Personal best{" "}
                <span className="best-value">
                  {best ? formatTime(best.race) : "Set your first time"}
                </span>
              </span>
              <Icon name="arrow" size={16} />
            </button>
          </footer>
        </>
      )}

      {inRace && (
        <>
          <h1 className="sr-only">Copper Canyon race</h1>
          <div className="race-hud" aria-label="Race status">
            <div className="hud-stat position-stat">
              <span>Position</span>
              <strong>
                {state.position}
                <small> / 4</small>
              </strong>
            </div>
            <div className="hud-stat">
              <span>Lap</span>
              <strong>
                {state.lap}
                <small> / 3</small>
              </strong>
            </div>
            <div className="hud-stat time-stat">
              <span>Race time</span>
              <strong data-testid="race-time">
                {formatTime(state.elapsed)}
              </strong>
            </div>
          </div>
          <div className="lap-strip">
            <span>
              Current lap <b>{formatTime(state.lapTime)}</b>
            </span>
            <span>
              Best lap{" "}
              <b>
                {formatTime(
                  state.laps.length ? Math.min(...state.laps) : best?.lap,
                )}
              </b>
            </span>
          </div>
          <div className="race-map">
            <TrackMap state={state} />
            <span>Copper Canyon</span>
          </div>
          <div className="driving-instruments">
            <div className="speed">
              <strong data-testid="speed">
                {Math.round(state.speed * 3.6)}
              </strong>
              <span>km/h</span>
            </div>
            <div className="boost-gauge">
              <div>
                <span>
                  <Icon name="bolt" size={16} />
                  Boost
                </span>
                <span>{Math.round(state.boost)}%</span>
              </div>
              <meter
                aria-label="Boost available"
                min={0}
                max={100}
                value={state.boost}
              >
                {Math.round(state.boost)}%
              </meter>
            </div>
            <span className="drive-status">
              {state.hit
                ? "Contact · speed reduced"
                : state.offroad
                  ? "Off road · steer back"
                  : state.boosting
                    ? "Boost engaged"
                    : auto
                      ? "Auto-accelerate on"
                      : "Hold ↑ or W to accelerate"}
            </span>
          </div>
          {playing && <TouchControls input={game.input} auto={auto} />}
          {playing && (
            <div className="desktop-controls">
              <span>
                <kbd>←</kbd>
                <kbd>→</kbd> Steer
              </span>
              <span>
                <kbd>↓</kbd> Brake
              </span>
              <span>
                <kbd>Space</kbd> Boost
              </span>
              <span>
                <kbd>P</kbd> Pause
              </span>
            </div>
          )}
          {phase === "countdown" && (
            <div
              className="countdown"
              aria-label={`Starting in ${Math.ceil(state.countdown)}`}
            >
              <span>Find your line.</span>
              <strong>{Math.ceil(state.countdown)}</strong>
            </div>
          )}
          {phase === "paused" && (
            <RaceOverlay
              labelledBy="pause-title"
              onEscape={() => {
                game.resume();
                shell.current?.focus();
              }}
            >
              <section className="pause-panel" aria-labelledby="pause-title">
                <span className="panel-icon">
                  <Icon name="pause" size={28} />
                </span>
                <h2 id="pause-title">Take a breather.</h2>
                <p>Your race will be right here.</p>
                <button
                  id="primary-action"
                  ref={resumeButton}
                  className="primary-button"
                  onClick={() => {
                    game.resume();
                    shell.current?.focus();
                  }}
                >
                  Resume race
                  <Icon name="play" />
                </button>
                <button className="secondary-button" onClick={start}>
                  <Icon name="restart" />
                  Restart race
                </button>
                <button className="text-button" onClick={back}>
                  Back to garage
                </button>
              </section>
            </RaceOverlay>
          )}
          {phase === "finished" && (
            <RaceOverlay labelledBy="finish-title" onEscape={back}>
              <section className="results-panel" aria-labelledby="finish-title">
                <span className="panel-icon">
                  <Icon name="flag" size={28} />
                </span>
                <h2 id="finish-title">
                  {state.position === 1
                    ? "Canyon conquered."
                    : "That’s a wrap."}
                </h2>
                <p>
                  {state.position === 1
                    ? "First across the line. Make it faster."
                    : `You finished ${["", "first", "second", "third", "fourth"][state.position]}. There’s another line to find.`}
                </p>
                <div className="result-summary">
                  <div>
                    <span>Position</span>
                    <strong>
                      {state.position}
                      <small> / 4</small>
                    </strong>
                  </div>
                  <div>
                    <span>Race time</span>
                    <strong>{formatTime(state.elapsed)}</strong>
                  </div>
                </div>
                <ol className="lap-results">
                  {state.laps.map((time, i) => (
                    <li key={i}>
                      <span>Lap {i + 1}</span>
                      {time === Math.min(...state.laps) && (
                        <span className="lap-best">Fastest</span>
                      )}
                      <b>{formatTime(time)}</b>
                    </li>
                  ))}
                </ol>
                <p className="save-note">
                  {!saveStatus.saved
                    ? "Storage unavailable. Times last until you close this page."
                    : saveStatus.newBest
                      ? `New ${mode} personal best. Saved on this device.`
                      : "Times saved on this device."}
                </p>
                <button
                  id="primary-action"
                  ref={finishButton}
                  className="primary-button"
                  onClick={start}
                >
                  Race again
                  <Icon name="restart" />
                </button>
                <button className="text-button" onClick={back}>
                  Back to garage
                </button>
              </section>
            </RaceOverlay>
          )}
        </>
      )}

      {game.error && (
        <div className="graphics-error" role="alert">
          <h2>Let’s get you on track.</h2>
          <p>{game.error}</p>
          <button
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            Reload game
            <Icon name="restart" />
          </button>
        </div>
      )}
      {game.audioError && (
        <div className="audio-message" role="status">
          {game.audioError}
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      {panel === "controls" && (
        <Modal title="Find your line." onClose={() => setPanel(null)}>
          <p className="modal-intro">
            Finish three laps ahead of the other drivers. Stay on the asphalt
            and save your boost for the straights.
          </p>
          <dl className="control-list">
            <div>
              <dt>Steer</dt>
              <dd>
                <kbd>←</kbd>
                <kbd>→</kbd>
                <span>or</span>
                <kbd>A</kbd>
                <kbd>D</kbd>
              </dd>
            </div>
            <div>
              <dt>Accelerate</dt>
              <dd>
                <kbd>↑</kbd>
                <span>or</span>
                <kbd>W</kbd>
              </dd>
            </div>
            <div>
              <dt>Brake</dt>
              <dd>
                <kbd>↓</kbd>
                <span>or</span>
                <kbd>S</kbd>
              </dd>
            </div>
            <div>
              <dt>Boost</dt>
              <dd>
                <kbd>Space</kbd>
                <span>or</span>
                <kbd>Shift</kbd>
              </dd>
            </div>
            <div>
              <dt>Pause / resume</dt>
              <dd>
                <kbd>P</kbd>
                <span>or</span>
                <kbd>Esc</kbd>
              </dd>
            </div>
          </dl>
          <div className="help-note">
            <h3>Small screen, same open road.</h3>
            <p>
              Use the on-screen steering, brake, and boost buttons.
              Auto-accelerate keeps you moving; turn it off in the garage for
              manual throttle.
            </p>
          </div>
          <p className="help-detail">
            Boost recharges when released. Contact with a rival slows you down.
            The race pauses when you switch tabs.
          </p>
          {game.reducedMotion && (
            <p className="help-detail">
              Reduced motion is on: camera smoothing and the boost zoom are
              disabled. Driving still involves 3D motion.
            </p>
          )}
          <button className="primary-button" onClick={() => setPanel(null)}>
            Got it
            <Icon name="check" />
          </button>
        </Modal>
      )}
      {panel === "records" && (
        <Modal title="Your fastest runs." onClose={() => setPanel(null)}>
          <p className="modal-intro">
            Personal records for Copper Canyon, saved only in this browser.
          </p>
          <div className="records-table">
            <div className="record-heading">
              <span>Pace</span>
              <span>Best lap</span>
              <span>Best race</span>
            </div>
            {(["Cruise", "Sport", "Pro"] as Mode[]).map((m) => (
              <div className="record-row" key={m}>
                <strong>{m}</strong>
                <span>{formatTime(records[m]?.lap)}</span>
                <span>{formatTime(records[m]?.race)}</span>
              </div>
            ))}
          </div>
          {Object.keys(records).length === 0 && (
            <p className="empty-records">
              An open road and a clean slate. Finish a race to set your first
              time.
            </p>
          )}
          <button className="primary-button" onClick={() => setPanel(null)}>
            Back to garage
            <Icon name="arrow" />
          </button>
        </Modal>
      )}
    </main>
  );
}
