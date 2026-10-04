import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AmityMap from "../map/AmityMap.jsx";
import ScoreBar from "../dashboard/ScoreBar.jsx";
import CurrentPortal from "../dashboard/CurrentPortal.jsx";
import BottomNav from "../dashboard/BottomNav.jsx";
import IntelPanel from "../intel/IntelPanel.jsx";
import PortalDetail from "../intel/PortalDetail.jsx";
import CaptureFlow from "../capture/CaptureFlow.jsx";
import RiddleFlow from "../riddle/RiddleFlow.jsx";
import PlayerProfile from "../profile/PlayerProfile.jsx";
import LeaderboardScreen from "../leaderboard/LeaderboardScreen.jsx";
import { teamAccent } from "../../theme.js";
import { getCurrentEvent } from "../../api/event.js";
import { getPortal, getPortals } from "../../api/portals.js";
import { getResonators } from "../../api/account.js";

export default function DashboardScreen() {
  const location = useLocation();
  const team = location.state?.team ?? "red";
  const accent = teamAccent(team);

  const [view, setView] = useState("map"); // "map" | "intel" | "profile"
  const [selected, setSelected] = useState(null); // portal shown on the Intel detail page
  const [riddlesOpen, setRiddlesOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false); // leaderboard page
  const [capturing, setCapturing] = useState(null); // portal being captured
  const [layers, setLayers] = useState({ portals: true, links: true, territories: true });
  const [event, setEvent] = useState(null);
  const [portals, setPortals] = useState([]);
  const [resonators, setResonators] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadGameState = async () => {
      try {
        const [eventData, portalData] = await Promise.all([
          getCurrentEvent(),
          getPortals(),
          getResonators(),
        ]);
        if (!mounted) return;
        setEvent(eventData);
        setPortals(portalData);
        setResonators(resonatorData);
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

  // Tapping the active tab again (other than Map) closes it and returns to the plain map.
  const onNav = (id) => setView(id === view && id !== "map" ? "map" : id);

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
      {/* The map is always mounted and always full-screen; everything else overlays it. */}
      <div className="absolute inset-0"><AmityMap portals={portals} onSelectPortal={openPortal} /></div>

      <ScoreBar event={event} />

      {event?.event?.status === "active" && event?.game_open && (
        <button
          type="button"
          onClick={() => setRiddlesOpen(true)}
          className="absolute inset-x-2 top-[13.25rem] z-10 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b0d16]/95 p-3 text-left shadow-lg backdrop-blur"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-lg">?</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-bold">Daily Riddles</span>
            <span className="mt-0.5 block text-xs text-mute">Solve today's riddles to earn resonators and XP.</span>
          </span>
          <span className="text-mute">→</span>
        </button>
      )}

      {event?.event?.status === "active" && event?.game_open && resonators && (
        <div className="absolute inset-x-2 top-[17.9rem] z-10 flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0d16]/95 px-3 py-2.5 shadow-lg backdrop-blur">
          <span className="text-xs text-mute">Resonators available</span>
          <span className="font-display text-sm font-bold">{resonators.available}</span>
        </div>
      )}

      {view === "map" && portals[0] && <CurrentPortal portal={portals[0]} onClick={() => openPortal(portals[0])} />}

      {view === "intel" && (
        <IntelPanel portals={portals} onSelect={openPortal} accent={accent} layers={layers} onLayersChange={setLayers} />
      )}

      {view === "profile" && (
        <PlayerProfile
          team={team}
          onOpenLeaderboard={() => setBoardOpen(true)}
          onSettings={() => console.log("TODO: open settings / sign out")}
        />
      )}

      <BottomNav view={view} onChange={onNav} accent={accent} onScan={() => portals[0] && setCapturing(portals[0])} />

      {selected && (
        <PortalDetail
          portal={selected}
          accent={accent}
          onBack={() => setSelected(null)}
          onNavigate={(p) => console.log("TODO: start navigation to", p.name)}
        />
      )}

      {boardOpen && <LeaderboardScreen accent={accent} onBack={() => setBoardOpen(false)} />}

      {riddlesOpen && (
        <RiddleFlow
          accent={accent}
          onClose={() => setRiddlesOpen(false)}
        />
      )}

      {capturing && (
        <CaptureFlow
          portal={capturing}
          accent={accent}
          onClose={() => setCapturing(null)}
          availableResonators={resonators?.available ?? 0}
          onComplete={(res) => {
            console.log("Captured", res);
            setCapturing(null);
          }}
        />
      )}
    </main>
  );
}