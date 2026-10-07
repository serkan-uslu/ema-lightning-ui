import { AudioLines } from "lucide-react";

export const BrandMark = ({ size = 22 }: { size?: number }) => (
  <span className="brand-mark" aria-hidden="true">
    <AudioLines size={size} />
  </span>
);
