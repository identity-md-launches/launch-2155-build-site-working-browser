import type { CSSProperties } from "react";
export type IconName =
  | "arrow"
  | "sound"
  | "mute"
  | "help"
  | "pause"
  | "play"
  | "close"
  | "restart"
  | "flag"
  | "bolt"
  | "left"
  | "right"
  | "brake"
  | "expand"
  | "trophy"
  | "check";
const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M4 12h15M13 5l7 7-7 7" />
    </>
  ),
  sound: (
    <>
      <path d="m11 5-6 4H2v6h3l6 4V5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
    </>
  ),
  mute: (
    <>
      <path d="m11 5-6 4H2v6h3l6 4V5ZM16 9l6 6m0-6-6 6" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1 .6-1.7 1.1-1.7 2.7M12 17h.01" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14M16 5v14" strokeWidth="3" />
    </>
  ),
  play: <path d="m8 4 12 8-12 8V4Z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  restart: (
    <>
      <path d="M4 10a8 8 0 1 1 .8 6M4 4v6h6" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0" />
      <path d="M10 4v9M14 5v9M5 9c5-4 9 4 14 0" />
    </>
  ),
  bolt: <path d="m14 2-9 12h6l-1 8 9-12h-6l1-8Z" />,
  left: <path d="m14 5-7 7 7 7" />,
  right: <path d="m10 5 7 7-7 7" />,
  brake: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M4 5a10 10 0 0 0 0 14M20 5a10 10 0 0 1 0 14M9 12h6" />
    </>
  ),
  expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />,
  trophy: (
    <>
      <path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v6m-4 2h8" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
