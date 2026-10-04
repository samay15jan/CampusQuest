import { useState } from "react";
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
import { PORTALS } from "../../data/mock.js";
import { teamAccent } from "../../theme.js";

export default function DashboardScreen() {
  const location = useLocation();
  const { account } = useAuth();
  const team = account?.profile?.faction ?? account?.faction ?? location.state?.team ?? "red";
  const accent = teamAccent(team);

  const [view, setView] = useState("map"); // "map" | "intel" | "profile"
  const [selected, setSelected] = useState(null); // portal shown on the Intel detail page
  const { solvedIds, markSolved } = useSolved();
  const [riddleLoc, setRiddleLoc] = useState(null); // map location whose riddle flow is open
  const [boardOpen, setBoardOpen] = useState(false); // leaderboard page
  const [capturing, setCapturing] = useState(null); // portal being captured
  const [layers, setLayers] = useState({ portals: true, links: true, territories: true });

  // Tapping the active tab again (other than Map) closes it and returns to the plain map.
  const onNav = (id) => setView(id === view && id !== "map" ? "map" : id);

  const openPortal = (portal) => {
    setView("intel");
    setSelected(portal);
  };

  return (
    <main className="relative h-dvh overflow-hidden bg-ink text-white">
      {/* The map is always mounted and always full-screen; everything else overlays it. */}
      <div className="absolute inset-0"><AmityMap onSelectLocation={setRiddleLoc} solvedIds={solvedIds} /></div>

      <ScoreBar />

      {view === "map" && <CurrentPortal portal={PORTALS[0]} onClick={() => openPortal(PORTALS[0])} />}

      {view === "intel" && (
        <IntelPanel portals={PORTALS} onSelect={setSelected} accent={accent} layers={layers} onLayersChange={setLayers} />
      )}

      {view === "profile" && (
        <PlayerProfile
          account={account}
          team={team}
          onOpenLeaderboard={() => setBoardOpen(true)}
          onSettings={() => console.log("TODO: open settings / sign out")}
        />
      )}

      <BottomNav view={view} onChange={onNav} accent={accent} onScan={() => setCapturing(PORTALS[0])} />

      {selected && (
        <PortalDetail
          portal={selected}
          accent={accent}
          onBack={() => setSelected(null)}
          onNavigate={(p) => console.log("TODO: start navigation to", p.name)}
        />
      )}

      {boardOpen && <LeaderboardScreen accent={accent} onBack={() => setBoardOpen(false)} />}

      {riddleLoc && (
        <RiddleFlow
          location={riddleLoc}
          accent={accent}
          solved={solvedIds.includes(riddleLoc.id)}
          onSolved={markSolved}
          onClose={() => setRiddleLoc(null)}
          onComplete={(res) => {
            // TODO: save capture + XP (riddle + capture) to Firestore
            console.log("Captured via riddle flow", res);
            setRiddleLoc(null);
          }}
        />
      )}

      {capturing && (
        <CaptureFlow
          portal={capturing}
          accent={accent}
          onClose={() => setCapturing(null)}
          onComplete={(res) => {
            // TODO: save capture + resonator deployment to Firestore (res.photo is a JPEG data URL)
            console.log("Captured", res);
            setCapturing(null);
          }}
        />
      )}
    </main>
  );
}