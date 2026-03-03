import { useQuery } from "@tanstack/react-query";
import { type LeaderboardEntry } from "@shared/schema";

export function useDriverLeaderboard(lobbyId: number | null) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", lobbyId, "drivers"],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard/${lobbyId}/drivers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    enabled: !!lobbyId,
  });
}

export function useConstructorLeaderboard(lobbyId: number | null) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", lobbyId, "constructors"],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard/${lobbyId}/constructors`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    enabled: !!lobbyId,
  });
}
