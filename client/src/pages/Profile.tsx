import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveLobby, useSetTeamName } from "@/hooks/use-lobby";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Camera, Save, User, Shield, Trophy, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const { user } = useAuth();
  const { activeLobbyId, activeMembership } = useActiveLobby();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setTeamNameMutation = useSetTeamName();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState(user?.bio || "");

  useEffect(() => {
    if (user?.bio) setBio(user.bio);
  }, [user?.bio]);

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
      toast({ title: "Avatar Locked", description: "Identity updated on the grid." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    }
  });

  const bioMutation = useMutation({
    mutationFn: async (newBio: string) => {
      const res = await apiRequest("PATCH", "/api/user/bio", { bio: newBio });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Dossier Updated", description: "Racing history transmitted." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
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
    <div className="max-w-5xl mx-auto px-4 py-12 pb-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            {(avatarPreview || user.avatarUrl) ? (
              <img
                src={avatarPreview || user.avatarUrl || ""}
                alt="avatar"
                className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-zinc-900 shadow-2xl transition-all"
                data-testid="img-avatar-profile"
              />
            ) : (
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-zinc-900 flex items-center justify-center border-4 border-zinc-800 shadow-2xl" data-testid="img-avatar-placeholder">
                <User className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
            <label className="absolute bottom-2 right-2 w-10 h-10 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center cursor-pointer shadow-xl border-2 border-zinc-900 transition-transform hover:scale-110 active:scale-95 z-20" data-testid="label-upload-avatar">
              <Camera className="w-5 h-5 text-white" />
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" data-testid="input-avatar-file" />
            </label>
          </div>

          <div className="flex-1">
            <h1 className="text-5xl md:text-6xl font-display font-black text-white uppercase tracking-tighter italic leading-none mb-2" data-testid="text-profile-title">
              {user.username}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Registry: #FL-{user.id.toString().padStart(4, '0')}
              </span>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                Super License Active
              </span>
            </div>
          </div>

          {avatarFile && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <button
                onClick={() => avatarMutation.mutate(avatarFile)}
                disabled={avatarMutation.isPending}
                data-testid="button-save-avatar"
                className="bg-white text-black rounded-2xl px-8 py-4 font-black uppercase text-xs hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center gap-3 shadow-2xl shadow-white/10"
              >
                <Save className="w-4 h-4" />
                {avatarMutation.isPending ? "Syncing..." : "Confirm Photo"}
              </button>
            </motion.div>
          )}
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          <div className="glass-panel rounded-[2rem] p-8 border-2 border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
            <div className="relative z-10">
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <FileText className="w-4 h-4 text-primary" /> Driver Dossier
              </h2>
              <div className="space-y-6">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Briefly describe your racing history, rivalries, and championship aspirations..."
                  className="w-full h-40 bg-zinc-900/50 border-2 border-white/5 rounded-2xl px-6 py-5 text-white font-medium focus:border-primary focus:bg-zinc-900 outline-none transition-all resize-none shadow-inner text-lg placeholder:text-white/10"
                  data-testid="textarea-bio"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => bioMutation.mutate(bio)}
                    disabled={bioMutation.isPending || bio === user.bio}
                    data-testid="button-save-bio"
                    className={cn(
                      "rounded-xl px-8 py-4 font-black uppercase text-xs transition-all flex items-center gap-3",
                      bio === user.bio 
                        ? "bg-zinc-800 text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90 red-glow shadow-xl shadow-primary/20"
                    )}
                  >
                    <Save className="w-4 h-4" />
                    {bioMutation.isPending ? "Transmitting..." : "Update Dossier"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {user.memberships && user.memberships.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] px-4 flex items-center gap-3">
                <Shield className="w-4 h-4 text-primary" /> Active Assignments
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.memberships.map((m: any, idx: number) => (
                  <motion.div 
                    key={m.lobbyId} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-panel rounded-3xl p-6 border-2 border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden" 
                    data-testid={`profile-lobby-${m.lobbyId}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                        <Trophy className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Freq ID</div>
                        <code className="text-primary font-mono font-black tracking-widest bg-zinc-900/50 px-2 py-0.5 rounded border border-white/5 text-[10px]">
                          {m.lobbyCode}
                        </code>
                      </div>
                    </div>

                    <h3 className="font-display font-black text-white text-xl uppercase tracking-tight mb-4 group-hover:text-primary transition-colors">{m.lobbyName}</h3>
                    
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>Team</span>
                        <span className="text-white italic">{m.teamName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
                        {m.role === "admin" ? (
                          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[8px] font-black uppercase border border-primary/20">Race Director</span>
                        ) : (
                          <span className="bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full text-[8px] font-black uppercase border border-white/10">Registered Driver</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
