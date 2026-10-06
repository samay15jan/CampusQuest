import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, Popup } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import { LOCATIONS, ICONS } from "../../data/locations.js";

const CENTER = [77.3336, 28.5445];

const BOUNDS = [
  [77.3285, 28.5405],
  [77.339, 28.549],
];

const POLYGON = [
  [77.336901, 28.545001],
  [77.333156, 28.541775],
  [77.332348, 28.542487],
  [77.330849, 28.541231],
  [77.329625, 28.542417],
  [77.331679, 28.544176],
  [77.332055, 28.543797],
  [77.332824, 28.544463],
  [77.33193, 28.545343],
  [77.331787, 28.545502],
  [77.332577, 28.546223],
  [77.33201, 28.546805],
  [77.333505, 28.548107],
];

const EXCLUDED_POLYGON = [
  [77.333676, 28.545193],
  [77.33337, 28.545493],
  [77.333552, 28.545661],
  [77.332871, 28.546318],
  [77.333425, 28.546777],
  [77.3342, 28.546082],
  [77.333836, 28.545764],
  [77.334087, 28.545513],
];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");

    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";

    document.body.appendChild(ta);
    ta.select();

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);

    return ok;
  }
}

function normalizeHeading(value) {
  return (value + 360) % 360;
}

function shortestAngleDifference(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function smoothHeading(current, target) {
  const difference = shortestAngleDifference(current, target);
  return normalizeHeading(current + difference * 0.15);
}

/**
 * Props
 *  - onSelectLocation(loc): called when a location marker is tapped (replaces the popup)
 *  - solvedIds: location ids whose riddle is solved; their markers turn red
 */
export default function AmityMap({ portals = [], onSelectPortal, onSelectLocation, solvedIds = [] }) {
  const container = useRef(null);

  const mapRef = useRef(null);
  const timerRef = useRef(null);

  const onSelectRef = useRef(onSelectLocation);
  onSelectRef.current = onSelectLocation;
  const onSelectPortalRef = useRef(onSelectPortal);
  onSelectPortalRef.current = onSelectPortal;
  const markerEls = useRef(new Map());
  const portalMarkersRef = useRef(new Map());
  const portalLinksSvgRef = useRef(null);
  const portalLinkPathsRef = useRef(new Map());

  const compassEnabledRef = useRef(false);
  const headingRef = useRef(null);

  const [point, setPoint] = useState(null);
  const [copied, setCopied] = useState(null);
  const [status, setStatus] = useState("Loading map...");
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [heading, setHeading] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const isMobileDevice = () => {
    if (typeof window === "undefined") return false;

    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    );
  };

  const handleOrientation = (event) => {
    if (!compassEnabledRef.current) return;

    let newHeading = null;

    if (
      typeof event.webkitCompassHeading === "number" &&
      !Number.isNaN(event.webkitCompassHeading)
    ) {
      newHeading = event.webkitCompassHeading;
    } else if (typeof event.alpha === "number" && !Number.isNaN(event.alpha)) {
      newHeading = 360 - event.alpha;
    }

    if (newHeading == null) return;

    newHeading = normalizeHeading(newHeading);

    headingRef.current =
      headingRef.current === null
        ? newHeading
        : smoothHeading(headingRef.current, newHeading);

    const currentHeading = headingRef.current;

    setHeading(Math.round(currentHeading));

    const currentMap = mapRef.current;
    if (!currentMap) return;

    if (
      currentMap.isMoving() ||
      currentMap.isZooming() ||
      currentMap.isRotating()
    ) {
      return;
    }

    if (
      Math.abs(shortestAngleDifference(currentMap.getBearing(), currentHeading)) < 0.5
    ) {
      return;
    }

    currentMap.jumpTo({ bearing: currentHeading });
  };

  const enableCompass = async () => {
    if (!isMobileDevice()) {
      setStatus("Compass is available on mobile only.");
      return;
    }

    if (typeof window.DeviceOrientationEvent === "undefined") {
      setStatus("Device orientation is not supported.");
      return;
    }

    // iOS Safari requires permission, requested from a user gesture.
    if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
      try {
        const permission =
          await window.DeviceOrientationEvent.requestPermission();

        if (permission !== "granted") {
          setStatus("Compass permission denied.");
          return;
        }
      } catch (error) {
        console.error("Compass permission error:", error);
        setStatus("Unable to access compass.");
        return;
      }
    }

    headingRef.current = null;
    compassEnabledRef.current = true;

    mapRef.current?.dragRotate.disable();
    mapRef.current?.touchZoomRotate.disableRotation();

    window.addEventListener("deviceorientation", handleOrientation, true);

    setCompassEnabled(true);
    setStatus("Compass enabled");
  };

  const disableCompass = () => {
    compassEnabledRef.current = false;

    window.removeEventListener("deviceorientation", handleOrientation, true);

    headingRef.current = null;

    setHeading(null);
    setCompassEnabled(false);

    mapRef.current?.dragRotate.enable();
    mapRef.current?.touchZoomRotate.enableRotation();

    const currentMap = mapRef.current;

    if (currentMap) {
      currentMap.easeTo({ bearing: 0, duration: 300, essential: true });
    }

    setStatus("Compass disabled");
  };

  const toggleCompass = async () => {
    if (compassEnabledRef.current) {
      disableCompass();
    } else {
      await enableCompass();
    }
  };

  useEffect(() => {
    const map = new MapLibreMap({
      container: container.current,

      style: {
        version: 8,

        projection: { type: "globe" },

        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 19,
          },
        },

        layers: [{ id: "satellite", type: "raster", source: "satellite" }],

        sky: {
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
        },

        light: {
          anchor: "map",
          position: [1.5, 90, 80],
        },
      },

      center: [77.3331, 28.5445],
      zoom: 0,
      minZoom: 0,
      maxZoom: 17,
    });

    mapRef.current = map;

    /* Location markers start hidden and fade in when the fly-in stops. */
    const campusMarkers = [];

    const showCampusMarkers = () => {
      campusMarkers.forEach((el) =>
        el.classList.remove("pointer-events-none", "opacity-0"),
      );
    };

    map.on("load", () => {
      setStatus("Map loaded");

      const target = [77.3331, 28.5445];

      map.setProjection({ type: "globe" });

      // Give the globe a moment to render, then fly in.
      setTimeout(() => {
        // Reveal the markers once the fly-in finishes.
        map.once("moveend", () => {
          showCampusMarkers();
          // Do not render the portal network until the initial camera animation
          // has completely settled.
          setMapReady(true);
        });

        map.flyTo({
          center: target,
          zoom: 16,
          bearing: 55,
          speed: 5.0,
          curve: 1.2,
          easing(t) {
            return t;
          },
          essential: true,
        });
      }, 400);
    });

    const NS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(NS, "svg");

    svg.setAttribute(
      "class",
      "pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible",
    );

    // Shade outside the campus.
    const shade = document.createElementNS(NS, "path");
    shade.setAttribute("fill", "#05080d");
    shade.setAttribute("fill-opacity", "0.80");
    shade.setAttribute("fill-rule", "evenodd");
    svg.appendChild(shade);

    // Main campus polygon.
    const poly = document.createElementNS(NS, "polygon");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", "#ffffff");
    poly.setAttribute("stroke-width", "2");
    poly.setAttribute("stroke-linejoin", "round");
    svg.appendChild(poly);

    // Excluded polygon.
    const excludedPoly = document.createElementNS(NS, "polygon");
    excludedPoly.setAttribute("fill", "none");
    excludedPoly.setAttribute("stroke", "#ffffff50");
    excludedPoly.setAttribute("stroke-width", "2");
    excludedPoly.setAttribute("stroke-linejoin", "round");
    svg.appendChild(excludedPoly);

    map.getCanvasContainer().appendChild(svg);

    // Redraw on every render so polygons follow rotation/zoom.
    const drawPolygon = () => {
      const list = POLYGON.map((p) => map.project(p)).map(
        (p) => `${p.x},${p.y}`,
      );

      poly.setAttribute("points", list.join(" "));

      const excludedList = EXCLUDED_POLYGON.map((p) => map.project(p)).map(
        (p) => `${p.x},${p.y}`,
      );

      excludedPoly.setAttribute("points", excludedList.join(" "));

      const { clientWidth: w, clientHeight: h } = map.getContainer();
      const pad = 200;

      shade.setAttribute(
        "d",
        `
          M${-pad},${-pad}
          H${w + pad}
          V${h + pad}
          H${-pad}
          Z

          M${list.join(" L")} Z

          M${excludedList.join(" L")} Z
        `,
      );
    };

    map.on("render", drawPolygon);
    drawPolygon();

    /* ------------------------ Location markers ----------------------- */

    LOCATIONS.forEach((loc) => {
      const el = document.createElement("div");
      el.className =
        "campus-marker pointer-events-none flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-gray-300 bg-gray-500 text-white opacity-0 shadow-md transition-opacity duration-500";
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[loc.icon]}</svg>`;
      campusMarkers.push(el);
      markerEls.current.set(loc.id, el);

      const content = document.createElement("div");
      content.className = "font-sans text-sm text-slate-900";

      const title = document.createElement("div");
      title.className = "font-bold";
      title.textContent = loc.name;

      const mission = document.createElement("div");
      mission.className = "text-xs text-slate-600";
      mission.textContent = loc.mission;

      content.append(title, mission);

      const popup = new Popup({ offset: 18, closeButton: false }).setDOMContent(
        content,
      );

      const marker = new Marker({ element: el }).setLngLat([loc.lng, loc.lat]);

      if (onSelectRef.current) {
        el.addEventListener("click", () => onSelectRef.current?.(loc));
      } else {
        marker.setPopup(popup);
      }

      marker.addTo(map);
    });

    return () => {
      clearTimeout(timerRef.current);

      compassEnabledRef.current = false;

      window.removeEventListener("deviceorientation", handleOrientation, true);

      markerEls.current.clear();
      portalMarkersRef.current.forEach((marker) => marker.remove());
      portalMarkersRef.current.clear();
      portalLinkPathsRef.current.forEach((elements) => elements.forEach((el) => el.remove()));
      portalLinkPathsRef.current.clear();
      portalLinksSvgRef.current?.remove();
      portalLinksSvgRef.current = null;
      document.getElementById("cq-map-effects")?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render backend event portals as polished neon nodes and connect them with animated links.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const ownerColors = {
      red: "#ff3b3b",
      blue: "#3b82f6",
      neutral: "#a5afc2",
    };

    // Keep the portal network behind the markers but above the satellite imagery.
    if (!portalLinksSvgRef.current) {
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "cq-portal-links pointer-events-none absolute inset-0 h-full w-full overflow-visible");
      svg.style.pointerEvents = "none";

      const defs = document.createElementNS(NS, "defs");
      svg.appendChild(defs);
      map.getCanvasContainer().appendChild(svg);
      portalLinksSvgRef.current = svg;
    }

    const svg = portalLinksSvgRef.current;
    const NS = "http://www.w3.org/2000/svg";
    const current = portalLinkPathsRef.current;

    // Build a clean loop by sorting portals by angle around their centroid.
    // This gives a non-self-crossing ring instead of zig-zag lines across the map.
    const cx = portals.reduce((sum, p) => sum + p.longitude, 0) / (portals.length || 1);
    const cy = portals.reduce((sum, p) => sum + p.latitude, 0) / (portals.length || 1);
    const ordered = [...portals].sort(
      (a, b) =>
        Math.atan2(a.latitude - cy, a.longitude - cx) -
        Math.atan2(b.latitude - cy, b.longitude - cx),
    );

    const links = ordered.length > 2
      ? ordered.map((portal, index) => [portal, ordered[(index + 1) % ordered.length]])
      : [];

    const linkIds = new Set(links.map(([a, b]) => `${a.id}-${b.id}`));

    for (const [id, elements] of current) {
      if (!linkIds.has(id)) {
        elements.forEach((el) => el.remove());
        current.delete(id);
      }
    }

    const drawLinks = () => {
      const width = map.getContainer().clientWidth;
      const height = map.getContainer().clientHeight;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      links.forEach(([a, b]) => {
        const id = `${a.id}-${b.id}`;
        let elements = current.get(id);

        const start = map.project([a.longitude, a.latitude]);
        const end = map.project([b.longitude, b.latitude]);
        const fromColor = ownerColors[a.owner] || ownerColors.neutral;
        const toColor = ownerColors[b.owner] || ownerColors.neutral;

        if (!elements) {
          const glow = document.createElementNS(NS, "line");
          const core = document.createElementNS(NS, "line");
          const pulse = document.createElementNS(NS, "line");

          glow.setAttribute("stroke-width", "8");
          glow.setAttribute("stroke-linecap", "round");
          glow.setAttribute("stroke-opacity", "0.16");
          glow.setAttribute("filter", "url(#cq-link-glow)");

          core.setAttribute("stroke-width", "1.5");
          core.setAttribute("stroke-linecap", "round");
          core.setAttribute("stroke-opacity", "0.7");

          pulse.setAttribute("stroke", "#ffffff");
          pulse.setAttribute("stroke-width", "2.5");
          pulse.setAttribute("stroke-linecap", "round");
          pulse.setAttribute("stroke-dasharray", "1 38");
          pulse.setAttribute("stroke-opacity", "0.9");
          pulse.style.animation = "cq-link-flow 2.8s linear infinite";

          svg.append(glow, core, pulse);
          elements = [glow, core, pulse];
          current.set(id, elements);
        }

        elements.forEach((line) => {
          line.setAttribute("x1", start.x);
          line.setAttribute("y1", start.y);
          line.setAttribute("x2", end.x);
          line.setAttribute("y2", end.y);
        });

        const glow = elements[0];
        const core = elements[1];
        glow.setAttribute("stroke", fromColor);
        core.setAttribute("stroke", toColor === fromColor ? fromColor : fromColor);
        core.style.stroke = `url(#cq-gradient-${id})`;

        let gradient = document.getElementById(`cq-gradient-${id}`);
        if (!gradient) {
          const defs = svg.querySelector("defs");
          gradient = document.createElementNS(NS, "linearGradient");
          gradient.id = `cq-gradient-${id}`;
          gradient.setAttribute("gradientUnits", "userSpaceOnUse");
          defs.appendChild(gradient);
        }
        gradient.setAttribute("x1", start.x);
        gradient.setAttribute("y1", start.y);
        gradient.setAttribute("x2", end.x);
        gradient.setAttribute("y2", end.y);
        gradient.innerHTML = `<stop offset="0%" stop-color="${fromColor}"/><stop offset="100%" stop-color="${toColor}"/>`;
      });
    };

    if (!document.getElementById("cq-map-effects")) {
      const style = document.createElement("style");
      style.id = "cq-map-effects";
      style.textContent = `
        @keyframes cq-link-flow {
          from { stroke-dashoffset: 0; opacity: .15; }
          50% { opacity: .95; }
          to { stroke-dashoffset: -39; opacity: .15; }
        }
        @keyframes cq-portal-pulse {
          0%, 100% { transform: scale(1); opacity: .45; }
          50% { transform: scale(1.16); opacity: .08; }
        }
        @keyframes cq-portal-core {
          0%, 100% { box-shadow: 0 0 10px currentColor, 0 0 22px currentColor; }
          50% { box-shadow: 0 0 16px currentColor, 0 0 34px currentColor; }
        }
        .cq-portal-node { position: relative; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,.42); background: radial-gradient(circle at 50% 45%, rgba(255,255,255,.16), rgba(8,11,20,.96) 58%); color: #9ca3af; box-shadow: 0 0 12px currentColor, inset 0 0 10px rgba(255,255,255,.08); display: flex; align-items: center; justify-content: center; transition: transform .18s ease, filter .18s ease; }
        .cq-portal-node::before { content: ''; position: absolute; inset: -7px; border: 1px solid currentColor; border-radius: 50%; opacity: .25; animation: cq-portal-pulse 2.2s ease-in-out infinite; }
        .cq-portal-node::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; border: 1px solid currentColor; opacity: .35; animation: cq-portal-core 2.2s ease-in-out infinite; }
        .cq-portal-node:hover { transform: scale(1.12); filter: brightness(1.25); }
        .cq-portal-node svg { position: relative; z-index: 2; width: 19px; height: 19px; filter: drop-shadow(0 0 5px currentColor); }
        .cq-portal-node .cq-portal-count { position: absolute; right: -5px; bottom: -4px; z-index: 3; min-width: 16px; height: 16px; padding: 0 4px; border: 1px solid rgba(255,255,255,.28); border-radius: 999px; background: #080b14; color: white; font: 700 9px/14px sans-serif; text-align: center; }
      `;
      document.head.appendChild(style);
    }

    // Depth-sort markers by screen Y so lower (nearer) markers sit on top of
    // higher ones, with all portals above all location markers.
    const updateDepth = () => {
      LOCATIONS.forEach((loc) => {
        const el = markerEls.current.get(loc.id);
        if (!el) return;
        const y = Math.max(0, Math.round(map.project([loc.lng, loc.lat]).y));
      });
      portalMarkersRef.current.forEach((m) => {
        const y = Math.max(0, Math.round(map.project(m.getLngLat()).y));
      });
    };
    const onRender = () => {
      drawLinks();
      updateDepth();
    };

    const markerCurrent = portalMarkersRef.current;
    const nextIds = new Set(portals.map((portal) => String(portal.id)));

    for (const [id, marker] of markerCurrent) {
      if (!nextIds.has(id)) {
        marker.remove();
        markerCurrent.delete(id);
      }
    }

    // Portals with identical coordinates would stack exactly; fan them out by pixels.
    const groups = new Map();
    portals.forEach((p) => {
      const k = `${p.latitude.toFixed(5)}:${p.longitude.toFixed(5)}`;
      groups.set(k, [...(groups.get(k) || []), p.id]);
    });
    const offsetFor = (p) => {
      const ids = groups.get(`${p.latitude.toFixed(5)}:${p.longitude.toFixed(5)}`);
      if (ids.length < 2) return [0, 0];
      const i = ids.indexOf(p.id);
      const a = (i / ids.length) * Math.PI * 2;
      return [Math.cos(a) * 26, Math.sin(a) * 26];
    };

    portals.forEach((portal) => {
      const id = String(portal.id);
      let marker = markerCurrent.get(id);
      const color = ownerColors[portal.owner] || ownerColors.neutral;
      const total = portal.resonators?.total ?? 0;

      if (!marker) {
        // MapLibre owns the position/transform of the marker element, so the
        // styled node must be a CHILD of a bare wrapper. Styling the marker
        // element itself (position: relative, transform on hover/transition)
        // breaks its absolute positioning.
        const wrapper = document.createElement("div");
        const el = document.createElement("button");
        el.type = "button";
        el.className = "cq-portal-node";
        el.setAttribute("aria-label", portal.name);
        wrapper.appendChild(el);
        el.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            ${ICONS.tower}
          </svg>
          <span class="cq-portal-count">${total}/3</span>
        `;
        el.addEventListener("click", () => onSelectPortalRef.current?.(portal));
        marker = new Marker({ element: wrapper, anchor: "center", offset: offsetFor(portal) })
          .setLngLat([portal.longitude, portal.latitude])
          .addTo(map);
        markerCurrent.set(id, marker);
      } else {
        marker.setLngLat([portal.longitude, portal.latitude]);
        const count = marker.getElement().querySelector(".cq-portal-count");
        if (count) count.textContent = `${total}/3`;
      }

      const el = marker.getElement().querySelector(".cq-portal-node");
      el.style.color = color;
      el.style.borderColor = `${color}99`;
      el.title = `${portal.name} · ${total}/3 resonators`;
    });

    onRender();
    map.on("render", onRender);

    return () => {
      map.off("render", onRender);
    };
  }, [portals, mapReady]);

  // Tint markers whose riddle is solved.
  const solvedKey = solvedIds.join(",");
  useEffect(() => {
    const solved = new Set(solvedIds);

    markerEls.current.forEach((el, id) => {
      const on = solved.has(id);
      el.classList.toggle("bg-red-600", on);
      el.classList.toggle("border-red-300", on);
      el.classList.toggle("bg-gray-500", !on);
      el.classList.toggle("border-gray-300", !on);
    });
  }, [solvedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const latlng = point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : "";

  const lnglat = point
    ? `[${point.lng.toFixed(6)}, ${point.lat.toFixed(6)}]`
    : "";

  const handleCopy = async (kind, text) => {
    const ok = await copyText(text);
    if (!ok) return;

    setCopied(kind);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="relative h-screen w-full">
      {/* MAP */}
      <div ref={container} className="h-full w-full" />

      {/* COMPASS BUTTON */}
      <button
        type="button"
        onClick={toggleCompass}
        aria-label={compassEnabled ? "Disable compass" : "Enable compass"}
        title={compassEnabled ? "Disable compass" : "Enable compass"}
        className={`absolute bottom-44 right-4 z-[100] h-12 w-12 cursor-pointer items-center justify-center rounded-full p-0 text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-[8px] ${
          isMobileDevice() ? "flex" : "hidden"
        } ${
          compassEnabled
            ? "border-2 border-white bg-[rgba(46,158,91,0.95)]"
            : "border border-white/35 bg-[rgba(15,20,25,0.9)]"
        }`}
      >
        <span
          className="flex h-7 w-7 select-none items-center justify-center text-xl font-bold transition-transform duration-75 ease-linear"
          style={{ transform: `rotate(${heading !== null ? -heading : 0}deg)` }}
        >
          N
        </span>
      </button>

      {/* COORDINATES PANEL */}
      {/* <div className="absolute bottom-3 left-3 z-[100] max-w-[calc(100%-24px)] rounded-lg bg-[rgba(15,20,25,0.85)] px-3 py-2.5 font-sans text-sm text-white">
        {point ? (
          <>
            <div className="mb-2 tabular-nums">
              <div>Lat: {point.lat.toFixed(6)}</div>
              <div>Lng: {point.lng.toFixed(6)}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className={btnClass(copied === "latlng")}
                onClick={() => handleCopy("latlng", latlng)}
              >
                {copied === "latlng" ? "Copied" : "Copy lat, lng"}
              </button>

              <button
                className={btnClass(copied === "lnglat")}
                onClick={() => handleCopy("lnglat", lnglat)}
              >
                {copied === "lnglat" ? "Copied" : "Copy [lng, lat]"}
              </button>
            </div>
          </>
        ) : (
          <span />
        )}
      </div> */}
    </div>
  );
}