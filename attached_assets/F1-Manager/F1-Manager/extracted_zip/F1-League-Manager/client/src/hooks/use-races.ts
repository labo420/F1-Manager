import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Race } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useRaces() {
  return useQuery<Race[]>({
    queryKey: ["/api/races"],
    queryFn: async () => {
      const res = await fetch("/api/races", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch races");
      return res.json();
    },
  });
}

export function useUpdateRaceStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { isLocked?: boolean; isCompleted?: boolean } }) => {
      const res = await fetch(`/api/races/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update race status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/races"] });
      toast({ title: "Race Status Updated", description: "The changes have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}
