import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRaces } from "@/hooks/use-races";
import { motion } from "framer-motion";
import { Trophy, Timer, ChevronLeft, MapPin, Calendar as CalendarIcon, Flag } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

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

export default function RaceResults() {
  const [, params] = useRoute("/race/:id/results");
  const raceId = Number(params?.id);
  
  const { data: races } = useRaces();
  const race = races?.find(r => r.id === raceId);

  const { data: results, isLoading } = useQuery<any[]>({
    queryKey: ["/api/f1/race", raceId, "external-results"],
    enabled: !!raceId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 pb-24">
      <Link href="/">
        <button className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Command Center</span>
        </button>
      </Link>

      {race && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-1 rounded border border-primary/20 uppercase tracking-tighter">
                  Round {race.round}
                </span>
                <span className="bg-white/5 text-white/50 text-[10px] font-black px-2 py-1 rounded border border-white/10 uppercase tracking-tighter">
                  Official Classification
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter italic leading-none mb-4">
                {race.name}
              </h1>
              <div className="flex flex-wrap gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest">{race.circuitName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest">{format(new Date(race.date), "MMMM do, yyyy")}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="glass-panel rounded-[2rem] overflow-hidden border-2 border-white/5 shadow-2xl">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pos</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Driver</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Constructor</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Time/Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results?.map((res, idx) => (
                <motion.tr 
                  key={res.driverId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className={`
                      text-lg font-display font-black italic
                      ${res.position === "1" ? "text-yellow-500" : res.position === "2" ? "text-zinc-400" : res.position === "3" ? "text-orange-500" : "text-white/40"}
                    `}>
                      {res.position.padStart(2, '0')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-1 h-6 rounded-full" 
                        style={{ backgroundColor: TEAM_COLORS[res.constructorName] || "#ffffff" }}
                      />
                      <div>
                        <div className="text-sm font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                          {res.driverName}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          #{res.driverNumber}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                      {res.constructorName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {res.time || res.status}
                      </span>
                      {res.fastestLap && (
                        <div className="relative group/lap">
                          <Timer className="w-3.5 h-3.5 text-purple-500 animate-pulse shadow-purple-500/50" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-purple-600 text-[8px] font-black text-white rounded opacity-0 group-hover/lap:opacity-100 transition-opacity whitespace-nowrap">
                            FASTEST LAP
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10 group-hover:border-primary/30 transition-all">
                      {res.points}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(!results || results.length === 0) && (
        <div className="text-center py-24 glass-panel rounded-[2rem] border-2 border-dashed border-white/5 mt-8">
          <Flag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">Awaiting Race Classification</p>
          <p className="text-xs text-muted-foreground/50 mt-2 uppercase tracking-widest font-bold">Data will sync post-chequered flag</p>
        </div>
      )}
    </div>
  );
}
