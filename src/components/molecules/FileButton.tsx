import type { ReactNode } from "react";

export function FileButton({
  accept,
  onFile,
  children,
  disabled,
  variant = "inline",
}: {
  accept: string;
  onFile: (file: File) => void;
  children: ReactNode;
  disabled?: boolean;
  variant?: "inline" | "dropzone";
}) {
  return (
    <label
      className={`file-button file-${variant} ${disabled ? "is-disabled" : ""}`}
    >
      {children}
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
