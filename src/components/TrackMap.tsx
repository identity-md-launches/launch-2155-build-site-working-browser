import { mapPosition, trackMapPoints } from "../game/track";
import type { RaceSnapshot } from "../game/model";
export function TrackMap({
  state,
  preview = false,
}: {
  state?: RaceSnapshot;
  preview?: boolean;
}) {
  const player = mapPosition(state?.distance ?? 0);
  return (
    <svg
      className={`track-map${preview ? " preview-map" : ""}`}
      viewBox="0 0 240 165"
      role="img"
      aria-label="Copper Canyon circuit map"
    >
      <polyline
        points={trackMapPoints}
        fill="none"
        stroke="currentColor"
        strokeWidth={preview ? 3 : 4}
        strokeLinejoin="round"
      />
      {state?.rivals.map((r, i) => {
        const p = mapPosition(r.distance);
        return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#c3ccc4" />;
      })}
      <circle
        cx={player.x}
        cy={player.y}
        r="5"
        fill="#ff915c"
        stroke="#171b1a"
        strokeWidth="2"
      />
      {preview && (
        <>
          <path
            d={`M${player.x + 8} ${player.y - 8}v14m0-14h9v6h-9`}
            fill="none"
            stroke="#ff915c"
            strokeWidth="1.5"
          />
        </>
      )}
    </svg>
  );
}
