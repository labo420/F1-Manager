import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Loader2, Trophy, Users, Star, Lock, Calendar, ChevronLeft, Flag, Zap, Wrench, Crown, ChevronRight, Medal, BarChart3, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Lobby, Race, Selection, LobbyMember, RaceStandingsEntry } from "@shared/schema";
import { format } from "date-fns";

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const RACE_COUNTRY_CODES: Record<string, string> = {
  "Australia": "au", "China": "cn", "Japan": "jp", "Bahrain": "bh",
  "Saudi Arabia": "sa", "Monaco": "mc", "Spain": "es", "Canada": "ca",
  "Austria": "at", "United Kingdom": "gb", "Belgium": "be", "Hungary": "hu",
  "Netherlands": "nl", "Italy": "it", "Azerbaijan": "az", "Singapore": "sg",
  "Mexico": "mx", "Brazil": "br", "Qatar": "qa", "UAE": "ae",
  "UK": "gb", "USA": "us", "Emilia Romagna": "it", "Sao Paulo": "br",
};

function RaceFlag({ country, size = 20 }: { country: string; size?: number }) {
  const cc = RACE_COUNTRY_CODES[country];
  if (!cc) return <span style={{ width: size, height: Math.round(size * 0.67) }} className="inline-block bg-white/10 rounded-sm" />;
  return (
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      alt={country}
      style={{ width: size, height: "auto" }}
      className="rounded-sm object-cover inline-block shrink-0"
    />
  );
}

type BadgeKey = "pole_position" | "fastest_lap" | "p1_constructor" | "perfect_weekend";

const BADGE_DEFS: Record<BadgeKey, { label: string; desc: string; Icon: any; color: string; bg: string; border: string; glow: string }> = {
  pole_position: {
    label: "Pole Position",
    desc: "Driver con più punti della lobby",
    Icon: Trophy,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    glow: "shadow-yellow-400/20",
  },
  fastest_lap: {
    label: "Fastest Lap",
    desc: "Driver con il giro veloce",
    Icon: Zap,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    glow: "shadow-purple-400/20",
  },
  p1_constructor: {
    label: "P1 Constructor",
    desc: "Constructor con più punti della lobby",
    Icon: Wrench,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
    glow: "shadow-orange-400/20",
  },
  perfect_weekend: {
    label: "Perfect Weekend",
    desc: "Miglior driver e constructor della lobby",
    Icon: Crown,
    color: "text-amber-300",
    bg: "bg-amber-300/10",
    border: "border-amber-300/40",
    glow: "shadow-amber-300/20",
  },
};

type PlayerBadgeEntry = {
  userId: number;
  username: string;
  teamName: string;
  driverName: string;
  constructorName: string;
  driverPoints: number;
  constructorPoints: number;
  badges: BadgeKey[];
};

type TabId = "predictions" | "standings" | "badges" | "players";

const TABS: { id: TabId; label: string; Icon: any }[] = [
  { id: "predictions", label: "Picks", Icon: Calendar },
  { id: "standings", label: "Standings", Icon: BarChart3 },
  { id: "badges", label: "Badges", Icon: Medal },
  { id: "players", label: "Players", Icon: Users },
];

export default function LobbyDetail({ id }: { id: number }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("predictions");
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);
  const [badgeRaceId, setBadgeRaceId] = useState<number | null>(null);

  const { data: lobby, isLoading: loadingLobby } = useQuery<Lobby>({
    queryKey: [`/api/lobby/${id}`],
  });

  const { data: races, isLoading: loadingRaces } = useQuery<Race[]>({
    queryKey: ["/api/races"],
  });

  const { data: mySelections } = useQuery<Selection[]>({
    queryKey: [`/api/selections/${id}/me`],
  });

  const { data: members, isLoading: loadingMembers } = useQuery<(LobbyMember & { username: string })[]>({
    queryKey: [`/api/lobby/${id}/members`],
  });

  const { data: usage } = useQuery<any>({
    queryKey: [`/api/usage/${id}`],
    initialData: { driverUsage: {}, constructorUsage: {}, driverJolliesRemaining: 2, constructorJolliesRemaining: 2, jolliesRemaining: 4 }
  });

  const completedRaces = races?.filter(r => r.isCompleted) ?? [];
  const nextRace = races?.find(r => !r.isCompleted) || races?.[races.length - 1];

  useEffect(() => {
    if (completedRaces.length > 0 && selectedRaceId === null) {
      setSelectedRaceId(completedRaces[completedRaces.length - 1].id);
    }
    if (completedRaces.length > 0 && badgeRaceId === null) {
      setBadgeRaceId(completedRaces[completedRaces.length - 1].id);
    }
  }, [completedRaces.length]);

  const { data: raceStandings, isLoading: loadingStandings } = useQuery<RaceStandingsEntry[]>({
    queryKey: ["/api/lobby", id, "race", selectedRaceId, "standings"],
    enabled: selectedRaceId !== null,
  });

  const { data: badgeData, isLoading: badgesLoading } = useQuery<{ players: PlayerBadgeEntry[] }>({
    queryKey: [`/api/lobby/${id}/race/${badgeRaceId}/badges`],
    enabled: badgeRaceId !== null,
  });

  const badgePlayers = badgeData?.players ?? [];

  if (loadingLobby || loadingRaces || loadingMembers) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lobby) return <div className="text-white p-8">Lobby not found</div>;

  const completedCount = races?.filter(r => r.isCompleted).length ?? 0;
  const totalCount = races?.length ?? 24;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-24">

      {/* Back button */}
      <button
        onClick={() => setLocation("/paddock")}
        className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 group"
        data-testid="button-back-paddock"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Paddock</span>
      </button>

      {/* Hero header */}
      <div className="glass-panel rounded-3xl border border-white/5 p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-5 sm:gap-8">
          {lobby.imageUrl ? (
            <img src={lobby.imageUrl} alt="" className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl object-cover border border-white/10 shadow-2xl shrink-0" />
          ) : (
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner shrink-0">
              <span className="text-xl sm:text-3xl font-black text-white/30">{getInitials(lobby.name)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white uppercase tracking-tighter leading-none mb-2 truncate">
              {lobby.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <code className="text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                {lobby.code}
              </code>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
                {members?.length ?? 0}/10 managers
              </span>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
                {completedCount}/{totalCount} gare
              </span>
            </div>
          </div>
          {/* Jollies */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <div className="glass-panel border border-yellow-400/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400/70 mb-0.5">Driver</p>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-xl font-black text-white leading-none">{usage?.driverJolliesRemaining ?? 0}</span>
              </div>
            </div>
            <div className="glass-panel border border-blue-400/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-400/70 mb-0.5">Team</p>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                <span className="text-xl font-black text-white leading-none">{usage?.constructorJolliesRemaining ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile jollies */}
        <div className="flex sm:hidden items-center gap-3 mt-5 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-black text-white">{usage?.driverJolliesRemaining ?? 0}</span>
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Driver Jollies</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
            <span className="text-xs font-black text-white">{usage?.constructorJolliesRemaining ?? 0}</span>
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Team Jollies</span>
          </div>
        </div>
      </div>

      {/* Custom tab bar */}
      <div className="flex gap-1 glass-panel rounded-2xl p-1 border border-white/5 mb-8">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-xl font-display font-black uppercase tracking-tight text-[11px] sm:text-xs transition-all ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <tab.Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Predictions */}
      {activeTab === "predictions" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Next race card */}
              <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
                    Prossima Gara
                  </p>
                </div>
                {nextRace ? (
                  <div className="p-5">
                    <div className="flex items-center gap-4 mb-5">
                      <RaceFlag country={nextRace.country ?? ""} size={32} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-display font-black text-white uppercase tracking-tight leading-none truncate">
                          {nextRace.name}
                        </h3>
                        <p className="text-xs text-muted-foreground opacity-60 mt-0.5">{nextRace.circuitName}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        nextRace.isLocked
                          ? "bg-red-500/10 text-red-400 border-red-400/30"
                          : "bg-green-500/10 text-green-400 border-green-400/30"
                      }`}>
                        {nextRace.isLocked ? "🔴 Locked" : "🟢 Open"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-5 px-4 py-3 rounded-xl bg-white/3 border border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Data</span>
                      <span className="text-xs font-black text-white">{format(new Date(nextRace.date), "PPP")}</span>
                    </div>
                    {!nextRace.isLocked ? (
                      <Link href={`/draft/${id}/${nextRace.id}`}>
                        <button
                          data-testid="button-go-draft"
                          className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-display font-black uppercase tracking-tight flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] red-glow shadow-2xl shadow-primary/30"
                        >
                          <Flag className="w-4 h-4" /> Go to Draft Room
                        </button>
                      </Link>
                    ) : (
                      <div className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-white/10 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Picks bloccati</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">Nessuna gara in programma.</div>
                )}
              </div>

              {/* My current pick */}
              <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
                    La tua scelta
                  </p>
                </div>
                <div className="p-5">
                  {nextRace && mySelections?.find(s => s.raceId === nextRace.id) ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-panel rounded-2xl p-4 border border-primary/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">Driver</p>
                        <p className="text-sm font-black text-white uppercase tracking-tight">Scelta salvata ✓</p>
                      </div>
                      <div className="glass-panel rounded-2xl p-4 border border-primary/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">Constructor</p>
                        <p className="text-sm font-black text-white uppercase tracking-tight">Scelta salvata ✓</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-xs text-muted-foreground opacity-50 uppercase tracking-widest font-black">
                        Nessuna scelta per questa gara
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar stats */}
            <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden h-fit">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
                  Stato Lega
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Managers</span>
                  <span className="text-sm font-black text-white">{members?.length || 0}<span className="text-muted-foreground opacity-40">/10</span></span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((members?.length ?? 0) / 10) * 100}%` }} />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Gare completate</span>
                  <span className="text-sm font-black text-white">{completedCount}<span className="text-muted-foreground opacity-40">/{totalCount}</span></span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
                </div>
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">F1 2026 Season</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: Standings */}
      {activeTab === "standings" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {completedRaces.length === 0 ? (
            <div className="glass-panel rounded-3xl border border-white/5 flex flex-col items-center justify-center py-20">
              <Flag className="w-10 h-10 text-muted-foreground opacity-20 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">
                Nessuna gara completata
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Race selector */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {completedRaces.map(race => (
                  <button
                    key={race.id}
                    data-testid={`race-selector-${race.id}`}
                    onClick={() => setSelectedRaceId(race.id)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-tight border transition-all whitespace-nowrap ${
                      selectedRaceId === race.id
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                        : "glass-panel text-muted-foreground border-white/10 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <RaceFlag country={race.country ?? ""} size={14} />
                    R{race.round ?? "?"} {race.country}
                  </button>
                ))}
              </div>

              {/* Standings panel */}
              <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <p className="text-sm font-display font-black text-white uppercase tracking-tight">
                    {completedRaces.find(r => r.id === selectedRaceId)?.name ?? "Classifica"}
                  </p>
                </div>
                {loadingStandings ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !raceStandings || raceStandings.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">Nessun dato per questa gara</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="py-3 pl-5 text-left text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-50 w-8">#</th>
                            <th className="py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-50">Scuderia</th>
                            <th className="py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-50">Driver</th>
                            <th className="py-3 text-left text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-50">Constructor</th>
                            <th className="py-3 text-right text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-50">D</th>
                            <th className="py-3 text-right text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-50">C</th>
                            <th className="py-3 pr-5 text-right text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-50">Tot</th>
                          </tr>
                        </thead>
                        <tbody>
                          {raceStandings.map((entry, idx) => (
                            <tr
                              key={entry.userId}
                              data-testid={`standings-row-${entry.userId}`}
                              className="border-b border-white/5 hover:bg-white/3 transition-colors"
                            >
                              <td className="py-3.5 pl-5">
                                <span className={`text-sm font-black ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground opacity-40"}`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                                    {entry.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-white uppercase tracking-tight leading-none">{entry.teamName}</p>
                                    <p className="text-[10px] text-muted-foreground opacity-50">@{entry.username}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 text-xs text-muted-foreground">{entry.driverName ?? <span className="opacity-30">—</span>}</td>
                              <td className="py-3.5 text-xs text-muted-foreground">{entry.constructorName ?? <span className="opacity-30">—</span>}</td>
                              <td className="py-3.5 text-right font-mono text-xs text-blue-400">{entry.driverPoints}</td>
                              <td className="py-3.5 text-right font-mono text-xs text-emerald-400">{entry.constructorPoints}</td>
                              <td className="py-3.5 pr-5 text-right font-black text-sm text-white">{entry.totalPoints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-white/5">
                      {raceStandings.map((entry, idx) => (
                        <div key={entry.userId} data-testid={`standings-card-${entry.userId}`} className="flex items-center gap-3 px-4 py-3.5">
                          <span className={`text-sm font-black w-5 text-center shrink-0 ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground opacity-30"}`}>
                            {idx + 1}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                            {entry.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white uppercase tracking-tight truncate">{entry.teamName}</p>
                            <p className="text-[10px] text-muted-foreground opacity-50 truncate">{entry.driverName ?? "—"} · {entry.constructorName ?? "—"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-white">{entry.totalPoints}</p>
                            <p className="text-[10px] leading-none">
                              <span className="text-blue-400">{entry.driverPoints}</span>
                              <span className="text-muted-foreground/30"> + </span>
                              <span className="text-emerald-400">{entry.constructorPoints}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Tab: Badges */}
      {activeTab === "badges" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {completedRaces.length === 0 ? (
            <div className="glass-panel rounded-3xl border border-white/5 flex flex-col items-center justify-center py-20">
              <Medal className="w-10 h-10 text-muted-foreground opacity-20 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">
                Badge disponibili dopo la prima gara
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Race list */}
              <div className="lg:col-span-1 glass-panel rounded-3xl border border-white/5 overflow-hidden h-fit">
                <div className="px-5 py-4 border-b border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                    Seleziona Gara
                  </p>
                </div>
                <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
                  {completedRaces.map(race => (
                    <button
                      key={race.id}
                      onClick={() => setBadgeRaceId(race.id)}
                      data-testid={`button-badge-race-${race.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-white/3 ${
                        badgeRaceId === race.id ? "bg-primary/10 border-l-2 border-primary" : "border-l-2 border-transparent"
                      }`}
                    >
                      <RaceFlag country={race.country ?? ""} size={22} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black uppercase tracking-tight truncate leading-none mb-0.5 ${badgeRaceId === race.id ? "text-primary" : "text-white"}`}>
                          {race.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground opacity-40 font-mono">
                          Round {race.round ?? "—"}
                        </p>
                      </div>
                      {badgeRaceId === race.id && <ChevronRight className="w-3 h-3 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badge content */}
              <div className="lg:col-span-2 space-y-4">
                {badgesLoading ? (
                  <div className="glass-panel rounded-3xl border border-white/5 flex items-center justify-center min-h-[240px]">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : badgePlayers.length === 0 ? (
                  <div className="glass-panel rounded-3xl border border-white/5 flex items-center justify-center min-h-[240px]">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">
                      Nessuna pick per questa gara
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Badge winner cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(["perfect_weekend", "pole_position", "fastest_lap", "p1_constructor"] as BadgeKey[]).map(badgeKey => {
                        const winner = badgePlayers.find(p => p.badges.includes(badgeKey));
                        if (!winner) return null;
                        const def = BADGE_DEFS[badgeKey];
                        return (
                          <motion.div
                            key={badgeKey}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`glass-panel rounded-2xl border-2 ${def.border} ${def.bg} p-4 flex items-center gap-4 shadow-xl ${def.glow}`}
                            data-testid={`badge-card-${badgeKey}`}
                          >
                            <div className={`w-12 h-12 rounded-xl ${def.bg} border-2 ${def.border} flex items-center justify-center shrink-0`}>
                              <def.Icon className={`w-5 h-5 ${def.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-[10px] font-black uppercase tracking-wider ${def.color} leading-none mb-1`}>
                                {def.label}
                              </p>
                              <p className="text-sm font-display font-black text-white uppercase tracking-tight leading-none truncate mb-0.5">
                                {winner.teamName}
                              </p>
                              <p className="text-[10px] text-muted-foreground opacity-50 truncate">
                                {badgeKey === "p1_constructor" ? winner.constructorName : winner.driverName}
                                {" · "}
                                <span className="font-black">
                                  {badgeKey === "p1_constructor" ? winner.constructorPoints : winner.driverPoints} pts
                                </span>
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* All players list */}
                    <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                          Tutti i manager
                        </p>
                      </div>
                      <div className="divide-y divide-white/5">
                        {badgePlayers.map(player => (
                          <div
                            key={player.userId}
                            data-testid={`player-badge-row-${player.userId}`}
                            className="flex items-center gap-3 px-5 py-3.5"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                              {player.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-white uppercase tracking-tight truncate leading-none mb-0.5">
                                {player.teamName}
                              </p>
                              <p className="text-[10px] text-muted-foreground opacity-40 truncate">
                                {player.driverName} <span className="text-blue-400 font-black">{player.driverPoints}p</span>
                                <span className="opacity-30"> · </span>
                                {player.constructorName} <span className="text-emerald-400 font-black">{player.constructorPoints}p</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {player.badges.length === 0 ? (
                                <span className="text-[9px] font-black text-muted-foreground opacity-20">—</span>
                              ) : (
                                player.badges.filter(b => b !== "perfect_weekend").map(badgeKey => {
                                  const def = BADGE_DEFS[badgeKey as BadgeKey];
                                  if (!def) return null;
                                  return (
                                    <div key={badgeKey} title={def.label} className={`w-7 h-7 rounded-xl ${def.bg} border ${def.border} flex items-center justify-center`}>
                                      <def.Icon className={`w-3.5 h-3.5 ${def.color}`} />
                                    </div>
                                  );
                                })
                              )}
                              {player.badges.includes("perfect_weekend") && (
                                <div title="Perfect Weekend" className={`w-7 h-7 rounded-xl ${BADGE_DEFS.perfect_weekend.bg} border ${BADGE_DEFS.perfect_weekend.border} flex items-center justify-center`}>
                                  <Crown className={`w-3.5 h-3.5 ${BADGE_DEFS.perfect_weekend.color}`} />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Tab: Players */}
      {activeTab === "players" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
                Manager List
              </p>
              <span className="ml-auto text-[10px] font-black text-muted-foreground opacity-40 uppercase tracking-widest">
                {members?.length ?? 0}/10
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {members?.map((member, idx) => (
                <div key={member.userId} className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors">
                  <span className="text-xs font-black text-muted-foreground opacity-30 w-4 text-center shrink-0">{idx + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm shrink-0">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-tight leading-none truncate">{member.teamName}</p>
                    <p className="text-[10px] text-muted-foreground opacity-50 mt-0.5">@{member.username}</p>
                  </div>
                  {member.role === "admin" && (
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
