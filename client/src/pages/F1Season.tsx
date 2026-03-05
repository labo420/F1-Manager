import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flag, Calendar, ChevronDown, ChevronUp, Zap, Timer, Award, Users, MapPin, Ruler, RotateCcw } from "lucide-react";
import { format } from "date-fns";

type DriverStanding = {
  driverId: number;
  name: string;
  team: string;
  number: number | null;
  totalPoints: number;
  wins: number;
  podiums: number;
};

type ConstructorStanding = {
  constructorId: number;
  name: string;
  color: string | null;
  totalPoints: number;
};

type RaceEntry = {
  id: number;
  name: string;
  round: number | null;
  country: string | null;
  circuitName: string | null;
  circuitLength: string | null;
  laps: number | null;
  date: string;
  isCompleted: boolean;
  isLocked: boolean;
};

type RaceDetail = {
  race: RaceEntry;
  driverResults: Array<{
    id: number;
    driverId: number;
    position: number | null;
    points: number;
    overtakes: number;
    fastestLap: boolean;
    driverName: string;
    driverTeam: string;
  }>;
  constructorResults: Array<{
    constructorId: number;
    points: number;
    constructorName: string;
  }>;
  fastestLapDriver: string | null;
  totalOvertakes: number;
};

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

const TEAM_LOGOS: Record<string, string> = {
  "red bull racing": "/logos/redbull.png",
  "ferrari": "/logos/ferrari.png",
  "mclaren": "/logos/mclaren.png",
  "mercedes": "/logos/mercedes.png",
  "aston martin": "/logos/astonmartin.png",
  "alpine": "/logos/alpine.png",
  "rb": "/logos/racingbulls.png",
  "williams": "/logos/williams.png",
  "audi": "/logos/audi.png",
  "haas": "/logos/haas.png",
  "cadillac": "/logos/cadillac.png",
};

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

function CircuitInfo({ race }: { race: RaceEntry }) {
  const length = race.circuitLength ? parseFloat(race.circuitLength.replace(',', '.')) : null;
  const totalDistance = length && race.laps ? (length * race.laps).toFixed(3) : null;

  if (!race.circuitName && !length && !race.laps) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3" data-testid={`circuit-info-${race.id}`}>
      {race.circuitName && (
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
          <MapPin className="w-4 h-4 text-primary mx-auto mb-1.5" />
          <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Circuit</div>
          <div className="text-white font-bold text-xs leading-tight">{race.circuitName}</div>
        </div>
      )}
      {race.circuitLength && (
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
          <Ruler className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
          <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Length</div>
          <div className="text-white font-bold text-sm">{race.circuitLength.replace(',', '.')} km</div>
        </div>
      )}
      {race.laps && (
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
          <RotateCcw className="w-4 h-4 text-green-400 mx-auto mb-1.5" />
          <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Laps</div>
          <div className="text-white font-bold text-sm">{race.laps}</div>
        </div>
      )}
      {totalDistance && (
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-white/5">
          <Flag className="w-4 h-4 text-yellow-400 mx-auto mb-1.5" />
          <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Total Distance</div>
          <div className="text-white font-bold text-sm">{totalDistance} km</div>
        </div>
      )}
    </div>
  );
}

export default function F1Season() {
  const [tab, setTab] = useState<"drivers" | "constructors" | "archive">("drivers");
  const [expandedRace, setExpandedRace] = useState<number | null>(null);
  const [expandedUpcoming, setExpandedUpcoming] = useState<number | null>(null);

  const { data: driverStandings, isLoading: driversLoading } = useQuery<DriverStanding[]>({
    queryKey: ["/api/f1/driver-standings"],
  });

  const { data: constructorStandings, isLoading: constructorsLoading } = useQuery<ConstructorStanding[]>({
    queryKey: ["/api/f1/constructor-standings"],
  });

  const { data: raceCalendar, isLoading: racesLoading } = useQuery<RaceEntry[]>({
    queryKey: ["/api/f1/races"],
  });

  const { data: raceDetail } = useQuery<RaceDetail>({
    queryKey: ["/api/f1/race", expandedRace, "details"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${expandedRace}/details`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!expandedRace,
  });

  const isLoading = driversLoading || constructorsLoading || racesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const completedRaces = raceCalendar?.filter(r => r.isCompleted) || [];
  const upcomingRaces = raceCalendar?.filter(r => !r.isCompleted) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-16 h-16 bg-primary rounded-tr-2xl rounded-bl-2xl f1-slant flex items-center justify-center red-glow">
            <Flag className="w-8 h-8 text-white f1-slant-reverse" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight" data-testid="text-f1-title">
          F1 2026 <span className="text-primary">World Championship</span>
        </h1>
        <p className="text-muted-foreground mt-3 uppercase tracking-[0.2em] text-[11px] font-bold">
          Official FIA Season Records
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="flex bg-zinc-950/50 p-1 rounded-xl border border-white/5 gap-1">
          {[
            { key: "drivers" as const, label: "Driver Standings", icon: Trophy },
            { key: "constructors" as const, label: "Constructor Standings", icon: Users },
            { key: "archive" as const, label: "Race Archive", icon: Calendar },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`tab-${t.key}`}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                tab === t.key ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.key === "constructors" ? "Teams" : t.key === "archive" ? "Races" : "Drivers"}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "drivers" && (
          <motion.div key="drivers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass-panel rounded-3xl p-1 overflow-hidden">
              <div className="bg-background rounded-[22px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" data-testid="table-driver-standings">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="px-4 py-4 font-bold text-muted-foreground uppercase text-[10px] w-12">Pos</th>
                        <th className="px-4 py-4 font-bold text-muted-foreground uppercase text-[10px]">Driver</th>
                        <th className="px-4 py-4 font-bold text-muted-foreground uppercase text-[10px] hidden md:table-cell">Team</th>
                        <th className="px-4 py-4 font-bold text-muted-foreground uppercase text-[10px] text-center hidden sm:table-cell">Wins</th>
                        <th className="px-4 py-4 font-bold text-muted-foreground uppercase text-[10px] text-center hidden sm:table-cell">Podiums</th>
                        <th className="px-4 py-4 font-bold text-primary uppercase text-[10px] text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverStandings?.map((d, i) => (
                        <motion.tr
                          key={d.driverId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          data-testid={`row-driver-${d.driverId}`}
                          className={`border-b border-border/30 hover:bg-white/5 transition-colors ${i === 0 ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-4 py-4 font-display font-bold text-lg">
                            {i === 0 ? <span className="text-yellow-400">1</span> :
                             i === 1 ? <span className="text-gray-300">2</span> :
                             i === 2 ? <span className="text-amber-600">3</span> :
                             <span className="text-muted-foreground">{i + 1}</span>}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <TeamIcon name={d.team} className="w-5 h-5" />
                              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: TEAM_COLORS[d.team] || "#666" }}></div>
                              <div>
                                <div className="font-bold text-white">{d.name}</div>
                                <div className="text-[10px] text-muted-foreground md:hidden">{d.team}</div>
                              </div>
                              {d.number && <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded hidden lg:inline">#{d.number}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground text-sm hidden md:table-cell">{d.team}</td>
                          <td className="px-4 py-4 text-center text-white font-bold hidden sm:table-cell">{d.wins}</td>
                          <td className="px-4 py-4 text-center text-muted-foreground hidden sm:table-cell">{d.podiums}</td>
                          <td className="px-4 py-4 text-right font-display font-black text-xl text-white">{d.totalPoints}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "constructors" && (
          <motion.div key="constructors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass-panel rounded-3xl p-1 overflow-hidden">
              <div className="bg-background rounded-[22px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" data-testid="table-constructor-standings">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="px-6 py-4 font-bold text-muted-foreground uppercase text-[10px] w-16">Pos</th>
                        <th className="px-6 py-4 font-bold text-muted-foreground uppercase text-[10px]">Constructor</th>
                        <th className="px-6 py-4 font-bold text-primary uppercase text-[10px] text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {constructorStandings?.map((c, i) => (
                        <motion.tr
                          key={c.constructorId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          data-testid={`row-constructor-${c.constructorId}`}
                          className={`border-b border-border/30 hover:bg-white/5 transition-colors ${i === 0 ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-6 py-5 font-display font-bold text-xl">
                            {i === 0 ? <span className="text-yellow-400">1</span> :
                             i === 1 ? <span className="text-gray-300">2</span> :
                             i === 2 ? <span className="text-amber-600">3</span> :
                             <span className="text-muted-foreground">{i + 1}</span>}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: c.color || "#666" }}></div>
                              <TeamIcon name={c.name} className="w-8 h-8" />
                              <span className="font-bold text-white text-lg">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right font-display font-black text-2xl text-white">{c.totalPoints}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "archive" && (
          <motion.div key="archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {completedRaces.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" /> Completed Rounds
                </h2>
                <div className="space-y-3">
                  {completedRaces.map((race) => (
                    <div key={race.id} data-testid={`archive-race-${race.id}`}>
                      <button
                        onClick={() => setExpandedRace(expandedRace === race.id ? null : race.id)}
                        className="w-full glass-panel rounded-2xl p-5 flex items-center justify-between hover:bg-white/5 transition-all group"
                        data-testid={`button-expand-race-${race.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-display font-black text-sm">
                            R{race.round}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-white">{race.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {race.country} · {race.circuitName || ""} · {format(new Date(race.date), "MMM do, yyyy")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] uppercase font-bold bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full">Official</span>
                          {expandedRace === race.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedRace === race.id && raceDetail && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="glass-panel rounded-2xl mt-2 p-6 space-y-6">
                              <CircuitInfo race={race} />

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-zinc-900 rounded-xl p-4 text-center border border-white/5">
                                  <Timer className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                                  <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Fastest Lap</div>
                                  <div className="text-white font-bold">{raceDetail.fastestLapDriver || "N/A"}</div>
                                </div>
                                <div className="bg-zinc-900 rounded-xl p-4 text-center border border-white/5">
                                  <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                                  <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Total Overtakes</div>
                                  <div className="text-white font-bold text-xl">{raceDetail.totalOvertakes}</div>
                                </div>
                                <div className="bg-zinc-900 rounded-xl p-4 text-center border border-white/5">
                                  <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                                  <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Winner</div>
                                  <div className="text-white font-bold">{raceDetail.driverResults[0]?.driverName || "N/A"}</div>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-3">Podium & Full Classification</h3>
                                <div className="space-y-1">
                                  {raceDetail.driverResults.map((dr, idx) => (
                                    <div
                                      key={dr.driverId}
                                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                        idx < 3 ? "bg-zinc-900 border border-white/5" : "hover:bg-white/5"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className={`w-7 text-center font-display font-bold text-sm ${
                                          idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground"
                                        }`}>
                                          P{dr.position ?? "-"}
                                        </span>
                                        <TeamIcon name={dr.driverTeam} className="w-5 h-5" />
                                        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: TEAM_COLORS[dr.driverTeam] || "#666" }}></div>
                                        <div>
                                          <span className="text-white font-bold text-sm">{dr.driverName}</span>
                                          <span className="text-muted-foreground text-xs ml-2">{dr.driverTeam}</span>
                                        </div>
                                        {dr.fastestLap && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase">FL</span>}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        {dr.overtakes > 0 && <span className="text-xs text-yellow-500 font-bold">{dr.overtakes} OT</span>}
                                        <span className="font-display font-bold text-white w-10 text-right">{dr.points}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" /> Upcoming Rounds
              </h2>
              {upcomingRaces.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground">Season complete.</div>
              ) : (
                <div className="space-y-3">
                  {upcomingRaces.map((race) => (
                    <div key={race.id} data-testid={`upcoming-race-${race.id}`}>
                      <button
                        onClick={() => setExpandedUpcoming(expandedUpcoming === race.id ? null : race.id)}
                        className="w-full glass-panel rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-all text-left"
                        data-testid={`button-expand-upcoming-${race.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center text-muted-foreground font-display font-bold text-xs">
                            R{race.round}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{race.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {race.country} · {format(new Date(race.date), "MMM do, yyyy")}
                              {race.circuitName && <span> · {race.circuitName}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {race.isLocked && <span className="text-[9px] uppercase font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Locked</span>}
                          {expandedUpcoming === race.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedUpcoming === race.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="glass-panel rounded-xl mt-1 p-4">
                              <CircuitInfo race={race} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {completedRaces.length === 0 && (
              <div className="glass-panel rounded-2xl p-12 text-center mt-8">
                <Flag className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">Season Not Yet Underway</h3>
                <p className="text-muted-foreground">Official race results will appear here once the Admin enters them.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
