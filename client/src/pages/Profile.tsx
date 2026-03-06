import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useSetTeamName } from "@/hooks/use-lobby";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Camera, Save, User, Shield, Trophy, Star } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { activeLobbyId, activeMembership } = useActiveLobby();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setTeamNameMutation = useSetTeamName();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload avatar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setAvatarFile(null);
      setAvatarPreview(null);
      toast({ title: "Avatar Updated", description: "Looking good on the grid!" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic" data-testid="text-profile-title">
            Driver Profile
          </h1>
          <p className="text-muted-foreground mt-2">@{user.username}</p>
        </div>

        <div className="glass-panel rounded-2xl p-8 mb-6">
          <h2 className="text-lg font-bold text-white uppercase mb-6 flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" /> Avatar
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              {(avatarPreview || user.avatarUrl) ? (
                <img
                  src={avatarPreview || user.avatarUrl || ""}
                  alt="avatar"
                  className="w-28 h-28 rounded-full object-cover border-4 border-white/10 group-hover:border-primary/50 transition-all"
                  data-testid="img-avatar-profile"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/10 group-hover:border-primary/50 transition-all" data-testid="img-avatar-placeholder">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" data-testid="label-upload-avatar">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" data-testid="input-avatar-file" />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-muted-foreground text-sm mb-3">Upload a JPG, PNG, or WebP image (max 2MB).</p>
              {avatarFile && (
                <button
                  onClick={() => avatarMutation.mutate(avatarFile)}
                  disabled={avatarMutation.isPending}
                  data-testid="button-save-avatar"
                  className="bg-primary text-white rounded-xl px-6 py-3 font-bold uppercase text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {avatarMutation.isPending ? "Uploading..." : "Save Avatar"}
                </button>
              )}
            </div>
          </div>
        </div>

        {user.memberships && user.memberships.length > 0 && (
          <div className="glass-panel rounded-2xl p-8">
            <h2 className="text-lg font-bold text-white uppercase mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> My Leagues
            </h2>
            <div className="space-y-4">
              {user.memberships.map((m: any) => (
                <div key={m.lobbyId} className="bg-background rounded-xl p-5 border-2 border-border" data-testid={`profile-lobby-${m.lobbyId}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white text-lg">{m.lobbyName}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {m.role === "admin" && (
                          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase">Admin</span>
                        )}
                        <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {m.teamName}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {m.driverJokers + m.constructorJokers} Stars</span>
                      </div>
                    </div>
                    <div className="text-sm font-mono text-primary">
                      {m.lobbyCode}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
