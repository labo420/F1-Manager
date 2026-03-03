import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { type InsertDriverResult, type InsertConstructorResult } from "@shared/schema";

export function useSubmitDriverResult() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertDriverResult) => {
      const res = await fetch("/api/results/driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit driver result");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({ title: "Driver Result Saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });
}

export function useSubmitConstructorResult() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertConstructorResult) => {
      const res = await fetch("/api/results/constructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit constructor result");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({ title: "Constructor Result Saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });
}
