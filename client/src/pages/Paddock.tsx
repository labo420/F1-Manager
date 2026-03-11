import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Users, PlusCircle, LogIn, Trophy, Zap, Wrench, Crown, ChevronRight, Medal } from "lucide-react";
import { useCreateLobby, useJoinLobby } from "@/hooks/use-lobby";
import { TeamAvatar } from "@/components/TeamAvatar";
import { motion, AnimatePresence } from "framer-motion";
import type { Membership, Race } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const RACE_COUNTRY_CODES: Record<string, string> = {
  "Australia": "au", "China": "cn", "Japan": "jp", "Bahrain": "bh",
  "Saudi Arabia": "sa", "Miami": "us", "Emilia Romagna": "it", "Monaco": "mc",
  "Spain": "es", "Canada": "ca", "Austria": "at", "United Kingdom": "gb",
  "Belgium": "be", "Hungary": "hu", "Netherlands": "nl", "Italy": "it",
  "Azerbaijan": "az", "Singapore": "sg", "United States": "us", "Mexico": "mx",
  "Brazil": "br", "Sao Paulo": "br", "Las Vegas": "us", "Qatar": "qa",
  "Abu Dhabi": "ae", "Spanish Madrid": "es",
};

function RaceFlag({ country, size = 20 }: { country: string; size?: number }) {
  const cc = RACE_COUNTRY_CODES[country];
  if (!cc) return <span style={{ width: size, height: size * 0.67 }} className="inline-block bg-white/10 rounded-sm" />;
  return (
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      alt={country}
      style={{ width: size, height: "auto" }}
      className="rounded-sm object-cover inline-block"
    />
  );
}

type BadgeKey = "pole_position" | "fastest_lap" | "p1_constructor" | "perfect_weekend";

const BADGE_DEFS: Record<BadgeKey, { label: string; desc: string; Icon: any; color: string; bg: string; border: string }> = {
  pole_position: {
    label: "Pole Position",
    desc: "Driver con più punti della lobby",
    Icon: Trophy,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
  },
  fastest_lap: {
    label: "Fastest Lap",
    desc: "Driver con il giro veloce",
    Icon: Zap,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
  },
  p1_constructor: {
    label: "P1 Constructor",
    desc: "Constructor con più punti della lobby",
    Icon: Wrench,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
  },
  perfect_weekend: {
    label: "Perfect Weekend",
    desc: "Miglior driver e constructor della lobby",
    Icon: Crown,
    color: "text-amber-300",
    bg: "bg-amber-300/10",
    border: "border-amber-300/40",
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

function GpRecapSection({ memberships }: { memberships: Membership[] }) {
  const [selectedLobbyId, setSelectedLobbyId] = useState<number>(memberships[0]?.lobbyId ?? 0);
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);

  const { data: races } = useQuery<Race[]>({
    queryKey: ["/api/f1/races"],
  });

  const completedRaces = (races ?? []).filter(r => r.isCompleted);

  const { data: badgeData, isLoading: badgesLoading } = useQuery<{ players: PlayerBadgeEntry[] }>({
    queryKey: [`/api/lobby/${selectedLobbyId}/race/${selectedRaceId}/badges`],
    enabled: selectedRaceId !== null && selectedLobbyId !== 0,
  });

  const players = badgeData?.players ?? [];
  const badgeWinners = players.filter(p => p.badges.length > 0);

  return (
    <div className="mt-16">
      <div className="flex items-end gap-4 mb-8">
        <div>
          <h2 className="text-4xl sm:text-6xl font-display font-black text-white uppercase tracking-tighter italic leading-none mb-2">
            GP Recap
          </h2>
          <div className="h-1.5 w-16 bg-primary rounded-full ml-1" />
        </div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">
          Badge per gara
        </p>
      </div>

      {memberships.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {memberships.map(m => (
            <button
              key={m.lobbyId}
              onClick={() => { setSelectedLobbyId(m.lobbyId); setSelectedRaceId(null); }}
              data-testid={`button-recap-lobby-${m.lobbyId}`}
              className={`px-4 py-2 rounded-xl font-display font-black uppercase tracking-tight text-sm transition-all border-2 ${
                selectedLobbyId === m.lobbyId
                  ? "bg-primary text-white border-primary red-glow"
                  : "glass-panel text-muted-foreground border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              {m.lobbyName}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
              Seleziona Gara
            </p>
          </div>
          {completedRaces.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs font-bold text-muted-foreground opacity-40 uppercase tracking-widest">
                Nessuna gara completata
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
              {completedRaces.map(race => (
                <button
                  key={race.id}
                  onClick={() => setSelectedRaceId(race.id)}
                  data-testid={`button-recap-race-${race.id}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 ${
                    selectedRaceId === race.id ? "bg-primary/10 border-l-2 border-primary" : "border-l-2 border-transparent"
                  }`}
                >
                  <RaceFlag country={race.country ?? ""} size={22} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black uppercase tracking-tight truncate ${selectedRaceId === race.id ? "text-primary" : "text-white"}`}>
                      {race.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground opacity-50 font-mono">
                      R{race.round ?? "—"} · {race.date}
                    </p>
                  </div>
                  {selectedRaceId === race.id && (
                    <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedRaceId === null ? (
            <div className="glass-panel rounded-2xl border border-white/5 flex items-center justify-center h-full min-h-[200px]">
              <div className="text-center">
                <Medal className="w-10 h-10 text-muted-foreground opacity-20 mx-auto mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">
                  Seleziona una gara
                </p>
              </div>
            </div>
          ) : badgesLoading ? (
            <div className="glass-panel rounded-2xl border border-white/5 flex items-center justify-center h-full min-h-[200px]">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : players.length === 0 ? (
            <div className="glass-panel rounded-2xl border border-white/5 flex items-center justify-center h-full min-h-[200px]">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">
                Nessuna pick per questa gara
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {badgeWinners.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  {(["perfect_weekend", "pole_position", "fastest_lap", "p1_constructor"] as BadgeKey[]).map(badgeKey => {
                    const winner = players.find(p => p.badges.includes(badgeKey));
                    if (!winner) return null;
                    const def = BADGE_DEFS[badgeKey];
                    return (
                      <motion.div
                        key={badgeKey}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`glass-panel rounded-2xl border-2 ${def.border} ${def.bg} p-4 flex items-center gap-4`}
                        data-testid={`badge-card-${badgeKey}`}
                      >
                        <div className={`w-11 h-11 rounded-xl ${def.bg} border ${def.border} flex items-center justify-center shrink-0`}>
                          <def.Icon className={`w-5 h-5 ${def.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-black uppercase tracking-wider ${def.color} leading-none mb-0.5`}>
                            {def.label}
                          </p>
                          <p className="text-sm font-display font-black text-white uppercase tracking-tight truncate">
                            {winner.teamName}
                          </p>
                          <p className="text-[10px] text-muted-foreground opacity-60 truncate">
                            {badgeKey === "p1_constructor" ? winner.constructorName : winner.driverName}
                            {" · "}
                            {badgeKey === "p1_constructor"
                              ? `${winner.constructorPoints} pts`
                              : `${winner.driverPoints} pts`}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                    Tutti i giocatori
                  </p>
                </div>
                <div className="divide-y divide-white/5">
                  {players.map(player => (
                    <div
                      key={player.userId}
                      data-testid={`player-badge-row-${player.userId}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white uppercase tracking-tight truncate">
                          {player.teamName}
                        </p>
                        <p className="text-[10px] text-muted-foreground opacity-50 truncate">
                          {player.driverName} · {player.driverPoints} pts &nbsp;|&nbsp; {player.constructorName} · {player.constructorPoints} pts
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {player.badges.length === 0 ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-30">—</span>
                        ) : (
                          player.badges.filter(b => b !== "perfect_weekend").map(badgeKey => {
                            const def = BADGE_DEFS[badgeKey as BadgeKey];
                            if (!def) return null;
                            return (
                              <div
                                key={badgeKey}
                                title={def.label}
                                className={`w-6 h-6 rounded-lg ${def.bg} border ${def.border} flex items-center justify-center`}
                              >
                                <def.Icon className={`w-3 h-3 ${def.color}`} />
                              </div>
                            );
                          })
                        )}
                        {player.badges.includes("perfect_weekend") && (
                          <div
                            title="Perfect Weekend"
                            className={`w-6 h-6 rounded-lg ${BADGE_DEFS.perfect_weekend.bg} border ${BADGE_DEFS.perfect_weekend.border} flex items-center justify-center`}
                          >
                            <Crown className={`w-3 h-3 ${BADGE_DEFS.perfect_weekend.color}`} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Paddock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [leagueName, setLeagueName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");
  const createLobby = useCreateLobby();
  const joinLobby = useJoinLobby();

  const { data: memberships, isLoading } = useQuery<Membership[]>({
    queryKey: ["/api/me"],
    select: (data: any) => data.memberships,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-12 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-6 mb-6 sm:mb-12">
        <div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black text-white uppercase tracking-tighter italic leading-none mb-2">
            Paddock
          </h1>
          <div className="h-1.5 w-24 bg-primary rounded-full ml-1" />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button
            onClick={() => setMode("create")}
            data-testid="button-create-league"
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-display font-black uppercase tracking-tight flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] red-glow shadow-2xl shadow-primary/40"
          >
            <PlusCircle className="w-5 h-5" /> Create League
          </button>
          <button
            onClick={() => setMode("join")}
            data-testid="button-join-league"
            className="flex-1 md:flex-none glass-panel hover:bg-white/10 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-display font-black uppercase tracking-tight flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-2 border-white/10"
          >
            <LogIn className="w-5 h-5 text-primary" /> Join League
          </button>
        </div>
      </div>

      {mode === "create" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto mb-16 glass-panel rounded-3xl p-6 sm:p-10 border-2 border-primary/30 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
            <PlusCircle className="w-8 h-8 text-primary" /> Start New League
          </h2>
          <form onSubmit={(e) => { e.preventDefault(); if (leagueName.trim() && teamName.trim()) createLobby.mutate({ name: leagueName.trim(), teamName: teamName.trim() }, { onSuccess: () => { setMode("list"); setLeagueName(""); setTeamName(""); } }); }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">League Identity</label>
              <input
                placeholder="Enter League Name"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 text-white font-display font-bold uppercase tracking-tight focus:border-primary outline-none transition-all placeholder:text-white/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Your Scuderia</label>
              <input
                placeholder="Enter Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 text-white font-display font-bold uppercase tracking-tight focus:border-primary outline-none transition-all placeholder:text-white/20"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => { setMode("list"); setTeamName(""); }} className="flex-1 py-5 rounded-2xl font-display font-black uppercase tracking-tight text-muted-foreground hover:text-white hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!leagueName.trim() || !teamName.trim() || createLobby.isPending}
                className="flex-[2] bg-primary text-white rounded-2xl py-5 font-display font-black uppercase tracking-tight disabled:opacity-50 hover:bg-primary/90 transition-all red-glow"
              >
                {createLobby.isPending ? "Constructing..." : "Confirm Grid"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {mode === "join" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto mb-16 glass-panel rounded-3xl p-6 sm:p-10 border-2 border-primary/30 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
            <LogIn className="w-8 h-8 text-primary" /> Join The Grid
          </h2>
          <form onSubmit={(e) => { e.preventDefault(); if (code.length >= 4 && teamName.trim()) joinLobby.mutate({ code: code.toUpperCase(), teamName: teamName.trim() }, { onSuccess: () => { setMode("list"); setCode(""); setTeamName(""); } }); }} className="space-y-6">
            <div className="space-y-2 text-center">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">League Invitation Code</label>
              <input
                placeholder="F1-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-6 text-white font-mono text-4xl text-center tracking-[0.4em] uppercase focus:border-primary outline-none transition-all placeholder:text-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Your Scuderia</label>
              <input
                placeholder="Enter Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 text-white font-display font-bold uppercase tracking-tight focus:border-primary outline-none transition-all placeholder:text-white/20"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => { setMode("list"); setTeamName(""); }} className="flex-1 py-5 rounded-2xl font-display font-black uppercase tracking-tight text-muted-foreground hover:text-white hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button
                type="submit"
                disabled={code.length < 4 || !teamName.trim() || joinLobby.isPending}
                className="flex-[2] bg-primary text-white rounded-2xl py-5 font-display font-black uppercase tracking-tight disabled:opacity-50 hover:bg-primary/90 transition-all red-glow"
              >
                {joinLobby.isPending ? "Connecting..." : "Confirm Entry"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {memberships?.map((membership, idx) => (
          <motion.div
            key={membership.lobbyId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Link href={`/lobby/${membership.lobbyId}`}>
              <div className="glass-panel rounded-[2rem] p-3 hover:bg-white/5 hover:border-primary/50 transition-all group cursor-pointer border-2 border-white/5 relative overflow-hidden h-full flex flex-col shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/15 transition-colors" />

                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1 mb-0.5 leading-none">
                      {membership.lobbyName}
                    </h3>
                    <code className="text-[8px] font-mono font-bold text-primary bg-primary/10 px-1 py-0.5 rounded-md uppercase tracking-widest">
                      {membership.lobbyCode}
                    </code>
                  </div>
                  <div className="relative shrink-0">
                    {membership.lobbyImageUrl ? (
                      <img
                        src={membership.lobbyImageUrl}
                        alt={membership.lobbyName}
                        className="w-10 h-10 rounded-2xl object-cover border border-white/10 shadow-inner"
                        data-testid={`img-lobby-${membership.lobbyId}`}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-inner">
                        <span className="text-[9px] font-black text-white/60 group-hover:text-primary transition-colors">{getInitials(membership.lobbyName)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Scuderia</span>
                    <div className="flex items-center gap-1.5">
                      <TeamAvatar name={membership.teamName} size="sm" />
                      <span className="text-xs font-display font-black text-white uppercase tracking-tight">{membership.teamName}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Role</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em] ${
                      membership.role === 'admin' ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.5)]' : 'bg-white/10 text-white border border-white/10'
                    }`}>
                      {membership.role}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-end">
                  <div className="text-[8px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 flex items-center gap-1.5">
                    Enter Paddock <div className="w-3 h-[2px] bg-primary rounded-full" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}

        {memberships?.length === 0 && (
          <div className="col-span-full text-center py-20 glass-panel rounded-3xl border-2 border-dashed border-white/10">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-muted-foreground opacity-20" />
            </div>
            <p className="text-xl font-display font-bold text-muted-foreground uppercase tracking-tight mb-6">Your Grid is Empty</p>
            <button
              onClick={() => setMode("create")}
              className="text-primary hover:text-white font-black uppercase tracking-widest text-xs transition-colors border-b-2 border-primary/20 hover:border-white pb-1"
            >
              Start Your First League
            </button>
          </div>
        )}
      </div>

      {memberships && memberships.length > 0 && (
        <GpRecapSection memberships={memberships} />
      )}
    </div>
  );
}
