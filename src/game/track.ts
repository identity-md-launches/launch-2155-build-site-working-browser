import * as THREE from "three";

// A closed circuit with a wide opening straight and two canyon sweepers.
const points = [
  [0, 0, 0],
  [0, 1, 125],
  [45, 4, 225],
  [155, 8, 250],
  [240, 9, 180],
  [270, 6, 60],
  [210, 2, -45],
  [215, 0, -145],
  [135, 2, -220],
  [20, 5, -195],
  [-55, 2, -115],
  [-35, 0, -40],
];
export const trackCurve = new THREE.CatmullRomCurve3(
  points.map((p) => new THREE.Vector3(...p)),
  true,
  "catmullrom",
  0.35,
);
trackCurve.arcLengthDivisions = 2400;
export const TRACK_LENGTH = trackCurve.getLength();
export const ROAD_WIDTH = 12;
export const trackMapPoints = Array.from({ length: 181 }, (_, i) => {
  const p = trackCurve.getPointAt(i / 180);
  return `${(((p.x + 65) / 345) * 210 + 15).toFixed(1)},${(((p.z + 230) / 490) * 135 + 12).toFixed(1)}`;
}).join(" ");
export function trackPoint(
  distance: number,
  lane = 0,
): { position: THREE.Vector3; tangent: THREE.Vector3; right: THREE.Vector3 } {
  const t = (((distance / TRACK_LENGTH) % 1) + 1) % 1;
  const position = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t).normalize();
  const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  position.addScaledVector(right, lane);
  return { position, tangent, right };
}
export function mapPosition(distance: number) {
  const p = trackCurve.getPointAt((((distance / TRACK_LENGTH) % 1) + 1) % 1);
  return {
    x: ((p.x + 65) / 345) * 210 + 15,
    y: ((p.z + 230) / 490) * 135 + 12,
  };
}
