import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useLobbyInfo, useLobbyMembers } from "@/hooks/use-lobby";
import { useRaces, useUpdateRaceStatus } from "@/hooks/use-races";
import { useDrivers, useConstructors } from "@/hooks/use-competitors";
import { Settings, Lock, Unlock, CheckCircle, Copy, Users, Flag, Save, AlertTriangle, ChevronLeft, UserCircle, ChevronDown, Activity, Timer, Eye, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DriverAvatar } from "@/components/DriverAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { useDraftStatus } from "@/hooks/use-selections";

const FIA_POINTS: Record<number, number> = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1,
};

type DriverEntry = {
  driverId: number;
  position: number;
  points: number;
  overtakes: number;
  fastestLap: boolean;
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

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const adminLobbies = user?.memberships?.filter(m => m.role === "admin") || [];
  const [selectedLobbyId, setSelectedLobbyId] = useState<number | "">("");

  const { data: lobby } = useLobbyInfo(Number(selectedLobbyId));
  const { data: members } = useLobbyMembers(Number(selectedLobbyId));
  const { data: races } = useRaces();
  const { data: drivers } = useDrivers();
  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateRaceStatus();

  const [selectedRaceId, setSelectedRaceId] = useState<number | "">("");
  const [driverEntries, setDriverEntries] = useState<DriverEntry[]>([]);

  const isAdmin = adminLobbies.length > 0;

  const bulkSaveMutation = useMutation({
    mutationFn: async ({ raceId, results, lobbyId }: { raceId: number; results: DriverEntry[]; lobbyId: number }) => {
      const res = await fetch(`/api/admin/race/${raceId}/bulk-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, lobbyId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save results");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard", selectedLobbyId, "drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard", selectedLobbyId, "constructors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/f1/driver-standings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/f1/constructor-standings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/race"] });
      toast({ title: "Official Results Saved", description: "Standings updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (drivers && drivers.length > 0 && driverEntries.length === 0) {
      setDriverEntries(
        drivers.map((d, i) => ({
          driverId: d.id,
          position: i + 1,
          points: FIA_POINTS[i + 1] || 0,
          overtakes: 0,
          fastestLap: false,
        }))
      );
    }
  }, [drivers]);

  const { data: existingResults } = useQuery<{ driverResults: any[]; constructorResults: any[] }>({
    queryKey: ["/api/results/race", selectedRaceId],
    queryFn: async () => {
      const res = await fetch(`/api/results/race/${selectedRaceId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedRaceId,
  });

  const { data: draftStatus, isLoading: draftLoading } = useDraftStatus(
    selectedLobbyId ? Number(selectedLobbyId) : null,
    selectedRaceId ? Number(selectedRaceId) : null
  );

  const { data: adminPicks } = useQuery<Array<{ userId: number; username: string; teamName: string; driverName: string; driverNumber: number | null; constructorName: string }>>({
    queryKey: ["/api/admin/lobby", selectedLobbyId, "race", selectedRaceId, "picks"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/lobby/${selectedLobbyId}/race/${selectedRaceId}/picks`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedLobbyId && !!selectedRaceId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (existingResults?.driverResults && existingResults.driverResults.length > 0 && drivers) {
      const entries = drivers.map((d, i) => {
        const existing = existingResults.driverResults.find((r: any) => r.driverId === d.id);
        if (existing) {
          return { driverId: d.id, position: existing.position ?? i + 1, points: existing.points, overtakes: existing.overtakes, fastestLap: existing.fastestLap };
        }
        return { driverId: d.id, position: i + 1, points: FIA_POINTS[i + 1] || 0, overtakes: 0, fastestLap: false };
      });
      entries.sort((a, b) => a.position - b.position);
      setDriverEntries(entries);
    } else if (drivers && (!existingResults?.driverResults || existingResults.driverResults.length === 0)) {
      setDriverEntries(
        drivers.map((d, i) => ({ driverId: d.id, position: i + 1, points: FIA_POINTS[i + 1] || 0, overtakes: 0, fastestLap: false }))
      );
    }
  }, [existingResults, drivers, selectedRaceId]);

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <Settings className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-white">Admin access required</h2>
        <p className="text-muted-foreground mt-2">You need to be a league admin to access Race Control.</p>
      </div>
    );
  }

  if (!selectedLobbyId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-6 mb-12"
        >
          <div className="p-4 bg-primary rounded-2xl text-white shadow-2xl shadow-primary/20 f1-slant">
            <Settings className="w-10 h-10 f1-slant-reverse" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white italic uppercase tracking-tighter leading-none">
              Race <span className="text-primary">Control</span>
            </h1>
            <p className="text-muted-foreground mt-2 uppercase tracking-[0.3em] text-[10px] font-black opacity-60">
              Command Center & League Administration
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminLobbies.map((m, idx) => (
            <motion.button
              key={m.lobbyId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedLobbyId(m.lobbyId)}
              className="glass-panel p-8 rounded-3xl text-left border-2 border-white/5 hover:border-primary/50 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</span>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase border border-primary/20">
                    Active Admin
                  </span>
                </div>
              </div>

              <div className="relative z-10">
                <h2 className="text-2xl font-display font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight mb-4">
                  {m.lobbyName}
                </h2>
                
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Access Key</span>
                    <code className="text-red-500 font-mono font-black tracking-widest bg-zinc-900/50 px-3 py-1 rounded border border-white/5">
                      {m.lobbyCode}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Role</span>
                    <span className="text-white text-xs font-bold italic uppercase tracking-tighter">Chief Steward</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 flex items-center justify-center">
                <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">
                  Enter Control Room →
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const selectedRace = races?.find(r => r.id === Number(selectedRaceId));

  const updateEntry = (driverId: number, field: keyof DriverEntry, value: any) => {
    setDriverEntries(prev => {
      const updated = prev.map(e => {
        if (e.driverId !== driverId) return e;
        const newEntry = { ...e, [field]: value };
        if (field === "position") newEntry.points = FIA_POINTS[Number(value)] || 0;
        return newEntry;
      });
      if (field === "fastestLap" && value === true) {
        return updated.map(e => ({ ...e, fastestLap: e.driverId === driverId }));
      }
      return updated;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12"
      >
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setSelectedLobbyId("")}
            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-muted-foreground hover:text-white transition-all border border-white/5"
            title="Back to League List"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-16 h-16 bg-primary rounded-tr-2xl rounded-bl-2xl f1-slant flex items-center justify-center red-glow shadow-2xl shadow-primary/20">
            <Settings className="w-10 h-10 text-white f1-slant-reverse" />
          </div>
          <div>
            <h1 className="md:text-5xl font-display font-black text-white italic uppercase tracking-tighter text-[25px]" data-testid="text-admin-title">
              Race <span className="text-primary">Control</span>
            </h1>
            <p className="uppercase tracking-[0.2em] mt-2 opacity-80 text-[30px] font-extrabold text-left bg-[transparent] text-[#e60008]">{lobby?.name}</p>
          </div>
        </div>

        {lobby && (
          <div className="glass-panel p-5 rounded-2xl flex items-center gap-6 border-2 border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Official League Code</span>
                <code data-testid="text-lobby-code" className="bg-zinc-900/80 px-4 py-2 rounded-xl border border-white/10 text-red-500 font-mono font-black text-xl tracking-[0.2em] shadow-inner">{lobby.code}</code>
              </div>
              <button 
                onClick={() => { navigator.clipboard.writeText(lobby.code); toast({ title: "Frequency Locked", description: "Invite code copied to clipboard." }); }} 
                data-testid="button-copy-code" 
                className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-primary hover:text-white rounded-xl transition-all border border-white/10 group/btn shadow-lg"
              >
                <Copy className="w-5 h-5 text-zinc-400 group-hover/btn:text-white" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel rounded-3xl p-8 border-2 border-white/5 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <Flag className="w-4 h-4 text-primary" /> Session Select
            </h2>
            <div className="relative group">
              <select
                value={selectedRaceId}
                onChange={(e) => setSelectedRaceId(Number(e.target.value))}
                data-testid="select-race"
                className="w-full bg-zinc-900/50 border-2 border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-primary focus:ring-1 outline-none appearance-none transition-all cursor-pointer relative z-10 group-hover:border-white/20"
              >
                <option value="" disabled className="bg-zinc-900">Select Grand Prix...</option>
                {races?.map(r => (
                  <option key={r.id} value={r.id} className="bg-zinc-900">{r.round ? `R${r.round}: ` : ""}{r.name} {r.isCompleted ? "✓" : ""}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-20 group-hover:text-white transition-colors" />
            </div>

            {selectedRace && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4 mt-8 pt-8 border-t border-white/5"
              >
                <h3 className="font-black text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Race Operations</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => updateStatus({ id: selectedRace.id, updates: { isLocked: !selectedRace.isLocked } })}
                    disabled={updatingStatus || selectedRace.isCompleted}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 text-[10px] transition-all border-2 ${
                      selectedRace.isLocked 
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/5" 
                        : "bg-green-500/10 border-green-500/20 text-green-500 shadow-lg shadow-green-500/5"
                    }`}
                  >
                    {selectedRace.isLocked ? <><Lock className="w-4 h-4" /> Unlock Grid</> : <><Unlock className="w-4 h-4" /> Lock Grid</>}
                  </button>
                  <button
                    onClick={() => updateStatus({ id: selectedRace.id, updates: { isCompleted: !selectedRace.isCompleted } })}
                    disabled={updatingStatus}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 text-[10px] transition-all border-2 ${
                      selectedRace.isCompleted 
                        ? "bg-zinc-800 border-white/10 text-white" 
                        : "bg-primary border-primary text-white red-glow shadow-xl shadow-primary/20"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {selectedRace.isCompleted ? "Reopen Session" : "Finalize Results"}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-3xl p-8 border-2 border-white/5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
                <Users className="text-primary w-4 h-4" /> Personnel
              </h2>
              <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-muted-foreground tracking-widest border border-white/5">
                {members?.length || 0} / 10
              </span>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {members?.map((m: any, idx: number) => (
                <motion.div 
                  key={m.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  data-testid={`member-${m.userId}`} 
                  className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                          <UserCircle className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                      {m.role === "admin" && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                          <Settings className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-display font-black text-white text-xs uppercase tracking-tight group-hover:text-primary transition-colors">{m.teamName === "TBD" ? "Unassigned" : m.teamName}</div>
                      <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-60">@{m.username}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {selectedRace && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel rounded-3xl overflow-hidden border-2 border-white/5 shadow-2xl"
            >
              <div className="px-8 py-5 flex items-center gap-3 border-b border-white/5">
                <Eye className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex-1 min-w-0">Draft Monitor</h2>
                {draftStatus?.isComplete ? (
                  <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-500/20 shrink-0">
                    Complete
                  </span>
                ) : draftStatus && !draftStatus.isComplete && draftStatus.draftOrder.length > 0 ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full border border-primary/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Live
                  </span>
                ) : null}
              </div>

              <div className="p-4">
                {draftLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !draftStatus || draftStatus.draftOrder.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <Clock className="w-7 h-7 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-center">Draft not started</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                    {draftStatus.draftOrder.map((player, index) => {
                      const isCurrent = !draftStatus.isComplete && index === draftStatus.currentDrafterIndex;
                      const isNext = !draftStatus.isComplete && index === draftStatus.currentDrafterIndex + 1;
                      const pick = adminPicks?.find(p => p.userId === player.userId);

                      return (
                        <div
                          key={player.userId}
                          className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${
                            isCurrent
                              ? "bg-primary/10 border-primary/30"
                              : player.hasPicked
                              ? "bg-green-500/5 border-green-500/10"
                              : isNext
                              ? "bg-white/5 border-white/10"
                              : "border-transparent"
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border shrink-0 mt-0.5 ${
                            isCurrent
                              ? "bg-primary/20 border-primary/40 text-primary"
                              : player.hasPicked
                              ? "bg-green-500/10 border-green-500/20 text-green-400"
                              : "bg-white/5 border-white/10 text-muted-foreground"
                          }`}>
                            {index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-white truncate">
                                {player.teamName && player.teamName !== "TBD" ? player.teamName : player.username}
                              </span>
                              {isCurrent && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest rounded-full border border-primary/30 shrink-0">
                                  <span className="w-1 h-1 rounded-full bg-primary animate-ping inline-block" />
                                  Now
                                </span>
                              )}
                              {isNext && (
                                <span className="px-1.5 py-0.5 bg-white/5 text-muted-foreground text-[8px] font-black uppercase tracking-widest rounded-full border border-white/10 shrink-0">
                                  Next
                                </span>
                              )}
                            </div>
                            {pick ? (
                              <div className="mt-0.5 space-y-0.5">
                                <div className="text-[10px] text-green-400 font-bold truncate">{pick.driverName}</div>
                                <div className="text-[9px] text-green-400/60 font-medium truncate">{pick.constructorName}</div>
                              </div>
                            ) : player.hasPicked ? (
                              <div className="text-[9px] text-muted-foreground mt-0.5">Pick recorded</div>
                            ) : (
                              <div className="text-[9px] text-muted-foreground opacity-40 mt-0.5">Awaiting pick</div>
                            )}
                          </div>

                          <div className="shrink-0 mt-0.5">
                            {player.hasPicked ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            ) : isCurrent ? (
                              <Activity className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-muted-foreground opacity-20" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {!selectedRace ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="glass-panel rounded-3xl p-24 text-center border-2 border-dashed border-white/10 h-full flex flex-col items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-50 blur-3xl rounded-full translate-y-1/2" />
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 mx-auto group">
                    <Flag className="w-10 h-10 text-primary opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                  </div>
                  <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-4 italic">FIA Timing & Results System</h3>
                  <p className="text-muted-foreground max-w-md mx-auto font-medium uppercase tracking-[0.1em] text-[10px]">Please select a Grand Prix session from the telemetry panel to begin inputting official classification data.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="glass-panel rounded-[2rem] overflow-hidden border-2 border-white/5 shadow-2xl relative"
              >
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-[100px] pointer-events-none" />
                
                <div className="bg-zinc-900/80 backdrop-blur-md p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 relative z-10">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="px-4 py-1.5 bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/30 shadow-lg shadow-primary/5">
                        {selectedRace.round ? `Round ${selectedRace.round}` : "Official Session"}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight italic" data-testid="text-bulk-title">
                        {selectedRace.name}
                      </h2>
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-60">Session Classification Telemetry</p>
                  </div>
                  {selectedRace.isCompleted && (
                    <div className="flex items-center gap-3 bg-amber-500/10 text-amber-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-500/20 shadow-xl shadow-amber-500/5">
                      <AlertTriangle className="w-4 h-4" /> 
                      <span>Session Finalized</span>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto p-2">
                  <table className="w-full text-left border-separate border-spacing-y-2 px-6" data-testid="table-bulk-results">
                    <thead>
                      <tr className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40">
                        <th className="px-6 py-4 w-20 text-center">Pos</th>
                        <th className="px-6 py-4">Driver / Constructor</th>
                        <th className="px-6 py-4 w-24 text-center">Points</th>
                        <th className="px-6 py-4 w-24 text-center">Overtakes</th>
                        <th className="px-6 py-4 w-20 text-center">Fastest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverEntries.map((entry, idx) => {
                        const driver = drivers?.find(d => d.id === entry.driverId);
                        if (!driver) return null;
                        return (
                          <motion.tr 
                            key={entry.driverId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className="group hover:bg-white/5 transition-all duration-300" 
                            data-testid={`bulk-row-${entry.driverId}`}
                          >
                            <td className="py-2 pl-6">
                              <div className="relative w-16 group/input">
                                <input 
                                  type="number" 
                                  min="1" 
                                  max="20" 
                                  value={entry.position} 
                                  onChange={(e) => updateEntry(entry.driverId, "position", Number(e.target.value))} 
                                  className="w-full bg-zinc-950/80 border-2 border-white/5 rounded-xl px-2 py-3 text-white text-center text-lg font-display font-black focus:border-primary focus:bg-zinc-900 outline-none transition-all shadow-inner tabular-nums" 
                                />
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center border border-white/10 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                  <Activity className="w-2.5 h-2.5 text-muted-foreground" />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-2">
                              <div className="flex items-center gap-5">
                                <div className="relative">
                                  <DriverAvatar number={driver.number ?? undefined} name={driver.name} size="md" teamColor={TEAM_COLORS[driver.team]} />
                                  <div 
                                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 shadow-xl" 
                                    style={{ backgroundColor: TEAM_COLORS[driver.team] || "#444" }}
                                  />
                                </div>
                                <div>
                                  <div className="text-lg font-display font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-none mb-1">{driver.name}</div>
                                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    {driver.team}
                                    {driver.number && <span className="text-primary opacity-100 ml-1">#{driver.number}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-2">
                              <div className="relative w-20 mx-auto">
                                <input 
                                  type="number" 
                                  min="0" 
                                  value={entry.points} 
                                  onChange={(e) => updateEntry(entry.driverId, "points", Number(e.target.value))} 
                                  className="w-full bg-zinc-950/80 border-2 border-white/5 rounded-xl px-2 py-3 text-primary text-center text-xl font-display font-black focus:border-primary focus:bg-zinc-900 outline-none transition-all shadow-inner tabular-nums" 
                                />
                              </div>
                            </td>
                            <td className="px-6 py-2">
                              <div className="relative w-20 mx-auto">
                                <input 
                                  type="number" 
                                  min="0" 
                                  value={entry.overtakes} 
                                  onChange={(e) => updateEntry(entry.driverId, "overtakes", Number(e.target.value))} 
                                  className="w-full bg-zinc-950/80 border-2 border-white/5 rounded-xl px-2 py-3 text-white text-center text-lg font-display font-black focus:border-primary focus:bg-zinc-900 outline-none transition-all shadow-inner tabular-nums" 
                                />
                              </div>
                            </td>
                            <td className="px-6 py-2 text-center">
                              <label className="relative inline-flex items-center cursor-pointer group/fl">
                                <input 
                                  type="checkbox" 
                                  checked={entry.fastestLap} 
                                  onChange={(e) => updateEntry(entry.driverId, "fastestLap", e.target.checked)} 
                                  className="sr-only peer" 
                                />
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border-2 border-white/5 peer-checked:border-purple-500/50 peer-checked:bg-purple-500/10 transition-all group-hover/fl:border-white/20">
                                  <Timer className={`w-6 h-6 transition-all ${entry.fastestLap ? "text-purple-400 scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "text-muted-foreground opacity-30 group-hover/fl:opacity-60"}`} />
                                </div>
                              </label>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-10 bg-zinc-900/50 backdrop-blur-md border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                      <Activity className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">System Intelligence</p>
                      <p className="text-xs text-white/60 font-medium">Points auto-calculated via FIA 2026 standard. Constructor attribution logic is live.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (selectedRaceId && selectedLobbyId) bulkSaveMutation.mutate({ raceId: Number(selectedRaceId), results: driverEntries, lobbyId: Number(selectedLobbyId) }); }}
                    disabled={bulkSaveMutation.isPending || !selectedRaceId}
                    data-testid="button-save-bulk-results"
                    className="bg-primary hover:bg-primary/90 text-white font-display font-black py-5 px-12 rounded-2xl transition-all flex items-center justify-center gap-4 uppercase text-sm tracking-[0.2em] disabled:opacity-50 red-glow shadow-2xl shadow-primary/30 whitespace-nowrap group h-16"
                  >
                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {bulkSaveMutation.isPending ? "Transmitting..." : "Broadcast Results"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
