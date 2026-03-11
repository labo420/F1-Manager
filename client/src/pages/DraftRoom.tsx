import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useState } from "react";
import { Loader2, ChevronLeft, User, ShieldCheck, Info, Star, Flag, CheckCircle2, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Driver, Constructor, DraftStatus, UsageInfo } from "@shared/schema";
import { cn } from "@/lib/utils";
import { DriverAvatar } from "@/components/DriverAvatar";

export default function DraftRoom({ lobbyId, raceId }: { lobbyId: number; raceId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: draftStatus, isLoading: loadingDraft } = useQuery<DraftStatus>({
    queryKey: [`/api/draft/${lobbyId}/${raceId}`],
    refetchInterval: 3000,
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const { data: constructors } = useQuery<Constructor[]>({
    queryKey: ["/api/constructors"],
  });

  const { data: usage } = useQuery<UsageInfo>({
    queryKey: [`/api/usage/${lobbyId}`],
  });

  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedConstructorId, setSelectedConstructorId] = useState<number | null>(null);
  const [useJolly, setUseJolly] = useState(false);
  const [mobilePickTab, setMobilePickTab] = useState<"driver" | "constructor">("driver");

  const mutation = useMutation({
    mutationFn: async (vars: { driverId: number; constructorId: number; useJolly: boolean }) => {
      const res = await apiRequest("POST", "/api/selections", {
        ...vars,
        lobbyId,
        raceId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/draft/${lobbyId}/${raceId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/selections/${lobbyId}/me`] });
      queryClient.invalidateQueries({ queryKey: [`/api/usage/${lobbyId}`] });
      setSelectedDriverId(null);
      setSelectedConstructorId(null);
      setUseJolly(false);
      toast({ title: "Selection saved", description: "Your picks for this race have been recorded." });
    },
    onError: (error: Error) => {
      toast({ title: "Selection failed", description: error.message, variant: "destructive" });
    },
  });

  if (loadingDraft || !drivers || !constructors || !usage) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isMyTurn = draftStatus?.isMyTurn;
  const isComplete = draftStatus?.isComplete;

  const handlePick = () => {
    if (selectedDriverId && selectedConstructorId) {
      mutation.mutate({ driverId: selectedDriverId, constructorId: selectedConstructorId, useJolly });
    }
  };

  const needsJolly = (dId: number | null, cId: number | null) => {
    if (!usage) return false;
    const dUsage = dId ? usage.driverUsage[dId] || 0 : 0;
    const cUsage = cId ? usage.constructorUsage[cId] || 0 : 0;
    return dUsage === 1 || cUsage === 2;
  };

  const isMandatoryDriver = (dId: number) => {
    if (!usage || !drivers) return false;
    const usedDriverIds = Object.keys(usage.driverUsage).map(Number);
    const isUnused = !usedDriverIds.includes(dId);
    if (!isUnused) return false;
    const unusedCount = drivers.length - usedDriverIds.length;
    return unusedCount <= 3;
  };

  const StarRating = ({ count, total }: { count: number; total: number }) => (
    <div className="flex gap-0.5">
      {[...Array(total)].map((_, i) => (
        <Star key={i} className={cn("w-3.5 h-3.5", i < count ? "text-yellow-400 fill-yellow-400" : "text-white/10")} />
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-28">

      {/* Back + header */}
      <button
        onClick={() => setLocation(`/lobby/${lobbyId}`)}
        className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 group"
        data-testid="button-back-lobby"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Back to Lobby</span>
      </button>

      {/* Hero */}
      <div className="glass-panel rounded-3xl border border-white/5 p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full -mr-36 -mt-36 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70 mb-2">Draft Room</p>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white uppercase tracking-tighter leading-none">
              Make Your Pick
            </h1>
            <p className="text-sm text-muted-foreground mt-2 opacity-60">Select your Driver and Constructor for this race</p>
          </div>

          {/* Status + actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Turn indicator */}
            {!isComplete && (
              <div className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider",
                isMyTurn
                  ? "bg-primary/10 border-primary/30 text-primary animate-pulse"
                  : "bg-white/5 border-white/10 text-muted-foreground"
              )}>
                {isMyTurn ? (
                  <><Flag className="w-3.5 h-3.5" /> Your Turn!</>
                ) : (
                  <><Clock className="w-3.5 h-3.5" /> Waiting for {draftStatus?.currentDrafterName}…</>
                )}
              </div>
            )}

            {/* Jolly toggle */}
            {isMyTurn && !isComplete && needsJolly(selectedDriverId, selectedConstructorId) && (
              <button
                onClick={() => setUseJolly(!useJolly)}
                data-testid="button-use-jolly"
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all",
                  useJolly
                    ? "bg-yellow-400/15 border-yellow-400/40 text-yellow-400 shadow-lg shadow-yellow-400/10"
                    : "bg-white/5 border-yellow-400/30 text-yellow-400/70 hover:border-yellow-400/50"
                )}
              >
                <Star className={cn("w-3.5 h-3.5", useJolly && "fill-yellow-400")} />
                {useJolly ? "Joker Active" : "Use Joker"}
              </button>
            )}

            {/* Confirm — desktop only */}
            {isMyTurn && !isComplete && (
              <button
                onClick={handlePick}
                disabled={!selectedDriverId || !selectedConstructorId || mutation.isPending || (needsJolly(selectedDriverId, selectedConstructorId) && !useJolly)}
                data-testid="button-confirm-pick"
                className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-wider transition-all hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed red-glow shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirm Pick
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Selection area — col-span-3, first mobile */}
        <div className="lg:col-span-3 space-y-5 order-1 lg:order-2">
          {!isComplete ? (
            <div className={cn(
              "glass-panel rounded-3xl border overflow-hidden transition-all",
              isMyTurn ? "border-primary/30 shadow-xl shadow-primary/10" : "border-white/5 opacity-80"
            )}>
              {/* Panel header */}
              <div className={cn(
                "px-5 sm:px-6 py-4 border-b flex items-center justify-between",
                isMyTurn ? "border-primary/20 bg-primary/5" : "border-white/5"
              )}>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
                  {isMyTurn ? "Select Your Picks" : `Waiting for ${draftStatus?.currentDrafterName}`}
                </p>
                {/* Selection summary pills */}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                    selectedDriverId ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-muted-foreground opacity-40"
                  )}>
                    Driver {selectedDriverId ? "✓" : "—"}
                  </div>
                  <div className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                    selectedConstructorId ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-muted-foreground opacity-40"
                  )}>
                    Team {selectedConstructorId ? "✓" : "—"}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* Mobile tab switcher */}
                <div className="flex md:hidden gap-1 mb-5 glass-panel rounded-2xl p-1 border border-white/5">
                  <button
                    onClick={() => setMobilePickTab("driver")}
                    data-testid="mobile-tab-driver"
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-display font-black uppercase tracking-tight text-xs transition-all",
                      mobilePickTab === "driver"
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-white"
                    )}
                  >
                    Driver
                    {selectedDriverId && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                  </button>
                  <button
                    onClick={() => setMobilePickTab("constructor")}
                    data-testid="mobile-tab-constructor"
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-display font-black uppercase tracking-tight text-xs transition-all",
                      mobilePickTab === "constructor"
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-white"
                    )}
                  >
                    Constructor
                    {selectedConstructorId && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Driver list */}
                  <div className={cn(mobilePickTab !== "driver" && "hidden md:block")}>
                    <p className="hidden md:block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 mb-3">
                      Select Driver
                    </p>
                    <div className="space-y-1.5 md:max-h-[440px] md:overflow-y-auto pr-1">
                      {drivers.map(driver => {
                        const isTaken = draftStatus?.takenDriverIds.includes(driver.id);
                        const usedCount = usage.driverUsage[driver.id] || 0;
                        const isSelected = selectedDriverId === driver.id;
                        const isDisabled = !isMyTurn || isTaken || usedCount >= 2;
                        const isMandatory = isMandatoryDriver(driver.id);

                        return (
                          <button
                            key={driver.id}
                            disabled={isDisabled}
                            data-testid={`driver-btn-${driver.id}`}
                            onClick={() => {
                              setSelectedDriverId(driver.id);
                              setMobilePickTab("constructor");
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3.5 py-3 rounded-2xl border text-left transition-all",
                              isTaken
                                ? "bg-white/3 border-white/5 opacity-40 cursor-not-allowed"
                                : usedCount >= 2
                                  ? "bg-red-500/5 border-red-500/15 opacity-50 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30 shadow-lg shadow-primary/10"
                                    : isMandatory
                                      ? "bg-orange-500/5 border-orange-500/30"
                                      : "bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/15 active:scale-[0.99]"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <DriverAvatar number={driver.number ?? undefined} name={driver.name} size="sm" />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className={cn("text-sm font-black uppercase tracking-tight leading-none", isSelected ? "text-white" : "text-white/80")}>{driver.name}</p>
                                  {isMandatory && !isTaken && usedCount < 2 && (
                                    <span className="text-[8px] font-black uppercase tracking-wider text-orange-400 border border-orange-400/30 px-1.5 py-0.5 rounded-full">
                                      Must Pick
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground opacity-50 mt-0.5">{driver.team}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Uses</p>
                              <p className={cn("text-sm font-black leading-none", usedCount >= 2 ? "text-red-400" : isSelected ? "text-primary" : "text-white/40")}>
                                {usedCount}<span className="text-white/20">/2</span>
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Constructor list */}
                  <div className={cn(mobilePickTab !== "constructor" && "hidden md:block")}>
                    <p className="hidden md:block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 mb-3">
                      Select Constructor
                    </p>
                    <div className="space-y-1.5 md:max-h-[440px] md:overflow-y-auto pr-1">
                      {constructors.map(con => {
                        const isTaken = draftStatus?.takenConstructorIds.includes(con.id);
                        const usedCount = usage.constructorUsage[con.id] || 0;
                        const isSelected = selectedConstructorId === con.id;
                        const isDisabled = !isMyTurn || isTaken || usedCount >= 3;

                        return (
                          <button
                            key={con.id}
                            disabled={isDisabled}
                            data-testid={`constructor-btn-${con.id}`}
                            onClick={() => setSelectedConstructorId(con.id)}
                            className={cn(
                              "w-full flex items-center justify-between px-3.5 py-3 rounded-2xl border text-left transition-all",
                              isTaken
                                ? "bg-white/3 border-white/5 opacity-40 cursor-not-allowed"
                                : usedCount >= 3
                                  ? "bg-red-500/5 border-red-500/15 opacity-50 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30 shadow-lg shadow-primary/10"
                                    : "bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/15 active:scale-[0.99]"
                            )}
                          >
                            {/* Team color bar */}
                            <div className="flex items-center gap-3">
                              <div
                                className="w-1 h-9 rounded-full shrink-0"
                                style={{ backgroundColor: con.color ?? "#ffffff20" }}
                              />
                              <div>
                                <p className={cn("text-sm font-black uppercase tracking-tight leading-none", isSelected ? "text-white" : "text-white/80")}>
                                  {con.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground opacity-40 mt-0.5 font-mono">Constructor</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Uses</p>
                              <p className={cn("text-sm font-black leading-none", usedCount >= 3 ? "text-red-400" : isSelected ? "text-primary" : "text-white/40")}>
                                {usedCount}<span className="text-white/20">/3</span>
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Draft complete panel */
            <div className="glass-panel rounded-3xl border border-green-500/20 bg-green-500/5 flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mb-6">
                <ShieldCheck className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-4xl font-display font-black text-white uppercase tracking-tighter mb-2">Draft Complete</h2>
              <p className="text-sm text-muted-foreground opacity-60 mb-8">All managers have locked in their picks for this race.</p>
              <button
                onClick={() => setLocation(`/lobby/${lobbyId}`)}
                className="bg-primary text-white px-8 py-3.5 rounded-2xl font-display font-black uppercase tracking-tight text-sm hover:bg-primary/90 transition-all red-glow shadow-xl shadow-primary/30 hover:scale-[1.02]"
              >
                Return to Lobby
              </button>
            </div>
          )}
        </div>

        {/* Sidebar — first on desktop, second on mobile */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">

          {/* Draft order */}
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
                Draft Order
              </p>
            </div>
            <div className="p-3 space-y-1">
              {draftStatus?.draftOrder.map((drafter, idx) => {
                const isCurrent = draftStatus.currentDrafterIndex === idx && !isComplete;
                return (
                  <div
                    key={drafter.userId}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
                      isCurrent ? "bg-primary/10 border border-primary/20" : "border border-transparent",
                      drafter.hasPicked && "opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                        isCurrent ? "bg-primary text-white" : "bg-white/5 text-muted-foreground"
                      )}>
                        {idx + 1}
                      </div>
                      <span className={cn("text-xs font-black uppercase tracking-tight truncate max-w-[90px]", isCurrent ? "text-white" : "text-white/60")}>
                        {drafter.username}
                      </span>
                    </div>
                    {drafter.hasPicked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    ) : isCurrent ? (
                      <span className="text-[9px] font-black uppercase tracking-wider text-primary animate-pulse">Picking</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Jokers & rules */}
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
                Your Jokers
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel rounded-2xl p-3 border border-yellow-400/10 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400/60 mb-2">Driver</p>
                  <StarRating count={usage.driverJolliesRemaining} total={2} />
                  <p className="text-xs font-black text-white mt-1">{usage.driverJolliesRemaining}/2</p>
                </div>
                <div className="glass-panel rounded-2xl p-3 border border-blue-400/10 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-400/60 mb-2">Team</p>
                  <StarRating count={usage.constructorJolliesRemaining} total={2} />
                  <p className="text-xs font-black text-white mt-1">{usage.constructorJolliesRemaining}/2</p>
                </div>
              </div>
              <div className="flex items-start gap-2 px-1">
                <Info className="w-3.5 h-3.5 text-muted-foreground opacity-40 mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground opacity-40 leading-relaxed">
                  Each driver can be used up to 2× and each constructor up to 3× per season. The last use requires a Joker.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky confirm bar */}
      {isMyTurn && !isComplete && selectedDriverId && selectedConstructorId && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4 py-3 bg-zinc-950/95 border-t border-white/10 backdrop-blur-xl space-y-2">
          {needsJolly(selectedDriverId, selectedConstructorId) && (
            <button
              onClick={() => setUseJolly(!useJolly)}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-2xl border font-black text-sm uppercase tracking-tight transition-all",
                useJolly
                  ? "bg-yellow-400/15 border-yellow-400/40 text-yellow-400"
                  : "border-yellow-400/30 text-yellow-400/70"
              )}
            >
              <Star className={cn("w-4 h-4", useJolly && "fill-yellow-400")} />
              {useJolly ? "Joker Active" : "Use Joker"}
            </button>
          )}
          <button
            onClick={handlePick}
            disabled={mutation.isPending || (needsJolly(selectedDriverId, selectedConstructorId) && !useJolly)}
            data-testid="button-confirm-pick-mobile"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-display font-black text-sm uppercase tracking-tight transition-all disabled:opacity-40 red-glow shadow-xl shadow-primary/30"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirm Pick
          </button>
        </div>
      )}
    </div>
  );
}
