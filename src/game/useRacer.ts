import { useCallback, useEffect, useRef, useState } from "react";
import {
  Race,
  EMPTY_CONTROLS,
  type Controls,
  type Mode,
  type RaceSnapshot,
} from "./model";
import { TRACK_LENGTH } from "./track";
import { RacingScene } from "./scene";
import { EngineAudio } from "./audio";

export function useRacer(modalOpen: boolean) {
  const host = useRef<HTMLDivElement>(null);
  const race = useRef(new Race(TRACK_LENGTH));
  const controls = useRef<Controls>({ ...EMPTY_CONTROLS });
  const scene = useRef<RacingScene | null>(null);
  const audio = useRef<EngineAudio | null>(null);
  const modal = useRef(modalOpen);
  modal.current = modalOpen;
  const [snapshot, setSnapshot] = useState<RaceSnapshot>(
    race.current.snapshot(),
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const clearInput = useCallback(() => {
    controls.current = { ...EMPTY_CONTROLS };
  }, []);
  const publish = useCallback(() => setSnapshot(race.current.snapshot()), []);
  const pause = useCallback(() => {
    race.current.pause();
    audio.current?.update(0, false, false);
    clearInput();
    publish();
  }, [clearInput, publish]);
  const resume = useCallback(() => {
    clearInput();
    race.current.resume();
    publish();
  }, [clearInput, publish]);
  useEffect(() => {
    if (!host.current) return;
    let frame = 0,
      failed = false;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = preference.matches;
    setReducedMotion(reduced);
    const preferenceChanged = () => {
      reduced = preference.matches;
      setReducedMotion(reduced);
    };
    preference.addEventListener("change", preferenceChanged);
    const fail = (message: string) => {
      failed = true;
      race.current.pause();
      audio.current?.update(0, false, false);
      setError(message);
      setReady(false);
      publish();
    };
    try {
      scene.current = new RacingScene(host.current, fail);
      audio.current = new EngineAudio();
      setReady(true);
    } catch {
      fail(
        "This browser could not start 3D graphics. Enable hardware acceleration or try a browser with WebGL 2, then reload.",
      );
    }
    let last = performance.now(),
      lastPublish = 0;
    const tick = (now: number) => {
      if (failed) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const before = race.current.state.phase;
      race.current.step(dt, controls.current);
      const state = race.current.state;
      scene.current?.render(state, dt, reduced);
      audio.current?.update(
        state.speed,
        state.phase === "racing",
        state.boosting,
      );
      if (now - lastPublish > 90 || before !== state.phase) {
        publish();
        lastPublish = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const keyToControl: Record<string, keyof Controls> = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ArrowUp: "accelerate",
      KeyW: "accelerate",
      ArrowDown: "brake",
      KeyS: "brake",
      Space: "boost",
      ShiftLeft: "boost",
      ShiftRight: "boost",
    };
    const keys = new Set<string>();
    const handleKey = (event: KeyboardEvent, down: boolean) => {
      if (!down) {
        keys.delete(event.code);
      }
      if (modal.current) return;
      const phase = race.current.state.phase;
      if (
        (event.code === "Escape" || event.code === "KeyP") &&
        down &&
        !event.repeat &&
        phase !== "ready" &&
        phase !== "finished"
      ) {
        event.preventDefault();
        keys.clear();
        if (phase === "paused") resume();
        else pause();
        return;
      }
      const control = keyToControl[event.code];
      if (!control || (phase !== "racing" && phase !== "countdown")) return;
      if (
        (event.target instanceof HTMLButtonElement ||
          event.target instanceof HTMLInputElement) &&
        event.code === "Space"
      )
        return;
      event.preventDefault();
      if (down) keys.add(event.code);
      // Multiple keys for one action remain down until all aliases are released.
      controls.current[control] = [...keys].some(
        (k) => keyToControl[k] === control,
      );
    };
    const keydown = (event: KeyboardEvent) => handleKey(event, true);
    const keyup = (event: KeyboardEvent) => handleKey(event, false);
    const onBlur = () => {
      keys.clear();
      pause();
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      scene.current?.dispose();
      audio.current?.dispose();
      preference.removeEventListener("change", preferenceChanged);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pause, resume, publish]);
  return {
    host,
    snapshot,
    ready,
    error,
    sound,
    audioError,
    reducedMotion,
    pause,
    resume,
    start(mode: Mode, auto: boolean) {
      clearInput();
      race.current.start(mode, auto);
      publish();
    },
    reset() {
      clearInput();
      race.current.reset();
      publish();
    },
    paint(color: string) {
      scene.current?.setPaint(color);
    },
    input(control: keyof Controls, pressed: boolean) {
      controls.current[control] = pressed;
    },
    async toggleSound() {
      try {
        setSound(await audio.current!.toggle());
        setAudioError("");
      } catch {
        setAudioError(
          "Sound is unavailable in this browser. You can still race.",
        );
      }
    },
  };
}
