import { Check, Minus } from "lucide-react";

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className="checkbox"
      title={label}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
      <span aria-hidden="true">
        {checked ? (
          <Check size={12} strokeWidth={3} />
        ) : indeterminate ? (
          <Minus size={12} strokeWidth={3} />
        ) : null}
      </span>
    </label>
  );
}
