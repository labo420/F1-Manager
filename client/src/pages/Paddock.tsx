import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useLobbyInfo } from "@/hooks/use-lobby";
import { useRaces } from "@/hooks/use-races";
import { useDrivers, useConstructors } from "@/hooks/use-competitors";
import { useMySelections, useUpsertSelection, useDraftStatus, useUsageInfo } from "@/hooks/use-selections";
import { useDriverLeaderboard, useConstructorLeaderboard } from "@/hooks/use-leaderboard";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Car, Shield, Lock, AlertCircle, Copy, Users, Clock, Check, X, Star, Crown, ChevronRight, Trophy, Medal, Eye, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PaddockTab = "picks" | "spy" | "standings";

export default function Paddock() {
  const { user } = useAuth();
  const { activeLobbyId, setActiveLobbyId, activeMembership } = useActiveLobby();
  const [tab, setTab] = useState<PaddockTab>("picks");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const hasMemberships = user.memberships && user.memberships.length > 0;

  if (!hasMemberships) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <Users className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-white">No Leagues Yet</h2>
        <p className="text-muted-foreground mt-2">Go to the dashboard to create or join a league.</p>
      </div>
    );
  }

  if (!activeLobbyId || !activeMembership) {
    return <PaddockLobbySelector user={user} setActiveLobbyId={setActiveLobbyId} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {user.memberships.length > 1 && (
              <button onClick={() => setActiveLobbyId(null)} className="text-muted-foreground hover:text-white transition-colors text-sm font-bold uppercase" data-testid="button-switch-lobby-paddock">
                Switch
              </button>
            )}
            <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter" data-testid="text-paddock-lobby">
              {activeMembership.lobbyName}
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm uppercase tracking-widest font-bold">Paddock</p>
        </div>

        <JokerStarsDisplay membership={activeMembership} />
      </div>

      <div className="flex gap-1 mb-6 glass-panel rounded-xl p-1 inline-flex" data-testid="paddock-tabs">
        {([
          { key: "picks" as PaddockTab, label: "Make Picks", icon: Car },
          { key: "spy" as PaddockTab, label: "Spy Opponents", icon: Eye },
          { key: "standings" as PaddockTab, label: "Standings", icon: Trophy },
        ]).map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            data-testid={`tab-paddock-${item.key}`}
            className={`px-4 sm:px-6 py-3 rounded-lg font-bold uppercase text-xs sm:text-sm flex items-center gap-2 transition-all ${
              tab === item.key ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {tab === "picks" && <PaddockPicks lobbyId={activeLobbyId} membership={activeMembership} />}
      {tab === "spy" && <PaddockSpy lobbyId={activeLobbyId} />}
      {tab === "standings" && <PaddockStandings lobbyId={activeLobbyId} />}
    </div>
  );
}

function JokerStarsDisplay({ membership }: { membership: any }) {
  const driverStars = membership.driverJokers ?? 4;
  const constructorStars = membership.constructorJokers ?? 4;

  return (
    <div className="glass-panel px-4 py-3 rounded-xl flex items-center gap-4" data-testid="paddock-stars">
      <div>
        <div className="text-[10px] font-black text-muted-foreground uppercase leading-none tracking-widest opacity-70">Driver ★</div>
        <div className="flex items-center gap-0.5 mt-1">
          {[...Array(4)].map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < driverStars ? "text-yellow-400 fill-yellow-400" : "text-zinc-600"}`} />
          ))}
        </div>
      </div>
      <div className="w-[1px] h-10 bg-white/10" />
      <div>
        <div className="text-[10px] font-black text-muted-foreground uppercase leading-none tracking-widest opacity-70">Constructor ★</div>
        <div className="flex items-center gap-0.5 mt-1">
          {[...Array(4)].map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < constructorStars ? "text-yellow-400 fill-yellow-400" : "text-zinc-600"}`} />
          ))}
        </div>
      </div>
      <div className="w-[1px] h-10 bg-white/10" />
      <div>
        <div className="text-[10px] font-black text-muted-foreground uppercase leading-none tracking-widest opacity-70">Scuderia</div>
        <div className="text-sm font-black text-white tracking-tighter uppercase italic">{membership.teamName}</div>
      </div>
    </div>
  );
}

function PaddockLobbySelector({ user, setActiveLobbyId }: { user: any; setActiveLobbyId: (id: number) => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 pb-24">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">Paddock</h1>
        <p className="text-muted-foreground mt-2">Select a league to enter the paddock</p>
      </div>
      <div className="space-y-3">
        {user.memberships.map((m: any) => (
          <button
            key={m.lobbyId}
            onClick={() => setActiveLobbyId(m.lobbyId)}
            data-testid={`paddock-lobby-${m.lobbyId}`}
            className="w-full glass-panel rounded-xl p-5 flex items-center justify-between hover:border-primary/50 transition-all group text-left border-2 border-transparent"
          >
            <div>
              <div className="text-white font-bold text-lg">{m.lobbyName}</div>
              <div className="text-muted-foreground text-xs mt-1">
                {m.role === "admin" ? "Admin" : "Player"} | Team: {m.teamName}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

function PaddockPicks({ lobbyId, membership }: { lobbyId: number; membership: any }) {
  const { data: races, isLoading: racesLoading } = useRaces();
  const { data: drivers } = useDrivers();
  const { data: constructors } = useConstructors();
  const { data: selections } = useMySelections(lobbyId);
  const { data: usageInfo } = useUsageInfo(lobbyId);
  const { mutate: upsertSelection, isPending: savingSelection } = useUpsertSelection();
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);

  if (racesLoading || !races) {
    return <div className="flex items-center justify-center min-h-[40vh]"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const activeRace = races.find(r => !r.isCompleted && !r.isLocked) || races.find(r => !r.isCompleted) || races[races.length - 1];
  const activeRaceId = selectedRaceId || activeRace?.id;
  const currentRace = races.find(r => r.id === activeRaceId);

  if (!currentRace) return <div className="p-8 text-center text-muted-foreground">No races scheduled yet.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
            <Calendar className="text-primary w-4 h-4" /> Upcoming Races
          </h2>
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {races.filter(r => !r.isCompleted).map(race => (
              <button
                key={race.id}
                onClick={() => setSelectedRaceId(race.id)}
                data-testid={`paddock-race-${race.id}`}
                className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between text-sm ${
                  activeRaceId === race.id
                    ? "bg-primary/10 border border-primary text-white"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="truncate">
                  <div className="font-bold truncate">{race.name}</div>
                  <div className="text-[10px] mt-0.5">{format(new Date(race.date), "MMM do")}{race.itaTime && ` · ${race.itaTime}`}</div>
                </div>
                {race.isLocked ? <Lock className="w-3 h-3 text-primary shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <RacePickPanel
          race={currentRace}
          lobbyId={lobbyId}
          drivers={drivers || []}
          constructors={constructors || []}
          selections={selections || []}
          savingSelection={savingSelection}
          onSubmitPick={upsertSelection}
          usageInfo={usageInfo || null}
        />
      </div>
    </div>
  );
}

function RacePickPanel({ race, lobbyId, drivers, constructors, selections, savingSelection, onSubmitPick, usageInfo }: {
  race: any; lobbyId: number; drivers: any[]; constructors: any[]; selections: any[];
  savingSelection: boolean; onSubmitPick: (data: any) => void; usageInfo: any;
}) {
  const { data: draftStatus, isLoading: draftLoading } = useDraftStatus(
    !race.isLocked && !race.isCompleted ? lobbyId : null,
    !race.isLocked && !race.isCompleted ? race.id : null
  );
  const currentSelection = selections.find((s: any) => s.raceId === race.id);

  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedConstructorId, setSelectedConstructorId] = useState<string>("");

  const handlePickSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const driverId = Number(selectedDriverId);
    const constructorId = Number(selectedConstructorId);
    if (!driverId || !constructorId) return;
    onSubmitPick({ raceId: race.id, driverId, constructorId, lobbyId });
    setSelectedDriverId("");
    setSelectedConstructorId("");
  };

  const availableDrivers = drivers.filter(d => !draftStatus?.takenDriverIds?.includes(d.id));
  const availableConstructors = constructors.filter(c => !draftStatus?.takenConstructorIds?.includes(c.id));

  const getDriverUsage = (driverId: number) => usageInfo?.driverUsage?.[driverId] || 0;
  const getConstructorUsage = (constructorId: number) => usageInfo?.constructorUsage?.[constructorId] || 0;
  const driverStarsRemaining = usageInfo?.driverJokersRemaining ?? 4;
  const constructorStarsRemaining = usageInfo?.constructorJokersRemaining ?? 4;

  const selectedDriverUsage = selectedDriverId ? getDriverUsage(Number(selectedDriverId)) : 0;
  const selectedConstructorUsage = selectedConstructorId ? getConstructorUsage(Number(selectedConstructorId)) : 0;

  let driverStarNeeded = selectedDriverUsage >= 2 ? 1 : 0;
  let constructorStarNeeded = selectedConstructorUsage >= 2 ? 1 : 0;

  const isPickingAllowed = !race.isLocked && !race.isCompleted && draftStatus?.isMyTurn && !draftStatus?.isComplete && !currentSelection;
  const pickBlocked = selectedDriverUsage >= 3 || selectedConstructorUsage >= 3 ||
    (driverStarNeeded > 0 && driverStarsRemaining < driverStarNeeded) ||
    (constructorStarNeeded > 0 && constructorStarsRemaining < constructorStarNeeded);

  return (
    <>
      <motion.div
        key={race.id}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel rounded-3xl p-1 overflow-hidden"
      >
        <div className="bg-gradient-to-br from-background to-secondary rounded-[22px] p-6 sm:p-8 relative">
          {race.isLocked && !race.isCompleted && (
            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold uppercase px-4 py-2 rounded-bl-xl flex items-center gap-2">
              <Lock className="w-4 h-4" /> Locked
            </div>
          )}
          {race.isCompleted && (
            <div className="absolute top-0 right-0 bg-white/20 text-white text-xs font-bold uppercase px-4 py-2 rounded-bl-xl flex items-center gap-2">
              Completed
            </div>
          )}

          <h2 className="text-2xl font-display font-black text-white uppercase mb-2" data-testid="text-race-name">
            {race.name}
          </h2>
          <p className="text-primary font-bold flex items-center gap-2 mb-1 text-sm">
            <Calendar className="w-4 h-4" /> {format(new Date(race.date), "MMMM do, yyyy")}
          </p>
          {race.itaTime && (
            <p className="text-muted-foreground text-xs mb-6">
              ITA {race.itaTime} | UTC {format(new Date(race.date), "HH:mm")}
            </p>
          )}

          {!race.isLocked && !race.isCompleted && draftStatus && !draftStatus.isComplete && !currentSelection && (
            <div className={`mb-6 p-4 rounded-xl border-2 ${
              draftStatus.isMyTurn
                ? "bg-green-500/10 border-green-500/40"
                : "bg-yellow-500/10 border-yellow-500/30"
            }`}>
              <div className="flex items-center gap-3">
                {draftStatus.isMyTurn ? (
                  <>
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Car className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-green-400 font-bold uppercase text-sm" data-testid="text-draft-your-turn">It's your turn to pick!</p>
                      <p className="text-green-400/70 text-xs">Select your driver and constructor below.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center animate-pulse">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-yellow-400 font-bold uppercase text-sm" data-testid="text-draft-waiting">
                        Waiting for {draftStatus.currentDrafterName} to pick...
                      </p>
                      <p className="text-yellow-400/70 text-xs">You'll be notified when it's your turn.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {draftStatus?.isComplete && !currentSelection && !race.isLocked && !race.isCompleted && (
            <div className="mb-6 p-4 rounded-xl border-2 bg-blue-500/10 border-blue-500/30">
              <p className="text-blue-400 font-bold uppercase text-sm">Draft Complete</p>
              <p className="text-blue-400/70 text-xs">All players have made their picks for this race.</p>
            </div>
          )}

          <form onSubmit={handlePickSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <Car className="w-4 h-4" /> Driver Selection
                </label>
                <select
                  data-testid="select-driver"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  disabled={!isPickingAllowed}
                  required
                  className="w-full bg-background border-2 border-border rounded-xl px-4 py-4 text-white focus:border-primary outline-none transition-all disabled:opacity-50 appearance-none"
                >
                  <option value="" disabled>Select a Driver</option>
                  {availableDrivers.map(d => {
                    const usage = getDriverUsage(d.id);
                    const blocked = usage >= 3;
                    const starRequired = usage >= 2 && usage < 3;
                    return (
                      <option key={d.id} value={d.id} disabled={blocked}>
                        {d.name} ({d.team}){usage > 0 ? ` [${usage}/${blocked ? 3 : 2}]${starRequired ? " ★" : ""}${blocked ? " MAXED" : ""}` : ""}
                      </option>
                    );
                  })}
                </select>
                {selectedDriverId && <UsageIndicator usage={selectedDriverUsage} starsRemaining={driverStarsRemaining} type="driver" />}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Constructor Selection
                </label>
                <select
                  data-testid="select-constructor"
                  value={selectedConstructorId}
                  onChange={(e) => setSelectedConstructorId(e.target.value)}
                  disabled={!isPickingAllowed}
                  required
                  className="w-full bg-background border-2 border-border rounded-xl px-4 py-4 text-white focus:border-primary outline-none transition-all disabled:opacity-50 appearance-none"
                >
                  <option value="" disabled>Select a Constructor</option>
                  {availableConstructors.map(c => {
                    const usage = getConstructorUsage(c.id);
                    const blocked = usage >= 3;
                    const starRequired = usage >= 2 && usage < 3;
                    return (
                      <option key={c.id} value={c.id} disabled={blocked}>
                        {c.name}{usage > 0 ? ` [${usage}/${blocked ? 3 : 2}]${starRequired ? " ★" : ""}${blocked ? " MAXED" : ""}` : ""}
                      </option>
                    );
                  })}
                </select>
                {selectedConstructorId && <UsageIndicator usage={selectedConstructorUsage} starsRemaining={constructorStarsRemaining} type="constructor" />}
              </div>
            </div>

            {(driverStarNeeded > 0 || constructorStarNeeded > 0) && isPickingAllowed && !pickBlocked && (
              <div className="p-3 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/10 flex items-center gap-3" data-testid="text-star-warning">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <p className="text-yellow-400 text-sm font-semibold">
                  This pick will use
                  {driverStarNeeded > 0 && ` 1 Driver ★`}
                  {driverStarNeeded > 0 && constructorStarNeeded > 0 && " and"}
                  {constructorStarNeeded > 0 && ` 1 Constructor ★`}.
                </p>
              </div>
            )}

            {pickBlocked && isPickingAllowed && (
              <div className="p-3 rounded-xl border-2 border-red-500/30 bg-red-500/10 flex items-center gap-3" data-testid="text-pick-blocked">
                <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm font-semibold">
                  {selectedDriverUsage >= 3
                    ? "Maximum limit reached (3/3) for this driver."
                    : selectedConstructorUsage >= 3
                      ? "Maximum limit reached (3/3) for this constructor."
                      : driverStarNeeded > 0 && driverStarsRemaining < 1
                        ? "No Driver Stars remaining. Pick a different driver."
                        : "No Constructor Stars remaining. Pick a different constructor."}
                </p>
              </div>
            )}

            {isPickingAllowed && (
              <div className="pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={savingSelection || !selectedDriverId || !selectedConstructorId || pickBlocked}
                  data-testid="button-submit-picks"
                  className="w-full bg-primary text-white rounded-xl py-4 font-bold uppercase tracking-wide hover:bg-primary/90 hover:red-glow transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {savingSelection ? "Confirming..." : (driverStarNeeded + constructorStarNeeded) > 0 ? `Confirm Pick (${driverStarNeeded + constructorStarNeeded} ★)` : "Confirm Pick"}
                </button>
                <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Once confirmed, your pick cannot be changed.
                </p>
              </div>
            )}

            {currentSelection && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-xl">
                <h4 className="text-primary font-bold uppercase text-sm mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4" /> Your Pick
                </h4>
                <div className="flex gap-4 text-white">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground block">Driver</span>
                    <span data-testid="text-picked-driver">{drivers.find(d => d.id === currentSelection.driverId)?.name}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground block">Constructor</span>
                    <span data-testid="text-picked-constructor">{constructors.find(c => c.id === currentSelection.constructorId)?.name}</span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </motion.div>

      {!race.isCompleted && draftStatus && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <Users className="text-primary w-5 h-5" /> Draft Order
          </h3>
          <div className="space-y-2">
            {draftStatus.draftOrder.map((drafter: any, index: number) => {
              const isCurrent = index === draftStatus.currentDrafterIndex && !draftStatus.isComplete;
              const isPicked = drafter.hasPicked;
              return (
                <div
                  key={drafter.userId}
                  data-testid={`draft-order-${drafter.userId}`}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    isCurrent ? "border-primary bg-primary/10 shadow-lg" : isPicked ? "border-green-500/30 bg-green-500/5" : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {drafter.avatarUrl ? (
                      <img src={drafter.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCurrent ? "bg-primary text-white" : isPicked ? "bg-green-500/20 text-green-400" : "bg-white/10 text-muted-foreground"
                      }`}>
                        {isPicked ? <Check className="w-4 h-4" /> : index + 1}
                      </div>
                    )}
                    <div>
                      <span className={`font-bold ${isCurrent ? "text-primary" : isPicked ? "text-green-400" : "text-white"}`}>
                        {drafter.teamName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">@{drafter.username}</span>
                    </div>
                  </div>
                  <div>
                    {isPicked ? (
                      <span className="text-xs font-bold uppercase text-green-400 bg-green-500/10 px-2 py-1 rounded">Done</span>
                    ) : isCurrent ? (
                      <span className="text-xs font-bold uppercase text-primary bg-primary/10 px-2 py-1 rounded animate-pulse">Picking...</span>
                    ) : (
                      <span className="text-xs font-bold uppercase text-muted-foreground bg-white/5 px-2 py-1 rounded">Waiting</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {draftStatus.isComplete && (
            <div className="mt-4 text-center text-sm text-green-400 font-bold uppercase">All picks are in!</div>
          )}
        </motion.div>
      )}
    </>
  );
}

function PaddockSpy({ lobbyId }: { lobbyId: number }) {
  const { data: races } = useRaces();
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);

  const lockedRaces = (races || []).filter(r => r.isLocked || r.isCompleted);
  const activeRaceId = selectedRaceId || lockedRaces[lockedRaces.length - 1]?.id;

  const { data: picks, isLoading } = useQuery<any[]>({
    queryKey: ["/api/lobby", lobbyId, "race", activeRaceId, "picks"],
    queryFn: async () => {
      const res = await fetch(`/api/lobby/${lobbyId}/race/${activeRaceId}/picks`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeRaceId,
  });

  const activeRace = (races || []).find(r => r.id === activeRaceId);

  return (
    <div className="space-y-6">
      {lockedRaces.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No locked races yet. Opponent picks become visible once a race is locked.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {lockedRaces.map(race => (
              <button
                key={race.id}
                onClick={() => setSelectedRaceId(race.id)}
                data-testid={`spy-race-${race.id}`}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                  activeRaceId === race.id ? "bg-primary text-white" : "glass-panel text-muted-foreground hover:text-white"
                }`}
              >
                R{race.round}
              </button>
            ))}
          </div>

          {activeRace && (
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white uppercase mb-4" data-testid="spy-race-title">
                {activeRace.name} - Picks
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : !picks || picks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No picks found for this race.</p>
              ) : (
                <div className="space-y-3">
                  {picks.map((pick: any) => (
                    <div key={pick.userId} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background" data-testid={`spy-pick-${pick.userId}`}>
                      <div>
                        <div className="text-white font-bold">{pick.teamName}</div>
                        <div className="text-xs text-muted-foreground">@{pick.username}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <Car className="w-3 h-3 text-primary" />
                          <span className="text-white font-semibold">{pick.driverName}</span>
                          {pick.driverNumber && <span className="text-primary font-mono text-xs">#{pick.driverNumber}</span>}
                        </div>
                        <div className="flex items-center gap-1 text-sm mt-0.5">
                          <Shield className="w-3 h-3 text-primary" />
                          <span className="text-white font-semibold">{pick.constructorName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaddockStandings({ lobbyId }: { lobbyId: number }) {
  const [tab, setTab] = useState<"drivers" | "constructors">("drivers");
  const { data: driverLeaderboard, isLoading: dLoading } = useDriverLeaderboard(lobbyId);
  const { data: constructorLeaderboard, isLoading: cLoading } = useConstructorLeaderboard(lobbyId);

  const leaderboard = tab === "drivers" ? driverLeaderboard : constructorLeaderboard;
  const isLoading = tab === "drivers" ? dLoading : cLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="glass-panel rounded-xl p-1 inline-flex gap-1" data-testid="paddock-standings-toggle">
          <button
            onClick={() => setTab("drivers")}
            data-testid="paddock-tab-driver-standings"
            className={`px-6 py-2.5 rounded-lg font-bold uppercase text-sm flex items-center gap-2 transition-all ${
              tab === "drivers" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Car className="w-4 h-4" /> Drivers
          </button>
          <button
            onClick={() => setTab("constructors")}
            data-testid="paddock-tab-constructor-standings"
            className={`px-6 py-2.5 rounded-lg font-bold uppercase text-sm flex items-center gap-2 transition-all ${
              tab === "constructors" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" /> Constructors
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse" data-testid="paddock-standings-table">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-xs">Pos</th>
                <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-xs">Scuderia</th>
                <th className="px-4 py-3 font-bold text-primary uppercase text-xs text-right">
                  {tab === "drivers" ? "Driver Pts" : "Constructor Pts"}
                </th>
              </tr>
            </thead>
            <tbody>
              {(leaderboard || []).map((entry, index) => (
                <tr key={entry.userId} className={`border-b border-border/50 hover:bg-white/5 transition-colors ${index === 0 ? "bg-primary/5" : ""}`} data-testid={`paddock-standing-${entry.userId}`}>
                  <td className="px-4 py-4 font-display font-bold text-xl w-16">
                    {index === 0 ? (
                      <span className="text-yellow-400 flex items-center gap-1"><Medal className="w-5 h-5" /> 1</span>
                    ) : index === 1 ? (
                      <span className="text-gray-300">2</span>
                    ) : index === 2 ? (
                      <span className="text-amber-600">3</span>
                    ) : (
                      <span className="text-muted-foreground">{index + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {entry.teamName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className={`font-bold ${index === 0 ? "text-primary" : "text-white"}`}>{entry.teamName}</span>
                        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">@{entry.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-display font-black text-xl text-white">{entry.totalPoints}</td>
                </tr>
              ))}
              {(!leaderboard || leaderboard.length === 0) && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No points recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsageIndicator({ usage, starsRemaining, type }: { usage: number; starsRemaining: number; type: string }) {
  if (usage === 0) return null;

  if (usage >= 3) {
    return (
      <div className="text-xs font-bold text-red-400 flex items-center gap-1 mt-1" data-testid={`text-usage-${type}-blocked`}>
        <X className="w-3 h-3" /> Maximum limit reached (3/3) for this {type}.
      </div>
    );
  }

  if (usage >= 2) {
    if (starsRemaining <= 0) {
      return (
        <div className="text-xs font-bold text-red-400 flex items-center gap-1 mt-1" data-testid={`text-usage-${type}-no-star`}>
          <X className="w-3 h-3" /> No {type === "driver" ? "Driver" : "Constructor"} Stars remaining.
        </div>
      );
    }
    return (
      <div className="text-xs font-bold text-yellow-400 flex items-center gap-1 mt-1" data-testid={`text-usage-${type}-star`}>
        <Star className="w-3 h-3 fill-yellow-400" /> Used: 2/3 — Star Required
      </div>
    );
  }

  return (
    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1" data-testid={`text-usage-${type}-count`}>
      Used: {usage}/2
    </div>
  );
}
