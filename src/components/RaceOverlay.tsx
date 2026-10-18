import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
export function RaceOverlay({
  labelledBy,
  onEscape,
  children,
}: {
  labelledBy: string;
  onEscape: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="race-dialog"
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onEscape();
      }}
    >
      {children}
    </dialog>
  );
}
