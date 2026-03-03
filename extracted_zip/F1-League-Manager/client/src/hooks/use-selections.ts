import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Selection, type DraftStatus, type UsageInfo } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMySelections(lobbyId: number | null) {
  return useQuery<Selection[]>({
    queryKey: ["/api/selections", lobbyId, "me"],
    queryFn: async () => {
      const res = await fetch(`/api/selections/${lobbyId}/me`, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch selections");
      return res.json();
    },
    enabled: !!lobbyId,
  });
}

export function useDraftStatus(lobbyId: number | null, raceId: number | null) {
  return useQuery<DraftStatus>({
    queryKey: ["/api/draft", lobbyId, raceId],
    queryFn: async () => {
      const res = await fetch(`/api/draft/${lobbyId}/${raceId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch draft status");
      return res.json();
    },
    enabled: !!lobbyId && !!raceId,
    refetchInterval: 5000,
  });
}

export function useUsageInfo(lobbyId: number | null) {
  return useQuery<UsageInfo>({
    queryKey: ["/api/usage", lobbyId],
    queryFn: async () => {
      const res = await fetch(`/api/usage/${lobbyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage info");
      return res.json();
    },
    enabled: !!lobbyId,
  });
}

export function useUpsertSelection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { raceId: number; driverId: number; constructorId: number; lobbyId: number }) => {
      const res = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to save selection");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/selections", variables.lobbyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/draft", variables.lobbyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage", variables.lobbyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Pick Confirmed!", description: "Your driver and constructor are locked in." });
    },
    onError: (error: Error) => {
      toast({ title: "Error saving picks", description: error.message, variant: "destructive" });
    }
  });
}
