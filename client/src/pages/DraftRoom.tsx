import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronRight, User, ShieldCheck, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Driver, Constructor, DraftStatus, Selection, UsageInfo } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

  const mutation = useMutation({
    mutationFn: async (vars: { driverId: number; constructorId: number }) => {
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
      toast({ title: "Selection saved", description: "Your picks for this race have been recorded." });
    },
    onError: (error: Error) => {
      toast({
        title: "Selection failed",
        description: error.message,
        variant: "destructive",
      });
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
      mutation.mutate({ driverId: selectedDriverId, constructorId: selectedConstructorId });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Draft Room</h1>
          <p className="text-muted-foreground">Select your Driver and Constructor for this race</p>
        </div>
        <div className="flex gap-4">
          {isMyTurn && !isComplete && (
            <Button 
              onClick={handlePick} 
              disabled={!selectedDriverId || !selectedConstructorId || mutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Selection
            </Button>
          )}
          <Button variant="outline" onClick={() => setLocation(`/lobby/${lobbyId}`)}>
            Back to Lobby
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Draft Order */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                Draft Order
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              <div className="space-y-1">
                {draftStatus?.draftOrder.map((drafter, idx) => (
                  <div
                    key={drafter.userId}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md text-sm",
                      draftStatus.currentDrafterIndex === idx && !isComplete && "bg-primary/10 border border-primary/20",
                      drafter.hasPicked && "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                        draftStatus.currentDrafterIndex === idx && !isComplete ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {idx + 1}
                      </div>
                      <span className="font-medium truncate max-w-[100px]">{drafter.username}</span>
                    </div>
                    {drafter.hasPicked ? (
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      idx === draftStatus.currentDrafterIndex && !isComplete && (
                        <Badge variant="outline" className="text-[10px] animate-pulse">Picking...</Badge>
                      )
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>You can use each driver/constructor up to 3 times per season. The 3rd use consumes a Jolly.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-background rounded border text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Driver Jollies</p>
                  <p className="text-lg font-bold">{usage.driverJokersRemaining}</p>
                </div>
                <div className="p-2 bg-background rounded border text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Team Jollies</p>
                  <p className="text-lg font-bold">{usage.constructorJokersRemaining}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Area: Selection */}
        <div className="lg:col-span-3 space-y-6">
          {!isComplete ? (
            <Card className={cn("border-2", isMyTurn ? "border-primary shadow-lg" : "border-muted opacity-80")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{isMyTurn ? "Your Turn to Pick!" : `Waiting for ${draftStatus?.currentDrafterName}...`}</span>
                  {isMyTurn && <Badge className="bg-primary animate-bounce">Your Turn</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Driver Selection */}
                  <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-primary" />
                      Select Driver
                    </h3>
                    <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
                      {drivers.map(driver => {
                        const isTaken = draftStatus?.takenDriverIds.includes(driver.id);
                        const usedCount = usage.driverUsage[driver.id] || 0;
                        const isSelected = selectedDriverId === driver.id;
                        const isDisabled = !isMyTurn || isTaken || usedCount >= 3;
                        
                        return (
                          <button
                            key={driver.id}
                            disabled={isDisabled}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border text-left transition-all",
                              isTaken ? "bg-muted/50 opacity-50 cursor-not-allowed" : 
                              usedCount >= 3 ? "bg-red-500/10 border-red-500/20 cursor-not-allowed" :
                              isSelected ? "border-primary bg-primary/10 ring-2 ring-primary/20" :
                              "hover:border-primary hover:bg-primary/5 active:scale-[0.98]",
                              "disabled:cursor-not-allowed"
                            )}
                            onClick={() => setSelectedDriverId(driver.id)}
                          >
                            <div>
                              <p className="font-bold">{driver.name}</p>
                              <p className="text-xs text-muted-foreground">{driver.team}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase text-muted-foreground">Used</p>
                              <p className={cn("font-bold", usedCount >= 3 ? "text-red-500" : "text-primary")}>
                                {usedCount}/3
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Constructor Selection */}
                  <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-primary" />
                      Select Constructor
                    </h3>
                    <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
                      {constructors.map(con => {
                        const isTaken = draftStatus?.takenConstructorIds.includes(con.id);
                        const usedCount = usage.constructorUsage[con.id] || 0;
                        const isSelected = selectedConstructorId === con.id;
                        const isDisabled = !isMyTurn || isTaken || usedCount >= 3;

                        return (
                          <button
                            key={con.id}
                            disabled={isDisabled}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border text-left transition-all",
                              isTaken ? "bg-muted/50 opacity-50 cursor-not-allowed" : 
                              usedCount >= 3 ? "bg-red-500/10 border-red-500/20 cursor-not-allowed" :
                              isSelected ? "border-primary bg-primary/10 ring-2 ring-primary/20" :
                              "hover:border-primary hover:bg-primary/5 active:scale-[0.98]",
                              "disabled:cursor-not-allowed"
                            )}
                            style={{ borderLeftColor: con.color, borderLeftWidth: '4px' }}
                            onClick={() => setSelectedConstructorId(con.id)}
                          >
                            <div>
                              <p className="font-bold">{con.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase text-muted-foreground">Used</p>
                              <p className={cn("font-bold", usedCount >= 3 ? "text-red-500" : "text-primary")}>
                                {usedCount}/3
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-500 bg-green-500/5">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Draft Complete!</h2>
                <p className="text-muted-foreground mb-6">All players have made their selections for this race.</p>
                <Button onClick={() => setLocation(`/lobby/${lobbyId}`)}>Return to Lobby</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
