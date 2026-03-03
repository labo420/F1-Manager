import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type Lobby } from "@shared/schema";

const ACTIVE_LOBBY_KEY = "f1-active-lobby-id";

export function useActiveLobby() {
  const { user } = useAuth();
  const [activeLobbyId, setActiveLobbyIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(ACTIVE_LOBBY_KEY);
    return stored ? Number(stored) : null;
  });

  const setActiveLobbyId = useCallback((id: number | null) => {
    setActiveLobbyIdState(id);
    if (id) localStorage.setItem(ACTIVE_LOBBY_KEY, String(id));
    else localStorage.removeItem(ACTIVE_LOBBY_KEY);
  }, []);

  useEffect(() => {
    if (!user || !user.memberships || user.memberships.length === 0) {
      return;
    }
    if (activeLobbyId && user.memberships.some(m => m.lobbyId === activeLobbyId)) {
      return;
    }
    setActiveLobbyId(user.memberships[0].lobbyId);
  }, [user, activeLobbyId, setActiveLobbyId]);

  const activeMembership = user?.memberships?.find(m => m.lobbyId === activeLobbyId) || null;

  return { activeLobbyId, setActiveLobbyId, activeMembership };
}

export function useLobbyInfo(lobbyId: number | null) {
  return useQuery<Lobby>({
    queryKey: ["/api/lobby", lobbyId],
    queryFn: async () => {
      const res = await fetch(`/api/lobby/${lobbyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lobby");
      return res.json();
    },
    enabled: !!lobbyId,
  });
}

export function useLobbyMembers(lobbyId: number | null) {
  return useQuery<any[]>({
    queryKey: ["/api/lobby", lobbyId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/lobby/${lobbyId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!lobbyId,
  });
}

export function useCreateLobby() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create league");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "League Created", description: `Invite code: ${data.code}` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useJoinLobby() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/lobby/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to join lobby");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Joined League", description: "Welcome to the grid!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useSetTeamName() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ lobbyId, teamName }: { lobbyId: number; teamName: string }) => {
      const res = await fetch(`/api/lobby/${lobbyId}/team-name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to set team name");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Team name set", description: "You're all set!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}
