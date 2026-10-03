import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, Popup } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

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

/*
 * CampusQuest locations
 * (from CampusQuest_Final_Locations_Missions_Riddles.docx).
 * `icon` is a key into ICONS below.
 */
const LOCATIONS = [
  { id: 1, icon: "mic", name: "H Block Centre", mission: "The Spotlight", lat: 28.546582, lng: 77.334419 },
  { id: 2, icon: "helipad", name: "Helipad", mission: "The Landing Zone", lat: 28.544243, lng: 77.334365 },
  { id: 3, icon: "palm", name: "Palm Court", mission: "Palm Pursuit", lat: 28.543837, lng: 77.333223 },
  { id: 4, icon: "ball", name: "Sports Complex Room", mission: "The Arsenal", lat: 28.543981, lng: 77.331631 },
  { id: 5, icon: "coffee", name: "N Block Coffee", mission: "The Odd One Out", lat: 28.547175, lng: 77.333267 },
  { id: 6, icon: "book", name: "Library", mission: "The False Mall", lat: 28.543964, lng: 77.33465 },
  { id: 7, icon: "gate", name: "Gate No. 2", mission: "The Balli Route", lat: 28.541924, lng: 77.333188 },
  { id: 8, icon: "food", name: "I Block Mess", mission: "The Crispy Secret", lat: 28.54301, lng: 77.333489 },
  { id: 9, icon: "burger", name: "Megabyte", mission: "The Mega Feast", lat: 28.544999, lng: 77.334564 },
  { id: 10, icon: "truck", name: "Rara's Food Truck", mission: "The Fry Trail", lat: 28.545003, lng: 77.334977 },
  { id: 11, icon: "paddle", name: "Arcadia Pickleball Court", mission: "The Lost Realm", lat: 28.543347, lng: 77.332344 },
  { id: 12, icon: "bowl", name: "Cafedia", mission: "The Momo Hunt", lat: 28.543347, lng: 77.332344 },
  { id: 13, icon: "mic", name: "J2 Block Entrance", mission: "The Debate Ground", lat: 28.54326, lng: 77.332735 },
  { id: 14, icon: "fruit", name: "Hidden Fruit Shop", mission: "The Hidden Harvest", lat: 28.546266, lng: 77.334563 },
  { id: 15, icon: "bank", name: "The Bank", mission: "The Vault", lat: 28.545154, lng: 77.332206 },
];

/* Marker icons: 24x24 stroke icons, keyed by LOCATIONS[].icon. */
const ICONS = {
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
  helipad: '<circle cx="12" cy="12" r="10"/><path d="M9 7v10M15 7v10M9 12h6"/>',
  palm: '<path d="M12 22V11M12 11C9 9 6 10 4 13M12 11c3-2 6-1 8 2M12 11C11 8 9 6 6 6M12 11c1-3 3-5 6-5"/>',
  ball: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20"/>',
  coffee: '<path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM6 2v3M10 2v3M14 2v3"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  gate: '<path d="M5 21V9a7 7 0 0 1 14 0v12M3 21h18M12 2v19"/>',
  food: '<path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zM21 15v7"/>',
  burger: '<path d="M4 11a8 8 0 0 1 16 0zM3 15h18M5 19h14"/>',
  truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  paddle: '<circle cx="12" cy="9" r="6"/><path d="M12 15v7M10 22h4"/>',
  bowl: '<path d="M3 12h18a9 9 0 0 1-18 0zM8 4c0 2 2 2 2 4M14 4c0 2 2 2 2 4"/>',
  fruit: '<path d="M12 7c-1-3-4-3-5-1-2 3-1 9 2 12 1 1 2 1 3 0 1 1 2 1 3 0 3-3 4-9 2-12-1-2-4-2-5 1zM12 7c0-2 1-4 3-5"/>',
  bank: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z"/>',
};

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

export default function AmityMap() {
  const container = useRef(null);

  const mapRef = useRef(null);
  const timerRef = useRef(null);

  const compassEnabledRef = useRef(false);
  const headingRef = useRef(null);

  const [point, setPoint] = useState(null);
  const [copied, setCopied] = useState(null);
  const [status, setStatus] = useState("Loading map...");
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [heading, setHeading] = useState(null);

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
        map.once("moveend", showCampusMarkers);

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

      new Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map);
    });

    return () => {
      clearTimeout(timerRef.current);

      compassEnabledRef.current = false;

      window.removeEventListener("deviceorientation", handleOrientation, true);

      map.remove();
      mapRef.current = null;
    };
  }, []);

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