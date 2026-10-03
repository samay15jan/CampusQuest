import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

/* ---------- team themes ---------- */
const TEAMS = {
  red: {
    name: "Red Team",
    tagline: "Passion. Control. Unity.",
    accent: "#ff3b3b",
    glow: "rgba(255,59,59,0.45)",
    wash: "radial-gradient(120% 60% at 0% 0%, rgba(255,40,40,0.28), transparent 60%), linear-gradient(180deg,#14070a,#07080d 60%)",
    button: "linear-gradient(90deg,#8a1521,#d42a36)",
  },
  blue: {
    name: "Blue Team",
    tagline: "Strategy. Progress. Change.",
    accent: "#2f7bff",
    glow: "rgba(47,123,255,0.5)",
    wash: "radial-gradient(120% 60% at 0% 0%, rgba(30,100,255,0.3), transparent 60%), linear-gradient(180deg,#060d1c,#05070d 60%)",
    button: "linear-gradient(90deg,#0a5cff,#1f7bff)",
  },
};

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

const AVATARS = [
  { id: "blue1", src: "/avatars/blue1.jpg", team: "blue" },
  { id: "blue2", src: "/avatars/blue2.jpg", team: "blue" },
  { id: "blue3", src: "/avatars/blue3.jpg", team: "blue" },
  { id: "blue4", src: "/avatars/blue4.jpg", team: "blue" },
  { id: "red1", src: "/avatars/red1.jpg", team: "red" },
  { id: "red2", src: "/avatars/red2.jpg", team: "red" },
  { id: "red3", src: "/avatars/red3.jpg", team: "red" },
  { id: "red4", src: "/avatars/red4.jpg", team: "red" },
];

function AvatarArt({ kind, accent }) {
  const skin = "#1b1d27";
  const eye = { fill: accent };
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`bg-${kind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2d3a" />
          <stop offset="1" stopColor="#0c0d14" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#bg-${kind})`} />
      <path d="M8 100c2-20 18-28 42-28s40 8 42 28Z" fill="#0f1017" stroke={accent} strokeOpacity=".5" />
      {kind === "hood" && (<>
        <path d="M22 78C18 40 32 14 50 14s32 26 28 64c-8-8-48-8-56 0Z" fill="#0a0b10" stroke={accent} strokeOpacity=".7" />
        <path d="M34 48c4-8 28-8 32 0 0 14-8 22-16 22s-16-8-16-22Z" fill={skin} />
        <rect x="38" y="50" width="8" height="3" rx="1.5" {...eye} /><rect x="54" y="50" width="8" height="3" rx="1.5" {...eye} />
      </>)}
      {kind === "spike" && (<>
        <ellipse cx="50" cy="52" rx="19" ry="23" fill={skin} />
        <path d="M30 46 26 22l14 10 6-16 8 14 12-10-2 22c-8-8-28-8-34 0Z" fill="#090a0f" stroke={accent} strokeOpacity=".7" />
        <circle cx="42" cy="54" r="2.4" {...eye} /><circle cx="58" cy="54" r="2.4" {...eye} />
      </>)}
      {kind === "cap" && (<>
        <ellipse cx="50" cy="55" rx="19" ry="22" fill={skin} />
        <path d="M28 46c0-18 10-26 22-26s22 8 22 26Z" fill="#0a0b10" stroke={accent} strokeOpacity=".7" />
        <path d="M26 46h52l6 4H26Z" fill="#0a0b10" />
        <rect x="40" y="56" width="6" height="2.5" rx="1.2" fill="#8b8f9c" /><rect x="55" y="56" width="6" height="2.5" rx="1.2" fill="#8b8f9c" />
      </>)}
      {kind === "helmet" && (<>
        <path d="M26 66c-4-30 6-48 24-48s28 18 24 48c-6 6-42 6-48 0Z" fill="#0d0e14" stroke={accent} strokeOpacity=".8" />
        <path d="M32 46h36l-4 12H36Z" fill={accent} fillOpacity=".85" />
      </>)}
      {kind === "bob" && (<>
        <path d="M24 70c-6-30 0-52 26-52s32 22 26 52c-6-14-46-14-52 0Z" fill="#090a0f" stroke={accent} strokeOpacity=".7" />
        <ellipse cx="50" cy="54" rx="17" ry="20" fill={skin} />
        <path d="M33 42c10 2 24 0 34-6-2-12-10-16-17-16s-15 4-17 22Z" fill="#090a0f" />
        <circle cx="43" cy="55" r="2.2" {...eye} /><circle cx="58" cy="55" r="2.2" {...eye} />
      </>)}
      {kind === "mask" && (<>
        <path d="M28 62c-4-26 4-44 22-44s26 18 22 44c-6 8-38 8-44 0Z" fill="#c9ccd6" fillOpacity=".12" stroke="#c9ccd6" strokeOpacity=".5" />
        <path d="M34 48h32l-3 10H37Z" fill="#0a0b10" stroke={accent} />
        <path d="M38 53h24" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      </>)}
      {kind === "shades" && (<>
        <ellipse cx="50" cy="55" rx="19" ry="22" fill={skin} />
        <path d="M28 46c0-16 10-24 22-24s22 8 22 24c-10-6-34-6-44 0Z" fill="#0a0b10" stroke={accent} strokeOpacity=".7" />
        <rect x="34" y="52" width="14" height="8" rx="3" fill={accent} fillOpacity=".75" /><rect x="52" y="52" width="14" height="8" rx="3" fill={accent} fillOpacity=".75" />
      </>)}
      {kind === "long" && (<>
        <path d="M22 88C14 50 24 16 50 16s36 34 28 72c-4-20-8-26-8-36H30c0 10-4 16-8 36Z" fill="#090a0f" stroke={accent} strokeOpacity=".7" />
        <ellipse cx="50" cy="52" rx="16" ry="20" fill={skin} />
        <path d="M34 44c8-10 24-10 32 0-8-2-24-2-32 0Z" fill="#090a0f" />
        <circle cx="43" cy="54" r="2.2" {...eye} /><circle cx="58" cy="54" r="2.2" {...eye} />
      </>)}
    </svg>
  );
}


function Field({ icon, label, optional, hint, children, count, max }) {
  return (
    <div className="mt-6">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} className="mt-0.5 shrink-0 text-[color:var(--accent)]" aria-hidden="true">{icon}</svg>
        <div>
          <p className="font-display text-[13px] font-bold uppercase tracking-wide">
            {label} {optional && <span className="text-[10px] font-normal text-mute">(Optional)</span>}
          </p>
          <p className="text-xs leading-4 text-mute">{hint}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
      <p className="mt-1 text-right text-xs text-mute">{count} / {max}</p>
    </div>
  );
}

const inputBase =
  "h-12 w-full rounded-lg border bg-[#07080d]/80 px-4 text-[15px] text-white placeholder:text-mute/60 outline-none transition focus:border-[color:var(--accent)] focus:shadow-[0_0_14px_var(--glow)]";

/* ---------- screen ---------- */
export default function ProfileScreen({ team: teamProp }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Team comes from FactionScreen: navigate("/profile", { state: { team: "red" | "blue" } })
  const teamKey = teamProp ?? location.state?.team ?? "red";
  const team = TEAMS[teamKey] ?? TEAMS.red;

  const [avatar, setAvatar] = useState(`${teamKey}1`);
  const [username, setUsername] = useState(() => '');
  const [bio, setBio] = useState("");

  const usernameValid = useMemo(() => /^[a-z0-9_]{3,16}$/.test(username), [username]);
  // TODO: check username uniqueness against your database before enabling Continue.

  const onContinue = () => {
    if (!usernameValid) return;
    // TODO: save { uid: user.uid, team: teamKey, avatar, username, displayName, bio } to Firestore.
    navigate("/dashboard", { state: { team: teamKey } });
  };

  return (
    <main
      className="relative min-h-dvh overflow-hidden bg-ink pb-[max(2rem,env(safe-area-inset-bottom))] text-white"
      style={{ "--accent": team.accent, "--glow": team.glow, background: team.wash }}
    >
      {/* top bar */}
      <header className="mt-10 relative flex items-center justify-between px-5">
        <div className="flex items-center gap-4">
        </div>
      </header>

      {/* team banner */}
      <section className="relative mt-5 flex items-center gap-5 px-5">
        <svg viewBox="0 0 120 110" className="h-28 w-32 shrink-0 opacity-70" aria-hidden="true" style={{ color: team.accent }}>
          {/* placeholder emblem: replace with your lion / wolf artwork */}
          <path d="M60 6 100 28l-6 44-34 34-34-34-6-44Z" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="2" />
          <path d="M60 30 80 44l-4 22-16 16-16-16-4-22Z" fill="currentColor" fillOpacity=".4" />
        </svg>
        <div>
          <h2 className="font-display text-2xl font-black uppercase tracking-wider" style={{ color: team.accent }}>{team.name}</h2>
          <span className="mt-1 inline-block rounded-md border px-3 py-0.5 text-xs uppercase tracking-wider" style={{ borderColor: team.accent }}>Selected</span>
          <p className="mt-2 text-[15px] text-slate-200">{team.tagline}</p>
        </div>
      </section>

      {/* heading */}
      <section className="relative mt-6 px-5">
        <h1 className="font-display text-[26px] font-black italic uppercase tracking-wide">Set up your agent</h1>
        <p className="mt-1 text-sm text-mute">This identity will represent you across the campus.</p>
      </section>

      <div className="relative px-5">
        {/* avatar picker */}
        <section className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} className="shrink-0 text-[color:var(--accent)]" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
            </svg>
            <div>
              <p className="font-display text-[13px] font-bold uppercase tracking-wide">Profile picture</p>
              <p className="text-xs text-mute">Choose an avatar to represent your agent.</p>
            </div>
          </div>

          <div role="radiogroup" aria-label="Profile picture" className="mt-4 grid grid-cols-4 gap-2.5">
            {AVATARS
              .filter((a) => a.team === teamKey)
              .map((a) => {
                const selected = a.id === avatar;

                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Avatar ${a.id}`}
                    onClick={() => setAvatar(a.id)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${selected
                      ? "border-[color:var(--accent)] shadow-[0_0_14px_var(--glow)]"
                      : "border-white/10 opacity-80"
                      }`}
                  >
                    <img
                      src={a.src}
                      alt=""
                      className="h-full w-full object-cover"
                    />

                    {selected && (
                      <span
                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full text-white"
                        style={{ background: team.accent }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="13"
                          height="13"
                          {...stroke}
                          strokeWidth={3}
                        >
                          <path d="m5 12 5 5 9-10" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </section>

        {/* username */}
        <Field
          icon={<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-4 3-6 7-6s7 2 7 6" /></>}
          label="Username"
          hint="Pick a unique username. This will be visible to other players."
          count={username.length}
          max={16}
        >
          <div className="relative">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16))}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!usernameValid}
              placeholder="Username"
              required
              className={`${inputBase} pr-11 border-[color:var(--accent)]`}
            />
            {usernameValid && (
              <svg viewBox="0 0 24 24" width="24" height="24" {...stroke} className="absolute right-3 top-3 text-emerald-400" aria-label="Username available">
                <circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" />
              </svg>
            )}
          </div>
        </Field>

        {/* bio */}
        <Field
          icon={<><rect x="3" y="4" width="8" height="16" rx="1.5" /><rect x="13" y="4" width="8" height="16" rx="1.5" /></>}
          label="Short bio"
          optional
          hint="Tell others a bit about yourself."
          count={bio.length}
          max={60}
        >
          <input value={bio} maxLength={60} onChange={(e) => setBio(e.target.value)} placeholder="Here to capture everything." className={`${inputBase} border-white/15`} />
        </Field>

        <button
          onClick={onContinue}
          disabled={!usernameValid}
          className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-white/20 font-display text-sm font-bold uppercase tracking-[0.18em] shadow-[0_0_22px_var(--glow)] transition active:brightness-125 disabled:opacity-40 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          style={{ background: team.button }}
        >
          Continue
          <svg viewBox="0 0 24 24" width="18" height="18" {...stroke} strokeWidth={2.2}><path d="m9 5 7 7-7 7" /></svg>
        </button>
      </div>
    </main>
  );
}