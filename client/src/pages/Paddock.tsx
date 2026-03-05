import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Users, PlusCircle, LogIn } from "lucide-react";
import { useCreateLobby, useJoinLobby } from "@/hooks/use-lobby";
import type { Membership } from "@shared/schema";

export default function Paddock() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [leagueName, setLeagueName] = useState("");
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
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">Paddock</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setMode("create")}
            className="bg-primary text-white px-6 py-2 rounded-xl font-bold uppercase text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg red-glow"
          >
            <PlusCircle className="w-4 h-4" /> Create League
          </button>
          <button
            onClick={() => setMode("join")}
            className="glass-panel text-white px-6 py-2 rounded-xl font-bold uppercase text-sm flex items-center gap-2 hover:border-primary/50 transition-all border-2 border-transparent"
          >
            <LogIn className="w-4 h-4 text-primary" /> Join League
          </button>
        </div>
      </div>

      {mode === "create" && (
        <div className="max-w-md mx-auto mb-12 glass-panel rounded-2xl p-8 border-2 border-primary/20">
          <h2 className="text-xl font-bold text-white uppercase mb-6">Create a New League</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (leagueName.trim()) createLobby.mutate(leagueName.trim(), { onSuccess: () => { setMode("list"); setLeagueName(""); } }); }} className="space-y-4">
            <input
              placeholder="League Name"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              className="w-full bg-background border-2 border-border rounded-xl px-4 py-4 text-white font-bold uppercase focus:border-primary outline-none"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setMode("list")} className="flex-1 py-3 rounded-xl font-bold uppercase text-sm text-muted-foreground hover:text-white transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!leagueName.trim() || createLobby.isPending}
                className="flex-[2] bg-primary text-white rounded-xl py-3 font-bold uppercase disabled:opacity-50 hover:bg-primary/90 transition-all"
              >
                {createLobby.isPending ? "Creating..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mode === "join" && (
        <div className="max-w-md mx-auto mb-12 glass-panel rounded-2xl p-8 border-2 border-primary/20">
          <h2 className="text-xl font-bold text-white uppercase mb-6">Join a League</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (code.length >= 4) joinLobby.mutate(code.toUpperCase(), { onSuccess: () => { setMode("list"); setCode(""); } }); }} className="space-y-4">
            <input
              placeholder="F1-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-background border-2 border-border rounded-xl px-4 py-4 text-white font-mono text-2xl text-center tracking-[0.3em] uppercase focus:border-primary outline-none"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setMode("list")} className="flex-1 py-3 rounded-xl font-bold uppercase text-sm text-muted-foreground hover:text-white transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={code.length < 4 || joinLobby.isPending}
                className="flex-[2] bg-primary text-white rounded-xl py-3 font-bold uppercase disabled:opacity-50 hover:bg-primary/90 transition-all"
              >
                {joinLobby.isPending ? "Joining..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {memberships?.map((membership) => (
          <Link key={membership.lobbyId} href={`/lobby/${membership.lobbyId}`}>
            <Card className="hover:border-primary cursor-pointer transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">{membership.lobbyName}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
                  Code: {membership.lobbyCode}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Team:</span>
                  <span className="font-medium">{membership.teamName}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="capitalize font-medium">{membership.role}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        
        {memberships?.length === 0 && (
          <div className="col-span-full text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground mb-4">You haven't joined any lobbies yet.</p>
            <Link href="/" className="text-primary hover:underline">
              Go to Dashboard to create or join a league
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
