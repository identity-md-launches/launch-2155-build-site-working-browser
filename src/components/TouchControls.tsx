import type { Controls } from "../game/model";
import { Icon, type IconName } from "./Icon";
export function TouchControls({
  input,
  auto,
}: {
  input: (control: keyof Controls, pressed: boolean) => void;
  auto: boolean;
}) {
  const control = (
    name: keyof Controls,
    label: string,
    icon: IconName,
    className = "",
  ) => (
    <button
      className={`drive-control ${className}`}
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        input(name, true);
      }}
      onPointerUp={() => input(name, false)}
      onPointerCancel={() => input(name, false)}
      onLostPointerCapture={() => input(name, false)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          input(name, true);
        }
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") input(name, false);
      }}
      onBlur={() => input(name, false)}
    >
      <Icon name={icon} size={24} />
      <span>{label}</span>
    </button>
  );
  return (
    <div className="touch-controls" aria-label="Touch driving controls">
      <div className="steering">
        {control("left", "Steer left", "left")}
        {control("right", "Steer right", "right")}
      </div>
      <div className="pedals">
        {control("brake", "Brake", "brake")}
        {!auto && control("accelerate", "Accelerate", "arrow")}
        {control("boost", "Boost", "bolt", "boost-control")}
      </div>
    </div>
  );
}
