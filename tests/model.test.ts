import test from "node:test";
import assert from "node:assert/strict";
import {
  Race,
  EMPTY_CONTROLS,
  formatTime,
  type Mode,
  type Controls,
} from "../src/game/model";
import { TRACK_LENGTH, trackPoint, mapPosition } from "../src/game/track";
import { readRecords, saveRecord } from "../src/game/storage";
const idle = { ...EMPTY_CONTROLS };
function advance(race: Race, seconds: number, controls: Controls = idle) {
  for (let i = 0; i < Math.ceil(seconds / 0.02); i++) race.step(0.02, controls);
}
function started(mode: Mode = "Sport", auto = true) {
  const race = new Race(TRACK_LENGTH);
  race.start(mode, auto);
  advance(race, 3.02);
  return race;
}

test("countdown holds position, then starts a race", () => {
  const race = new Race(1000);
  race.start("Sport", true);
  advance(race, 2);
  assert.equal(race.state.phase, "countdown");
  assert.equal(race.state.distance, 0);
  advance(race, 1.04);
  assert.equal(race.state.phase, "racing");
  assert.ok(race.state.speed > 0);
});
test("throttle accelerates, brake slows, manual mode requires input", () => {
  const race = started("Sport", false);
  advance(race, 2);
  assert.equal(race.state.speed, 0);
  advance(race, 2, { ...idle, accelerate: true });
  const speed = race.state.speed;
  assert.ok(speed > 25);
  advance(race, 0.5, { ...idle, brake: true });
  assert.ok(race.state.speed < speed);
});
test("steering is bounded and driving off-road reduces speed", () => {
  const race = started();
  advance(race, 5);
  advance(race, 2.5, { ...idle, left: true });
  assert.equal(race.state.lane, -7.1);
  assert.equal(race.state.offroad, true);
  assert.ok(race.state.speed <= 23.1);
  advance(race, 1, { ...idle, right: true });
  assert.equal(race.state.offroad, false);
});
test("boost uses its charge, exceeds normal speed, then recharges", () => {
  const race = started();
  race.state.lane = -4.5;
  advance(race, 4);
  advance(race, 2, { ...idle, boost: true });
  assert.ok(race.state.speed > 53);
  assert.ok(race.state.boost < 50);
  const charge = race.state.boost;
  advance(race, 2);
  assert.ok(race.state.boost > charge);
  assert.equal(race.state.boosting, false);
});
test("rival contact causes a speed penalty with a recovery cooldown", () => {
  const race = started();
  race.state.speed = 50;
  race.state.distance = 100;
  race.state.lane = 2.5;
  race.state.rivals[0] = {
    distance: 102,
    lane: 2.5,
    speed: 40,
    finishTime: null,
  };
  race.step(0.02, idle);
  assert.equal(race.state.hit, true);
  assert.ok(race.state.speed < 35);
  const hitSpeed = race.state.speed;
  race.step(0.02, idle);
  assert.ok(race.state.speed > hitSpeed);
});
test("pause freezes elapsed time, position and charge; resume preserves countdown", () => {
  const race = new Race(1000);
  race.start("Pro", true);
  advance(race, 1);
  race.pause();
  const before = race.snapshot();
  advance(race, 5);
  assert.deepEqual(race.snapshot(), before);
  race.resume();
  assert.equal(race.state.phase, "countdown");
  advance(race, 2.1);
  race.pause();
  const elapsed = race.state.elapsed;
  advance(race, 2);
  assert.equal(race.state.elapsed, elapsed);
  race.resume();
  advance(race, 1);
  assert.ok(race.state.elapsed > elapsed);
});
test("three full laps finish, produce consistent times and stop the timer", () => {
  const race = started("Cruise");
  // Hold a clear inside lane. This exercises the actual simulation through three laps.
  race.state.lane = -4.5;
  for (let i = 0; i < 10000 && race.state.phase !== "finished"; i++)
    race.step(0.02, { ...idle, boost: race.state.boost > 30 });
  assert.equal(race.state.phase, "finished");
  assert.equal(race.state.laps.length, 3);
  assert.equal(race.state.lap, 3);
  assert.equal(race.state.position, 1);
  assert.equal(race.state.distance, TRACK_LENGTH * 3);
  assert.ok(race.state.laps.every((t) => t > 15));
  assert.ok(
    Math.abs(race.state.laps.reduce((a, b) => a + b, 0) - race.state.elapsed) <
      0.000001,
  );
  const before = race.snapshot();
  advance(race, 3);
  assert.deepEqual(race.snapshot(), before);
});
test("restart restores initial rivals, timer, boost and player position", () => {
  const race = started();
  advance(race, 10, { ...idle, boost: true });
  race.start("Pro", false);
  assert.equal(race.state.elapsed, 0);
  assert.equal(race.state.distance, 0);
  assert.equal(race.state.boost, 100);
  assert.equal(race.state.position, 4);
  assert.deepEqual(race.state.laps, []);
  assert.equal(race.autoThrottle, false);
});
test("pace changes rival progress and oversized frame deltas are capped", () => {
  const easy = started("Cruise"),
    hard = started("Pro");
  advance(easy, 12);
  advance(hard, 12);
  assert.ok(hard.state.rivals[0].distance > easy.state.rivals[0].distance);
  const before = hard.state.elapsed;
  hard.step(5, idle);
  assert.ok(hard.state.elapsed - before <= 0.051);
});
test("track is continuous at the lap seam and mapping stays in view", () => {
  assert.ok(
    trackPoint(0).position.distanceTo(trackPoint(TRACK_LENGTH).position) < 0.01,
  );
  assert.ok(
    trackPoint(-1).position.distanceTo(trackPoint(TRACK_LENGTH - 1).position) <
      0.01,
  );
  for (let i = 0; i < 100; i++) {
    const p = mapPosition((TRACK_LENGTH * i) / 100);
    assert.ok(p.x >= 0 && p.x <= 240 && p.y >= 0 && p.y <= 165);
  }
});
test("formatted times handle missing values and minute transitions", () => {
  assert.equal(formatTime(null), "—");
  assert.equal(formatTime(Infinity), "—");
  assert.equal(formatTime(0), "0:00.00");
  assert.equal(formatTime(61.23), "1:01.23");
  assert.equal(formatTime(-1), "0:00.00");
});
test("records are local, per pace, monotonic, and tolerate unavailable storage", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    },
  });
  assert.deepEqual(readRecords(), {});
  assert.equal(saveRecord("Sport", [25, 24, 23], 72).newBest, true);
  assert.equal(saveRecord("Sport", [26, 25, 24], 75).newBest, false);
  assert.equal(readRecords().Sport?.race, 72);
  assert.equal(readRecords().Sport?.lap, 23);
  assert.equal(readRecords().Pro, undefined);
  memory.set("apex-run.records.v1", "{broken");
  assert.deepEqual(readRecords(), {});
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => {
      throw new Error("storage blocked");
    },
  });
  assert.deepEqual(readRecords(), {});
  assert.equal(saveRecord("Cruise", [25, 24, 23], 72).saved, false);
});

test("normal throttle stays capped and releasing boost returns to the normal limit", () => {
  const race = started("Cruise");
  // Keep rivals clear so contact cannot hide a speed-limit regression.
  race.state.rivals.forEach((r, i) => {
    r.distance = 500 + i * 40;
  });
  advance(race, 8);
  assert.ok(race.state.speed <= 53);
  assert.equal(race.state.speed, 53);
  advance(race, 2, { ...idle, boost: true });
  assert.equal(race.state.speed, 72);
  advance(race, 2);
  assert.ok(race.state.speed <= 53);
});

test("empty boost requires release and cannot pulse indefinitely at slow frame rates", () => {
  for (const dt of [1 / 60, 0.02, 0.05]) {
    const race = started("Cruise");
    race.state.lane = 0;
    // Isolate resource behavior from rival contact.
    race.state.rivals = [];
    for (let i = 0; i < Math.ceil(20 / dt); i++)
      race.step(dt, { ...idle, boost: true });
    assert.equal(race.state.boosting, false);
    assert.ok(
      race.state.speed <= 53,
      `depleted boost exceeded normal speed at dt=${dt}`,
    );
    const remaining = race.state.boost;
    advance(race, 2, { ...idle, boost: true });
    assert.equal(race.state.boost, remaining);
    advance(race, 2);
    assert.ok(race.state.boost > remaining + 17);
  }
});
