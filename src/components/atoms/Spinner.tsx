import { LoaderCircle } from "lucide-react";

export const Spinner = ({ size = 16 }: { size?: number }) => (
  <LoaderCircle className="spin" size={size} aria-hidden="true" />
);
