import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, User, LogOut, Lock, Shield, Trophy, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AvatarPicker } from "@/components/AvatarPicker";

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    mutationFn: async (pwd: string) => {
      return apiRequest("PATCH", "/api/user/password", { newPassword: pwd });
    },
    onSuccess: () => {
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", description: "Your password has been changed." });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not update password.", variant: "destructive" });
    },
  });

  const handlePasswordSave = () => {
    if (!newPassword.trim()) return toast({ title: "Error", description: "Enter a new password.", variant: "destructive" });
    if (newPassword !== confirmPassword) return toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
    passwordMutation.mutate(newPassword);
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

          <div>
            <button
              onClick={() => { setShowPasswordForm(v => !v); setNewPassword(""); setConfirmPassword(""); }}
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
              <ChevronDown className={`w-4 h-4 text-white/20 group-hover:text-white/40 transition-all shrink-0 ${showPasswordForm ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showPasswordForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 space-y-3 bg-white/[0.02]">
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        placeholder="Nuova password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        data-testid="input-new-password"
                        className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs font-medium focus:border-primary focus:outline-none pr-10 placeholder:text-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                      >
                        {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="Conferma password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      data-testid="input-confirm-password"
                      className="w-full bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs font-medium focus:border-primary focus:outline-none placeholder:text-white/20"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setShowPasswordForm(false); setNewPassword(""); setConfirmPassword(""); }}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 text-[10px] font-semibold uppercase tracking-wider hover:text-white transition-colors"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handlePasswordSave}
                        disabled={passwordMutation.isPending}
                        data-testid="button-save-password"
                        className="px-4 py-1.5 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {passwordMutation.isPending && <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />}
                        Salva
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {leagues.length > 0 && (
            <button
              onClick={() => setLocation("/leagues")}
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
    </div>
  );
}
