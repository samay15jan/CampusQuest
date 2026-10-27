import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLocation } from "react-router-dom";

import Presence from "../motion/Presence.jsx";
import AmityMap from "../map/AmityMap.jsx";
import ScoreBar from "../dashboard/ScoreBar.jsx";
import BottomNav from "../dashboard/BottomNav.jsx";
import IntelPanel from "../intel/IntelPanel.jsx";
import PortalDetail from "../intel/PortalDetail.jsx";
import CaptureFlow from "../capture/CaptureFlow.jsx";
import RiddleFlow from "../riddle/RiddleFlow.jsx";
import useSolved from "../riddle/useSolved.js";
import PlayerProfile from "../profile/PlayerProfile.jsx";

import { teamAccent } from "../../theme.js";
import { getCurrentEvent } from "../../api/event.js";
import { getPortal, getPortals } from "../../api/portals.js";
import { getActivity, getHeatmap } from "../../api/intel.js";
import { getTodayRiddles } from "../../api/riddles.js";
import { withAnswered } from "../riddle/answeredStore.js";
import useUserLocation from "../map/useUserLocation.js";
import { ALLOWED_RANGE, haversine, portalCoordinates } from "../capture/verify.js";

export default function DashboardScreen() {
  const location = useLocation();
  const { account } = useAuth();

  const team =
    account?.profile?.faction ??
    account?.faction ??
    location.state?.team ??
    "red";

  const accent = teamAccent(team);

  const [view, setView] = useState("map"); // "map" | "intel" | "profile"
  const [selected, setSelected] = useState(null);
  const [capturing, setCapturing] = useState(null);

  const [riddlesOpen, setRiddlesOpen] = useState(false);
  const { solvedIds, markSolved } = useSolved();
  const [riddleLoc, setRiddleLoc] = useState(null);

  const [layers, setLayers] = useState({
    portals: true,
    links: true,
    territories: true,
  });

  // true while today's daily riddles still have unsolved ones (drives the highlight)
  const [riddlesPending, setRiddlesPending] = useState(false);
  const [resonators, setResonators] = useState(0); // available to deploy
  const { position } = useUserLocation();
  const [event, setEvent] = useState(null);
  const [portals, setPortals] = useState([]);
  const [activity, setActivity] = useState([]);
  const [heatmap, setHeatmap] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadGameState = async () => {
      try {
        const [eventData, portalData, activityData, heatmapData] = await Promise.all([
          getCurrentEvent(),
          getPortals(),
          getActivity(20),
          getHeatmap(24),
        ]);

        if (!mounted) return;

        setEvent(eventData);
        setPortals(portalData);
        setActivity(activityData);
        setHeatmap(heatmapData);
      } catch (error) {
        console.error("Failed to load game state", error);
      }
    };

    loadGameState();

    const id = window.setInterval(loadGameState, 30_000);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  // Refresh daily-riddle status on load and whenever the riddle flow closes.
  useEffect(() => {
    if (riddlesOpen || capturing) return;
    let active = true;
    getTodayRiddles()
      .then((data) => {
        const list = withAnswered(data);
        if (!active) return;
        setRiddlesPending(list.some((r) => !r.answered));
        setResonators(data?.available_resonators ?? 0);
      })
      .catch(() => { });
    return () => { active = false; };
  }, [riddlesOpen, capturing]);

  // Nearest portal, and whether the player is within range of it.
  const nearest = position
    ? portals.reduce((best, p) => {
      const c = portalCoordinates(p);
      if (!c) return best;
      const d = haversine({ lat: position.lat, lng: position.lng }, c);
      return !best || d < best.d ? { portal: p, d } : best;
    }, null)
    : null;

  const scanTarget = nearest?.portal ?? portals[0] ?? null;
  const canScan = !!scanTarget;

  // Tapping the active tab again (other than Map) returns to the plain map.
  const onNav = (id) => {
    setView(id === view && id !== "map" ? "map" : id);
  };

  const openPortal = async (portal) => {
    setView("intel");
    setSelected(portal);

    try {
      const detail = await getPortal(portal.id);
      setSelected(detail);
    } catch (error) {
      console.error("Failed to load portal detail", error);
    }
  };

  return (
    <main className="relative h-dvh overflow-hidden bg-ink text-white">
      {/* Map is always mounted and full-screen. Everything else overlays it.
          z-0 makes this a stacking context, so the map's own floating buttons
          (compass, locate-me: z-[100]) stay beneath the Intel/Profile screens. */}
      <div className="absolute inset-0 z-0">
        <AmityMap
          portals={portals}
          heatmap={heatmap}
          onSelectPortal={openPortal}
          onSelectLocation={setRiddleLoc}
          solvedIds={solvedIds}
          showControls={view === "map" && !selected && !capturing && !riddlesOpen && !riddleLoc}
        />
      </div>

      <ScoreBar event={event} />

      {/* Daily riddles */}
      {event?.event?.status === "active" && event?.game_open && (
        <button
          type="button"
          onClick={() => setRiddlesOpen(true)}
          className={`absolute inset-x-2 top-[10rem] z-10 flex items-center gap-3 rounded-xl border bg-[#0b0d16]/95 p-3 text-left shadow-lg backdrop-blur ${riddlesPending ? "riddle-pending" : "border-white/10"}`}
        >
          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10">
            <img
              src="/other/riddle.jpg"
              alt=""
              className="h-full w-full object-cover"
            />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-bold">
              Daily Riddles
            </span>
          </span>

          <span className="text-mute">→</span>
        </button>
      )}

      {/* Intel */}
      <Presence show={view === "intel"} anim="slide-up" className="z-10">
        <IntelPanel
          portals={portals}
          activity={activity}
          onSelect={openPortal}
          accent={accent}
          layers={layers}
          onLayersChange={setLayers}
        />
      </Presence>

      {/* Profile */}
      <Presence show={view === "profile"} anim="fade" className="z-[15]">
        <PlayerProfile
          account={account}
          team={team}
          onSettings={() =>
            console.log("TODO: open settings / sign out")
          }
        />
      </Presence>

      {/* Bottom navigation */}
      <BottomNav
        view={view}
        onChange={onNav}
        accent={accent}
        scanEnabled={canScan}
        onScan={() => canScan && setCapturing(scanTarget)}
      />

      {/* Portal details */}
      <Presence show={!!selected} anim="slide-right" className="z-30">
        {selected && <PortalDetail
          portal={selected}
          accent={accent}
          onBack={() => setSelected(null)}
          onNavigate={(p) =>
            console.log("TODO: start navigation to", p.name)
          }
        />}
      </Presence>

      {/* Daily riddles button flow */}
      <Presence show={riddlesOpen} anim="slide-up" className="z-50">
        <RiddleFlow
          accent={accent}
          onClose={() => setRiddlesOpen(false)}
          onComplete={(res) => {
            console.log("Daily riddle completed", res);
            setRiddlesOpen(false);
          }}
        />
      </Presence>

      {/* Map/location riddle flow */}
      <Presence show={!!riddleLoc} anim="slide-up" className="z-50">
        {riddleLoc && <RiddleFlow
          location={riddleLoc}
          accent={accent}
          solved={solvedIds.includes(riddleLoc.id)}
          onSolved={markSolved}
          onClose={() => setRiddleLoc(null)}
          onComplete={(res) => {
            console.log("Captured via riddle flow", res);
            setRiddleLoc(null);
          }}
        />}
      </Presence>

      {/* Portal capture */}
      <Presence show={!!capturing} anim="slide-up" className="z-40">
        {capturing && <CaptureFlow
          portal={capturing}
          accent={accent}
          onClose={() => setCapturing(null)}
          onComplete={(res) => {
            console.log("Captured", res);
            setCapturing(null);
          }}
        />}
      </Presence>
    </main>
  );
}