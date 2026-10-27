import { useMemo } from "react";
import QRCode from "qrcode";

/** Minimal inline-SVG QR (no canvas, crisp on any screen). */
export function QRCodeSVG({ value, size = 176 }) {
  const { n, cells } = useMemo(() => {
    const q = QRCode.create(value, { errorCorrectionLevel: "M" });
    return { n: q.modules.size, cells: q.modules.data };
  }, [value]);

  const path = useMemo(() => {
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (cells[y * n + x]) d += `M${x} ${y}h1v1h-1z`;
    return d;
  }, [n, cells]);

  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label="QR code to open CampusQuest">
      <path d={path} fill="#05070d" />
    </svg>
  );
}
