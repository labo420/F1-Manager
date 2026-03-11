import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Users, PlusCircle, LogIn, ArrowRight, Crown, X } from "lucide-react";
import { useCreateLobby, useJoinLobby } from "@/hooks/use-lobby";
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
    <div className="max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8 pb-28">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 sm:mb-14">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">
            My Leagues
          </p>
          <h1 className="text-5xl sm:text-7xl font-display font-black text-white uppercase tracking-tighter leading-none">
            Paddock
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-[3px] w-8 bg-primary rounded-full" />
            <div className="h-px w-16 bg-white/10" />
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setMode(mode === "create" ? "list" : "create")}
            data-testid="button-create-league"
            className={`group flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-display font-black uppercase text-sm tracking-wide transition-all duration-200
              ${mode === "create"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25"}`}
          >
            {mode === "create" ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            <span className="hidden sm:inline">Create</span>
          </button>
          <button
            onClick={() => setMode(mode === "join" ? "list" : "join")}
            data-testid="button-join-league"
            className={`group flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-display font-black uppercase text-sm tracking-wide transition-all duration-200 border
              ${mode === "join"
                ? "bg-white/10 text-white border-white/20"
                : "bg-transparent text-white border-white/15 hover:bg-white/8 hover:border-white/25"}`}
          >
            {mode === "join" ? <X className="w-4 h-4" /> : <LogIn className="w-4 h-4 text-primary" />}
            <span className="hidden sm:inline">Join</span>
          </button>
        </div>
      </div>

      {/* ── Create form ── */}
      <AnimatePresence>
        {mode === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-8"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
              <div className="border-b border-primary/15 px-6 py-4 flex items-center gap-3">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                <span className="font-display font-black text-sm uppercase tracking-wider text-white">New League</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (leagueName.trim() && teamName.trim()) {
                    createLobby.mutate(
                      { name: leagueName.trim(), teamName: teamName.trim() },
                      { onSuccess: () => { setMode("list"); setLeagueName(""); setTeamName(""); } }
                    );
                  }
                }}
                className="p-6 grid sm:grid-cols-2 gap-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">League Name</label>
                  <input
                    placeholder="e.g. Scuderia GP"
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    data-testid="input-league-name"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-primary outline-none transition-colors placeholder:text-white/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Your Scuderia</label>
                  <input
                    placeholder="e.g. Tifosi Racing"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    data-testid="input-team-name-create"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-primary outline-none transition-colors placeholder:text-white/20"
                  />
                </div>
                <div className="sm:col-span-2 flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setMode("list"); setLeagueName(""); setTeamName(""); }}
                    className="px-6 py-2.5 rounded-lg font-bold uppercase text-xs text-white/35 hover:text-white/70 transition-colors border border-white/8 hover:border-white/15"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!leagueName.trim() || !teamName.trim() || createLobby.isPending}
                    data-testid="button-submit-create"
                    className="px-8 py-2.5 bg-primary text-white rounded-lg font-black uppercase text-xs tracking-wider disabled:opacity-40 hover:bg-primary/90 transition-all"
                  >
                    {createLobby.isPending ? "Creating…" : "Confirm"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* ── Join form ── */}
        {mode === "join" && (
          <motion.div
            key="join"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-8"
          >
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="border-b border-white/8 px-6 py-4 flex items-center gap-3">
                <div className="w-1.5 h-4 bg-white/30 rounded-full" />
                <span className="font-display font-black text-sm uppercase tracking-wider text-white">Join League</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.length >= 4 && teamName.trim()) {
                    joinLobby.mutate(
                      { code: code.toUpperCase(), teamName: teamName.trim() },
                      { onSuccess: () => { setMode("list"); setCode(""); setTeamName(""); } }
                    );
                  }
                }}
                className="p-6 grid sm:grid-cols-2 gap-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">League Code</label>
                  <input
                    placeholder="F1-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    data-testid="input-league-code"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white font-mono font-bold text-lg text-center tracking-[0.3em] uppercase focus:border-primary outline-none transition-colors placeholder:text-white/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Your Scuderia</label>
                  <input
                    placeholder="e.g. Tifosi Racing"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    data-testid="input-team-name-join"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-primary outline-none transition-colors placeholder:text-white/20"
                  />
                </div>
                <div className="sm:col-span-2 flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setMode("list"); setCode(""); setTeamName(""); }}
                    className="px-6 py-2.5 rounded-lg font-bold uppercase text-xs text-white/35 hover:text-white/70 transition-colors border border-white/8 hover:border-white/15"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={code.length < 4 || !teamName.trim() || joinLobby.isPending}
                    data-testid="button-submit-join"
                    className="px-8 py-2.5 bg-primary text-white rounded-lg font-black uppercase text-xs tracking-wider disabled:opacity-40 hover:bg-primary/90 transition-all"
                  >
                    {joinLobby.isPending ? "Joining…" : "Join Grid"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── League cards ── */}
      {memberships && memberships.length > 0 ? (
        <div className="space-y-3">
          {memberships.map((membership, idx) => {
            const isAdmin = membership.role === "admin";
            const initials = getInitials(membership.lobbyName);
            return (
              <motion.div
                key={membership.lobbyId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <Link href={`/lobby/${membership.lobbyId}`}>
                  <div
                    className={`group relative flex items-center gap-4 sm:gap-6 rounded-xl px-5 py-4 sm:py-5 border transition-all duration-200 cursor-pointer overflow-hidden
                      bg-white/[0.03] hover:bg-white/[0.055]
                      ${isAdmin ? "border-primary/20 hover:border-primary/40" : "border-white/8 hover:border-white/18"}`}
                    data-testid={`lobby-card-${membership.lobbyId}`}
                  >
                    {/* Left accent bar */}
                    <div className={`absolute left-0 inset-y-0 w-[3px] rounded-r-full transition-all duration-200
                      ${isAdmin ? "bg-primary" : "bg-white/20 group-hover:bg-white/40"}`} />

                    {/* Avatar */}
                    <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center border font-display font-black text-sm transition-colors duration-200
                      ${isAdmin
                        ? "bg-primary/10 border-primary/20 text-primary group-hover:bg-primary/20"
                        : "bg-white/5 border-white/10 text-white/50 group-hover:bg-white/10"}`}
                    >
                      {membership.lobbyImageUrl ? (
                        <img
                          src={membership.lobbyImageUrl}
                          alt={membership.lobbyName}
                          className="w-full h-full object-cover rounded-xl"
                          data-testid={`img-lobby-${membership.lobbyId}`}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className={`font-display font-black text-base sm:text-lg uppercase tracking-tight leading-none transition-colors
                          ${isAdmin ? "text-white group-hover:text-primary" : "text-white"}`}>
                          {membership.lobbyName}
                        </h3>
                        {isAdmin && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                            <Crown className="w-2.5 h-2.5" /> Admin
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <code className="text-[10px] font-mono text-white/35 tracking-wider">{membership.lobbyCode}</code>
                        <span className="text-white/15 text-xs">·</span>
                        <span className="text-[10px] text-white/45 font-semibold uppercase tracking-wide">{membership.teamName}</span>
                      </div>
                    </div>

                    {/* Right side: CTA */}
                    <div className={`shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all duration-200 opacity-0 group-hover:opacity-100
                      ${isAdmin ? "text-primary" : "text-white/60"}`}>
                      <span className="hidden sm:block">Enter</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 rounded-xl border border-dashed border-white/10 bg-white/[0.02]"
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Users className="w-7 h-7 text-white/20" />
          </div>
          <p className="font-display font-black text-lg uppercase tracking-tight text-white/30 mb-4">No Leagues Yet</p>
          <button
            onClick={() => setMode("create")}
            className="text-primary hover:text-white font-black uppercase tracking-widest text-xs transition-colors"
          >
            Create Your First League →
          </button>
        </motion.div>
      )}
    </div>
  );
}
