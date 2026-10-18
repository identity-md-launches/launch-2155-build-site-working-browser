import type { Mode } from "./model";
export interface RecordTime {
  lap: number;
  race: number;
  date: string;
}
export type Records = Partial<Record<Mode, RecordTime>>;
const KEY = "apex-run.records.v1";
export function readRecords(): Records {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (typeof parsed !== "object" || !parsed) return {};
    const clean: Records = {};
    for (const mode of ["Cruise", "Sport", "Pro"] as const) {
      const value = (parsed as Records)[mode];
      if (
        value &&
        Number.isFinite(value.lap) &&
        value.lap > 0 &&
        Number.isFinite(value.race) &&
        value.race > 0 &&
        typeof value.date === "string"
      )
        clean[mode] = value;
    }
    return clean;
  } catch {
    return {};
  }
}
export function saveRecord(
  mode: Mode,
  laps: number[],
  elapsed: number,
): { records: Records; saved: boolean; newBest: boolean } {
  const records = readRecords();
  const previous = records[mode];
  const lap = Math.min(...laps);
  const newBest = !previous || elapsed < previous.race;
  records[mode] = {
    lap: Math.min(lap, previous?.lap ?? Infinity),
    race: Math.min(elapsed, previous?.race ?? Infinity),
    date: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
    return { records, saved: true, newBest };
  } catch {
    return { records, saved: false, newBest };
  }
}
