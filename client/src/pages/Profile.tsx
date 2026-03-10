import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useSetTeamName } from "@/hooks/use-lobby";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, User, Shield, Trophy, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AvatarPicker } from "@/components/AvatarPicker";

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);

  const presetMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest("PATCH", "/api/user/avatar-url", { url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Avatar updated", description: "Your new avatar is active." });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not update avatar.", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setShowPicker(false);
      toast({ title: "Avatar updated", description: "Photo uploaded successfully." });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Try again.", variant: "destructive" });
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left">
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/30 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-700" />
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="avatar"
                className="relative w-32 h-32 md:w-36 md:h-36 rounded-full object-cover border-2 border-zinc-800 shadow-2xl"
                data-testid="img-avatar-profile"
              />
            ) : (
              <div
                className="relative w-32 h-32 md:w-36 md:h-36 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-zinc-800 shadow-2xl"
                data-testid="img-avatar-placeholder"
              >
                <User className="w-14 h-14 text-muted-foreground/30" />
              </div>
            )}
            <button
              onClick={() => setShowPicker(true)}
              data-testid="button-edit-avatar"
              className="absolute bottom-1 right-1 w-9 h-9 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-xl border-2 border-zinc-900 transition-transform hover:scale-110 active:scale-95 z-20"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex-1">
            <h1
              className="text-5xl md:text-6xl font-display font-black text-white uppercase tracking-tighter leading-none mb-3"
              data-testid="text-profile-title"
            >
              {user.username}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                #{user.id.toString().padStart(4, "0")}
              </span>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold uppercase tracking-widest text-primary">
                Active
              </span>
            </div>
          </div>
        </div>

        {user.memberships && user.memberships.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest flex items-center gap-3">
              <Shield className="w-4 h-4 text-primary" /> Leagues
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user.memberships.map((m: any, idx: number) => (
                <motion.div
                  key={m.lobbyId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden"
                  data-testid={`profile-lobby-${m.lobbyId}`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    {m.lobbyImageUrl ? (
                      <img
                        src={m.lobbyImageUrl}
                        alt={m.lobbyName}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0 group-hover:bg-primary/10 transition-colors">
                        <Trophy className="w-6 h-6 text-white/30 group-hover:text-primary/70 transition-colors" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-white text-lg uppercase tracking-tight leading-none mb-1 truncate group-hover:text-primary transition-colors">
                        {m.lobbyName}
                      </h3>
                      <code className="text-primary font-mono font-bold bg-primary/10 px-2 py-0.5 rounded text-[10px] tracking-widest">
                        {m.lobbyCode}
                      </code>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest">Team</span>
                      <span className="text-xs font-semibold text-white">{m.teamName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest">Role</span>
                      {m.role === "admin" ? (
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase border border-primary/20">Admin</span>
                      ) : (
                        <span className="bg-white/5 text-white/50 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase border border-white/10">Player</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pt-8 border-t border-white/10 mt-8"
        >
          <button
            onClick={() => logout()}
            data-testid="button-logout-profile"
            className="w-full md:w-auto px-6 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-red-600/20"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showPicker && (
          <AvatarPicker
            type="user"
            currentUrl={user.avatarUrl}
            onSelectPreset={(url) => {
              presetMutation.mutate(url);
              setShowPicker(false);
            }}
            onUploadFile={(file) => uploadMutation.mutate(file)}
            isLoading={uploadMutation.isPending}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
