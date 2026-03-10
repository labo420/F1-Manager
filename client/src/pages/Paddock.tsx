import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Users, PlusCircle, LogIn, ChevronRight } from "lucide-react";
import { useCreateLobby, useJoinLobby } from "@/hooks/use-lobby";
import { TeamAvatar } from "@/components/TeamAvatar";
import { motion, AnimatePresence } from "framer-motion";
import type { Membership } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function Paddock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [leagueName, setLeagueName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");
  const createLobby = useCreateLobby();
  const joinLobby = useJoinLobby();

  const { data: memberships, isLoading } = useQuery<Membership[]>({
    queryKey: ["/api/me"],
    select: (data: any) => data.memberships,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-12 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-8 mb-8 sm:mb-16">
        <div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black text-white uppercase tracking-tighter italic leading-none mb-2">
            Paddock
          </h1>
          <div className="h-1.5 w-24 bg-primary rounded-full ml-1" />
        </div>
        
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <button
            onClick={() => setMode("create")}
            data-testid="button-create-league"
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white px-5 sm:px-10 py-4 sm:py-5 rounded-2xl font-display font-black uppercase tracking-tight flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] red-glow shadow-2xl shadow-primary/40"
          >
            <PlusCircle className="w-6 h-6" /> Create League
          </button>
          <button
            onClick={() => setMode("join")}
            data-testid="button-join-league"
            className="flex-1 md:flex-none glass-panel hover:bg-white/10 text-white px-5 sm:px-10 py-4 sm:py-5 rounded-2xl font-display font-black uppercase tracking-tight flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] border-2 border-white/10"
          >
            <LogIn className="w-6 h-6 text-primary" /> Join League
          </button>
        </div>
      </div>

      {mode === "create" && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto mb-16 glass-panel rounded-3xl p-6 sm:p-10 border-2 border-primary/30 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
            <PlusCircle className="w-8 h-8 text-primary" /> Start New League
          </h2>
          <form onSubmit={(e) => { e.preventDefault(); if (leagueName.trim() && teamName.trim()) createLobby.mutate({ name: leagueName.trim(), teamName: teamName.trim() }, { onSuccess: () => { setMode("list"); setLeagueName(""); setTeamName(""); } }); }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">League Identity</label>
              <input
                placeholder="Enter League Name"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 text-white font-display font-bold uppercase tracking-tight focus:border-primary outline-none transition-all placeholder:text-white/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Your Scuderia</label>
              <input
                placeholder="Enter Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 text-white font-display font-bold uppercase tracking-tight focus:border-primary outline-none transition-all placeholder:text-white/20"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => { setMode("list"); setTeamName(""); }} className="flex-1 py-5 rounded-2xl font-display font-black uppercase tracking-tight text-muted-foreground hover:text-white hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!leagueName.trim() || !teamName.trim() || createLobby.isPending}
                className="flex-[2] bg-primary text-white rounded-2xl py-5 font-display font-black uppercase tracking-tight disabled:opacity-50 hover:bg-primary/90 transition-all red-glow"
              >
                {createLobby.isPending ? "Constructing..." : "Confirm Grid"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {mode === "join" && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto mb-16 glass-panel rounded-3xl p-6 sm:p-10 border-2 border-primary/30 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
            <LogIn className="w-8 h-8 text-primary" /> Join The Grid
          </h2>
          <form onSubmit={(e) => { e.preventDefault(); if (code.length >= 4 && teamName.trim()) joinLobby.mutate({ code: code.toUpperCase(), teamName: teamName.trim() }, { onSuccess: () => { setMode("list"); setCode(""); setTeamName(""); } }); }} className="space-y-6">
            <div className="space-y-2 text-center">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">League Invitation Code</label>
              <input
                placeholder="F1-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-6 text-white font-mono text-4xl text-center tracking-[0.4em] uppercase focus:border-primary outline-none transition-all placeholder:text-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Your Scuderia</label>
              <input
                placeholder="Enter Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 text-white font-display font-bold uppercase tracking-tight focus:border-primary outline-none transition-all placeholder:text-white/20"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => { setMode("list"); setTeamName(""); }} className="flex-1 py-5 rounded-2xl font-display font-black uppercase tracking-tight text-muted-foreground hover:text-white hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button
                type="submit"
                disabled={code.length < 4 || !teamName.trim() || joinLobby.isPending}
                className="flex-[2] bg-primary text-white rounded-2xl py-5 font-display font-black uppercase tracking-tight disabled:opacity-50 hover:bg-primary/90 transition-all red-glow"
              >
                {joinLobby.isPending ? "Connecting..." : "Confirm Entry"}
              </button>
            </div>
          </form>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {memberships?.map((membership, idx) => (
          <motion.div
            key={membership.lobbyId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Link href={`/lobby/${membership.lobbyId}`}>
              <div className="glass-panel rounded-[2rem] p-3 hover:bg-white/5 hover:border-primary/50 transition-all group cursor-pointer border-2 border-white/5 relative overflow-hidden h-full flex flex-col shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/15 transition-colors" />
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1 mb-0.5 leading-none">
                      {membership.lobbyName}
                    </h3>
                    <code className="text-[8px] font-mono font-bold text-primary bg-primary/10 px-1 py-0.5 rounded-md uppercase tracking-widest">
                      {membership.lobbyCode}
                    </code>
                  </div>
                  <div className="relative shrink-0">
                    {membership.lobbyImageUrl ? (
                      <img
                        src={membership.lobbyImageUrl}
                        alt={membership.lobbyName}
                        className="w-10 h-10 rounded-2xl object-cover border border-white/10 shadow-inner"
                        data-testid={`img-lobby-${membership.lobbyId}`}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-inner">
                        <span className="text-[9px] font-black text-white/60 group-hover:text-primary transition-colors">{getInitials(membership.lobbyName)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Scuderia</span>
                    <div className="flex items-center gap-1.5">
                      <TeamAvatar name={membership.teamName} size="sm" />
                      <span className="text-xs font-display font-black text-white uppercase tracking-tight">{membership.teamName}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Role</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em] ${
                      membership.role === 'admin' ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.5)]' : 'bg-white/10 text-white border border-white/10'
                    }`}>
                      {membership.role}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-end">
                  <div className="text-[8px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 flex items-center gap-1.5">
                    Enter Paddock <div className="w-3 h-[2px] bg-primary rounded-full" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
        
        {memberships?.length === 0 && (
          <div className="col-span-full text-center py-20 glass-panel rounded-3xl border-2 border-dashed border-white/10">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-muted-foreground opacity-20" />
            </div>
            <p className="text-xl font-display font-bold text-muted-foreground uppercase tracking-tight mb-6">Your Grid is Empty</p>
            <button 
              onClick={() => setMode("create")}
              className="text-primary hover:text-white font-black uppercase tracking-widest text-xs transition-colors border-b-2 border-primary/20 hover:border-white pb-1"
            >
              Start Your First League
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
