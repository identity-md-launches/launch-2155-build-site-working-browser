export type Mode = "Cruise" | "Sport" | "Pro";
export type Phase = "ready" | "countdown" | "racing" | "paused" | "finished";
export interface Controls {
  left: boolean;
  right: boolean;
  accelerate: boolean;
  brake: boolean;
  boost: boolean;
}
export interface Rival {
  distance: number;
  lane: number;
  speed: number;
  finishTime: number | null;
}
export interface RaceSnapshot {
  phase: Phase;
  countdown: number;
  speed: number;
  distance: number;
  lane: number;
  lap: number;
  position: number;
  elapsed: number;
  lapTime: number;
  laps: number[];
  boost: number;
  boosting: boolean;
  offroad: boolean;
  hit: boolean;
  rivals: Rival[];
}
export const LAP_COUNT = 3;
export const EMPTY_CONTROLS: Controls = {
  left: false,
  right: false,
  accelerate: false,
  brake: false,
  boost: false,
};
export const MODE_DETAIL: Record<Mode, string> = {
  Cruise: "A little more room to find your line.",
  Sport: "Quick rivals and a proper canyon challenge.",
  Pro: "Faster rivals put every corner to the test.",
};
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/** Deterministic, road-following arcade physics. Distances are metres; speed is m/s. */
export class Race {
  state: RaceSnapshot;
  autoThrottle = true;
  mode: Mode = "Sport";
  private previousPhase: Phase = "racing";
  private lastLapAt = 0;
  private hitCooldown = 0;
  constructor(public readonly trackLength: number) {
    this.state = this.initial();
  }
  private initial(): RaceSnapshot {
    return {
      phase: "ready",
      countdown: 3,
      speed: 0,
      distance: 0,
      lane: -2.4,
      lap: 1,
      position: 4,
      elapsed: 0,
      lapTime: 0,
      laps: [],
      boost: 100,
      boosting: false,
      offroad: false,
      hit: false,
      rivals: [
        { distance: 10, lane: 2.4, speed: 0, finishTime: null },
        { distance: 20, lane: -2.4, speed: 0, finishTime: null },
        { distance: 30, lane: 2.4, speed: 0, finishTime: null },
      ],
    };
  }
  reset() {
    this.state = this.initial();
    this.lastLapAt = 0;
    this.hitCooldown = 0;
  }
  start(mode: Mode, autoThrottle: boolean) {
    this.reset();
    this.mode = mode;
    this.autoThrottle = autoThrottle;
    this.state.phase = "countdown";
  }
  pause() {
    if (this.state.phase === "racing" || this.state.phase === "countdown") {
      this.previousPhase = this.state.phase;
      this.state.phase = "paused";
      this.state.boosting = false;
    }
  }
  resume() {
    if (this.state.phase === "paused") this.state.phase = this.previousPhase;
  }
  step(seconds: number, input: Controls) {
    const dt = clamp(seconds, 0, 0.05),
      s = this.state;
    if (s.phase === "countdown") {
      s.countdown = Math.max(0, s.countdown - dt);
      if (s.countdown <= 0.00001) {
        s.countdown = 0;
        s.phase = "racing";
      }
      return;
    }
    if (s.phase !== "racing") return;
    const oldDistance = s.distance;
    s.elapsed += dt;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    s.hit = this.hitCooldown > 0.65;
    const throttle = (this.autoThrottle || input.accelerate) && !input.brake;
    s.boosting =
      input.boost &&
      s.boost >= Math.max(0.8, 27 * dt) &&
      throttle &&
      !s.offroad;
    // Require enough charge for the whole frame; holding an empty boost cannot
    // refill it or grant repeated partial-charge bursts at low frame rates.
    s.boost = clamp(
      s.boost + dt * (s.boosting ? -27 : input.boost ? 0 : 9),
      0,
      100,
    );
    const maxSpeed = s.offroad ? 23 : s.boosting ? 72 : 53;
    const acceleration = input.brake
      ? -38
      : throttle
        ? s.boosting
          ? 25
          : 16
        : -9;
    // Above the active limit, deceleration replaces throttle acceleration.
    // Adding both would let a released boost permanently raise cruising speed.
    const aboveLimit = s.speed > maxSpeed;
    const effectiveAcceleration = aboveLimit
      ? Math.min(acceleration, -(s.offroad ? 36 : 12))
      : acceleration;
    s.speed = clamp(
      s.speed + effectiveAcceleration * dt,
      0,
      aboveLimit ? 74 : maxSpeed,
    );
    const steer = Number(input.right) - Number(input.left);
    s.lane = clamp(
      s.lane + steer * (1.9 + Math.min(s.speed / 13, 4.2)) * dt,
      -7.1,
      7.1,
    );
    s.offroad = Math.abs(s.lane) > 5.15;
    s.distance += s.speed * dt;
    const pace = this.mode === "Cruise" ? 34 : this.mode === "Sport" ? 44 : 52;
    s.rivals.forEach((r, i) => {
      if (r.finishTime !== null) return;
      const desired = pace + i * 1.5 + Math.sin(s.elapsed * 0.27 + i * 2.3) * 2;
      r.speed = Math.min(desired, r.speed + dt * (12 + i));
      r.distance += r.speed * dt;
      r.lane = (i % 2 ? -2.5 : 2.5) + Math.sin(s.elapsed * 0.32 + i) * 0.8;
      if (r.distance >= this.trackLength * LAP_COUNT) r.finishTime = s.elapsed;
      // Compare world positions modulo a lap, including cars being lapped.
      const gap =
        ((((r.distance - s.distance + this.trackLength / 2) %
          this.trackLength) +
          this.trackLength) %
          this.trackLength) -
        this.trackLength / 2;
      if (
        Math.abs(gap) < 4.4 &&
        Math.abs(r.lane - s.lane) < 1.8 &&
        this.hitCooldown === 0
      ) {
        s.speed *= 0.58;
        s.lane = clamp(s.lane + (s.lane < r.lane ? -0.75 : 0.75), -7.1, 7.1);
        this.hitCooldown = 1.1;
        s.hit = true;
      }
    });
    s.position =
      1 +
      s.rivals.filter((r) => r.distance > s.distance || r.finishTime !== null)
        .length;
    const crossedLap =
      Math.floor(s.distance / this.trackLength) >
      Math.floor(oldDistance / this.trackLength);
    if (crossedLap) {
      // Interpolate the crossing inside this frame for stable lap timing.
      const crossingTime =
        s.elapsed - (s.distance % this.trackLength) / Math.max(s.speed, 0.001);
      s.laps.push(crossingTime - this.lastLapAt);
      this.lastLapAt = crossingTime;
      if (s.laps.length === LAP_COUNT) {
        s.distance = this.trackLength * LAP_COUNT;
        s.elapsed = crossingTime;
        s.phase = "finished";
        s.boosting = false;
      }
    }
    s.lap = Math.min(LAP_COUNT, 1 + Math.floor(s.distance / this.trackLength));
    s.lapTime =
      s.phase === "finished"
        ? s.laps[LAP_COUNT - 1]
        : s.elapsed - this.lastLapAt;
  }
  snapshot(): RaceSnapshot {
    return {
      ...this.state,
      laps: [...this.state.laps],
      rivals: this.state.rivals.map((r) => ({ ...r })),
    };
  }
}

export function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds))
    return "—";
  const total = Math.floor(Math.max(0, seconds) * 100);
  return `${Math.floor(total / 6000)}:${String(Math.floor(total / 100) % 60).padStart(2, "0")}.${String(total % 100).padStart(2, "0")}`;
}
