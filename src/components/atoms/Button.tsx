import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, Ref } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

const classes = (
  variant: ButtonVariant,
  size: Size,
  block?: boolean,
  extra = "",
) =>
  [
    "btn",
    `btn-${variant}`,
    size === "sm" && "btn-sm",
    block && "btn-block",
    extra,
  ]
    .filter(Boolean)
    .join(" ");

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: Size;
  block?: boolean;
};

export function Button({
  variant = "secondary",
  size = "md",
  block,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes(variant, size, block, className)}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: Size;
  block?: boolean;
};

export function ButtonLink({
  variant = "secondary",
  size = "md",
  block,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={classes(variant, size, block, className)} {...props} />
  );
}
