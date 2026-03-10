import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Users, Star, Lock, Calendar, ChevronLeft, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lobby, Race, Driver, Constructor, Selection, LobbyMember } from "@shared/schema";
import { format } from "date-fns";

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function LobbyDetail({ id }: { id: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const { data: lobby, isLoading: loadingLobby } = useQuery<Lobby>({
    queryKey: [`/api/lobby/${id}`],
  });

  const { data: races, isLoading: loadingRaces } = useQuery<Race[]>({
    queryKey: ["/api/races"],
  });

  const { data: mySelections, isLoading: loadingSelections } = useQuery<Selection[]>({
    queryKey: [`/api/selections/${id}/me`],
  });

  const { data: members, isLoading: loadingMembers } = useQuery<(LobbyMember & { username: string })[]>({
    queryKey: [`/api/lobby/${id}/members`],
  });

  const { data: usage, isLoading: loadingUsage } = useQuery<any>({
    queryKey: [`/api/usage/${id}`],
    initialData: {
      driverUsage: {},
      constructorUsage: {},
      driverJolliesRemaining: 2,
      constructorJolliesRemaining: 2,
      jolliesRemaining: 4
    }
  });

  const currentMember = members?.find(m => m.userId === user?.id);
  const nextRace = races?.find(r => !r.isCompleted) || races?.[races.length - 1];

  if (loadingLobby || loadingRaces || loadingMembers || loadingUsage) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lobby) return <div>Lobby not found</div>;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => setLocation("/paddock")}
          className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
          title="Back to League List"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>
      
      <div className="mb-12 flex items-center gap-6">
        {lobby.imageUrl ? (
          <img src={lobby.imageUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-xl shrink-0" />
        ) : (
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
            <span className="text-lg font-black text-white/40">{getInitials(lobby.name)}</span>
          </div>
        )}
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tighter leading-none">{lobby.name}</h1>
          <p className="text-xs font-mono text-white/40 uppercase tracking-[0.1em] mt-3">League Code: {lobby.code}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-2 px-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <div>
              <p className="text-[10px] uppercase text-muted-foreground leading-none">Driver Jollies</p>
              <p className="text-xl font-bold leading-tight">{usage?.driverJolliesRemaining ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-2 px-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-blue-500 fill-blue-500" />
            <div>
              <p className="text-[10px] uppercase text-muted-foreground leading-none">Team Jollies</p>
              <p className="text-xl font-bold leading-tight">{usage?.constructorJolliesRemaining ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="predictions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Next Race: {nextRace?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nextRace ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{nextRace.circuitName}</p>
                          <p className="text-sm text-muted-foreground">{nextRace.country}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{format(new Date(nextRace.date), "PPP")}</p>
                          <Badge variant={nextRace.isLocked ? "destructive" : "secondary"}>
                            {nextRace.isLocked ? "Locked" : "Open for Predictions"}
                          </Badge>
                        </div>
                      </div>
                      
                      {!nextRace.isLocked ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <p className="text-muted-foreground mb-4">Click below to make your choices for this race.</p>
                          <Link href={`/draft/${id}/${nextRace.id}`}>
                            <Button>Go to Draft Room</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                          <Lock className="w-4 h-4" />
                          <span>Predictions are locked for this race</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>No upcoming races.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Current Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  {nextRace && mySelections?.find(s => s.raceId === nextRace.id) ? (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Selection details would go here, need to fetch driver/constructor names */}
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase">Driver</p>
                        <p className="font-bold">Selection Saved</p>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase">Constructor</p>
                        <p className="font-bold">Selection Saved</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-4 text-muted-foreground italic">No selection made yet for the upcoming race.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">League Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Players</span>
                    <span className="font-bold">{members?.length || 0}/10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Races Completed</span>
                    <span className="font-bold">{races?.filter(r => r.isCompleted).length || 0}/{races?.length || 24}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2 italic">Official F1 2026 Season</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="standings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground italic">Standings will be updated after the first race results are in.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Player List
              </CardTitle>
            </CardHeader>
            <CardContent>
                  <div className="divide-y">
                    {members?.map((member) => (
                      <div key={member.userId} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{member.teamName}</p>
                            <p className="text-xs text-muted-foreground">Manager: @{member.username}</p>
                          </div>
                        </div>
                    <div className="flex items-center gap-4">
                      {member.role === "admin" && (
                        <Badge variant="outline" className="text-[10px] uppercase">Admin</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
