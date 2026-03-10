import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Gauge, Radio, ChevronRight, Wifi, WifiOff, RefreshCw } from "lucide-react";

const OF1 = "https://api.openf1.org/v1";

type OpenF1Session = {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_short_name: string;
  country_name: string;
  year: number;
};

type OpenF1Driver = {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  headshot_url: string;
};

type CarData = {
  speed: number;
  rpm: number;
  throttle: number;
  brake: number;
  n_gear: number;
  drs: number;
  date: string;
};

type PositionData = {
  driver_number: number;
  position: number;
  date: string;
};

type IntervalData = {
  driver_number: number;
  interval: number | string;
  gap_to_leader: number | string;
  date: string;
};

type LapData = {
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
};

function isLive(session: OpenF1Session): boolean {
  const now = new Date();
  const start = new Date(session.date_start);
  const end = new Date(session.date_end);
  return now >= start && now <= end;
}

function fmtLap(s: number | null | undefined): string {
  if (!s) return "--:--.---";
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(3).padStart(6, "0");
  return `${m}:${sec}`;
}

function sessionLabel(s: OpenF1Session): string {
  const d = new Date(s.date_start);
  const month = d.toLocaleString("it", { month: "short" }).toUpperCase();
  const day = d.getDate();
  return `${s.circuit_short_name} – ${s.session_name} (${day} ${month})`;
}

function SessionTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    Race: "bg-primary/20 text-primary border-primary/20",
    Qualifying: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
    Practice: "bg-blue-500/20 text-blue-400 border-blue-500/20",
    Sprint: "bg-orange-500/20 text-orange-400 border-orange-500/20",
    "Sprint Qualifying": "bg-orange-400/20 text-orange-300 border-orange-400/20",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${map[type] ?? "bg-white/10 text-white/50 border-white/10"}`}>
      {type}
    </span>
  );
}

function TelemetryBar({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black text-white tabular-nums">{value}<span className="text-[9px] text-white/30 ml-0.5">{unit}</span></span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function GearDisplay({ gear }: { gear: number }) {
  return (
    <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-4">
      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Gear</span>
      <span className="font-display font-black text-5xl text-white leading-none">{gear || "N"}</span>
    </div>
  );
}

function DRSBadge({ drs }: { drs: number }) {
  const active = drs >= 10;
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl p-4 border transition-all ${active ? "bg-green-500/20 border-green-500/40" : "bg-white/5 border-white/10"}`}>
      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">DRS</span>
      <span className={`font-display font-black text-lg ${active ? "text-green-400" : "text-white/20"}`}>{active ? "ON" : "OFF"}</span>
    </div>
  );
}

export function TelemetryPanel() {
  const currentYear = new Date().getFullYear();
  const [selectedSessionKey, setSelectedSessionKey] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<OpenF1Session[]>({
    queryKey: ["openf1-sessions", currentYear],
    queryFn: async () => {
      const res = await fetch(`${OF1}/sessions?year=${currentYear}`);
      if (!res.ok) throw new Error("failed");
      const data: OpenF1Session[] = await res.json();
      return data.reverse();
    },
    staleTime: 60_000,
  });

  const activeSession = sessions?.find(s => s.session_key === selectedSessionKey) ?? null;
  const live = activeSession ? isLive(activeSession) : false;

  useEffect(() => {
    if (!sessions) return;
    if (selectedSessionKey) return;
    const first = sessions[0];
    if (first) setSelectedSessionKey(first.session_key);
  }, [sessions, selectedSessionKey]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, [live]);

  const { data: drivers } = useQuery<OpenF1Driver[]>({
    queryKey: ["openf1-drivers", selectedSessionKey],
    queryFn: async () => {
      const res = await fetch(`${OF1}/drivers?session_key=${selectedSessionKey}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: !!selectedSessionKey,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (!drivers || drivers.length === 0) return;
    if (selectedDriver) return;
    setSelectedDriver(drivers[0].driver_number);
  }, [drivers, selectedDriver]);

  const { data: carDataArr } = useQuery<CarData[]>({
    queryKey: ["openf1-cardata", selectedSessionKey, selectedDriver, tick],
    queryFn: async () => {
      const url = live
        ? `${OF1}/car_data?session_key=latest&driver_number=${selectedDriver}`
        : `${OF1}/car_data?session_key=${selectedSessionKey}&driver_number=${selectedDriver}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: !!selectedSessionKey && !!selectedDriver,
    staleTime: live ? 0 : 300_000,
  });

  const { data: positions } = useQuery<PositionData[]>({
    queryKey: ["openf1-positions", selectedSessionKey, tick],
    queryFn: async () => {
      const url = live
        ? `${OF1}/position?session_key=latest`
        : `${OF1}/position?session_key=${selectedSessionKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: !!selectedSessionKey,
    staleTime: live ? 0 : 300_000,
  });

  const { data: intervals } = useQuery<IntervalData[]>({
    queryKey: ["openf1-intervals", selectedSessionKey, tick],
    queryFn: async () => {
      const url = live
        ? `${OF1}/intervals?session_key=latest`
        : `${OF1}/intervals?session_key=${selectedSessionKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: !!selectedSessionKey,
    staleTime: live ? 0 : 300_000,
  });

  const { data: laps } = useQuery<LapData[]>({
    queryKey: ["openf1-laps", selectedSessionKey, selectedDriver],
    queryFn: async () => {
      const url = live
        ? `${OF1}/laps?session_key=latest&driver_number=${selectedDriver}`
        : `${OF1}/laps?session_key=${selectedSessionKey}&driver_number=${selectedDriver}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: !!selectedSessionKey && !!selectedDriver,
    staleTime: live ? 0 : 300_000,
  });

  const carData: CarData | null = carDataArr && carDataArr.length > 0 ? carDataArr[carDataArr.length - 1] : null;

  const latestPositions = (() => {
    if (!positions || positions.length === 0) return [];
    const byDriver: Record<number, PositionData> = {};
    for (const p of positions) {
      const existing = byDriver[p.driver_number];
      if (!existing || new Date(p.date) > new Date(existing.date)) {
        byDriver[p.driver_number] = p;
      }
    }
    return Object.values(byDriver).sort((a, b) => a.position - b.position);
  })();

  const latestIntervals = (() => {
    if (!intervals || intervals.length === 0) return {} as Record<number, IntervalData>;
    const byDriver: Record<number, IntervalData> = {};
    for (const i of intervals) {
      const existing = byDriver[i.driver_number];
      if (!existing || new Date(i.date) > new Date(existing.date)) {
        byDriver[i.driver_number] = i;
      }
    }
    return byDriver;
  })();

  const lastLap = laps && laps.length > 0 ? laps[laps.length - 1] : null;
  const bestLap = laps && laps.length > 0
    ? laps.reduce((best, l) => (l.lap_duration && (!best.lap_duration || l.lap_duration < best.lap_duration)) ? l : best, laps[0])
    : null;

  const driverInfo = drivers?.find(d => d.driver_number === selectedDriver);
  const driverPos = latestPositions.find(p => p.driver_number === selectedDriver);
  const driverInterval = selectedDriver ? latestIntervals[selectedDriver] : null;
  const teamColor = driverInfo?.team_colour ? `#${driverInfo.team_colour}` : "#e10600";

  const sessionGroups = (() => {
    if (!sessions) return [];
    const seen = new Set<number>();
    const out: OpenF1Session[] = [];
    for (const s of sessions) {
      if (!seen.has(s.session_key)) {
        seen.add(s.session_key);
        out.push(s);
      }
    }
    return out.slice(0, 20);
  })();

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          {live ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-white/30" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Archivio</span>
            </>
          )}
        </div>
        {live && (
          <span className="text-[9px] text-white/30 font-medium">Aggiorna ogni 5s</span>
        )}
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 pb-2" style={{ width: "max-content" }}>
          {sessionGroups.map(s => {
            const isSelected = s.session_key === selectedSessionKey;
            const isSessionLive = isLive(s);
            return (
              <button
                key={s.session_key}
                onClick={() => { setSelectedSessionKey(s.session_key); setSelectedDriver(null); }}
                data-testid={`btn-session-${s.session_key}`}
                className={`flex flex-col gap-1 px-3 py-2.5 rounded-xl border text-left transition-all shrink-0 ${
                  isSelected
                    ? "bg-primary/10 border-primary/40 text-white"
                    : "bg-white/[0.03] border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest">{s.circuit_short_name}</span>
                  {isSessionLive && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                </div>
                <SessionTypeBadge type={s.session_name} />
                <span className="text-[8px] text-white/30 font-medium">
                  {new Date(s.date_start).toLocaleDateString("it", { day: "numeric", month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeSession && (
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-black text-white uppercase tracking-tight">{activeSession.circuit_short_name} · {activeSession.country_name}</p>
            <p className="text-[10px] text-white/30 font-medium">{sessionLabel(activeSession)}</p>
          </div>
          <SessionTypeBadge type={activeSession.session_name} />
        </div>
      )}

      {drivers && drivers.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Seleziona pilota</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
            {drivers.map(d => {
              const isSelected = d.driver_number === selectedDriver;
              const pos = latestPositions.find(p => p.driver_number === d.driver_number);
              return (
                <button
                  key={d.driver_number}
                  onClick={() => setSelectedDriver(d.driver_number)}
                  data-testid={`btn-driver-${d.driver_number}`}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                    isSelected
                      ? "border-2 bg-white/10"
                      : "border border-white/5 hover:border-white/20 hover:bg-white/5"
                  }`}
                  style={isSelected ? { borderColor: `#${d.team_colour}`, boxShadow: `0 0 12px #${d.team_colour}30` } : {}}
                >
                  {pos && (
                    <span className="text-[8px] font-black text-white/30 leading-none">{pos.position}°</span>
                  )}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                    style={{ backgroundColor: `#${d.team_colour}30`, border: `1.5px solid #${d.team_colour}80` }}
                  >
                    {d.name_acronym}
                  </div>
                  <span className="text-[7px] font-black text-white/40 uppercase">{d.name_acronym}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {carData && driverInfo && (
          <motion.div key={selectedDriver} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass-panel rounded-2xl border border-white/5 p-5">
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                  style={{ backgroundColor: `#${driverInfo.team_colour}30`, border: `2px solid #${driverInfo.team_colour}` }}
                >
                  {driverInfo.name_acronym}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-black text-white text-base uppercase tracking-tight truncate">{driverInfo.full_name}</p>
                  <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">{driverInfo.team_name}</p>
                </div>
                <div className="text-right shrink-0">
                  {driverPos && (
                    <div className="text-2xl font-display font-black text-white leading-none">{driverPos.position}°</div>
                  )}
                  {driverInterval && (
                    <div className="text-[9px] text-white/30 font-medium mt-0.5">
                      {driverPos?.position === 1
                        ? "Leader"
                        : typeof driverInterval.gap_to_leader === "number"
                          ? `+${Number(driverInterval.gap_to_leader).toFixed(3)}s`
                          : driverInterval.gap_to_leader}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <TelemetryBar value={carData.speed} max={380} color={teamColor} label="Speed" unit=" km/h" />
                <TelemetryBar value={carData.rpm} max={15000} color="#6366f1" label="RPM" unit="" />
                <TelemetryBar value={carData.throttle} max={100} color="#22c55e" label="Throttle" unit="%" />
                <TelemetryBar value={carData.brake} max={100} color="#ef4444" label="Brake" unit="%" />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <GearDisplay gear={carData.n_gear} />
                <DRSBadge drs={carData.drs} />
              </div>
            </div>

            {(lastLap || bestLap) && (
              <div className="glass-panel rounded-2xl border border-white/5 p-5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Tempi Giro</p>
                <div className="grid grid-cols-2 gap-4">
                  {lastLap && (
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Ultimo Giro</p>
                      <p className="font-display font-black text-white text-lg leading-none tabular-nums">{fmtLap(lastLap.lap_duration ?? undefined)}</p>
                      <p className="text-[8px] text-white/20 mt-1 font-bold">Giro {lastLap.lap_number}</p>
                    </div>
                  )}
                  {bestLap && (
                    <div className="bg-purple-500/10 rounded-xl p-3 text-center border border-purple-500/20">
                      <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-1">Miglior Giro</p>
                      <p className="font-display font-black text-purple-300 text-lg leading-none tabular-nums">{fmtLap(bestLap.lap_duration ?? undefined)}</p>
                      <p className="text-[8px] text-purple-400/50 mt-1 font-bold">Giro {bestLap.lap_number}</p>
                    </div>
                  )}
                </div>

                {lastLap && lastLap.duration_sector_1 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[lastLap.duration_sector_1, lastLap.duration_sector_2, lastLap.duration_sector_3].map((sec, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
                        <p className="text-[7px] font-black text-white/30 uppercase tracking-widest mb-0.5">S{i + 1}</p>
                        <p className="font-display font-black text-white text-xs tabular-nums">{sec?.toFixed(3) ?? "--"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {latestPositions.length > 0 && (
              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Classifica</p>
                </div>
                <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                  {latestPositions.slice(0, 20).map((pos) => {
                    const drv = drivers?.find(d => d.driver_number === pos.driver_number);
                    const intv = latestIntervals[pos.driver_number];
                    const isMe = pos.driver_number === selectedDriver;
                    return (
                      <button
                        key={pos.driver_number}
                        onClick={() => setSelectedDriver(pos.driver_number)}
                        data-testid={`row-classifica-${pos.driver_number}`}
                        className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all hover:bg-white/5 ${isMe ? "bg-white/10" : ""}`}
                      >
                        <span className={`w-5 text-center text-[10px] font-black shrink-0 ${
                          pos.position === 1 ? "text-yellow-400" :
                          pos.position === 2 ? "text-gray-300" :
                          pos.position === 3 ? "text-amber-600" : "text-white/40"
                        }`}>{pos.position}</span>
                        <div
                          className="w-1 h-6 rounded-full shrink-0"
                          style={{ backgroundColor: drv ? `#${drv.team_colour}` : "#666" }}
                        />
                        <span className="text-xs font-black text-white uppercase flex-1 min-w-0 truncate">{drv?.name_acronym ?? `#${pos.driver_number}`}</span>
                        <span className="text-[9px] text-white/30 font-medium shrink-0 tabular-nums">
                          {pos.position === 1
                            ? "Leader"
                            : intv
                              ? (typeof intv.gap_to_leader === "number"
                                  ? `+${Number(intv.gap_to_leader).toFixed(3)}`
                                  : intv.gap_to_leader)
                              : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {selectedSessionKey && !carData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-3 text-white/30">
            <Activity className="w-10 h-10 opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest">Nessun dato telemetrico disponibile</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
