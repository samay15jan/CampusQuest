import { useEffect, useRef, useState } from "react";
import AmityMap from "../map/AmityMap.jsx";
import { ownerColor } from "../../theme.js";

const NS = "http://www.w3.org/2000/svg";
const MIN_ZONE_M = 45; // the capture radius is tiny on a big screen; draw a readable territory zone

/**
 * The same AmityMap used in the mobile app, plus live territory zones for the big screen.
 * Zones are drawn as an SVG overlay (like the rest of AmityMap's overlays), so they follow
 * zoom/rotation and need no extra map sources or web workers.
 */
export default function DashMap({ portals, onSelectPortal }) {
  const [map, setMap] = useState(null);
  const portalsRef = useRef(portals);

  useEffect(() => {
    if (!map) return;

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible");
    map.getCanvasContainer().appendChild(svg);
    const zones = new Map();

    const draw = () => {
      const list = portalsRef.current;
      const seen = new Set();

      for (const p of list) {
        const id = String(p.id);
        seen.add(id);
        let el = zones.get(id);
        if (!el) {
          el = document.createElementNS(NS, "circle");
          svg.appendChild(el);
          zones.set(id, el);
        }
        const c = map.project([p.longitude, p.latitude]);
        // Pixel radius: project a point `r` metres east of the centre.
        const r = Math.max(p.radius_m || 0, MIN_ZONE_M);
        const dLng = r / (111320 * Math.cos((p.latitude * Math.PI) / 180));
        const e = map.project([p.longitude + dLng, p.latitude]);
        const color = ownerColor(p.owner);

        el.setAttribute("cx", c.x);
        el.setAttribute("cy", c.y);
        el.setAttribute("r", Math.hypot(e.x - c.x, e.y - c.y));
        el.setAttribute("fill", color);
        el.setAttribute("fill-opacity", p.owner === "neutral" ? "0.12" : "0.28");
        el.setAttribute("stroke", color);
        el.setAttribute("stroke-width", "2");
        el.setAttribute("stroke-opacity", "0.9");
      }

      for (const [id, el] of zones) {
        if (!seen.has(id)) {
          el.remove();
          zones.delete(id);
        }
      }
    };

    draw();
    map.on("render", draw);
    return () => {
      map.off("render", draw);
      svg.remove();
    };
  }, [map]);

  // Portal list changes (new scores/owners) repaint on the next frame.
  useEffect(() => {
    portalsRef.current = portals;
    map?.triggerRepaint();
  }, [map, portals]);

  return (
    <AmityMap
      fill
      portals={portals}
      onSelectPortal={onSelectPortal}
      showControls={false}
      showLocations={false}
      trackUser={false}
      onMapReady={setMap}
    />
  );
}
