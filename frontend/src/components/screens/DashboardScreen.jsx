import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLocation } from "react-router-dom";

import AmityMap from "../map/AmityMap.jsx";
import ScoreBar from "../dashboard/ScoreBar.jsx";
import CurrentPortal from "../dashboard/CurrentPortal.jsx";
import BottomNav from "../dashboard/BottomNav.jsx";
import IntelPanel from "../intel/IntelPanel.jsx";
import PortalDetail from "../intel/PortalDetail.jsx";
import CaptureFlow from "../capture/CaptureFlow.jsx";
import RiddleFlow from "../riddle/RiddleFlow.jsx";
import useSolved from "../riddle/useSolved.js";
import PlayerProfile from "../profile/PlayerProfile.jsx";
import LeaderboardScreen from "../leaderboard/LeaderboardScreen.jsx";

import { teamAccent } from "../../theme.js";
import { getCurrentEvent } from "../../api/event.js";
import { getPortal, getPortals } from "../../api/portals.js";

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
  const [boardOpen, setBoardOpen] = useState(false);
  const [capturing, setCapturing] = useState(null);

  const [riddlesOpen, setRiddlesOpen] = useState(false);
  const { solvedIds, markSolved } = useSolved();
  const [riddleLoc, setRiddleLoc] = useState(null);

  const [layers, setLayers] = useState({
    portals: true,
    links: true,
    territories: true,
  });

  const [event, setEvent] = useState(null);
  const [portals, setPortals] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadGameState = async () => {
      try {
        const [eventData, portalData] = await Promise.all([
          getCurrentEvent(),
          getPortals(),
        ]);

        if (!mounted) return;

        setEvent(eventData);
        setPortals(portalData);
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
      {/* Map is always mounted and full-screen. Everything else overlays it. */}
      <div className="absolute inset-0">
        <AmityMap
          portals={portals}
          onSelectPortal={openPortal}
          onSelectLocation={setRiddleLoc}
          solvedIds={solvedIds}
        />
      </div>

      <ScoreBar event={event} />

      {/* Daily riddles */}
      {event?.event?.status === "active" && event?.game_open && (
        <button
          type="button"
          onClick={() => setRiddlesOpen(true)}
          className="absolute inset-x-2 top-[10rem] z-10 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b0d16]/95 p-3 text-left shadow-lg backdrop-blur"
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

      {/* Current portal */}
      {view === "map" && portals[0] && (
        <CurrentPortal
          portal={portals[0]}
          onClick={() => openPortal(portals[0])}
        />
      )}

      {/* Intel */}
      {view === "intel" && (
        <IntelPanel
          portals={portals}
          onSelect={openPortal}
          accent={accent}
          layers={layers}
          onLayersChange={setLayers}
        />
      )}

      {/* Profile */}
      {view === "profile" && (
        <PlayerProfile
          account={account}
          team={team}
          onOpenLeaderboard={() => setBoardOpen(true)}
          onSettings={() =>
            console.log("TODO: open settings / sign out")
          }
        />
      )}

      {/* Bottom navigation */}
      <BottomNav
        view={view}
        onChange={onNav}
        accent={accent}
        onScan={() => portals[0] && setCapturing(portals[0])}
      />

      {/* Portal details */}
      {selected && (
        <PortalDetail
          portal={selected}
          accent={accent}
          onBack={() => setSelected(null)}
          onNavigate={(p) =>
            console.log("TODO: start navigation to", p.name)
          }
        />
      )}

      {/* Leaderboard */}
      {boardOpen && (
        <LeaderboardScreen
          accent={accent}
          onBack={() => setBoardOpen(false)}
        />
      )}

      {/* Daily riddles button flow */}
      {riddlesOpen && (
        <RiddleFlow
          accent={accent}
          onClose={() => setRiddlesOpen(false)}
          onComplete={(res) => {
            console.log("Daily riddle completed", res);
            setRiddlesOpen(false);
          }}
        />
      )}

      {/* Map/location riddle flow */}
      {riddleLoc && (
        <RiddleFlow
          location={riddleLoc}
          accent={accent}
          solved={solvedIds.includes(riddleLoc.id)}
          onSolved={markSolved}
          onClose={() => setRiddleLoc(null)}
          onComplete={(res) => {
            console.log("Captured via riddle flow", res);
            setRiddleLoc(null);
          }}
        />
      )}

      {/* Portal capture */}
      {capturing && (
        <CaptureFlow
          portal={capturing}
          accent={accent}
          onClose={() => setCapturing(null)}
          onComplete={(res) => {
            console.log("Captured", res);
            setCapturing(null);
          }}
        />
      )}
    </main>
  );
}