import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useLobbyInfo } from "@/hooks/use-lobby";
import { useDriverLeaderboard, useConstructorLeaderboard } from "@/hooks/use-leaderboard";
import { motion } from "framer-motion";
import { Trophy, Medal, Car, Shield } from "lucide-react";

export default function Leaderboard() {
  const { user } = useAuth();
  const { activeLobbyId, activeMembership } = useActiveLobby();
  const { data: lobby } = useLobbyInfo(activeLobbyId);
  const [tab, setTab] = useState<"drivers" | "constructors">("drivers");

  const { data: driverLeaderboard, isLoading: dLoading } = useDriverLeaderboard(activeLobbyId);
  const { data: constructorLeaderboard, isLoading: cLoading } = useConstructorLeaderboard(activeLobbyId);

  if (!activeLobbyId || !activeMembership) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <Trophy className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-white">Select a league first</h2>
        <p className="text-muted-foreground mt-2">Go to the dashboard and enter a league to see standings.</p>
      </div>
    );
  }

  const leaderboard = tab === "drivers" ? driverLeaderboard : constructorLeaderboard;
  const isLoading = tab === "drivers" ? dLoading : cLoading;

  if (isLoading || !leaderboard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
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

      <div className="glass-panel rounded-3xl p-1 overflow-hidden">
        <div className="bg-background rounded-[22px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="table-leaderboard">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase text-xs">Pos</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase text-xs">Scuderia</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase text-xs">Manager</th>
                  <th className="px-6 py-4 font-bold text-primary uppercase text-xs text-right">
                    {tab === "drivers" ? "Driver Pts" : "Constructor Pts"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <motion.tr
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    data-testid={`leaderboard-row-${entry.userId}`}
                    className={`border-b border-border/50 hover:bg-white/5 transition-colors ${index === 0 ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-6 py-6 font-display font-bold text-2xl w-24">
                      {index === 0 ? (
                        <span className="text-yellow-400 flex items-center gap-2"><Medal className="w-6 h-6" /> 1</span>
                      ) : index === 1 ? (
                        <span className="text-gray-300">2</span>
                      ) : index === 2 ? (
                        <span className="text-amber-600">3</span>
                      ) : (
                        <span className="text-muted-foreground">{index + 1}</span>
                      )}
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        {entry.avatarUrl ? (
                          <img src={entry.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {entry.teamName.charAt(0)}
                          </div>
                        )}
                        <span className={`font-bold text-lg ${index === 0 ? "text-primary" : "text-white"}`}>{entry.teamName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-muted-foreground">@{entry.username}</td>
                    <td className="px-6 py-6 text-right font-display font-black text-2xl text-white">{entry.totalPoints}</td>
                  </motion.tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
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
