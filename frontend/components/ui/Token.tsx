import type { CSSProperties } from "react";
import { getAvatar, monogram } from "@/lib/avatars";

interface TokenProps {
  avatar: string;
  name: string;
  /** Size/context class from the stylesheet: `ava`, `a`, `mini`, `big-ava`, `me-ava`. */
  className: string;
  children?: React.ReactNode;
}

/** A player's token: their initial on a coloured disc or square. Decorative; names are always shown as text. */
export function Token({ avatar, name, className, children }: TokenProps) {
  const a = getAvatar(avatar);
  return (
    <span
      className={className}
      style={{ "--c": a.color } as CSSProperties}
      data-s={a.shape === "square" ? "s" : "c"}
      aria-hidden="true"
    >
      {monogram(name)}
      {children}
    </span>
  );
}
