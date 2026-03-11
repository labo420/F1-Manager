import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useLobbyInfo, useLobbyMembers } from "@/hooks/use-lobby";
import { useRaces, useUpdateRaceStatus } from "@/hooks/use-races";
import { useDrivers, useConstructors } from "@/hooks/use-competitors";
import { Settings, Lock, Unlock, CheckCircle, Copy, Users, Flag, Save, AlertTriangle, ChevronLeft, UserCircle, ChevronDown, Activity, Timer, Eye, Clock, Trash2, Shield, Download, Zap, Edit2, X, Trophy, Car, ListOrdered } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { DriverAvatar } from "@/components/DriverAvatar";
import { LobbyImageEditor } from "@/components/LobbyImageEditor";
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

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const RACE_COUNTRY_CODES: Record<string, string> = {
  "Australian Grand Prix": "au",
  "Chinese Grand Prix": "cn",
  "Japanese Grand Prix": "jp",
  "Bahrain Grand Prix": "bh",
  "Saudi Arabian Grand Prix": "sa",
  "Miami Grand Prix": "us",
  "Emilia Romagna Grand Prix": "it",
  "Canadian Grand Prix": "ca",
  "Monaco Grand Prix": "mc",
  "Spanish Grand Prix": "es",
  "Spanish Grand Prix (Madrid)": "es",
  "Austrian Grand Prix": "at",
  "British Grand Prix": "gb",
  "Belgian Grand Prix": "be",
  "Hungarian Grand Prix": "hu",
  "Dutch Grand Prix": "nl",
  "Italian Grand Prix": "it",
  "Azerbaijan Grand Prix": "az",
  "Singapore Grand Prix": "sg",
  "United States Grand Prix": "us",
  "Mexico City Grand Prix": "mx",
  "Mexican Grand Prix": "mx",
  "Sao Paulo Grand Prix": "br",
  "Brazilian Grand Prix": "br",
  "Qatar Grand Prix": "qa",
  "Abu Dhabi Grand Prix": "ae",
  "Las Vegas Grand Prix": "us",
};

function RaceFlag({ name, className = "w-5 h-3.5" }: { name: string; className?: string }) {
  const cc = RACE_COUNTRY_CODES[name];
  if (!cc) return <span className="text-sm">🏁</span>;
  return (
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      alt={cc}
      className={`${className} object-cover rounded-sm shadow-sm`}
    />
  );
}

type RealResultsTab = "qualifying" | "race" | "sprint";

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [realResultsTab, setRealResultsTab] = useState<RealResultsTab>("race");
  const [isEditingRealResults, setIsEditingRealResults] = useState(false);
  const [editedRealResults, setEditedRealResults] = useState<any[]>([]);

  const isAdmin = adminLobbies.length > 0;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteLobbyMutation = useMutation({
    mutationFn: async (lobbyId: number) => {
      const res = await fetch(`/api/lobby/${lobbyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete lobby");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setSelectedLobbyId("");
      setShowDeleteConfirm(false);
      toast({ title: "League deleted", description: "The league has been permanently deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not delete the league.", variant: "destructive" });
    },
  });

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
      setIsEditMode(false);
      toast({ title: "Official Results Confirmed", description: "Standings updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const finalizeResultsMutation = useMutation({
    mutationFn: async (raceId: number) => {
      const res = await fetch(`/api/admin/race/${raceId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyId: Number(selectedLobbyId) }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to finalize results");
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
      toast({ title: "Results Finalized", description: "League standings updated." });
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

  useEffect(() => {
    setIsEditMode(false);
  }, [selectedRaceId]);

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

  const selectedRace = races?.find(r => r.id === Number(selectedRaceId));

  const { data: qualifyingResults, isLoading: qualLoading } = useQuery<any[]>({
    queryKey: ["/api/f1/race", selectedRaceId, "qualifying"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${selectedRaceId}/qualifying`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedRaceId,
  });

  const { data: externalRaceResults, isLoading: raceResLoading } = useQuery<any[]>({
    queryKey: ["/api/f1/race", selectedRaceId, "external-results"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${selectedRaceId}/external-results`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedRaceId,
  });

  const { data: sprintResults, isLoading: sprintLoading } = useQuery<any[]>({
    queryKey: ["/api/f1/race", selectedRaceId, "sprint"],
    queryFn: async () => {
      const res = await fetch(`/api/f1/race/${selectedRaceId}/sprint`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedRaceId && !!selectedRace?.hasSprint,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {adminLobbies.map((m, idx) => (
            <motion.button
              key={m.lobbyId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedLobbyId(m.lobbyId)}
              className="glass-panel p-3 rounded-xl text-left border border-white/5 hover:border-primary/50 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-2 relative z-10">
                {m.lobbyImageUrl ? (
                  <img src={m.lobbyImageUrl} alt="" className="w-8 h-8 rounded object-cover border border-white/10 group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <span className="text-[8px] font-black text-primary">{getInitials(m.lobbyName)}</span>
                  </div>
                )}
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider mb-0 leading-none">Status</span>
                  <span className="px-1.5 py-0 rounded-full bg-primary/10 text-primary text-[7px] font-black uppercase border border-primary/20 mt-0.5">
                    Admin
                  </span>
                </div>
              </div>

              <div className="relative z-10">
                <h2 className="text-xs font-display font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight mb-2">
                  {m.lobbyName}
                </h2>
                
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[7px] text-muted-foreground font-black uppercase tracking-wider truncate">Key</span>
                    <code className="text-red-500 font-mono font-black tracking-widest bg-zinc-900/50 px-1.5 py-0 rounded border border-white/5 text-[10px]">
                      {m.lobbyCode}
                    </code>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 flex items-center justify-center">
                <div className="text-[7px] font-black text-primary uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity">
                  Enter →
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

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

  const getRealResultsTabData = () => {
    if (realResultsTab === "qualifying") return { data: qualifyingResults, loading: qualLoading };
    if (realResultsTab === "sprint") return { data: sprintResults, loading: sprintLoading };
    return { data: externalRaceResults, loading: raceResLoading };
  };

  const { data: activeTabData, loading: activeTabLoading } = getRealResultsTabData();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12"
      >
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setSelectedLobbyId("")}
            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-muted-foreground hover:text-white transition-all border border-white/5"
            data-testid="button-admin-back"
            title="Back to League List"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          {lobby && (
            <LobbyImageEditor
              lobbyId={Number(selectedLobbyId)}
              currentUrl={lobby.imageUrl}
              lobbyName={lobby.name}
            />
          )}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Race Control</p>
            <h1 className="font-display font-black text-white uppercase tracking-tighter text-3xl md:text-5xl leading-none mt-1" data-testid="text-admin-title">
              {lobby?.name || "—"}
            </h1>
          </div>
        </div>

        {/* Lobby Code */}
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

      <div className="space-y-8">

        {/* 1. Session Select */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel rounded-3xl overflow-hidden border-2 border-white/5 shadow-2xl"
        >
          <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
            <Flag className="w-3.5 h-3.5 text-primary shrink-0" />
            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Grand Prix</h2>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {races?.map(r => (
              <button
                key={r.id}
                onClick={(e) => {
                  setSelectedRaceId(r.id);
                  (e.target as HTMLElement).blur();
                }}
                data-testid={`race-option-${r.id}`}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all duration-150 ${
                  selectedRaceId === r.id
                    ? "bg-primary/15 border-l-2 border-primary"
                    : "hover:bg-white/[0.03] border-l-2 border-transparent"
                }`}
              >
                <RaceFlag name={r.name} className="w-6 h-4 rounded-[3px] shrink-0" />
                <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest w-6 shrink-0">R{r.round}</span>
                <span className={`text-[11px] font-bold flex-1 min-w-0 truncate ${selectedRaceId === r.id ? "text-white" : "text-white/70"}`}>
                  {r.name.replace(" Grand Prix", " GP")}
                </span>
                <span className="text-[9px] text-muted-foreground/50 shrink-0">
                  {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {r.isCompleted && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="Completed" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 2. Players List - Minimalista compatto */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.02 }}
          className="border-2 border-white/5 rounded-2xl p-3 bg-gradient-to-br from-white/[0.03] to-transparent shadow-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <Users className="text-primary w-3.5 h-3.5" /> Scuderie
            </h2>
            <span className="px-2 py-0.5 bg-primary/10 rounded-full text-[7px] font-black text-primary tracking-widest border border-primary/20">
              {members?.length || 0}/10
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {members?.map((m: any) => (
              <div 
                key={m.id}
                data-testid={`member-${m.userId}`}
                className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-900/40 border border-white/5 hover:border-primary/40 hover:bg-zinc-900/60 transition-all duration-200"
              >
                <div className="relative flex-shrink-0">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10 group-hover:border-primary/40 transition-colors" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/40 transition-colors">
                      <UserCircle className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                  )}
                  {m.role === "admin" && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border border-background shadow-md flex items-center justify-center">
                      <Settings className="w-1 h-1 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-white/80 group-hover:text-primary transition-colors truncate max-w-[100px]">
                  {m.teamName === "TBD" ? m.username : m.teamName}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 3. Players' Picks Panel */}
        {selectedRace && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-panel rounded-3xl overflow-hidden border-2 border-white/5 shadow-2xl"
          >
            <div className="px-8 py-5 flex items-center gap-3 border-b border-white/5">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex-1">Players' Picks</h2>
              <span className="px-2.5 py-1 bg-white/5 text-muted-foreground text-[9px] font-black uppercase tracking-widest rounded-full border border-white/10">
                {adminPicks?.length || 0} picks
              </span>
            </div>

            <div className="p-6">
              {!adminPicks ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : adminPicks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                  <Clock className="w-7 h-7 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No picks yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Drivers column */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Drivers</span>
                    </div>
                    <div className="space-y-2">
                      {members?.map((m: any) => {
                        const pick = adminPicks.find(p => p.userId === m.userId);
                        const teamColor = pick?.driverName
                          ? TEAM_COLORS[drivers?.find(d => d.name === pick.driverName)?.team || ""] 
                          : undefined;
                        return (
                          <div
                            key={m.userId}
                            data-testid={`pick-driver-${m.userId}`}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-white/5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {m.avatarUrl ? (
                                <img src={m.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                  <UserCircle className="w-4 h-4 text-muted-foreground/30" />
                                </div>
                              )}
                              <span className="text-[10px] font-black text-white/60 uppercase tracking-tight truncate">
                                {m.teamName === "TBD" ? m.username : m.teamName}
                              </span>
                            </div>
                            {pick ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {teamColor && <div className="w-1 h-4 rounded-full shrink-0" style={{ background: teamColor }} />}
                                <span className="text-[10px] font-black text-white truncate max-w-[100px]">{pick.driverName}</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-muted-foreground/40 font-bold italic shrink-0">No pick</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Constructors column */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Car className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Constructors</span>
                    </div>
                    <div className="space-y-2">
                      {members?.map((m: any) => {
                        const pick = adminPicks.find(p => p.userId === m.userId);
                        const teamColor = pick?.constructorName ? TEAM_COLORS[pick.constructorName] : undefined;
                        return (
                          <div
                            key={m.userId}
                            data-testid={`pick-constructor-${m.userId}`}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-white/5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {m.avatarUrl ? (
                                <img src={m.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10 shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                  <UserCircle className="w-4 h-4 text-muted-foreground/30" />
                                </div>
                              )}
                              <span className="text-[10px] font-black text-white/60 uppercase tracking-tight truncate">
                                {m.teamName === "TBD" ? m.username : m.teamName}
                              </span>
                            </div>
                            {pick ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {teamColor && <div className="w-1 h-4 rounded-full shrink-0" style={{ background: teamColor }} />}
                                <span className="text-[10px] font-black text-white truncate max-w-[100px]">{pick.constructorName}</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-muted-foreground/40 font-bold italic shrink-0">No pick</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 3. Real Results Panel (view-only) */}
        {selectedRace && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-3xl overflow-hidden border-2 border-white/5 shadow-2xl"
          >
            <div className="px-8 py-5 flex items-center gap-3 border-b border-white/5">
              <ListOrdered className="w-4 h-4 text-primary shrink-0" />
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Official F1 Results</h2>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 px-6 pt-4 gap-1">
              <button
                onClick={() => setRealResultsTab("race")}
                data-testid="tab-race"
                className={`px-4 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${
                  realResultsTab === "race"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-white"
                }`}
              >
                Race
              </button>
              <button
                onClick={() => setRealResultsTab("qualifying")}
                data-testid="tab-qualifying"
                className={`px-4 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${
                  realResultsTab === "qualifying"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-white"
                }`}
              >
                Qualifying
              </button>
              {selectedRace.hasSprint && (
                <button
                  onClick={() => setRealResultsTab("sprint")}
                  data-testid="tab-sprint"
                  className={`px-4 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${
                    realResultsTab === "sprint"
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-white"
                  }`}
                >
                  Sprint
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              {activeTabLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !activeTabData || activeTabData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Clock className="w-7 h-7 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-center">Data not available yet</p>
                  <p className="text-[9px] opacity-40 text-center">Results will appear once the session is complete</p>
                </div>
              ) : realResultsTab === "race" ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest w-10">P</th>
                      <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Driver</th>
                      <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden sm:table-cell">Team</th>
                      <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pts</th>
                      <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Gap</th>
                      <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">FL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTabData.map((r: any, idx: number) => {
                      const teamColor = TEAM_COLORS[r.teamName];
                      const isFinished = r.position !== null;
                      return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-center">
                            <span className={`font-black text-xs ${r.position === 1 ? "text-yellow-400" : r.position <= 3 ? "text-white" : isFinished ? "text-muted-foreground" : "text-red-400/60"}`}>
                              {isFinished ? r.position : r.positionText || "DNF"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {teamColor && <div className="w-0.5 h-6 rounded-full shrink-0" style={{ background: teamColor }} />}
                              <div>
                                <div className="font-bold text-white text-xs">{r.driverName}</div>
                                <div className="text-[9px] text-muted-foreground sm:hidden">{r.teamName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-[10px] text-muted-foreground">{r.teamName}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs font-black text-white">{r.points > 0 ? r.points : "—"}</span>
                          </td>
                          <td className="px-3 py-3 text-center hidden md:table-cell">
                            <span className="text-[10px] font-mono text-muted-foreground">{r.gap || (r.position === 1 ? "WINNER" : r.status || "—")}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {r.fastestLap && <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">FL</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : realResultsTab === "qualifying" ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest w-10">P</th>
                      <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Driver</th>
                      <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden sm:table-cell">Team</th>
                      <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Q1</th>
                      <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Q2</th>
                      <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Q3</th>
                      <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTabData.map((r: any) => {
                      const teamColor = TEAM_COLORS[r.teamName];
                      return (
                        <tr key={r.position} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-center">
                            <span className={`font-black text-xs ${r.position === 1 ? "text-yellow-400" : r.position <= 3 ? "text-white" : "text-muted-foreground"}`}>{r.position}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {teamColor && <div className="w-0.5 h-6 rounded-full shrink-0" style={{ background: teamColor }} />}
                              <div>
                                <div className="font-bold text-white text-xs">{r.driverName}</div>
                                <div className="text-[9px] text-muted-foreground sm:hidden">{r.teamName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-[10px] text-muted-foreground">{r.teamName}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-[10px] font-mono text-white/70">{r.q1 || "—"}</span>
                          </td>
                          <td className="px-3 py-3 text-center hidden md:table-cell">
                            <span className="text-[10px] font-mono text-white/70">{r.q2 || "—"}</span>
                          </td>
                          <td className="px-3 py-3 text-center hidden md:table-cell">
                            <span className="text-[10px] font-mono text-white/70">{r.q3 || "—"}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-[10px] font-mono text-muted-foreground">{r.gap || (r.position === 1 ? "POLE" : "—")}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* Sprint */
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest w-10">P</th>
                      <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Driver</th>
                      <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden sm:table-cell">Team</th>
                      <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pts</th>
                      <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTabData.map((r: any, idx: number) => {
                      const teamColor = TEAM_COLORS[r.teamName];
                      return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-center">
                            <span className={`font-black text-xs ${r.position === 1 ? "text-yellow-400" : r.position <= 3 ? "text-white" : "text-muted-foreground"}`}>{r.position}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {teamColor && <div className="w-0.5 h-6 rounded-full shrink-0" style={{ background: teamColor }} />}
                              <div>
                                <div className="font-bold text-white text-xs">{r.driverName}</div>
                                <div className="text-[9px] text-muted-foreground sm:hidden">{r.teamName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-[10px] text-muted-foreground">{r.teamName}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs font-black text-white">{r.points > 0 ? r.points : "—"}</span>
                          </td>
                          <td className="px-3 py-3 text-center hidden md:table-cell">
                            <span className="text-[10px] font-mono text-muted-foreground">{r.gap || (r.position === 1 ? "WINNER" : "—")}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
              {isEditingRealResults && editedRealResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="border-t border-white/5 overflow-x-auto bg-white/[0.01]"
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        {realResultsTab === "race" ? (
                          <>
                            <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest w-10">P</th>
                            <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Driver</th>
                            <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pts</th>
                            <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Gap</th>
                            <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">FL</th>
                          </>
                        ) : realResultsTab === "qualifying" ? (
                          <>
                            <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest w-10">P</th>
                            <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Driver</th>
                            <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Q1</th>
                            <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Q2</th>
                            <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Q3</th>
                          </>
                        ) : (
                          <>
                            <th className="text-center px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest w-10">P</th>
                            <th className="text-left px-4 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Driver</th>
                            <th className="text-center px-3 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pts</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {editedRealResults.map((r: any, idx: number) => (
                        <tr key={idx} className="border-b border-white/5">
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min={1}
                              value={r.position || ""}
                              onChange={e => setEditedRealResults(prev => {
                                const updated = [...prev];
                                updated[idx].position = Number(e.target.value) || null;
                                return updated;
                              })}
                              data-testid={`input-f1-position-${idx}`}
                              className="w-12 text-center bg-zinc-900/60 border border-white/10 rounded-lg px-1.5 py-1 text-white text-xs font-bold focus:border-primary focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-white font-bold">{r.driverName}</span>
                          </td>
                          {realResultsTab === "race" ? (
                            <>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="number"
                                  value={r.points || 0}
                                  onChange={e => setEditedRealResults(prev => {
                                    const updated = [...prev];
                                    updated[idx].points = Number(e.target.value) || 0;
                                    return updated;
                                  })}
                                  data-testid={`input-f1-points-${idx}`}
                                  className="w-12 text-center bg-zinc-900/60 border border-white/10 rounded-lg px-1.5 py-1 text-white text-xs font-bold focus:border-primary focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-3 text-center hidden md:table-cell">
                                <input
                                  type="text"
                                  value={r.gap || ""}
                                  onChange={e => setEditedRealResults(prev => {
                                    const updated = [...prev];
                                    updated[idx].gap = e.target.value;
                                    return updated;
                                  })}
                                  data-testid={`input-f1-gap-${idx}`}
                                  className="w-16 text-center bg-zinc-900/60 border border-white/10 rounded-lg px-1.5 py-1 text-white text-xs font-bold focus:border-primary focus:outline-none"
                                  placeholder="—"
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={r.fastestLap || false}
                                  onChange={e => setEditedRealResults(prev => {
                                    const updated = [...prev];
                                    updated[idx].fastestLap = e.target.checked;
                                    return updated;
                                  })}
                                  data-testid={`input-f1-fl-${idx}`}
                                  className="w-4 h-4 accent-primary cursor-pointer"
                                />
                              </td>
                            </>
                          ) : realResultsTab === "qualifying" ? (
                            <>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="text"
                                  value={r.q1 || ""}
                                  onChange={e => setEditedRealResults(prev => {
                                    const updated = [...prev];
                                    updated[idx].q1 = e.target.value;
                                    return updated;
                                  })}
                                  data-testid={`input-f1-q1-${idx}`}
                                  className="w-16 text-center bg-zinc-900/60 border border-white/10 rounded-lg px-1.5 py-1 text-white text-xs font-bold focus:border-primary focus:outline-none"
                                  placeholder="—"
                                />
                              </td>
                              <td className="px-3 py-3 text-center hidden md:table-cell">
                                <input
                                  type="text"
                                  value={r.q2 || ""}
                                  onChange={e => setEditedRealResults(prev => {
                                    const updated = [...prev];
                                    updated[idx].q2 = e.target.value;
                                    return updated;
                                  })}
                                  data-testid={`input-f1-q2-${idx}`}
                                  className="w-16 text-center bg-zinc-900/60 border border-white/10 rounded-lg px-1.5 py-1 text-white text-xs font-bold focus:border-primary focus:outline-none"
                                  placeholder="—"
                                />
                              </td>
                              <td className="px-3 py-3 text-center hidden md:table-cell">
                                <input
                                  type="text"
                                  value={r.q3 || ""}
                                  onChange={e => setEditedRealResults(prev => {
                                    const updated = [...prev];
                                    updated[idx].q3 = e.target.value;
                                    return updated;
                                  })}
                                  data-testid={`input-f1-q3-${idx}`}
                                  className="w-16 text-center bg-zinc-900/60 border border-white/10 rounded-lg px-1.5 py-1 text-white text-xs font-bold focus:border-primary focus:outline-none"
                                  placeholder="—"
                                />
                              </td>
                            </>
                          ) : (
                            <td className="px-3 py-3 text-center">
                              <input
                                type="number"
                                value={r.points || 0}
                                onChange={e => setEditedRealResults(prev => {
                                  const updated = [...prev];
                                  updated[idx].points = Number(e.target.value) || 0;
                                  return updated;
                                })}
                                data-testid={`input-f1-points-sprint-${idx}`}
                                className="w-12 text-center bg-zinc-900/60 border border-white/10 rounded-lg px-1.5 py-1 text-white text-xs font-bold focus:border-primary focus:outline-none"
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* 4. Race Operations */}
        {selectedRace && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 }}
            className="border-2 border-white/5 rounded-2xl p-5 bg-gradient-to-br from-white/[0.03] to-transparent shadow-xl"
          >
            <h3 className="font-black text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Race Operations</h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => updateStatus({ id: selectedRace.id, updates: { isLocked: !selectedRace.isLocked } })}
                disabled={updatingStatus}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 text-[10px] transition-all border-2 ${
                  selectedRace.isLocked 
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/5" 
                    : "bg-green-500/10 border-green-500/20 text-green-500 shadow-lg shadow-green-500/5"
                }`}
              >
                {selectedRace.isLocked ? <><Lock className="w-4 h-4" /> Unlock Grid</> : <><Unlock className="w-4 h-4" /> Lock Grid</>}
              </button>
              <button
                onClick={() => {
                  if (selectedRace.isCompleted) {
                    updateStatus({ id: selectedRace.id, updates: { isCompleted: false } });
                  } else {
                    finalizeResultsMutation.mutate(selectedRace.id);
                  }
                }}
                disabled={updatingStatus || finalizeResultsMutation.isPending}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 text-[10px] transition-all border-2 ${
                  selectedRace.isCompleted 
                    ? "bg-zinc-800 border-white/10 text-white" 
                    : "bg-primary border-primary text-white red-glow shadow-xl shadow-primary/20"
                }`}
              >
                {finalizeResultsMutation.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Finalizing...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> {selectedRace.isCompleted ? "Reopen Session" : "Finalize Results"}</>
                )}
              </button>
              {!isEditingRealResults ? (
                <button
                  onClick={() => {
                    setIsEditingRealResults(true);
                    setEditedRealResults(activeTabData ? JSON.parse(JSON.stringify(activeTabData)) : []);
                  }}
                  data-testid="button-edit-f1-results"
                  className="w-full py-4 rounded-2xl bg-white/5 border-2 border-white/10 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 text-[10px] hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Results
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditingRealResults(false);
                      setEditedRealResults([]);
                    }}
                    data-testid="button-cancel-f1-edit"
                    className="flex-1 py-4 rounded-2xl bg-white/5 border-2 border-white/10 text-muted-foreground font-black uppercase tracking-widest flex items-center justify-center gap-3 text-[10px] hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingRealResults(false);
                      toast({ title: "Results Updated", description: "Official F1 results have been saved." });
                    }}
                    data-testid="button-save-f1-edit"
                    className="flex-1 py-4 rounded-2xl bg-primary/20 border-2 border-primary/30 text-primary font-black uppercase tracking-widest flex items-center justify-center gap-3 text-[10px] hover:bg-primary/30 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 5. Draft Monitor */}
        {selectedRace && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
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
                  {draftStatus.draftOrder.map((player: any, index: number) => {
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

        {/* Danger Zone */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto w-full mt-8"
        >
          <div className="glass-panel rounded-3xl p-8 border-2 border-red-900/20 bg-gradient-to-br from-red-950/30 to-transparent shadow-2xl relative overflow-hidden group hover:border-red-900/40 transition-all">
            <div className="absolute inset-0 bg-red-900/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-red-500/20 transition-colors" />
            
            <div className="relative z-10">
              <div className="flex items-start gap-4 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-display font-black text-white uppercase tracking-tight mb-2">Danger Zone</h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Permanently delete this league and all associated data. This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteLobbyMutation.isPending}
                className="w-full mt-6 py-3.5 rounded-xl bg-red-900/40 border-2 border-red-900/50 text-red-300 font-semibold uppercase tracking-widest text-sm hover:bg-red-900/60 hover:border-red-900/70 hover:text-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group/btn"
                data-testid="button-delete-lobby"
              >
                {deleteLobbyMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin" />
                    Deleting League...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                    Delete League
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => !deleteLobbyMutation.isPending && setShowDeleteConfirm(false)}
          >
            <div className="bg-zinc-900 border border-red-900/30 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-display font-black text-white uppercase tracking-tight">Delete League</h3>
                </div>
                <p className="text-sm text-white/70 mb-6">
                  This action is irreversible. All league data, including results and player selections, will be permanently deleted.
                </p>
                <div className="bg-red-900/10 border border-red-900/20 rounded-lg p-3 mb-6">
                  <p className="text-xs text-red-200 font-mono font-semibold">League: {lobby?.name || "..."}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLobbyMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 text-xs font-semibold uppercase tracking-wider hover:text-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteLobbyMutation.mutate(Number(selectedLobbyId))}
                    disabled={deleteLobbyMutation.isPending}
                    data-testid="button-confirm-delete"
                    className="flex-1 py-2.5 rounded-lg bg-red-900/40 border border-red-900/60 text-red-300 text-xs font-semibold uppercase tracking-wider hover:bg-red-900/60 hover:text-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLobbyMutation.isPending ? <div className="w-3 h-3 border border-red-300/30 border-t-red-300 rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
