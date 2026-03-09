import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useLobbyInfo, useLobbyMembers } from "@/hooks/use-lobby";
import { useRaces, useUpdateRaceStatus } from "@/hooks/use-races";
import { useDrivers, useConstructors } from "@/hooks/use-competitors";
import { Settings, Lock, Unlock, CheckCircle, Copy, Users, Flag, Save, AlertTriangle, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DriverAvatar } from "@/components/DriverAvatar";

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
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-secondary rounded-xl text-white">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">
              Race Control
            </h1>
            <p className="text-muted-foreground">Select a league to manage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminLobbies.map((m) => (
            <button
              key={m.lobbyId}
              onClick={() => setSelectedLobbyId(m.lobbyId)}
              className="glass-panel p-6 rounded-2xl text-left hover:border-primary transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                  {m.lobbyName}
                </h2>
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Code: <span className="text-white font-mono">{m.lobbyCode}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">
                    Admin
                  </span>
                </div>
              </div>
            </button>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedLobbyId("")}
            className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
            title="Back to League List"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="p-3 bg-secondary rounded-xl text-white">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter" data-testid="text-admin-title">
              Race Control
            </h1>
            <p className="text-primary font-bold">{lobby?.name}</p>
          </div>
        </div>

        {lobby && (
          <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase">Invite Code:</span>
            <code data-testid="text-lobby-code" className="bg-zinc-900 px-3 py-1 rounded border border-zinc-800 text-red-500 font-mono font-bold text-lg tracking-widest">{lobby.code}</code>
            <button onClick={() => { navigator.clipboard.writeText(lobby.code); toast({ title: "Copied" }); }} data-testid="button-copy-code" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Copy className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white uppercase mb-4">Select Race</h2>
            <select
              value={selectedRaceId}
              onChange={(e) => setSelectedRaceId(Number(e.target.value))}
              data-testid="select-race"
              className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 outline-none mb-4"
            >
              <option value="" disabled>Select Race...</option>
              {races?.map(r => (
                <option key={r.id} value={r.id}>{r.round ? `R${r.round}: ` : ""}{r.name} {r.isCompleted ? "(Done)" : ""}</option>
              ))}
            </select>

            {selectedRace && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h3 className="font-bold text-xs text-muted-foreground uppercase">Race Status</h3>
                <button
                  onClick={() => updateStatus({ id: selectedRace.id, updates: { isLocked: !selectedRace.isLocked } })}
                  disabled={updatingStatus || selectedRace.isCompleted}
                  className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all ${
                    selectedRace.isLocked ? "bg-amber-500/20 text-amber-500" : "bg-green-500/20 text-green-500"
                  }`}
                >
                  {selectedRace.isLocked ? <><Lock className="w-3.5 h-3.5" /> Unlock</> : <><Unlock className="w-3.5 h-3.5" /> Lock</>}
                </button>
                <button
                  onClick={() => updateStatus({ id: selectedRace.id, updates: { isCompleted: !selectedRace.isCompleted } })}
                  disabled={updatingStatus}
                  className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all ${
                    selectedRace.isCompleted ? "bg-secondary text-white" : "bg-primary text-white"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {selectedRace.isCompleted ? "Reopen" : "Mark Complete"}
                </button>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
              <Users className="text-primary w-4 h-4" /> Members
            </h2>
            <div className="text-[10px] text-muted-foreground mb-2">{members?.length || 0}/10</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {members?.map((m: any) => (
                <div key={m.id} data-testid={`member-${m.userId}`} className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/10" />
                    )}
                    <div>
                      <div className="font-bold text-white text-xs">{m.teamName === "TBD" ? "--" : m.teamName}</div>
                      <div className="text-[10px] text-muted-foreground">@{m.username}</div>
                    </div>
                  </div>
                  {m.role === "admin" && <span className="text-[8px] font-bold uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded">Admin</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {!selectedRace ? (
            <div className="glass-panel rounded-2xl p-16 text-center">
              <Flag className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-white mb-2">Update Official FIA Results</h3>
              <p className="text-muted-foreground">Select a race to enter results.</p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/20 to-transparent p-5 flex items-center justify-between border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white uppercase flex items-center gap-2" data-testid="text-bulk-title">
                    <Flag className="text-primary w-5 h-5" />
                    {selectedRace.round ? `Round ${selectedRace.round}: ` : ""}{selectedRace.name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">Enter position, points, overtakes, and fastest lap</p>
                </div>
                {selectedRace.isCompleted && (
                  <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Already completed
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" data-testid="table-bulk-results">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px] w-14">Pos</th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px]">Driver</th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px] hidden md:table-cell">Team</th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px] w-20 text-center">Pts</th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px] w-20 text-center">OT</th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px] w-12 text-center">FL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverEntries.map((entry) => {
                      const driver = drivers?.find(d => d.id === entry.driverId);
                      if (!driver) return null;
                      return (
                        <tr key={entry.driverId} className="border-b border-border/20 hover:bg-white/5 transition-colors" data-testid={`bulk-row-${entry.driverId}`}>
                          <td className="px-4 py-2">
                            <input type="number" min="1" max="20" value={entry.position} onChange={(e) => updateEntry(entry.driverId, "position", Number(e.target.value))} className="w-14 bg-background border border-border rounded-lg px-2 py-1.5 text-white text-center text-sm font-bold focus:border-primary outline-none" />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2.5">
                              <DriverAvatar number={driver.number ?? undefined} name={driver.name} size="sm" />
                              <span className="text-white font-bold text-sm">{driver.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs hidden md:table-cell">{driver.team}</td>
                          <td className="px-4 py-2">
                            <input type="number" min="0" value={entry.points} onChange={(e) => updateEntry(entry.driverId, "points", Number(e.target.value))} className="w-16 bg-background border border-border rounded-lg px-2 py-1.5 text-white text-center text-sm font-bold focus:border-primary outline-none" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" min="0" value={entry.overtakes} onChange={(e) => updateEntry(entry.driverId, "overtakes", Number(e.target.value))} className="w-16 bg-background border border-border rounded-lg px-2 py-1.5 text-white text-center text-sm focus:border-primary outline-none" />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input type="checkbox" checked={entry.fastestLap} onChange={(e) => updateEntry(entry.driverId, "fastestLap", e.target.checked)} className="w-4 h-4 accent-purple-500 bg-background border-border cursor-pointer" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground">Points auto-fill based on position. Constructor points calculated automatically.</div>
                <button
                  onClick={() => { if (selectedRaceId && selectedLobbyId) bulkSaveMutation.mutate({ raceId: Number(selectedRaceId), results: driverEntries, lobbyId: Number(selectedLobbyId) }); }}
                  disabled={bulkSaveMutation.isPending || !selectedRaceId}
                  data-testid="button-save-bulk-results"
                  className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-wider disabled:opacity-50 hover:red-glow whitespace-nowrap"
                >
                  <Save className="w-4 h-4" />
                  {bulkSaveMutation.isPending ? "Saving..." : "Save Official Results"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
