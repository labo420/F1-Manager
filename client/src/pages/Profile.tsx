import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, User, Lock, Shield, Trophy, Eye, EyeOff, ChevronRight, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AvatarPicker } from "@/components/AvatarPicker";

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [openPanel, setOpenPanel] = useState<"password" | "username" | "leagues" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [showPwd, setShowPwd] = useState(false);

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

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("PATCH", "/api/user/password", data);
    },
    onSuccess: () => {
      setOpenPanel(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", description: "Your password has been changed." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "Could not update password.", variant: "destructive" });
    },
  });

  const usernameMutation = useMutation({
    mutationFn: async (username: string) => {
      return apiRequest("PATCH", "/api/user/username", { username });
    },
    onSuccess: () => {
      setOpenPanel(null);
      setNewUsername("");
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Username updated", description: "Your new username is active." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "Could not update username.", variant: "destructive" });
    },
  });

  const handlePasswordSave = () => {
    if (!currentPassword.trim()) return toast({ title: "Error", description: "Enter your current password.", variant: "destructive" });
    if (!newPassword.trim()) return toast({ title: "Error", description: "Enter a new password.", variant: "destructive" });
    if (newPassword !== confirmPassword) return toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handleUsernameSave = () => {
    if (!newUsername.trim()) return toast({ title: "Error", description: "Enter a new username.", variant: "destructive" });
    if (newUsername === user?.username) return toast({ title: "Error", description: "Choose a different username.", variant: "destructive" });
    usernameMutation.mutate(newUsername);
  };

  if (!user) return null;

  const leagues = user.memberships ?? [];

  return (
    <div className="max-w-lg mx-auto px-4 py-10 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/30 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-700" />
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="avatar"
                className="relative w-24 h-24 rounded-full object-cover border-2 border-zinc-800 shadow-2xl"
                data-testid="img-avatar-profile"
              />
            ) : (
              <div
                className="relative w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-zinc-800 shadow-2xl"
                data-testid="img-avatar-placeholder"
              >
                <User className="w-10 h-10 text-muted-foreground/30" />
              </div>
            )}
            <button
              onClick={() => setShowPicker(true)}
              data-testid="button-edit-avatar"
              className="absolute bottom-0.5 right-0.5 w-7 h-7 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-xl border-2 border-zinc-900 transition-transform hover:scale-110 active:scale-95 z-20"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div>
            <h1
              className="text-3xl font-display font-black text-white uppercase tracking-tighter leading-none mb-2"
              data-testid="text-profile-title"
            >
              {user.username}
            </h1>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                #{user.id.toString().padStart(4, "0")}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold uppercase tracking-widest text-primary">
                Active
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
          <div className="px-4 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">Impostazioni</p>
          </div>

          <button
            onClick={() => { setOpenPanel("username"); setNewUsername(user?.username || ""); }}
            data-testid="button-settings-username"
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
              <User className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">Cambia username</p>
              <p className="text-[10px] text-white/30">Scegli un nuovo nome utente</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
          </button>

          <button
            onClick={() => { setOpenPanel("password"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
            data-testid="button-settings-password"
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
              <Lock className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">Cambia password</p>
              <p className="text-[10px] text-white/30">Aggiorna le credenziali di accesso</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
          </button>

          {leagues.length > 0 && (
            <button
              onClick={() => setOpenPanel("leagues")}
              data-testid="button-settings-leagues"
              className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Shield className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">Le mie leghe</p>
                <p className="text-[10px] text-white/30">{leagues.length} {leagues.length === 1 ? "lega" : "leghe"} attive</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
            </button>
          )}

          <button
            onClick={() => logout()}
            data-testid="button-logout-profile"
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-red-500/5 transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 group-hover:bg-red-500/20 transition-colors">
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-400">Logout</p>
              <p className="text-[10px] text-white/30">Esci dall'account</p>
            </div>
          </button>
        </div>
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

      <AnimatePresence>
        {openPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenPanel(null)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-zinc-950 border-l border-white/10 z-50 overflow-y-auto flex flex-col"
            >
              {openPanel === "username" ? (
                <>
                  <div className="sticky top-0 px-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur flex items-center justify-between">
                    <h2 className="font-display font-black text-white text-lg uppercase tracking-tight">Cambia username</h2>
                    <button
                      onClick={() => setOpenPanel(null)}
                      className="text-white/40 hover:text-white transition-colors p-1"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 px-6 py-6 space-y-4">
                    <input
                      type="text"
                      placeholder="Nuovo username"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      data-testid="input-new-username"
                      className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-3 text-white text-sm font-medium focus:border-primary focus:outline-none placeholder:text-white/20"
                    />
                    <p className="text-[10px] text-white/30">Username: 1-30 caratteri, deve essere unico.</p>
                  </div>

                  <div className="sticky bottom-0 px-6 py-4 border-t border-white/5 bg-zinc-950/80 backdrop-blur flex gap-3">
                    <button
                      onClick={() => setOpenPanel(null)}
                      className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-white/40 text-sm font-semibold uppercase tracking-wider hover:text-white transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleUsernameSave}
                      disabled={usernameMutation.isPending}
                      data-testid="button-save-username"
                      className="flex-1 px-4 py-3 rounded-lg bg-primary text-white text-sm font-black uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {usernameMutation.isPending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Salva
                    </button>
                  </div>
                </>
              ) : openPanel === "password" ? (
                <>
                  <div className="sticky top-0 px-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur flex items-center justify-between">
                    <h2 className="font-display font-black text-white text-lg uppercase tracking-tight">Cambia password</h2>
                    <button
                      onClick={() => setOpenPanel(null)}
                      className="text-white/40 hover:text-white transition-colors p-1"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 px-6 py-6 space-y-4">
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="Password attuale"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      data-testid="input-current-password"
                      className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-3 text-white text-sm font-medium focus:border-primary focus:outline-none placeholder:text-white/20"
                    />
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        placeholder="Nuova password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        data-testid="input-new-password"
                        className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-3 text-white text-sm font-medium focus:border-primary focus:outline-none pr-10 placeholder:text-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="Conferma password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      data-testid="input-confirm-password"
                      className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-3 text-white text-sm font-medium focus:border-primary focus:outline-none placeholder:text-white/20"
                    />
                  </div>

                  <div className="sticky bottom-0 px-6 py-4 border-t border-white/5 bg-zinc-950/80 backdrop-blur flex gap-3">
                    <button
                      onClick={() => setOpenPanel(null)}
                      className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-white/40 text-sm font-semibold uppercase tracking-wider hover:text-white transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handlePasswordSave}
                      disabled={passwordMutation.isPending}
                      data-testid="button-save-password"
                      className="flex-1 px-4 py-3 rounded-lg bg-primary text-white text-sm font-black uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {passwordMutation.isPending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Salva
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="sticky top-0 px-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur flex items-center justify-between">
                    <h2 className="font-display font-black text-white text-lg uppercase tracking-tight">Le mie leghe</h2>
                    <button
                      onClick={() => setOpenPanel(null)}
                      className="text-white/40 hover:text-white transition-colors p-1"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 px-6 py-6 space-y-3">
                    {leagues.map((m: any) => (
                      <div key={m.lobbyId} className="glass-panel rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-all group" data-testid={`panel-league-item-${m.lobbyId}`}>
                        <div className="flex items-start gap-3 mb-3">
                          {m.lobbyImageUrl ? (
                            <img src={m.lobbyImageUrl} alt={m.lobbyName} className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                              <Trophy className="w-5 h-5 text-white/20" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm uppercase tracking-tight truncate">{m.lobbyName}</p>
                            <p className="text-[10px] text-white/30 font-medium">{m.teamName && m.teamName !== "TBD" ? m.teamName : "—"}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] text-white/40 uppercase tracking-wider">Codice</span>
                            <code className="text-primary font-mono font-bold text-[9px] tracking-widest">{m.lobbyCode}</code>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            {m.role === "admin" ? (
                              <>
                                <span className="text-[9px] text-white/40 uppercase tracking-wider">Ruolo</span>
                                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[8px] font-black uppercase border border-primary/20">Admin</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[9px] text-white/40 uppercase tracking-wider">Ruolo</span>
                                <span className="bg-white/5 text-white/40 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-white/10">Player</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
