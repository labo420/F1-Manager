import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type User, type Membership } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export type AuthUser = User & { memberships: Membership[] };

export function useAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid username or password");
        throw new Error("Failed to login");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Welcome back", description: "Successfully logged in." });
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to register" }));
        throw new Error(err.message || "Failed to register");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Registration successful", description: "Welcome to the league!" });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/me"], null);
      queryClient.clear();
      toast({ title: "Logged out", description: "You have been safely logged out." });
    }
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending
  };
}
