import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useCreateLobby, useJoinLobby, useSetTeamName, useLobbyInfo } from "@/hooks/use-lobby";
import { useRaces } from "@/hooks/use-races";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Lock, PlusCircle, LogIn, Crown, ChevronRight, ChevronDown, Users, Star, Trophy, Car, Shield, Copy, Timer, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { RaceFantasyWinners } from "@shared/schema";

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#3671C6",
  "Ferrari": "#E8002D",
  "McLaren": "#FF8000",
  "Mercedes": "#27F4D2",
  "Aston Martin": "#229971",
  "Alpine": "#FF87BC",
  "RB": "#6692FF",
  "Williams": "#64C4FF",
  "Audi": "#ff3300",
  "Haas": "#B6BABD",
  "Cadillac": "#d1d1d1",
};

function getRaceStatus(race: any): "coming-soon" | "in-corso" | "risultati" {
  if (race.isCompleted) return "risultati";
  const now = new Date();
  const raceTime = new Date(race.date).getTime();
  if (now.getTime() >= raceTime) return "in-corso";
  return "coming-soon";
}

function TeamIcon({ name, className = "w-6 h-6" }: { name: string; className?: string }) {
  const officialTeams = [
    "red bull racing", "ferrari", "mclaren", "mercedes", "aston martin",
    "alpine", "racing bulls", "rb", "williams", "audi", "haas", "cadillac"
  ];

  const lowerName = name.toLowerCase();
  const isOfficial = officialTeams.includes(lowerName);

  if (isOfficial) {
    const fileName = lowerName === "racing bulls" || lowerName === "rb" ? "racingbulls" : lowerName.replace(/\s+/g, "");
    return <img src={`/logos/${fileName}.png`} alt={name} className={`${className} object-contain`} />;
  }

  return (
    <div className={`${className} bg-zinc-800 rounded-full flex items-center justify-center text-muted-foreground border border-white/10`}>
      <Shield className="w-1/2 h-1/2" />
    </div>
  );
}

function getStatusLabel(status: string) {
  switch (status) {
    case "coming-soon": return "Coming Soon";
    case "in-corso": return "LIVE";
    case "risultati": return "Risultati";
    default: return "";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "coming-soon": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "in-corso": return "bg-red-600 text-white border-red-500 animate-pulse font-black shadow-[0_0_15px_rgba(220,38,38,0.5)]";
    case "risultati": return "bg-white/10 text-white border-white/20";
    default: return "";
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const { activeLobbyId, setActiveLobbyId, activeMembership } = useActiveLobby();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const hasMemberships = user.memberships && user.memberships.length > 0;

  if (!hasMemberships || !activeLobbyId || !activeMembership) {
    return <LobbySelectionView user={user} setActiveLobbyId={setActiveLobbyId} />;
  }

  if (activeMembership.teamName === "TBD") {
    return <SetTeamNameView lobbyId={activeLobbyId} lobbyName={activeMembership.lobbyName} />;
  }

  return <RaceAccordionDashboard lobbyId={activeLobbyId} membership={activeMembership} user={user} setActiveLobbyId={setActiveLobbyId} />;
}

function LobbySelectionView({ user, setActiveLobbyId }: { user: any; setActiveLobbyId: (id: number) => void }) {
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [leagueName, setLeagueName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");
  const createLobby = useCreateLobby();
  const joinLobby = useJoinLobby();

  const adminLobbies = user.memberships?.filter((m: any) => m.role === "admin") || [];
  const playerLobbies = user.memberships?.filter((m: any) => m.role === "player") || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 pb-24">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">
          Welcome, @{user.username}
        </h1>
        <p className="text-muted-foreground mt-2">Select a league or create a new one.</p>
      </div>

      {mode === "list" && (
        <>
          {adminLobbies.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4" /> Leagues I Manage
              </h2>
              <div className="space-y-3">
                {adminLobbies.map((m: any) => (
                  <button
                    key={m.lobbyId}
                    onClick={() => setActiveLobbyId(m.lobbyId)}
                    className="w-full glass-panel rounded-xl p-5 flex items-center justify-between hover:border-primary/50 transition-all group text-left border-2 border-transparent"
                  >
                    <div>
                      <div className="text-white font-bold text-lg">{m.lobbyName}</div>
                      <div className="text-muted-foreground text-xs mt-1">Code: <span className="text-primary font-mono">{m.lobbyCode}</span> | Team: {m.teamName}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {playerLobbies.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Leagues I Joined
              </h2>
              <div className="space-y-3">
                {playerLobbies.map((m: any) => (
                  <button
                    key={m.lobbyId}
                    onClick={() => setActiveLobbyId(m.lobbyId)}
                    className="w-full glass-panel rounded-xl p-5 flex items-center justify-between hover:border-primary/50 transition-all group text-left border-2 border-transparent"
                  >
                    <div>
                      <div className="text-white font-bold text-lg">{m.lobbyName}</div>
                      <div className="text-muted-foreground text-xs mt-1">Team: {m.teamName}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => setMode("create")}
              className="glass-panel rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/50 transition-all border-2 border-transparent group"
            >
              <PlusCircle className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold uppercase">Create League</span>
            </button>
            <button
              onClick={() => setMode("join")}
              className="glass-panel rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/50 transition-all border-2 border-transparent group"
            >
              <LogIn className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold uppercase">Join League</span>
            </button>
          </div>
        </>
      )}

      {mode === "create" && (
        <div className="glass-panel rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white uppercase mb-6">Create a New League</h2>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            if (leagueName.trim() && teamName.trim()) {
              createLobby.mutate({ name: leagueName.trim(), teamName: teamName.trim() }); 
            }
          }} className="space-y-4">
            <input
              placeholder="League Name"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              className="w-full bg-background border-2 border-border rounded-xl px-4 py-4 text-white font-bold uppercase focus:border-primary outline-none"
            />
            <input
              placeholder="Your Scuderia Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-background border-2 border-border rounded-xl px-4 py-4 text-white font-bold uppercase focus:border-primary outline-none"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setMode("list")} className="flex-1 py-3 rounded-xl font-bold uppercase text-sm text-muted-foreground hover:text-white transition-colors">
                Back
              </button>
              <button
                type="submit"
                disabled={!leagueName.trim() || !teamName.trim() || createLobby.isPending}
                className="flex-[2] bg-primary text-white rounded-xl py-3 font-bold uppercase disabled:opacity-50 hover:bg-primary/90 transition-all"
              >
                {createLobby.isPending ? "Creating..." : "Create League"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mode === "join" && (
        <div className="glass-panel rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white uppercase mb-6">Join a League</h2>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            if (code.length >= 4 && teamName.trim()) {
              joinLobby.mutate({ code: code.toUpperCase(), teamName: teamName.trim() }); 
            }
          }} className="space-y-4">
            <input
              placeholder="F1-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-background border-2 border-border rounded-xl px-4 py-4 text-white font-mono text-2xl text-center tracking-[0.3em] uppercase focus:border-primary outline-none"
            />
            <input
              placeholder="Your Scuderia Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-background border-2 border-border rounded-xl px-4 py-4 text-white font-bold uppercase focus:border-primary outline-none"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setMode("list")} className="flex-1 py-3 rounded-xl font-bold uppercase text-sm text-muted-foreground hover:text-white transition-colors">
                Back
              </button>
              <button
                type="submit"
                disabled={code.length < 4 || !teamName.trim() || joinLobby.isPending}
                className="flex-[2] bg-primary text-white rounded-xl py-3 font-bold uppercase disabled:opacity-50 hover:bg-primary/90 transition-all"
              >
                {joinLobby.isPending ? "Joining..." : "Join Grid"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SetTeamNameView({ lobbyId, lobbyName }: { lobbyId: number; lobbyName: string }) {
  const [teamName, setTeamName] = useState("");
  const setTeamNameMutation = useSetTeamName();

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="glass-panel rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white uppercase mb-2">Name Your Scuderia</h2>
        <p className="text-muted-foreground text-sm mb-6">League: {lobbyName}</p>
        <form onSubmit={(e) => { e.preventDefault(); if (teamName.trim()) setTeamNameMutation.mutate({ lobbyId, teamName: teamName.trim() }); }} className="space-y-4">
          <input
            placeholder="SCUDERIA EXAMPLE"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full bg-background border-2 border-border rounded-xl px-4 py-4 text-white font-bold uppercase focus:border-primary outline-none"
          />
          <button
            type="submit"
            disabled={!teamName.trim() || setTeamNameMutation.isPending}
            className="w-full bg-primary text-white rounded-xl py-4 font-bold uppercase disabled:opacity-50 hover:bg-primary/90 transition-all"
          >
            {setTeamNameMutation.isPending ? "Saving..." : "Confirm Team Name"}
          </button>
        </form>
      </div>
    </div>
  );
}

function RaceAccordionDashboard({ lobbyId, membership, user, setActiveLobbyId }: { lobbyId: number; membership: any; user: any; setActiveLobbyId: (id: number | null) => void }) {
  const { data: races, isLoading: racesLoading } = useRaces();
  const [expandedRaceId, setExpandedRaceId] = useState<number | null>(null);

  const hasMultipleLobbies = user.memberships.length > 1;

  if (racesLoading || !races) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const toggleAccordion = (raceId: number) => {
    setExpandedRaceId(prev => prev === raceId ? null : raceId);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {hasMultipleLobbies && (
              <button onClick={() => setActiveLobbyId(null)} className="text-muted-foreground hover:text-white transition-colors text-sm font-bold uppercase">
                Switch
              </button>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="text-primary font-bold">{membership.teamName}</span>
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Calendar className="text-primary w-5 h-5" /> 2026 Season
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Official FIA/F1 Information</p>
      </div>

      <div className="space-y-2">
        {races.map((race) => {
          const status = getRaceStatus(race);
          const isExpanded = expandedRaceId === race.id;

          return (
            <div key={race.id} className="glass-panel rounded-xl overflow-hidden">
              <button
                onClick={() => toggleAccordion(race.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="text-xs font-black text-muted-foreground w-6 text-center shrink-0">R{race.round}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white truncate">{race.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(race.date), "MMM do, yyyy")}
                      {race.itaTime && <span className="text-primary ml-2">{race.itaTime} ITA</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <RaceAccordionContent race={race} status={status} lobbyId={lobbyId} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RaceAccordionContent({ race, status, lobbyId }: { race: any; status: string; lobbyId: number }) {
  const { data: raceDetails } = useQuery<any>({
    queryKey: ["/api/f1/race", race.id, "details"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${race.id}/details`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: status === "risultati" || status === "in-corso",
  });

  const { data: liveStatusData } = useQuery({
    queryKey: ["/api/f1/live-status", race.id],
    queryFn: async () => {
      const res = await fetch(`https://api.openf1.org/v1/sessions?circuit_key=latest`, { mode: 'cors' });
      if (!res.ok) return null;
      const sessions = await res.json();
      return sessions?.[0] || null;
    },
    refetchInterval: 30000,
    enabled: status === "in-corso",
  });

  const isActuallyLive = liveStatusData && new Date(liveStatusData.date_start) <= new Date() && (!liveStatusData.date_end || new Date(liveStatusData.date_end) > new Date());

  const results = useMemo(() => {
    if (!raceDetails?.driverResults) return [];
    return [...raceDetails.driverResults].sort((a: any, b: any) => (a.position || 999) - (b.position || 999));
  }, [raceDetails]);

  return (
    <div className="px-4 sm:px-5 pb-5 border-t border-white/10">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground uppercase">Circuit</div>
          <div className="text-white font-semibold">{race.circuitName || race.name}</div>
          {race.circuitLength && <div className="text-xs text-muted-foreground">Length: {race.circuitLength.replace(',', '.')} km</div>}
          {race.laps && <div className="text-xs text-muted-foreground">Laps: {race.laps}</div>}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground uppercase">Schedule</div>
          <div className="text-white text-sm">{format(new Date(race.date), "EEEE, MMMM do yyyy")}</div>
          {race.itaTime && <div className="text-xs text-muted-foreground">Race Start: {race.itaTime} ITA | {format(new Date(race.date), "HH:mm")} UTC</div>}
        </div>
      </div>

      {status === "coming-soon" && (
        <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-wider">Coming Soon</p>
        </div>
      )}

      {status === "in-corso" && (
        <div className="mt-4 space-y-4">
          <div className={`p-3 rounded-xl border text-center transition-all ${isActuallyLive ? "bg-red-500/20 border-red-500/40 animate-pulse" : "bg-red-500/10 border-red-500/20"}`}>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 bg-red-500 rounded-full ${isActuallyLive ? "animate-ping" : ""}`} />
              <p className="text-red-500 text-sm font-bold uppercase">{isActuallyLive ? "LIVE NOW" : "SESSION IN PROGRESS"}</p>
            </div>
          </div>
          {results.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1">Live Standing</div>
              {results.map((dr, idx) => (
                <div key={dr.driverId} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center font-bold text-xs text-muted-foreground">{dr.position || "-"}</span>
                    <TeamIcon name={dr.driverTeam} className="w-4 h-4" />
                    <span className="text-white font-bold text-xs">{dr.driverName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{idx === 0 ? "Interval" : `+${dr.gap || "0.000"}s`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {status === "risultati" && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
             <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
                <Timer className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Fastest Lap</div>
                <div className="text-white font-bold text-xs">{raceDetails?.fastestLapDriver || "N/A"}</div>
             </div>
             <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
                <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Winner</div>
                <div className="text-white font-bold text-xs">{results[0]?.driverName || "N/A"}</div>
             </div>
             <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
                <Zap className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Overtakes</div>
                <div className="text-white font-bold text-xs">{raceDetails?.totalOvertakes || 0}</div>
             </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-2 flex justify-between items-center">
              <span>Full Classification</span>
              <span className="font-mono">Time / Gap</span>
            </div>
            <div className="space-y-1">
              {results.map((dr, idx) => (
                <div key={dr.driverId} className={`flex items-center justify-between p-3 rounded-lg ${idx < 3 ? "bg-white/5 border border-white/10" : "hover:bg-white/5"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-center font-display font-bold text-sm ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {dr.position || "-"}
                    </span>
                    <TeamIcon name={dr.driverTeam} className="w-5 h-5" />
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: TEAM_COLORS[dr.driverTeam] || "#666" }}></div>
                    <div>
                      <div className="text-white font-bold text-sm">{dr.driverName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{dr.driverTeam}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground">
                      {idx === 0 ? (dr.time || "1:30:00.000") : (dr.gap ? `+${dr.gap}s` : (dr.status || "DNF"))}
                    </span>
                    <span className="font-display font-bold text-white w-8 text-right text-xs">{dr.points}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
