import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flag, Calendar, ChevronDown, Zap, Timer, Award, Users, MapPin, Ruler, RotateCcw, Activity, Gauge, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { DriverAvatar } from "@/components/DriverAvatar";
import { TeamAvatar } from "@/components/TeamAvatar";

const CONSTRUCTOR_LOGOS: Record<string, string> = {
  "Alpine": "/logos/alpine.png",
  "Aston Martin": "/logos/astonmartin.png",
  "Audi": "/logos/audi.png",
  "Cadillac": "/logos/cadillac.png",
  "Ferrari": "/logos/ferrari.png",
  "Haas": "/logos/haas.png",
  "McLaren": "/logos/mclaren.png",
  "Mercedes": "/logos/mercedes.png",
  "RB": "/logos/rb.png",
  "Red Bull Racing": "/logos/redbull.png",
  "Williams": "/logos/williams.png",
};

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
    time?: string | null;
    gap?: string | null;
    status?: string | null;
  }>;
  constructorResults: Array<{
    constructorId: number;
    points: number;
    constructorName: string;
  }>;
  fastestLapDriver: string | null;
  totalOvertakes: number;
};

type QualifyingResult = {
  position: number;
  driverNumber: number;
  driverCode: string | null;
  driverName: string;
  teamName: string;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  gap: string | null;
};

type SprintResult = {
  position: number;
  driverNumber: number;
  driverName: string;
  teamName: string;
  time: string | null;
  gap: string | null;
  status: string | null;
  points: number;
  fastestLap: boolean;
};

type ExternalRaceResult = {
  position: number | null;
  driverNumber: number;
  driverCode: string | null;
  driverName: string;
  teamName: string;
  points: number;
  status: string;
  time: string | null;
  gap: string | null;
  fastestLap: boolean;
  qualifyingPosition: number | null;
  positionText: string;
};

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
      className="inline-block h-[12px] w-auto mr-1.5 align-middle mb-0.5 shadow-sm rounded-sm"
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


function getITAFromUTCTime(utcTimeString: string): { ita: string; utc: string } {
  if (!utcTimeString) return { ita: "TBD", utc: "TBD" };
  const d = new Date(utcTimeString);
  
  // Get UTC time
  const utcHours = d.getUTCHours();
  const utcMins = d.getUTCMinutes();
  const utcTime = `${String(utcHours).padStart(2, "0")}:${String(utcMins).padStart(2, "0")}`;
  
  // Determine CET/CEST offset
  const year = d.getFullYear();
  const lastSundayMarch = new Date(year, 2, 31);
  while (lastSundayMarch.getDay() !== 0) lastSundayMarch.setDate(lastSundayMarch.getDate() - 1);
  const lastSundayOct = new Date(year, 9, 31);
  while (lastSundayOct.getDay() !== 0) lastSundayOct.setDate(lastSundayOct.getDate() - 1);
  
  const isCEST = d >= lastSundayMarch && d < lastSundayOct;
  const offset = isCEST ? 2 : 1;
  
  const itaHours = (utcHours + offset) % 24;
  const itaMins = utcMins;
  const itaTime = `${String(itaHours).padStart(2, "0")}:${String(itaMins).padStart(2, "0")}`;
  
  return { ita: itaTime, utc: utcTime };
}

function SessionTimes({ race }: { race: RaceEntry }) {
  const { data: sessionsStatus } = useQuery({
    queryKey: ["/api/f1/sessions-status"],
    staleTime: 60 * 60 * 1000,
  });

  const raceDate = new Date(race.date);
  const qualDate = subDays(raceDate, 1);
  const sprintQualDate = race.hasSprint ? subDays(raceDate, 2) : null;
  const sprintDate = race.hasSprint ? subDays(raceDate, 1) : null;
  
  let sprintQualData = { ita: "TBD", utc: "TBD" };
  let sprintData = { ita: "TBD", utc: "TBD" };
  let qualData = { ita: "TBD", utc: "TBD" };
  let raceData = { ita: "TBD", utc: "TBD" };
  
  if (sessionsStatus) {
    // Sprint Qualifying (Friday for sprint weekends)
    const sprintQualSession = race.hasSprint ? (sessionsStatus.qualSessions || []).find(s => {
      const sessionDate = new Date(s.date_start);
      const dateMatch = format(sessionDate, "yyyy-MM-dd") === format(sprintQualDate!, "yyyy-MM-dd");
      return dateMatch && s.session_name === "Sprint Qualifying";
    }) : null;
    
    // Sprint (Saturday for sprint weekends)
    const sprintSession = race.hasSprint ? (sessionsStatus.raceSessions || []).find(s => {
      const sessionDate = new Date(s.date_start);
      const dateMatch = format(sessionDate, "yyyy-MM-dd") === format(sprintDate!, "yyyy-MM-dd");
      return dateMatch && s.session_name === "Sprint";
    }) : null;
    
    // Regular Qualifying (Saturday or Friday depending on sprint)
    const qualSession = (sessionsStatus.qualSessions || []).find(s => {
      const sessionDate = new Date(s.date_start);
      const dateMatch = format(sessionDate, "yyyy-MM-dd") === format(qualDate, "yyyy-MM-dd");
      return dateMatch && s.session_name === "Qualifying";
    });
    
    // Race (Sunday)
    const raceSession = (sessionsStatus.raceSessions || []).find(s => {
      const sessionDate = new Date(s.date_start);
      const dateMatch = format(sessionDate, "yyyy-MM-dd") === format(raceDate, "yyyy-MM-dd");
      return dateMatch && s.session_name === "Race";
    });
    
    if (sprintQualSession) {
      sprintQualData = getITAFromUTCTime(sprintQualSession.date_start);
    }
    
    if (sprintSession) {
      sprintData = getITAFromUTCTime(sprintSession.date_start);
    }
    
    if (qualSession) {
      qualData = getITAFromUTCTime(qualSession.date_start);
    }
    
    if (raceSession) {
      raceData = getITAFromUTCTime(raceSession.date_start);
    }
  }
  
  const sessions = [
    ...(race.hasSprint && sprintQualData.ita !== "TBD" ? [{ label: "Sprint Qualifying", date: sprintQualDate!, ita: sprintQualData.ita, utc: sprintQualData.utc }] : []),
    ...(race.hasSprint && sprintData.ita !== "TBD" ? [{ label: "Sprint", date: sprintDate!, ita: sprintData.ita, utc: sprintData.utc }] : []),
    { label: "Qualifying", date: qualDate, ita: qualData.ita, utc: qualData.utc },
    { label: "Race", date: raceDate, ita: raceData.ita, utc: raceData.utc },
  ];

  return (
    <div className="mt-6" data-testid={`session-times-${race.id}`}>
      <div className="space-y-2">
        {sessions.map(session => {
          const dateStr = format(session.date, "MMM dd");
          return (
            <div key={session.label} className="bg-white/5 rounded-lg p-2.5 border border-white/10 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase tracking-widest text-white text-[10px]">{session.label} — {dateStr}</div>
                  <div className="flex items-center gap-4 mt-1 text-[8px]">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-black uppercase tracking-widest">ITA</span>
                      <span className="font-mono font-black text-white text-[10px]">{session.ita}</span>
                    </div>
                    <div className="text-white/20">|</div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-black uppercase tracking-widest">UTC</span>
                      <span className="font-mono font-black text-white">{session.utc}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CircuitInfo({ race }: { race: RaceEntry }) {
  const length = race.circuitLength ? parseFloat(race.circuitLength.replace(',', '.')) : null;
  const totalDistance = length && race.laps ? (length * race.laps).toFixed(3) : null;

  if (!race.circuitName && !length && !race.laps) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2" data-testid={`circuit-info-${race.id}`}>
      {race.circuitName && (
        <div className="bg-zinc-900 rounded-lg p-1.5 text-center border border-white/5">
          <MapPin className="w-3 h-3 text-primary mx-auto mb-1" />
          <div className="text-[8px] text-muted-foreground uppercase font-bold mb-0.25">Circuit</div>
          <div className="text-white font-bold text-[10px]">{getCircuitFlag(race.circuitName || "")} {race.circuitName}</div>
        </div>
      )}
      {race.circuitLength && (
        <div className="bg-zinc-900 rounded-lg p-1.5 text-center border border-white/5">
          <Ruler className="w-3 h-3 text-blue-400 mx-auto mb-1" />
          <div className="text-[8px] text-muted-foreground uppercase font-bold mb-0.25">Length</div>
          <div className="text-white font-bold text-[10px]">{race.circuitLength.replace(',', '.')} km</div>
        </div>
      )}
      {race.laps && (
        <div className="bg-zinc-900 rounded-lg p-1.5 text-center border border-white/5">
          <RotateCcw className="w-3 h-3 text-green-400 mx-auto mb-1" />
          <div className="text-[8px] text-muted-foreground uppercase font-bold mb-0.25">Laps</div>
          <div className="text-white font-bold text-[10px]">{race.laps}</div>
        </div>
      )}
      {totalDistance && (
        <div className="bg-zinc-900 rounded-lg p-1.5 text-center border border-white/5">
          <Flag className="w-3 h-3 text-yellow-400 mx-auto mb-1" />
          <div className="text-[8px] text-muted-foreground uppercase font-bold mb-0.25">Total Distance</div>
          <div className="text-white font-bold text-[10px]">{totalDistance} km</div>
        </div>
      )}
    </div>
  );
}

export default function F1Season() {
  const [tab, setTab] = useState<"drivers" | "constructors" | "archive">("drivers");
  const [expandedRace, setExpandedRace] = useState<number | null>(null);
  const [expandedUpcoming, setExpandedUpcoming] = useState<number | null>(null);
  const [raceSessionTab, setRaceSessionTab] = useState<"race" | "qualifying" | "sprint">("race");
  const [upcomingSessionTab, setUpcomingSessionTab] = useState<"race" | "qualifying" | "sprint">("race");

  const { data: driverStandings, isLoading: driversLoading } = useQuery<DriverStanding[]>({
    queryKey: ["/api/f1/driver-standings"],
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const { data: constructorStandings, isLoading: constructorsLoading } = useQuery<ConstructorStanding[]>({
    queryKey: ["/api/f1/constructor-standings"],
    staleTime: 5 * 60 * 1000,
    retry: 2,
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

  const { data: qualifyingResults, isLoading: qualLoading } = useQuery<QualifyingResult[]>({
    queryKey: ["/api/f1/race", expandedRace, "qualifying"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${expandedRace}/qualifying`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!expandedRace && raceSessionTab === "qualifying",
  });

  const { data: sprintResults, isLoading: sprintLoading } = useQuery<SprintResult[]>({
    queryKey: ["/api/f1/race", expandedRace, "sprint"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${expandedRace}/sprint`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!expandedRace,
  });

  const { data: externalRaceResults, isLoading: extRaceLoading } = useQuery<ExternalRaceResult[]>({
    queryKey: ["/api/f1/race", expandedRace, "external-results"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${expandedRace}/external-results`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!expandedRace && raceSessionTab === "race",
  });

  const { data: upcomingQualResults, isLoading: upcomingQualLoading } = useQuery<QualifyingResult[]>({
    queryKey: ["/api/f1/race", expandedUpcoming, "qualifying"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${expandedUpcoming}/qualifying`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!expandedUpcoming && upcomingSessionTab === "qualifying",
  });

  const { data: upcomingSprintResults, isLoading: upcomingSprintLoading } = useQuery<SprintResult[]>({
    queryKey: ["/api/f1/race", expandedUpcoming, "sprint"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${expandedUpcoming}/sprint`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!expandedUpcoming,
  });

  const { data: upcomingRaceResults, isLoading: upcomingRaceLoading } = useQuery<ExternalRaceResult[]>({
    queryKey: ["/api/f1/race", expandedUpcoming, "external-results"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${expandedUpcoming}/external-results`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!expandedUpcoming && upcomingSessionTab === "race",
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

  const displayDriverStandings = driverStandings ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 sm:mb-16"
      >
        <div className="relative rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-primary/5 rounded-full -mr-64 -mt-32 blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-5 sm:p-8 md:p-12">
            <div className="flex flex-col items-center md:items-start gap-6 text-center md:text-left">
              <div className="flex items-center gap-4">
                <div className="h-8 w-px bg-white/10 hidden md:block" />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/500px-F1.svg.png"
                  alt="Formula 1"
                  className="h-12 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl md:text-6xl font-display font-black text-white uppercase tracking-tighter leading-none mb-2" data-testid="text-f1-title">
                  World Championship
                </h1>
                <p className="text-primary font-black uppercase tracking-[0.3em] text-sm">
                  2026 Season — Official Records
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest">24 Races</span>
                <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest">22 Drivers</span>
                <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest">11 teams</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <div className="flex justify-center mb-8">
        <div className="glass-panel rounded-2xl p-1.5 inline-flex gap-1 border-2 border-white/5 shadow-2xl" data-testid="toggle-f1-tabs">
          {[
            { key: "drivers" as const, label: "Drivers", icon: Trophy },
            { key: "constructors" as const, label: "Teams", icon: Users },
            { key: "archive" as const, label: "Races", icon: Calendar },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`tab-${t.key}`}
              className={`flex items-center gap-2 px-5 py-2 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${
                tab === t.key 
                  ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105 z-10" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              <t.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform ${tab === t.key ? "scale-110" : ""}`} />
              <span>{t.label}</span>
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
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-2.5 py-1.5 font-black text-muted-foreground uppercase text-[7px] md:text-[10px] tracking-widest w-10">Pos</th>
                        <th className="px-2.5 py-1.5 font-black text-muted-foreground uppercase text-[7px] md:text-[10px] tracking-widest">Driver</th>
                        <th className="px-2.5 py-1.5 font-black text-muted-foreground uppercase text-[7px] md:text-[10px] tracking-widest hidden md:table-cell">Team</th>
                        <th className="px-2.5 py-1.5 font-black text-muted-foreground uppercase text-[7px] md:text-[10px] tracking-widest text-center hidden sm:table-cell">Wins</th>
                        <th className="px-2.5 py-1.5 font-black text-muted-foreground uppercase text-[7px] md:text-[10px] tracking-widest text-center hidden sm:table-cell">Podiums</th>
                        <th className="px-2.5 py-1.5 font-black text-primary uppercase text-[7px] md:text-[10px] tracking-widest text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {displayDriverStandings.map((d, i) => (
                        <motion.tr
                          key={d.driverId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          data-testid={`row-driver-${d.driverId}`}
                          className={`group hover:bg-white/10 transition-all duration-300 ${i === 0 ? "bg-primary/10" : ""}`}
                        >
                          <td className="px-2.5 py-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                              <span className={`font-display font-black text-sm ${
                                i === 0 ? "text-yellow-400" :
                                i === 1 ? "text-gray-300" :
                                i === 2 ? "text-amber-600" :
                                "text-muted-foreground"
                              }`}>
                                {i + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-2.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="relative shrink-0">
                                <DriverAvatar number={d.number ?? undefined} name={d.name} teamColor={TEAM_COLORS[d.team]} />
                                <div 
                                  className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full border border-background shadow-lg" 
                                  style={{ backgroundColor: TEAM_COLORS[d.team] || "#444" }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-display font-black text-xs md:text-sm text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-none mb-0.5 truncate">{d.name}</div>
                                <div className="flex items-center gap-0.5 md:hidden min-w-0">
                                  <TeamAvatar name={d.team} size="sm" />
                                  <span className="text-[6px] text-muted-foreground font-black uppercase tracking-widest truncate">{d.team}</span>
                                </div>
                                {d.number && <span className="text-[6px] font-black text-primary bg-primary/10 px-0.5 py-0.5 rounded tracking-tighter lg:hidden">#</span>}
                              </div>
                              {d.number && <span className="text-[7px] md:text-[9px] font-black text-primary bg-primary/10 px-1 py-0.5 rounded tracking-tighter hidden lg:inline-block shrink-0">#{d.number}</span>}
                            </div>
                          </td>
                          <td className="px-2.5 py-2.5 hidden md:table-cell">
                            <div className="flex items-center gap-1">
                              <TeamAvatar name={d.team} size="sm" />
                              <span className="text-muted-foreground font-black uppercase text-[7px] md:text-[9px] tracking-widest">{d.team}</span>
                            </div>
                          </td>
                          <td className="px-2.5 py-2.5 text-center text-white font-display font-black text-xs hidden sm:table-cell tabular-nums">{d.wins}</td>
                          <td className="px-2.5 py-2.5 text-center text-muted-foreground font-display font-bold text-xs hidden sm:table-cell tabular-nums">{d.podiums}</td>
                          <td className="px-2.5 py-2.5 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-display font-black text-base text-white tracking-tighter tabular-nums leading-none">{d.totalPoints}</span>
                              <span className="text-[5px] md:text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Points</span>
                            </div>
                          </td>
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
            <div className="glass-panel rounded-3xl p-1 overflow-hidden shadow-2xl">
              <div className="bg-background/40 backdrop-blur-sm rounded-[22px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" data-testid="table-constructor-standings">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-2.5 py-1.5 font-black text-muted-foreground uppercase text-[7px] md:text-[10px] tracking-widest w-10">Pos</th>
                        <th className="px-2.5 py-1.5 font-black text-muted-foreground uppercase text-[7px] md:text-[10px] tracking-widest">Constructor</th>
                        <th className="px-2.5 py-1.5 font-black text-primary uppercase text-[7px] md:text-[10px] tracking-widest text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {constructorStandings?.map((c, i) => (
                        <motion.tr
                          key={c.constructorId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          data-testid={`row-constructor-${c.constructorId}`}
                          className={`group hover:bg-white/10 transition-all duration-300 ${i === 0 ? "bg-primary/10" : ""}`}
                        >
                          <td className="px-2.5 py-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                              <span className={`font-display font-black text-sm ${
                                i === 0 ? "text-yellow-400" :
                                i === 1 ? "text-gray-300" :
                                i === 2 ? "text-amber-600" :
                                "text-muted-foreground"
                              }`}>
                                {i + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-2.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {CONSTRUCTOR_LOGOS[c.name] ? (
                                <img src={CONSTRUCTOR_LOGOS[c.name]} alt={c.name} className="h-7 w-auto object-contain shrink-0" />
                              ) : (
                                <div className="w-1.5 h-7 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] shrink-0" style={{ backgroundColor: c.color || "#666", boxShadow: `0 0 15px ${c.color}40` }}></div>
                              )}
                              <TeamAvatar name={c.name} size="lg" />
                              <span className="font-display font-black text-xs md:text-sm text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-none truncate">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-2.5 py-2.5 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-display font-black text-base text-white tracking-tighter tabular-nums leading-none">{c.totalPoints}</span>
                              <span className="text-[5px] md:text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Points</span>
                            </div>
                          </td>
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
              <div className="mb-12">
                <h2 className="text-xl font-display font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-4 px-2">
                  <Award className="w-6 h-6 text-primary" /> 
                  <span>Completed Rounds</span>
                  <div className="h-px flex-1 bg-white/5" />
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {completedRaces.map((race, idx) => (
                    <motion.div 
                      key={race.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      data-testid={`archive-race-${race.id}`}
                    >
                      <button
                        onClick={() => {
                          if (expandedRace === race.id) {
                            setExpandedRace(null);
                          } else {
                            setExpandedRace(race.id);
                            setRaceSessionTab("race");
                          }
                        }}
                        className={`w-full glass-panel rounded-3xl p-6 flex items-center justify-between transition-all duration-300 group relative overflow-hidden border-2 ${
                          expandedRace === race.id ? "bg-white/10 border-primary/50" : "hover:bg-white/5 border-white/5"
                        }`}
                        data-testid={`button-expand-race-${race.id}`}
                      >
                        {expandedRace === race.id && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                        )}
                        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-white/10 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors shrink-0">
                            <span className="text-[10px] font-black text-muted-foreground uppercase leading-none mb-1">RND</span>
                            <span className="text-xl font-display font-black text-white leading-none">{race.round}</span>
                          </div>
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-3 mb-1 min-w-0">
                              <span className="font-display font-black text-base sm:text-2xl text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-none truncate">
                                {race.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">
                              <div className="flex items-center gap-1.5">
                                {getCircuitFlag(race.name)}
                                <span>{race.country}</span>
                              </div>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span>{format(new Date(race.date), "MMM do, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            expandedRace === race.id ? "bg-primary text-white rotate-180" : "bg-white/5 text-muted-foreground group-hover:text-white"
                          }`}>
                            <ChevronDown className="w-6 h-6" />
                          </div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedRace === race.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="glass-panel rounded-3xl mt-3 border-2 border-white/10 shadow-2xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                              <div className="flex items-center gap-1 p-4 pb-0 border-b border-white/5">
                                {[
                                  { key: "race" as const, label: "Race", icon: Trophy },
                                  { key: "qualifying" as const, label: "Qualifying", icon: Gauge },
                                  ...(sprintResults && sprintResults.length > 0 ? [{ key: "sprint" as const, label: "Sprint", icon: Activity }] : []),
                                ].map(st => (
                                  <button
                                    key={st.key}
                                    onClick={() => setRaceSessionTab(st.key)}
                                    data-testid={`tab-session-${st.key}-${race.id}`}
                                    className={`flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] rounded-t-xl transition-all border-b-2 -mb-px ${
                                      raceSessionTab === st.key
                                        ? "text-white border-primary bg-primary/10"
                                        : "text-muted-foreground border-transparent hover:text-white hover:bg-white/5"
                                    }`}
                                  >
                                    <st.icon className="w-3.5 h-3.5" />
                                    <span>{st.label}</span>
                                    {st.key === "sprint" && <span className="text-[8px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full border border-orange-500/30 ml-1">Sprint</span>}
                                  </button>
                                ))}
                              </div>

                              <div className="p-4 sm:p-8">
                                <CircuitInfo race={race} />
                                <SessionTimes race={race} />

                                <AnimatePresence mode="wait">
                                  {raceSessionTab === "race" && (
                                    <motion.div key="race-tab" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                      {extRaceLoading ? (
                                        <div className="flex items-center justify-center py-16">
                                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                      ) : externalRaceResults && externalRaceResults.length > 0 ? (
                                        <>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 max-w-2xl mx-auto">
                                            <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10 hover:border-purple-500/30 transition-colors">
                                              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                <Timer className="w-6 h-6 text-purple-400" />
                                              </div>
                                              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2">Fastest Lap</div>
                                              <div className="text-white font-display font-black text-xl uppercase tracking-tight leading-tight">{externalRaceResults.find(r => r.fastestLap)?.driverName || "N/A"}</div>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10 hover:border-primary/30 transition-colors">
                                              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                <Trophy className="w-6 h-6 text-primary" />
                                              </div>
                                              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2">Winner</div>
                                              <div className="text-white font-display font-black text-xl uppercase tracking-tight leading-tight">{externalRaceResults[0]?.driverName || "N/A"}</div>
                                            </div>
                                          </div>
                                          <div className="mt-10">
                                            <div className="flex items-center mb-6">
                                              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] shrink-0">Race Classification</h3>
                                              <div className="h-px flex-1 bg-white/5 ml-4" />
                                            </div>
                                            <div className="space-y-2">
                                              {externalRaceResults.map((result, idx) => (
                                                <div key={`${result.driverNumber}-${result.driverName}`} className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${idx < 3 ? "bg-white/5 border border-white/10 shadow-lg" : "hover:bg-white/5"}`}>
                                                  <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${idx === 0 ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400" : idx === 1 ? "bg-gray-300/20 border-gray-300/40 text-gray-300" : idx === 2 ? "bg-amber-600/20 border-amber-600/40 text-amber-600" : "bg-white/5 border-white/10 text-muted-foreground"}`}>{result.position ?? (result.positionText || "-")}</div>
                                                    <div className="relative">
                                                      <DriverAvatar name={result.driverName} teamColor={TEAM_COLORS[result.teamName]} />
                                                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background" style={{ backgroundColor: TEAM_COLORS[result.teamName] || "#444" }} />
                                                    </div>
                                                    <div>
                                                      <div className="text-white font-display font-black text-base uppercase tracking-tight flex items-center gap-2">
                                                        {result.driverName}
                                                        {result.fastestLap && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-black tracking-widest border border-purple-500/30">FL</span>}
                                                      </div>
                                                      <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{result.teamName}</div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-6">
                                                    <div className="text-right tabular-nums hidden sm:block">
                                                      <div className="text-sm font-display font-black text-white leading-none">{idx === 0 ? (result.time || "WINNER") : (result.gap || result.status || "DNF")}</div>
                                                      <div className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Interval</div>
                                                    </div>
                                                    <div className="w-12 text-right tabular-nums">
                                                      <div className="text-lg font-display font-black text-primary leading-none">+{Math.round(result.points)}</div>
                                                      <div className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Pts</div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </>
                                      ) : raceDetail ? (
                                        <>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 max-w-2xl mx-auto">
                                            <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10 hover:border-purple-500/30 transition-colors">
                                              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                <Timer className="w-6 h-6 text-purple-400" />
                                              </div>
                                              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2">Fastest Lap</div>
                                              <div className="text-white font-display font-black text-xl uppercase tracking-tight leading-tight">{raceDetail.fastestLapDriver || "N/A"}</div>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10 hover:border-primary/30 transition-colors">
                                              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                <Trophy className="w-6 h-6 text-primary" />
                                              </div>
                                              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2">Winner</div>
                                              <div className="text-white font-display font-black text-xl uppercase tracking-tight leading-tight">{raceDetail.driverResults[0]?.driverName || "N/A"}</div>
                                            </div>
                                          </div>
                                          <div className="mt-10">
                                            <div className="flex items-center mb-6">
                                              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] shrink-0">Race Classification</h3>
                                              <div className="h-px flex-1 bg-white/5 ml-4" />
                                            </div>
                                            <div className="space-y-2">
                                              {raceDetail.driverResults.map((dr, idx) => (
                                                <div key={dr.driverId} className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${idx < 3 ? "bg-white/5 border border-white/10 shadow-lg" : "hover:bg-white/5"}`}>
                                                  <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${idx === 0 ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400" : idx === 1 ? "bg-gray-300/20 border-gray-300/40 text-gray-300" : idx === 2 ? "bg-amber-600/20 border-amber-600/40 text-amber-600" : "bg-white/5 border-white/10 text-muted-foreground"}`}>{dr.position ?? "-"}</div>
                                                    <div className="relative">
                                                      <DriverAvatar name={dr.driverName} teamColor={TEAM_COLORS[dr.driverTeam]} />
                                                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background" style={{ backgroundColor: TEAM_COLORS[dr.driverTeam] || "#444" }} />
                                                    </div>
                                                    <div>
                                                      <div className="text-white font-display font-black text-base uppercase tracking-tight flex items-center gap-2">
                                                        {dr.driverName}
                                                        {dr.fastestLap && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-black tracking-widest border border-purple-500/30">FL</span>}
                                                      </div>
                                                      <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{dr.driverTeam}</div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-6">
                                                    <div className="text-right tabular-nums hidden sm:block">
                                                      <div className="text-sm font-display font-black text-white leading-none">{idx === 0 ? (dr.time || "WINNER") : (dr.gap || dr.status || "DNF")}</div>
                                                      <div className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Interval</div>
                                                    </div>
                                                    <div className="w-12 text-right tabular-nums">
                                                      <div className="text-lg font-display font-black text-primary leading-none">+{dr.points}</div>
                                                      <div className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Pts</div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                          <Trophy className="w-12 h-12 mb-4 opacity-20" />
                                          <p className="font-display font-black uppercase tracking-widest text-sm">Race Data Unavailable</p>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}

                                  {raceSessionTab === "qualifying" && (
                                    <motion.div key="qual-tab" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
                                      {qualLoading ? (
                                        <div className="flex items-center justify-center py-16">
                                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                      ) : !qualifyingResults || qualifyingResults.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                          <Gauge className="w-12 h-12 mb-4 opacity-20" />
                                          <p className="font-display font-black uppercase tracking-widest text-sm">Qualifying Data Unavailable</p>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center mb-6">
                                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] shrink-0">Qualifying Classification</h3>
                                            <div className="h-px flex-1 bg-white/5 ml-4" />
                                          </div>
                                          <div className="overflow-x-auto">
                                            <table className="w-full">
                                              <thead>
                                                <tr className="border-b border-white/5">
                                                  <th className="pb-3 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest w-10">P</th>
                                                  <th className="pb-3 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Driver</th>
                                                  <th className="pb-3 text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Q1</th>
                                                  <th className="pb-3 text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Q2</th>
                                                  <th className="pb-3 text-right text-[9px] font-black text-yellow-400 uppercase tracking-widest">Q3 / Best</th>
                                                  <th className="pb-3 text-right text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-4">Gap</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-white/5">
                                                {qualifyingResults.map((q, idx) => (
                                                  <tr key={q.position} className={`transition-all ${idx === 0 ? "bg-yellow-400/5" : "hover:bg-white/5"}`}>
                                                    <td className="py-4">
                                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border ${idx === 0 ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400" : idx === 1 ? "bg-gray-300/10 border-gray-300/20 text-gray-300" : idx === 2 ? "bg-amber-600/10 border-amber-600/20 text-amber-600" : "bg-white/5 border-white/10 text-muted-foreground"}`}>{q.position}</div>
                                                    </td>
                                                    <td className="py-4">
                                                      <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                          <DriverAvatar name={q.driverName} teamColor={TEAM_COLORS[q.teamName]} />
                                                          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background" style={{ backgroundColor: TEAM_COLORS[q.teamName] || "#444" }} />
                                                        </div>
                                                        <div>
                                                          <div className="text-white font-display font-black text-sm uppercase tracking-tight">{q.driverName}</div>
                                                          <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{q.teamName}</div>
                                                        </div>
                                                      </div>
                                                    </td>
                                                    <td className="py-4 text-center font-mono text-xs text-muted-foreground hidden md:table-cell">{q.q1 || "—"}</td>
                                                    <td className="py-4 text-center font-mono text-xs text-muted-foreground hidden md:table-cell">{q.q2 || "—"}</td>
                                                    <td className="py-4 text-right">
                                                      <span className={`font-mono text-sm font-black ${idx === 0 ? "text-yellow-400" : "text-white"}`}>{q.q3 || q.q2 || q.q1 || "—"}</span>
                                                    </td>
                                                    <td className="py-4 text-right pl-4">
                                                      {idx === 0 ? (
                                                        <span className="text-[9px] bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded-full font-black tracking-widest border border-yellow-400/30">POLE</span>
                                                      ) : (
                                                        <span className="font-mono text-xs text-red-400 font-black">{q.gap || "—"}</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </>
                                      )}
                                    </motion.div>
                                  )}

                                  {raceSessionTab === "sprint" && (
                                    <motion.div key="sprint-tab" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
                                      {sprintLoading ? (
                                        <div className="flex items-center justify-center py-16">
                                          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                      ) : !sprintResults || sprintResults.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                          <Activity className="w-12 h-12 mb-4 opacity-20" />
                                          <p className="font-display font-black uppercase tracking-widest text-sm">Sprint Data Unavailable</p>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center mb-6">
                                            <div className="flex items-center gap-3 shrink-0">
                                              <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-500/30">Sprint Race</span>
                                              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Results</h3>
                                            </div>
                                            <div className="h-px flex-1 bg-white/5 ml-4" />
                                          </div>
                                          <div className="space-y-2">
                                            {sprintResults.map((sr, idx) => (
                                              <div key={sr.position} className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${idx < 3 ? "bg-white/5 border border-white/10 shadow-lg" : "hover:bg-white/5"}`}>
                                                <div className="flex items-center gap-4">
                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${idx === 0 ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400" : idx === 1 ? "bg-gray-300/20 border-gray-300/40 text-gray-300" : idx === 2 ? "bg-amber-600/20 border-amber-600/40 text-amber-600" : "bg-white/5 border-white/10 text-muted-foreground"}`}>{sr.position}</div>
                                                  <div className="relative">
                                                    <DriverAvatar name={sr.driverName} teamColor={TEAM_COLORS[sr.teamName]} />
                                                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background" style={{ backgroundColor: TEAM_COLORS[sr.teamName] || "#444" }} />
                                                  </div>
                                                  <div>
                                                    <div className="text-white font-display font-black text-base uppercase tracking-tight flex items-center gap-2">
                                                      {sr.driverName}
                                                      {sr.fastestLap && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-black tracking-widest border border-purple-500/30">FL</span>}
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{sr.teamName}</div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                  <div className="text-right tabular-nums hidden sm:block">
                                                    <div className="text-sm font-display font-black text-white leading-none">{idx === 0 ? (sr.time || "WINNER") : (sr.gap || sr.status || "DNF")}</div>
                                                    <div className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Gap</div>
                                                  </div>
                                                  <div className="w-12 text-right tabular-nums">
                                                    <div className="text-lg font-display font-black text-orange-400 leading-none">+{sr.points}</div>
                                                    <div className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Pts</div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-4 px-2">
                <Calendar className="w-6 h-6 text-muted-foreground" /> 
                <span>Upcoming Grid</span>
                <div className="h-px flex-1 bg-white/5" />
              </h2>
              {upcomingRaces.length === 0 ? (
                <div className="glass-panel rounded-3xl p-6 sm:p-12 text-center text-muted-foreground border-2 border-dashed border-white/10">
                  <Flag className="w-12 h-12 text-primary mx-auto mb-4 opacity-20" />
                  <p className="font-display font-bold uppercase tracking-widest text-sm">Season Grid Complete</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {upcomingRaces.map((race, idx) => (
                    <motion.div 
                      key={race.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      data-testid={`upcoming-race-${race.id}`}
                    >
                      <button
                        onClick={() => setExpandedUpcoming(expandedUpcoming === race.id ? null : race.id)}
                        className={`w-full glass-panel rounded-xl p-3 flex items-center justify-between transition-all duration-300 group border ${
                          expandedUpcoming === race.id ? "bg-white/10 border-white/20" : "hover:bg-white/5 border-white/5"
                        }`}
                        data-testid={`button-expand-upcoming-${race.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white/5 rounded-lg flex flex-col items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors shrink-0">
                            <span className="text-[7px] font-black text-muted-foreground uppercase leading-none">RND</span>
                            <span className="text-xs font-display font-black text-white leading-none">{race.round}</span>
                          </div>
                          <div className="text-left min-w-0">
                            <div className="font-display font-black text-sm text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-none">
                              {race.name}
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                              <div className="flex items-center gap-0.5">
                                {getCircuitFlag(race.name)}
                                <span>{race.country}</span>
                              </div>
                              <span className="w-px h-px rounded-full bg-white/20" />
                              <span>{format(new Date(race.date), "MMM do")}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          expandedUpcoming === race.id ? "bg-white/20 text-white rotate-180" : "bg-white/5 text-muted-foreground group-hover:text-white"
                        }`}>
                          <ChevronDown className="w-4 h-4" />
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
                            <div className="glass-panel rounded-xl mt-2 border border-white/10 shadow-lg relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

                              <div className="p-2 sm:p-3">
                                <CircuitInfo race={race} />
                                <SessionTimes race={race} />

                                <div className="flex items-center justify-center gap-0.5 -mx-2 -ms-3 px-2 sm:px-3 py-1.5 mb-2 border-b border-white/5">
                                  {[
                                    { key: "race" as const, label: "Race", icon: Trophy },
                                    { key: "qualifying" as const, label: "Qualifying", icon: Gauge },
                                    ...(upcomingSprintResults && upcomingSprintResults.length > 0 ? [{ key: "sprint" as const, label: "Sprint", icon: Activity }] : []),
                                  ].map(st => (
                                    <button
                                      key={st.key}
                                      onClick={() => setUpcomingSessionTab(st.key)}
                                      data-testid={`tab-session-upcoming-${st.key}-${race.id}`}
                                      className={`flex items-center gap-2 px-3 py-2 font-black uppercase tracking-[0.15em] rounded-lg transition-all border-b-2 -mb-px text-xs ${
                                        upcomingSessionTab === st.key
                                          ? "text-white bg-primary/20 border-primary text-primary"
                                          : "text-muted-foreground border-transparent hover:text-white hover:bg-white/10"
                                      }`}
                                    >
                                      <st.icon className="w-2.5 h-2.5" />
                                      <span>{st.label}</span>
                                      {st.key === "sprint" && <span className="text-[6px] bg-orange-500/20 text-orange-400 px-1 py-0.25 rounded-full border border-orange-500/30 ml-0.5">Sprint</span>}
                                    </button>
                                  ))}
                                </div>

                                <AnimatePresence mode="wait">
                                  {upcomingSessionTab === "race" && (
                                    <motion.div key="race-tab" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                      {upcomingRaceLoading ? (
                                        <div className="flex items-center justify-center py-16">
                                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                      ) : upcomingRaceResults && upcomingRaceResults.length > 0 ? (
                                        <>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                            <div className="bg-white/5 rounded-lg p-2.5 text-center border border-white/10 hover:border-purple-500/30 transition-colors">
                                              <div className="w-7 h-7 bg-purple-500/10 rounded flex items-center justify-center mx-auto mb-1.5">
                                                <Timer className="w-3.5 h-3.5 text-purple-400" />
                                              </div>
                                              <div className="text-[8px] text-muted-foreground uppercase font-black tracking-[0.15em] mb-1">Fastest Lap</div>
                                              <div className="text-white font-display font-black text-xs uppercase tracking-tight leading-tight">{upcomingRaceResults.find(r => r.fastestLap)?.driverName || "N/A"}</div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-2.5 text-center border border-white/10 hover:border-primary/30 transition-colors">
                                              <div className="w-7 h-7 bg-primary/10 rounded flex items-center justify-center mx-auto mb-1.5">
                                                <Trophy className="w-3.5 h-3.5 text-primary" />
                                              </div>
                                              <div className="text-[8px] text-muted-foreground uppercase font-black tracking-[0.15em] mb-1">Winner</div>
                                              <div className="text-white font-display font-black text-xs uppercase tracking-tight leading-tight">{upcomingRaceResults[0]?.driverName || "N/A"}</div>
                                            </div>
                                          </div>
                                          <div className="mt-3">
                                            <div className="flex items-center mb-2">
                                              <h3 className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] shrink-0">Race Classification</h3>
                                              <div className="h-px flex-1 bg-white/5 ml-2" />
                                            </div>
                                            <div className="space-y-1">
                                              {upcomingRaceResults.map((result, idx) => (
                                                <div key={`${result.driverNumber}-${result.driverName}`} className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 ${idx < 3 ? "bg-white/5 border border-white/10 shadow-lg" : "hover:bg-white/5"}`}>
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black border shrink-0 ${idx === 0 ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400" : idx === 1 ? "bg-gray-300/20 border-gray-300/40 text-gray-300" : idx === 2 ? "bg-amber-600/20 border-amber-600/40 text-amber-600" : "bg-white/5 border-white/10 text-muted-foreground"}`}>{result.position ?? (result.positionText || "-")}</div>
                                                    <div className="relative shrink-0">
                                                      <DriverAvatar name={result.driverName} teamColor={TEAM_COLORS[result.teamName]} />
                                                      <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-background" style={{ backgroundColor: TEAM_COLORS[result.teamName] || "#444" }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                      <div className="text-white font-display font-black text-xs uppercase tracking-tight flex items-center gap-1">
                                                        <span className="truncate">{result.driverName}</span>
                                                        {result.fastestLap && <span className="text-[6px] bg-purple-500/20 text-purple-400 px-1 py-0.25 rounded-full font-black tracking-widest border border-purple-500/30 shrink-0">FL</span>}
                                                      </div>
                                                      <div className="text-[7px] text-muted-foreground font-black uppercase tracking-widest truncate">{result.teamName}</div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right tabular-nums hidden sm:block">
                                                      <div className="text-[9px] font-display font-black text-white leading-none">{idx === 0 ? (result.time || "WINNER") : (result.gap || result.status || "DNF")}</div>
                                                      <div className="text-[6px] text-muted-foreground font-black uppercase tracking-tighter">Int</div>
                                                    </div>
                                                    <div className="text-right tabular-nums">
                                                      <div className="text-xs font-display font-black text-primary leading-none">+{Math.round(result.points)}</div>
                                                      <div className="text-[6px] text-muted-foreground font-black uppercase tracking-tighter">Pts</div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                          <Trophy className="w-12 h-12 mb-4 opacity-20" />
                                          <p className="font-display font-black uppercase tracking-widest text-sm">Race Data Unavailable</p>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}

                                  {upcomingSessionTab === "qualifying" && (
                                    <motion.div key="qual-tab" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
                                      {upcomingQualLoading ? (
                                        <div className="flex items-center justify-center py-16">
                                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                      ) : !upcomingQualResults || upcomingQualResults.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                          <Gauge className="w-12 h-12 mb-4 opacity-20" />
                                          <p className="font-display font-black uppercase tracking-widest text-sm">Qualifying Data Unavailable</p>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center mb-6">
                                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] shrink-0">Qualifying Classification</h3>
                                            <div className="h-px flex-1 bg-white/5 ml-4" />
                                          </div>
                                          <div className="overflow-x-auto">
                                            <table className="w-full">
                                              <thead>
                                                <tr className="border-b border-white/5">
                                                  <th className="pb-3 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest w-10">P</th>
                                                  <th className="pb-3 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Driver</th>
                                                  <th className="pb-3 text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Q1</th>
                                                  <th className="pb-3 text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Q2</th>
                                                  <th className="pb-3 text-right text-[9px] font-black text-yellow-400 uppercase tracking-widest">Q3 / Best</th>
                                                  <th className="pb-3 text-right text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-4">Gap</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-white/5">
                                                {upcomingQualResults.map((q, idx) => (
                                                  <tr key={q.position} className={`transition-all ${idx === 0 ? "bg-yellow-400/5" : "hover:bg-white/5"}`}>
                                                    <td className="py-4">
                                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border ${idx === 0 ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400" : idx === 1 ? "bg-gray-300/10 border-gray-300/20 text-gray-300" : idx === 2 ? "bg-amber-600/10 border-amber-600/20 text-amber-600" : "bg-white/5 border-white/10 text-muted-foreground"}`}>{q.position}</div>
                                                    </td>
                                                    <td className="py-4">
                                                      <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                          <DriverAvatar name={q.driverName} teamColor={TEAM_COLORS[q.teamName]} />
                                                          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background" style={{ backgroundColor: TEAM_COLORS[q.teamName] || "#444" }} />
                                                        </div>
                                                        <div>
                                                          <div className="text-white font-display font-black text-sm uppercase tracking-tight">{q.driverName}</div>
                                                          <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{q.teamName}</div>
                                                        </div>
                                                      </div>
                                                    </td>
                                                    <td className="py-4 text-center font-mono text-xs text-muted-foreground hidden md:table-cell">{q.q1 || "—"}</td>
                                                    <td className="py-4 text-center font-mono text-xs text-muted-foreground hidden md:table-cell">{q.q2 || "—"}</td>
                                                    <td className="py-4 text-right">
                                                      <span className={`font-mono text-sm font-black ${idx === 0 ? "text-yellow-400" : "text-white"}`}>{q.q3 || q.q2 || q.q1 || "—"}</span>
                                                    </td>
                                                    <td className="py-4 text-right pl-4">
                                                      {idx === 0 ? (
                                                        <span className="text-[9px] bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded-full font-black tracking-widest border border-yellow-400/30">POLE</span>
                                                      ) : (
                                                        <span className="font-mono text-xs text-red-400 font-black">{q.gap || "—"}</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </>
                                      )}
                                    </motion.div>
                                  )}

                                  {upcomingSessionTab === "sprint" && (
                                    <motion.div key="sprint-tab" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
                                      {upcomingSprintLoading ? (
                                        <div className="flex items-center justify-center py-16">
                                          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                      ) : !upcomingSprintResults || upcomingSprintResults.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                          <Activity className="w-12 h-12 mb-4 opacity-20" />
                                          <p className="font-display font-black uppercase tracking-widest text-sm">Sprint Data Unavailable</p>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center mb-6">
                                            <div className="flex items-center gap-3 shrink-0">
                                              <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-500/30">Sprint Race</span>
                                              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Results</h3>
                                            </div>
                                            <div className="h-px flex-1 bg-white/5 ml-4" />
                                          </div>
                                          <div className="space-y-2">
                                            {upcomingSprintResults.map((sr, idx) => (
                                              <div key={sr.position} className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${idx < 3 ? "bg-white/5 border border-white/10 shadow-lg" : "hover:bg-white/5"}`}>
                                                <div className="flex items-center gap-4">
                                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${idx === 0 ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400" : idx === 1 ? "bg-gray-300/20 border-gray-300/40 text-gray-300" : idx === 2 ? "bg-amber-600/20 border-amber-600/40 text-amber-600" : "bg-white/5 border-white/10 text-muted-foreground"}`}>{sr.position}</div>
                                                  <div className="relative">
                                                    <DriverAvatar name={sr.driverName} teamColor={TEAM_COLORS[sr.teamName]} />
                                                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background" style={{ backgroundColor: TEAM_COLORS[sr.teamName] || "#444" }} />
                                                  </div>
                                                  <div>
                                                    <div className="text-white font-display font-black text-base uppercase tracking-tight flex items-center gap-2">
                                                      {sr.driverName}
                                                      {sr.fastestLap && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-black tracking-widest border border-purple-500/30">FL</span>}
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{sr.teamName}</div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                  <div className="text-right tabular-nums hidden sm:block">
                                                    <div className="text-sm font-display font-black text-white leading-none">{idx === 0 ? (sr.time || "WINNER") : (sr.gap || sr.status || "DNF")}</div>
                                                    <div className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Gap</div>
                                                  </div>
                                                  <div className="w-12 text-right tabular-nums">
                                                    <div className="text-lg font-display font-black text-orange-400 leading-none">+{sr.points}</div>
                                                    <div className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Pts</div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {completedRaces.length === 0 && (
              <div className="glass-panel rounded-2xl p-6 sm:p-12 text-center mt-8">
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
