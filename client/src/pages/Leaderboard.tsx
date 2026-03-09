import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useLobbyInfo } from "@/hooks/use-lobby";
import { useDriverLeaderboard, useConstructorLeaderboard } from "@/hooks/use-leaderboard";
import { motion } from "framer-motion";
import { Trophy, Medal, Car, Shield, ChevronRight, Users } from "lucide-react";
import { TeamAvatar } from "@/components/TeamAvatar";

export default function Leaderboard() {
  const { user } = useAuth();
  const { activeLobbyId, setActiveLobbyId, activeMembership } = useActiveLobby(false);
  const { data: lobby } = useLobbyInfo(activeLobbyId);
  const [tab, setTab] = useState<"drivers" | "constructors">("drivers");

  const { data: driverLeaderboard, isLoading: dLoading } = useDriverLeaderboard(activeLobbyId);
  const { data: constructorLeaderboard, isLoading: cLoading } = useConstructorLeaderboard(activeLobbyId);

  const adminLobbies = user?.memberships?.filter((m: any) => m.role === "admin") || [];
  const playerLobbies = user?.memberships?.filter((m: any) => m.role === "player") || [];

  if (!activeLobbyId || !activeMembership) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 pb-24">
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex w-20 h-20 bg-primary/10 rounded-tr-3xl rounded-bl-3xl f1-slant items-center justify-center mb-6 border-2 border-primary/20 red-glow"
          >
            <Trophy className="w-10 h-10 text-primary f1-slant-reverse" />
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tight">Select a League</h2>
          <p className="text-muted-foreground mt-3 uppercase text-xs tracking-[0.2em] font-bold opacity-70">Championship Standings</p>
        </div>

        {adminLobbies.length > 0 && (
          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 flex items-center gap-3 px-2">
              <div className="w-8 h-[1px] bg-primary/30" />
              Leagues I Manage
            </h3>
            <div className="grid gap-4">
              {adminLobbies.map((m: any, idx: number) => (
                <motion.button
                  key={m.lobbyId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setActiveLobbyId(m.lobbyId)}
                  className="w-full glass-panel rounded-2xl p-6 flex items-center justify-between hover:bg-white/5 hover:border-primary/50 transition-all group text-left border-2 border-white/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Shield className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <div className="text-white font-display font-black text-xl uppercase tracking-tight group-hover:text-primary transition-colors">{m.lobbyName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Administrator Access</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">Enter League</span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {playerLobbies.length > 0 && (
          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6 flex items-center gap-3 px-2">
              <div className="w-8 h-[1px] bg-white/10" />
              Leagues I Joined
            </h3>
            <div className="grid gap-4">
              {playerLobbies.map((m: any, idx: number) => (
                <motion.button
                  key={m.lobbyId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx + adminLobbies.length) * 0.1 }}
                  onClick={() => setActiveLobbyId(m.lobbyId)}
                  className="w-full glass-panel rounded-2xl p-6 flex items-center justify-between hover:bg-white/5 hover:border-white/20 transition-all group text-left border-2 border-white/5 relative overflow-hidden"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Users className="w-6 h-6 text-muted-foreground group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <div className="text-white font-display font-black text-xl uppercase tracking-tight group-hover:text-white transition-colors">{m.lobbyName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Competitor</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-white transition-all group-hover:translate-x-1" />
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {adminLobbies.length === 0 && playerLobbies.length === 0 && (
          <div className="text-center py-12 glass-panel rounded-2xl border-2 border-dashed border-white/10">
            <p className="text-muted-foreground">You are not a member of any leagues yet.</p>
          </div>
        )}
      </div>
    );
  }

  const TEAM_COLORS: Record<string, string> = {
    "Red Bull Racing": "#3671C6",
    "Ferrari": "#E80020",
    "Mercedes": "#27F4D2",
    "McLaren": "#FF8000",
    "Aston Martin": "#229971",
    "Alpine": "#0093CC",
    "Williams": "#64C4FF",
    "RB": "#6692FF",
    "Haas": "#B6BABD",
    "Audi": "#52e6cf",
    "Cadillac": "#FFD700",
  };

  const leaderboard = tab === "drivers" ? (driverLeaderboard || []) : (constructorLeaderboard || []);
  const isLoading = tab === "drivers" ? dLoading : cLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      <div className="mb-8 flex items-center justify-between">
        <button 
          onClick={() => setActiveLobbyId(null as any)}
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
        >
          ← Back to Leagues
        </button>
      </div>
      <div className="text-center mb-8">
        <div className="inline-flex w-16 h-16 bg-primary rounded-tr-2xl rounded-bl-2xl f1-slant items-center justify-center mb-4 red-glow">
          <Trophy className="w-8 h-8 text-white f1-slant-reverse" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight" data-testid="text-leaderboard-title">
          {lobby?.name || activeMembership.lobbyName}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg italic uppercase tracking-widest font-bold">League Standings</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="glass-panel rounded-xl p-1 inline-flex gap-1" data-testid="toggle-leaderboard-type">
          <button
            onClick={() => setTab("drivers")}
            data-testid="tab-driver-standings"
            className={`px-6 py-3 rounded-lg font-bold uppercase text-sm flex items-center gap-2 transition-all ${
              tab === "drivers" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Car className="w-4 h-4" /> Driver Standings
          </button>
          <button
            onClick={() => setTab("constructors")}
            data-testid="tab-constructor-standings"
            className={`px-6 py-3 rounded-lg font-bold uppercase text-sm flex items-center gap-2 transition-all ${
              tab === "constructors" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" /> Constructor Standings
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-1 overflow-hidden shadow-2xl">
        <div className="bg-background/40 backdrop-blur-sm rounded-[22px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="table-leaderboard">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-6 py-5 font-display font-bold text-muted-foreground uppercase text-[10px] tracking-widest w-20">Pos</th>
                  <th className="px-6 py-5 font-display font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Team / Manager</th>
                  <th className="px-6 py-5 font-display font-bold text-primary uppercase text-[10px] tracking-widest text-right">
                    {tab === "drivers" ? "Championship Pts" : "Constructor Pts"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaderboard.map((entry, index) => {
                  const teamColor = TEAM_COLORS[entry.teamName] || "#444";
                  return (
                    <motion.tr
                      key={entry.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      data-testid={`leaderboard-row-${entry.userId}`}
                      className={`group hover:bg-white/10 transition-all duration-300 ${index === 0 ? "bg-primary/10" : ""}`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors relative overflow-hidden">
                          {index === 0 && (
                            <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />
                          )}
                          <span className={`font-display font-black text-xl relative z-10 ${
                            index === 0 ? "text-yellow-400" : 
                            index === 1 ? "text-gray-300" : 
                            index === 2 ? "text-amber-600" : 
                            "text-muted-foreground"
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <TeamAvatar name={entry.teamName} size="lg" />
                            <div 
                              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background shadow-lg" 
                              style={{ backgroundColor: teamColor }}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-display font-black text-lg text-white uppercase tracking-tight leading-tight group-hover:text-primary transition-colors">
                              {entry.teamName}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                              <Users className="w-3 h-3" /> @{entry.username}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-display font-black text-3xl text-white tracking-tighter tabular-nums">
                            {entry.totalPoints}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter -mt-1">
                            Points
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                      No points recorded yet. The season is young!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
