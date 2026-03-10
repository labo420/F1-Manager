import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useCreateLobby, useJoinLobby, useSetTeamName, useLobbyInfo } from "@/hooks/use-lobby";
import { useRaces } from "@/hooks/use-races";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Lock, PlusCircle, LogIn, Crown, ChevronRight, ChevronDown, Users, Star, Trophy, Car, Copy, Timer, Zap, Gauge, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { RaceFantasyWinners } from "@shared/schema";
import { DriverAvatar } from "@/components/DriverAvatar";

const CIRCUIT_FLAGS: Record<string, string> = {
  "Bahrain": "bh",
  "Jeddah": "sa",
  "Albert Park": "au",
  "Shanghai": "cn",
  "Miami": "us",
  "Imola": "it",
  "Monaco": "mc",
  "Montreal": "ca",
  "Barcelona": "es",
  "Spielberg": "at",
  "Silverstone": "gb",
  "Hungaroring": "hu",
  "Spa-Francorchamps": "be",
  "Zandvoort": "nl",
  "Monza": "it",
  "Baku": "az",
  "Marina Bay": "sg",
  "Austin": "us",
  "Hermanos Rodriguez": "mx",
  "Interlagos": "br",
  "Las Vegas": "us",
  "Lusail": "qa",
  "Yas Marina": "ae",
  "Suzuka": "jp",
};

function getCircuitFlag(name: string) {
  if (!name) return null;
  let code = "";
  for (const [key, c] of Object.entries(CIRCUIT_FLAGS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      code = c;
      break;
    }
  }
  
  if (!code) {
    const nameMap: Record<string, string> = {
      "Australian Grand Prix": "au",
      "Chinese Grand Prix": "cn",
      "Japanese Grand Prix": "jp",
      "Miami Grand Prix": "us",
      "Emilia Romagna Grand Prix": "it",
      "Monaco Grand Prix": "mc",
      "Canadian Grand Prix": "ca",
      "Spanish Grand Prix": "es",
      "Austrian Grand Prix": "at",
      "British Grand Prix": "gb",
      "Hungarian Grand Prix": "hu",
      "Belgian Grand Prix": "be",
      "Dutch Grand Prix": "nl",
      "Italian Grand Prix": "it",
      "Azerbaijan Grand Prix": "az",
      "Singapore Grand Prix": "sg",
      "United States Grand Prix": "us",
      "Mexico City Grand Prix": "mx",
      "Sao Paulo Grand Prix": "br",
      "Las Vegas Grand Prix": "us",
      "Qatar Grand Prix": "qa",
      "Abu Dhabi Grand Prix": "ae",
      "Saudi Arabian Grand Prix": "sa",
      "Bahrain Grand Prix": "bh",
    };
    code = nameMap[name] || "";
  }

  if (!code) return null;
  return (
    <img 
      src={`https://flagcdn.com/w40/${code}.png`} 
      alt="" 
      className="inline-block h-[14px] w-auto mr-2 align-middle mb-0.5 shadow-md rounded-sm border border-white/10"
    />
  );
}

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

function getRaceStatusFromSessions(
  race: any,
  raceSessions: any[] | undefined
): "coming-soon" | "in-corso" | "risultati" {
  if (race.isCompleted) return "risultati";

  const now = new Date();
  const raceDate = new Date(race.date);

  if (!raceSessions || raceSessions.length === 0) {
    const fourHoursMs = 4 * 60 * 60 * 1000;
    if (now.getTime() >= raceDate.getTime() && now.getTime() <= raceDate.getTime() + fourHoursMs) return "in-corso";
    return "coming-soon";
  }

  const twelveHoursMs = 12 * 60 * 60 * 1000;
  const matchingSession = raceSessions.find((s: any) => {
    if (s.session_name !== "Race") return false;
    const diff = Math.abs(new Date(s.date_start).getTime() - raceDate.getTime());
    return diff < twelveHoursMs;
  });

  if (!matchingSession) return "coming-soon";

  const sessionStart = new Date(matchingSession.date_start);
  const sessionEnd = new Date(matchingSession.date_end);
  if (now >= sessionStart && now <= sessionEnd) return "in-corso";
  if (now > sessionEnd) return "risultati";
  return "coming-soon";
}


function getStatusLabel(status: string) {
  switch (status) {
    case "coming-soon": return "Coming Soon";
    case "in-corso": return "LIVE";
    case "risultati": return "Results";
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

function getITAFromUTCTime(utcTimeString: string): { ita: string; utc: string } {
  if (!utcTimeString) return { ita: "TBD", utc: "TBD" };
  const d = new Date(utcTimeString);
  const utcHours = d.getUTCHours();
  const utcMins = d.getUTCMinutes();
  const utcTime = `${String(utcHours).padStart(2, "0")}:${String(utcMins).padStart(2, "0")}`;
  const year = d.getFullYear();
  const lastSundayMarch = new Date(year, 2, 31);
  while (lastSundayMarch.getDay() !== 0) lastSundayMarch.setDate(lastSundayMarch.getDate() - 1);
  const lastSundayOct = new Date(year, 9, 31);
  while (lastSundayOct.getDay() !== 0) lastSundayOct.setDate(lastSundayOct.getDate() - 1);
  const isCEST = d >= lastSundayMarch && d < lastSundayOct;
  const offset = isCEST ? 2 : 1;
  const itaHours = (utcHours + offset) % 24;
  const itaTime = `${String(itaHours).padStart(2, "0")}:${String(utcMins).padStart(2, "0")}`;
  return { ita: itaTime, utc: utcTime };
}

function getSessionsForRace(race: any, sessionsStatus: any) {
  const raceDate = new Date(race.date);
  const qualDate = new Date(raceDate); qualDate.setDate(qualDate.getDate() - 1);
  const sprintQualDate = race.hasSprint ? new Date(raceDate) : null;
  if (sprintQualDate) sprintQualDate.setDate(sprintQualDate.getDate() - 2);
  const sprintDate = race.hasSprint ? new Date(raceDate) : null;
  if (sprintDate) sprintDate.setDate(sprintDate.getDate() - 1);

  let sprintQualData = { ita: "TBD", utc: "TBD" };
  let sprintData = { ita: "TBD", utc: "TBD" };
  let qualData = { ita: "TBD", utc: "TBD" };
  let raceData = { ita: "TBD", utc: "TBD" };

  if (sessionsStatus) {
    const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
    const sprintQualSession = race.hasSprint ? (sessionsStatus.qualSessions || []).find((s: any) =>
      s.date_start.slice(0, 10) === fmtDate(sprintQualDate!) && s.session_name === "Sprint Qualifying"
    ) : null;
    const sprintSession = race.hasSprint ? (sessionsStatus.raceSessions || []).find((s: any) =>
      s.date_start.slice(0, 10) === fmtDate(sprintDate!) && s.session_name === "Sprint"
    ) : null;
    const qualSession = (sessionsStatus.qualSessions || []).find((s: any) =>
      s.date_start.slice(0, 10) === fmtDate(qualDate) && s.session_name === "Qualifying"
    );
    const raceSession = (sessionsStatus.raceSessions || []).find((s: any) =>
      s.date_start.slice(0, 10) === fmtDate(raceDate) && s.session_name === "Race"
    );
    if (sprintQualSession) sprintQualData = getITAFromUTCTime(sprintQualSession.date_start);
    if (sprintSession) sprintData = getITAFromUTCTime(sprintSession.date_start);
    if (qualSession) qualData = getITAFromUTCTime(qualSession.date_start);
    if (raceSession) raceData = getITAFromUTCTime(raceSession.date_start);
    else if (race.date) raceData = getITAFromUTCTime(race.date);
  }

  const sessions = [];
  if (race.hasSprint) {
    sessions.push({ label: "Sprint Qual", shortLabel: "SQ", date: sprintQualDate!, data: sprintQualData, type: "sprint" });
    sessions.push({ label: "Sprint", shortLabel: "S", date: sprintDate!, data: sprintData, type: "sprint" });
  }
  sessions.push({ label: "Qualifying", shortLabel: "Q", date: qualDate, data: qualData, type: "qual" });
  sessions.push({ label: "Race", shortLabel: "R", date: raceDate, data: raceData, type: "race" });
  return sessions;
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
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16 pb-24">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 sm:mb-16"
      >
        <div className="mb-8">
          <div className="inline-flex items-center justify-center relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" style={{ opacity: 0.5 }} />
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white uppercase tracking-tighter italic relative z-10">
              @{user.username}
            </h1>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="h-px w-8 bg-primary/40" />
          <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase font-black">Driver Identity Verified</p>
          <div className="h-px w-8 bg-primary/40" />
        </div>
      </motion.div>

      {mode === "list" && (
        <>
          {adminLobbies.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 sm:mb-12"
            >
              <h2 className="text-xs font-black uppercase tracking-[0.15em] text-primary mb-3 sm:mb-6 flex items-center gap-3">
                <Crown className="w-5 h-5" /> Leagues I Manage
              </h2>
              <div className="space-y-3">
                {adminLobbies.map((m: any) => (
                  <motion.button
                    key={m.lobbyId}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setActiveLobbyId(m.lobbyId)}
                    className="w-full glass-panel rounded-2xl p-6 flex items-center justify-between hover:bg-primary/10 hover:border-primary/40 transition-all group text-left border-2 border-primary/20"
                  >
                    <div className="flex-1">
                      <div className="text-white font-black text-lg uppercase tracking-tight group-hover:text-primary transition-colors">{m.lobbyName}</div>
                      <div className="text-muted-foreground text-xs mt-2 flex gap-4">
                        <span>Code: <span className="text-primary font-mono font-bold">{m.lobbyCode}</span></span>
                        <span>Team: <span className="text-white font-semibold">{m.teamName}</span></span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ml-4 shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {playerLobbies.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 sm:mb-12"
            >
              <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 sm:mb-6 flex items-center gap-3">
                <Users className="w-5 h-5" /> Leagues I Joined
              </h2>
              <div className="space-y-3">
                {playerLobbies.map((m: any) => (
                  <motion.button
                    key={m.lobbyId}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setActiveLobbyId(m.lobbyId)}
                    className="w-full glass-panel rounded-2xl p-6 flex items-center justify-between hover:bg-white/5 hover:border-white/20 transition-all group text-left border-2 border-white/10"
                  >
                    <div className="flex-1">
                      <div className="text-white font-black text-lg uppercase tracking-tight">{m.lobbyName}</div>
                      <div className="text-muted-foreground text-xs mt-2">Team: <span className="text-white font-semibold">{m.teamName}</span></div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors ml-4 shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("create")}
              className="glass-panel rounded-2xl p-8 flex flex-col items-center gap-4 hover:bg-primary/10 hover:border-primary/40 transition-all border-2 border-primary/20 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <PlusCircle className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-white font-black text-sm uppercase tracking-wider">Create League</span>
              <p className="text-xs text-muted-foreground text-center">Start your own F1 fantasy grid</p>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("join")}
              className="glass-panel rounded-2xl p-8 flex flex-col items-center gap-4 hover:bg-white/5 hover:border-white/20 transition-all border-2 border-white/10 group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
                <LogIn className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-white font-black text-sm uppercase tracking-wider">Join League</span>
              <p className="text-xs text-muted-foreground text-center">Enter an existing league code</p>
            </motion.button>
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
  const { data: sessionsStatus } = useQuery<{ raceSessions: any[]; qualSessions: any[] }>({
    queryKey: ["/api/f1/sessions-status"],
    staleTime: 5 * 60 * 1000,
  });

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
                Switch League
              </button>
            )}
          </div>
        </div>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-10 mt-16"
      >
        <div className="flex items-center gap-4 mb-10 text-[20px]">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-bold uppercase tracking-wide text-white text-xl sm:text-[30px]">2026 FIA Formula 1 Race Calendar</h2>
            <p className="text-xs text-muted-foreground mt-1 tracking-wide">Session times in Italian (ITA) and Coordinated Universal (UTC)</p>
          </div>
        </div>
      </motion.div>
      <div className="space-y-4">
        {races.map((race, idx) => {
          const sessions = getSessionsForRace(race, sessionsStatus);

          return (
            <motion.div
              key={race.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="glass-panel rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors"
              data-testid={`calendar-race-${race.id}`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase leading-none">RND</span>
                    <span className="text-lg font-bold text-primary leading-none">{race.round}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-white uppercase leading-none">
                        {getCircuitFlag(race.name)}{race.name}
                      </span>
                      {race.hasSprint && (
                        <span className="text-[8px] bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded font-bold uppercase tracking-wide border border-orange-500/30 shrink-0">
                          Sprint
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-1">
                      {race.circuitName || race.country}
                    </div>
                  </div>
                </div>
              </div>
              <div className={`grid bg-white/[0.02] divide-white/5 ${sessions.length === 4 ? "grid-cols-2 sm:grid-cols-4 divide-x" : "grid-cols-2 divide-x"}`}>
                {sessions.map((session, sessionIdx) => {
                  const isRace = session.type === "race";
                  const isSprint = session.type === "sprint";
                  return (
                    <div
                      key={session.label}
                      className="flex flex-col gap-1.5 px-3 py-2.5 text-center"
                    >
                      <div className={`text-[8px] font-bold uppercase tracking-wide ${isSprint ? "text-orange-400" : isRace ? "text-primary" : "text-muted-foreground"}`}>
                        {session.label}
                      </div>
                      <div className="text-white font-semibold text-[11px]">
                        {format(session.date, "MMM d")}
                      </div>
                      <div className="space-y-1 mt-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[7px] text-muted-foreground font-medium uppercase tracking-wide">ITA</span>
                          <span className={`font-mono text-[10px] font-semibold ${session.data.ita === "TBD" ? "text-muted-foreground" : "text-white"}`}>
                            {session.data.ita}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[7px] text-muted-foreground font-medium uppercase tracking-wide">UTC</span>
                          <span className={`font-mono text-[10px] font-semibold ${session.data.utc === "TBD" ? "text-muted-foreground" : "text-muted-foreground"}`}>
                            {session.data.utc}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function RaceAccordionContent({ race, status, lobbyId, qualSessions }: { race: any; status: string; lobbyId: number; qualSessions?: any[] }) {
  const [liveData, setLiveData] = useState<any>(null);
  const [liveError, setLiveError] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [activeTab, setActiveTab] = useState<"race" | "qualifying">("race");

  const hasQualifyingData = (() => {
    if (!qualSessions) return false;
    const raceDate = new Date(race.date);
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    return qualSessions.some((s: any) => {
      const diff = Math.abs(new Date(s.date_start).getTime() - raceDate.getTime());
      return diff < 48 * 60 * 60 * 1000 && new Date(s.date_end) < new Date();
    });
  })();

  const { data: qualifyingResults, isLoading: qualLoading } = useQuery<any[]>({
    queryKey: ["/api/f1/race", race.id, "qualifying"],
    enabled: activeTab === "qualifying",
    staleTime: 10 * 60 * 1000,
  });

  const { data: externalResults, isLoading: externalLoading } = useQuery<any[]>({
    queryKey: ["/api/f1/race", race.id, "external-results"],
    enabled: status === "risultati" && !race.isCompleted,
    staleTime: 10 * 60 * 1000,
  });

  const { data: raceDetails } = useQuery<any>({
    queryKey: ["/api/f1/race", race.id, "details"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${race.id}/details`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: status === "risultati" || status === "in-corso",
  });

  // Real-time polling for live sessions using OpenF1 API with AbortController cleanup
  useEffect(() => {
    if (status !== "in-corso") return;

    const controller = new AbortController();
    let pollInterval: NodeJS.Timeout;

    const pollLiveData = async () => {
      try {
        setIsPolling(true);
        
        // Try OpenF1 for real-time intervals and positions
        const [intervalsRes, positionsRes] = await Promise.all([
          fetch("https://api.openf1.org/v1/intervals", { 
            signal: controller.signal,
            mode: 'cors'
          }).catch(() => null),
          fetch("https://api.openf1.org/v1/position", {
            signal: controller.signal,
            mode: 'cors'
          }).catch(() => null)
        ]);

        let liveStandings = null;

        if (intervalsRes?.ok && positionsRes?.ok) {
          const intervals = await intervalsRes.json();
          const positions = await positionsRes.json();
          
          if (Array.isArray(positions) && positions.length > 0) {
            // Map OpenF1 driver_number to our database and build standings
            liveStandings = positions
              .filter((pos: any) => pos.position && pos.driver_number)
              .map((pos: any) => ({
                position: pos.position,
                driverNumber: pos.driver_number,
                driverName: pos.driver_name || `Driver #${pos.driver_number}`,
                driverTeam: pos.team_name || "Unknown",
                gap: intervals.find((i: any) => i.driver_number === pos.driver_number)?.gap || null,
                interval: intervals.find((i: any) => i.driver_number === pos.driver_number)?.interval || null,
              }))
              .sort((a: any, b: any) => a.position - b.position);

            if (liveStandings.length > 0) {
              setLiveData(liveStandings);
              setLiveError(false);
            }
          }
        } else if (!liveStandings) {
          // Fallback to Jolpica for official classification if OpenF1 fails
          const ergastRes = await fetch(
            `https://api.jolpi.ca/ergast/f1/current/${race.round || 1}/results/?format=json`,
            { signal: controller.signal }
          ).catch(() => null);

          if (ergastRes?.ok) {
            const ergastData = await ergastRes.json();
            const raceResults = ergastData.MRData?.RaceTable?.Races?.[0]?.Results;
            
            if (Array.isArray(raceResults) && raceResults.length > 0) {
              liveStandings = raceResults
                .map((result: any) => ({
                  position: parseInt(result.position),
                  driverNumber: parseInt(result.Driver?.permanentNumber),
                  driverName: `${result.Driver?.givenName} ${result.Driver?.familyName}`,
                  driverTeam: result.Constructor?.name || "Unknown",
                  gap: result.position === "1" ? null : result.Time?.time || null,
                  interval: null,
                }))
                .sort((a: any, b: any) => a.position - b.position);

              setLiveData(liveStandings);
              setLiveError(false);
            }
          }
        }

        if (!liveStandings) {
          setLiveError(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setLiveError(true);
        }
      } finally {
        setIsPolling(false);
      }
    };

    // Initial fetch
    pollLiveData();

    // Poll every 60 seconds
    pollInterval = setInterval(pollLiveData, 60000);

    return () => {
      controller.abort();
      clearInterval(pollInterval);
    };
  }, [status, race.round]);

  const isActuallyLive = liveData && liveData.length > 0;

  const results = useMemo(() => {
    if (race.isCompleted && raceDetails?.driverResults?.length > 0) {
      return [...raceDetails.driverResults].sort((a: any, b: any) => (a.position || 999) - (b.position || 999));
    }
    if (externalResults && externalResults.length > 0) {
      return [...externalResults].sort((a: any, b: any) => (a.position || 999) - (b.position || 999));
    }
    if (raceDetails?.driverResults) {
      return [...raceDetails.driverResults].sort((a: any, b: any) => (a.position || 999) - (b.position || 999));
    }
    return [];
  }, [raceDetails, externalResults, race.isCompleted]);

  return (
    <div className="px-4 sm:px-5 pb-5 border-t border-white/10">
      <div className="flex gap-1 mt-4 mb-4 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("race")}
          className={`flex-1 text-xs font-bold uppercase py-1.5 rounded-md transition-all ${activeTab === "race" ? "bg-white/15 text-white" : "text-muted-foreground hover:text-white"}`}
          data-testid="tab-race"
        >
          Race
        </button>
        <button
          onClick={() => setActiveTab("qualifying")}
          className={`flex-1 text-xs font-bold uppercase py-1.5 rounded-md transition-all ${activeTab === "qualifying" ? "bg-white/15 text-white" : "text-muted-foreground hover:text-white"}`}
          data-testid="tab-qualifying"
        >
          Qualifying
        </button>
      </div>

      {activeTab === "qualifying" && (
        <div className="mb-4">
          {qualLoading ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground text-xs mt-2">Fetching qualifying results...</p>
            </div>
          ) : qualifyingResults && qualifyingResults.length > 0 ? (
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-2 flex justify-between">
                <span>Qualifying Classification</span>
                <span className="font-mono">Best / Gap</span>
              </div>
              <div className="space-y-1">
                {qualifyingResults.map((r: any) => (
                  <div key={r.position} className={`flex items-center justify-between p-2.5 rounded-lg ${r.position <= 3 ? "bg-white/5 border border-white/10" : "hover:bg-white/5"}`} data-testid={`qual-row-${r.position}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 text-center font-display font-bold text-xs shrink-0 ${r.position === 1 ? "text-yellow-400" : r.position === 2 ? "text-gray-300" : r.position === 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {r.position}
                      </span>
                      <DriverAvatar code={r.driverCode} number={r.driverNumber} name={r.driverName} teamColor={TEAM_COLORS[r.teamName]} />
                      <div className="w-0.5 h-6 rounded-full shrink-0" style={{ backgroundColor: TEAM_COLORS[r.teamName] || "#666" }} />
                      <div>
                        <div className="text-white font-bold text-sm">{r.driverName}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{r.teamName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {r.q3 ? (
                        <div className="text-xs font-mono text-white font-bold">{r.q3}</div>
                      ) : r.q2 ? (
                        <div className="text-xs font-mono text-muted-foreground">{r.q2}</div>
                      ) : (
                        <div className="text-xs font-mono text-muted-foreground">{r.q1 || "—"}</div>
                      )}
                      {r.gap ? (
                        <div className="text-[10px] text-red-400 font-mono">{r.gap}</div>
                      ) : (
                        <div className="text-[10px] text-yellow-400 font-mono uppercase">Pole</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">No qualifying data available yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "race" && (
      <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground uppercase">Circuit</div>
          <div className="text-white font-semibold">{getCircuitFlag(race.circuitName || race.name)} {race.circuitName || race.name}</div>
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
              {isPolling && <span className="text-[10px] text-red-400 ml-2 animate-pulse">Updating...</span>}
            </div>
          </div>

          {liveError && !liveData && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-amber-400 text-xs font-semibold">Live data unavailable. Showing race schedule.</p>
            </div>
          )}

          {(liveData && liveData.length > 0) ? (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1">Live Standing (Real-time from OpenF1 / Ergast)</div>
              {liveData.map((dr: any, idx: number) => (
                <div key={dr.driverNumber} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center font-bold text-xs text-muted-foreground shrink-0">{dr.position || "-"}</span>
                    <DriverAvatar code={dr.driverCode} number={dr.driverNumber} name={dr.driverName} teamColor={TEAM_COLORS[dr.driverTeam]} />
                    <span className="text-white font-bold text-xs">{dr.driverName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {idx === 0 ? "Interval" : (dr.gap ? `+${dr.gap}` : (dr.interval ? `+${dr.interval}` : "DNF"))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-xs">Fetching live session data...</p>
            </div>
          )}
        </div>
      )}

      {status === "risultati" && (
        <div className="mt-6 space-y-6">
          {externalLoading && !race.isCompleted && (
            <div className="flex items-center justify-center py-6 gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-muted-foreground text-xs">Loading race results...</span>
            </div>
          )}
          {!externalLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
             <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
                <Timer className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Fastest Lap</div>
                <div className="text-white font-bold text-xs">
                  {raceDetails?.fastestLapDriver || results.find((r: any) => r.fastestLap)?.driverName || "N/A"}
                </div>
             </div>
             <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
                <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Winner</div>
                <div className="text-white font-bold text-xs">{results[0]?.driverName || "N/A"}</div>
             </div>
             <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
                <Zap className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Overtakes</div>
                <div className="text-white font-bold text-xs">{raceDetails?.totalOvertakes || "—"}</div>
             </div>
          </div>
          )}

          {!externalLoading && results.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-2 flex justify-between items-center">
              <span>Full Classification</span>
              <span className="font-mono">Time / Gap</span>
            </div>
            <div className="space-y-1">
              {results.map((dr: any, idx: number) => {
                const team = dr.driverTeam || dr.teamName || "Unknown";
                return (
                <div key={dr.driverId || dr.driverNumber} className={`flex items-center justify-between p-3 rounded-lg ${idx < 3 ? "bg-white/5 border border-white/10" : "hover:bg-white/5"}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 text-center font-display font-bold text-xs shrink-0 ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {dr.position || dr.positionText || "-"}
                    </span>
                    <DriverAvatar code={dr.driverCode} number={dr.driverNumber} name={dr.driverName} teamColor={TEAM_COLORS[team]} />
                    <div className="w-0.5 h-6 rounded-full shrink-0" style={{ backgroundColor: TEAM_COLORS[team] || "#666" }} />
                    <div>
                      <div className="text-white font-bold text-sm flex items-center gap-1">
                        {dr.driverName}
                        {dr.fastestLap && <span className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded px-1 font-bold">FL</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">{team}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground">
                      {idx === 0 ? (dr.time || "—") : (dr.gap ? (typeof dr.gap === "string" && !dr.gap.startsWith("+") && dr.gap.length > 10 ? dr.gap : `+${dr.gap}`) : (dr.status || "DNF"))}
                    </span>
                    <span className="font-display font-bold text-white w-8 text-right text-xs">{dr.points}</span>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}
      </div>
      )}
    </div>
  );
}
