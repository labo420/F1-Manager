import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Users, Star, Lock, Calendar, ChevronLeft, Flag, Zap, Wrench, Crown, ChevronRight, Medal } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
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
  "Saudi Arabia": "sa", "Miami": "us", "Emilia Romagna": "it", "Monaco": "mc",
  "Spain": "es", "Canada": "ca", "Austria": "at", "United Kingdom": "gb",
  "Belgium": "be", "Hungary": "hu", "Netherlands": "nl", "Italy": "it",
  "Azerbaijan": "az", "Singapore": "sg", "United States": "us", "Mexico": "mx",
  "Brazil": "br", "Sao Paulo": "br", "Las Vegas": "us", "Qatar": "qa",
  "Abu Dhabi": "ae", "UAE": "ae", "UK": "gb", "USA": "us",
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

export default function LobbyDetail({ id }: { id: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);
  const [badgeRaceId, setBadgeRaceId] = useState<number | null>(null);

  const { data: lobby, isLoading: loadingLobby } = useQuery<Lobby>({
    queryKey: [`/api/lobby/${id}`],
  });

  const { data: races, isLoading: loadingRaces } = useQuery<Race[]>({
    queryKey: ["/api/races"],
  });

  const { data: mySelections, isLoading: loadingSelections } = useQuery<Selection[]>({
    queryKey: [`/api/selections/${id}/me`],
  });

  const { data: members, isLoading: loadingMembers } = useQuery<(LobbyMember & { username: string })[]>({
    queryKey: [`/api/lobby/${id}/members`],
  });

  const { data: usage, isLoading: loadingUsage } = useQuery<any>({
    queryKey: [`/api/usage/${id}`],
    initialData: {
      driverUsage: {},
      constructorUsage: {},
      driverJolliesRemaining: 2,
      constructorJolliesRemaining: 2,
      jolliesRemaining: 4
    }
  });

  const completedRaces = races?.filter(r => r.isCompleted) ?? [];

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

  const currentMember = members?.find(m => m.userId === user?.id);
  const nextRace = races?.find(r => !r.isCompleted) || races?.[races.length - 1];

  if (loadingLobby || loadingRaces || loadingMembers || loadingUsage) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lobby) return <div>Lobby not found</div>;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => setLocation("/paddock")}
          className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
          title="Back to League List"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="mb-12 flex items-center gap-6">
        {lobby.imageUrl ? (
          <img src={lobby.imageUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-xl shrink-0" />
        ) : (
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
            <span className="text-lg font-black text-white/40">{getInitials(lobby.name)}</span>
          </div>
        )}
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tighter leading-none">{lobby.name}</h1>
          <p className="text-xs font-mono text-white/40 uppercase tracking-[0.1em] mt-3">League Code: {lobby.code}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-2 px-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <div>
              <p className="text-[10px] uppercase text-muted-foreground leading-none">Driver Jollies</p>
              <p className="text-xl font-bold leading-tight">{usage?.driverJolliesRemaining ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-2 px-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-blue-500 fill-blue-500" />
            <div>
              <p className="text-[10px] uppercase text-muted-foreground leading-none">Team Jollies</p>
              <p className="text-xl font-bold leading-tight">{usage?.constructorJolliesRemaining ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="predictions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Next Race: {nextRace?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nextRace ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{nextRace.circuitName}</p>
                          <p className="text-sm text-muted-foreground">{nextRace.country}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{format(new Date(nextRace.date), "PPP")}</p>
                          <Badge variant={nextRace.isLocked ? "destructive" : "secondary"}>
                            {nextRace.isLocked ? "Locked" : "Open for Predictions"}
                          </Badge>
                        </div>
                      </div>

                      {!nextRace.isLocked ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <p className="text-muted-foreground mb-4">Click below to make your choices for this race.</p>
                          <Link href={`/draft/${id}/${nextRace.id}`}>
                            <Button>Go to Draft Room</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                          <Lock className="w-4 h-4" />
                          <span>Predictions are locked for this race</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>No upcoming races.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Current Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  {nextRace && mySelections?.find(s => s.raceId === nextRace.id) ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase">Driver</p>
                        <p className="font-bold">Selection Saved</p>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase">Constructor</p>
                        <p className="font-bold">Selection Saved</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-4 text-muted-foreground italic">No selection made yet for the upcoming race.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">League Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Players</span>
                    <span className="font-bold">{members?.length || 0}/10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Races Completed</span>
                    <span className="font-bold">{races?.filter(r => r.isCompleted).length || 0}/{races?.length || 24}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2 italic">Official F1 2026 Season</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="standings">
          {completedRaces.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Flag className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground italic text-sm">Standings will be available after the first race results are in.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {completedRaces.map(race => (
                  <button
                    key={race.id}
                    data-testid={`race-selector-${race.id}`}
                    onClick={() => setSelectedRaceId(race.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                      selectedRaceId === race.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-white/10 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    R{race.round ?? "?"} {race.country}
                  </button>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    {completedRaces.find(r => r.id === selectedRaceId)?.name ?? "Race Standings"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2 md:px-4 md:pb-4">
                  {loadingStandings ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : !raceStandings || raceStandings.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground italic text-sm">No data for this race.</p>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-xs uppercase text-muted-foreground">
                              <th className="py-2 pl-2 text-left w-8">#</th>
                              <th className="py-2 text-left">Scuderia / Manager</th>
                              <th className="py-2 text-left">Driver</th>
                              <th className="py-2 text-left">Constructor</th>
                              <th className="py-2 text-right pr-2">D Pts</th>
                              <th className="py-2 text-right">C Pts</th>
                              <th className="py-2 text-right pr-3">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {raceStandings.map((entry, idx) => (
                              <tr
                                key={entry.userId}
                                data-testid={`standings-row-${entry.userId}`}
                                className={`border-b border-white/5 transition-colors hover:bg-white/5 ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : ""}`}
                              >
                                <td className="py-2.5 pl-2 font-bold text-sm">{idx + 1}</td>
                                <td className="py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                      {entry.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-xs leading-tight">{entry.teamName}</p>
                                      <p className="text-[10px] text-muted-foreground">@{entry.username}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 text-xs">{entry.driverName ?? <span className="text-muted-foreground italic">—</span>}</td>
                                <td className="py-2.5 text-xs">{entry.constructorName ?? <span className="text-muted-foreground italic">—</span>}</td>
                                <td className="py-2.5 text-right pr-2 font-mono text-xs">{entry.driverPoints}</td>
                                <td className="py-2.5 text-right font-mono text-xs">{entry.constructorPoints}</td>
                                <td className="py-2.5 text-right pr-3 font-bold">{entry.totalPoints}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="md:hidden space-y-2">
                        {raceStandings.map((entry, idx) => (
                          <div
                            key={entry.userId}
                            data-testid={`standings-card-${entry.userId}`}
                            className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 flex items-center gap-3"
                          >
                            <span className={`text-sm font-black w-5 text-center shrink-0 ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                              {idx + 1}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {entry.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs leading-tight truncate">{entry.teamName}</p>
                              <p className="text-[10px] text-muted-foreground truncate">@{entry.username}</p>
                              <div className="flex gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground/70">{entry.driverName ?? "—"}</span>
                                <span className="text-[10px] text-muted-foreground/40">·</span>
                                <span className="text-[10px] text-muted-foreground/70">{entry.constructorName ?? "—"}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-1">
                              <p className="font-bold text-sm leading-tight">{entry.totalPoints}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                <span className="text-blue-400">{entry.driverPoints}</span>
                                <span className="text-muted-foreground/40"> + </span>
                                <span className="text-emerald-400">{entry.constructorPoints}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="badges">
          {completedRaces.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Medal className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground italic text-sm">I badge saranno disponibili dopo la prima gara completata.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                    Seleziona Gara
                  </p>
                </div>
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {completedRaces.map(race => (
                    <button
                      key={race.id}
                      onClick={() => setBadgeRaceId(race.id)}
                      data-testid={`button-badge-race-${race.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 ${
                        badgeRaceId === race.id ? "bg-primary/10 border-l-2 border-primary" : "border-l-2 border-transparent"
                      }`}
                    >
                      <RaceFlag country={race.country ?? ""} size={22} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black uppercase tracking-tight truncate ${badgeRaceId === race.id ? "text-primary" : "text-white"}`}>
                          {race.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground opacity-50 font-mono">
                          R{race.round ?? "—"} · {race.date}
                        </p>
                      </div>
                      {badgeRaceId === race.id && (
                        <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2">
                {badgesLoading ? (
                  <div className="glass-panel rounded-2xl border border-white/5 flex items-center justify-center min-h-[200px]">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : badgePlayers.length === 0 ? (
                  <div className="glass-panel rounded-2xl border border-white/5 flex items-center justify-center min-h-[200px]">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40">
                      Nessuna pick per questa gara
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(["perfect_weekend", "pole_position", "fastest_lap", "p1_constructor"] as BadgeKey[]).map(badgeKey => {
                        const winner = badgePlayers.find(p => p.badges.includes(badgeKey));
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

                    <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                          Tutti i giocatori
                        </p>
                      </div>
                      <div className="divide-y divide-white/5">
                        {badgePlayers.map(player => (
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
          )}
        </TabsContent>

        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Player List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {members?.map((member) => (
                  <div key={member.userId} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.teamName}</p>
                        <p className="text-xs text-muted-foreground">Manager: @{member.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {member.role === "admin" && (
                        <Badge variant="outline" className="text-[10px] uppercase">Admin</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
