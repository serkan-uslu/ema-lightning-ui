import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type Tone = "default" | "danger" | "accent";

const classes = (tone: Tone, size: "md" | "sm", active?: boolean, extra = "") =>
  [
    "icon-btn",
    tone !== "default" && `icon-btn-${tone}`,
    size === "sm" && "icon-btn-sm",
    active && "is-active",
    extra,
  ]
    .filter(Boolean)
    .join(" ");

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> & {
  /** Accessible name; also shown as the native tooltip. */
  label: string;
  tone?: Tone;
  size?: "md" | "sm";
  active?: boolean;
};

export function IconButton({
  label,
  tone = "default",
  size = "md",
  active,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={classes(tone, size, active, className)}
      {...props}
    />
  );
}

type IconLinkProps = Omit<ComponentProps<typeof Link>, "aria-label"> & {
  label: string;
  tone?: Tone;
  size?: "md" | "sm";
};

export function IconLink({
  label,
  tone = "default",
  size = "md",
  className,
  ...props
}: IconLinkProps) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={classes(tone, size, false, className)}
      {...props}
    />
  );
}

type IconAnchorProps = Omit<ComponentProps<"a">, "aria-label"> & {
  label: string;
  size?: "md" | "sm";
};

/** For plain file URLs (downloads) that must not go through the router. */
export function IconAnchor({
  label,
  size = "md",
  className,
  ...props
}: IconAnchorProps) {
  return (
    <a
      aria-label={label}
      title={label}
      className={classes("default", size, false, className)}
      {...props}
    />
  );
}
