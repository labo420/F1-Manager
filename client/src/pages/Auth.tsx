import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, User } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register, user, isLoggingIn, isRegistering } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      setLocation("/paddock");
    }
  }, [user, setLocation]);

  if (user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      login({ username, password });
    } else {
      register({ username, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-950">
      <div
        className="absolute inset-0 z-0 opacity-10 bg-cover bg-center grayscale"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1541410965313-d53b3c16ef17?w=1920&h=1080&fit=crop")' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950 z-0" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent z-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm z-10"
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/500px-F1.svg.png"
              alt="Formula 1"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight">Fantasy League</h1>
          <p className="text-white/35 mt-2 text-xs font-medium tracking-widest uppercase">Private Season 2026</p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
          <div className="flex bg-zinc-950/60 p-1 rounded-xl mb-6 border border-white/5">
            <button
              onClick={() => setIsLogin(true)}
              data-testid="tab-login"
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all rounded-lg ${
                isLogin ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              data-testid="tab-register"
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all rounded-lg ${
                !isLogin ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Username</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="input-username"
                  className="w-full bg-zinc-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-primary/60 focus:ring-0 outline-none transition-all placeholder:text-white/15 font-medium"
                  placeholder="champion_2026"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                  className="w-full bg-zinc-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-primary/60 focus:ring-0 outline-none transition-all placeholder:text-white/15 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || isRegistering}
              data-testid="button-submit"
              className="w-full mt-2 bg-primary text-white rounded-xl py-3 text-sm font-semibold uppercase tracking-wider hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-primary/20"
            >
              {isLoggingIn || isRegistering ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Create Account
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-[10px] font-medium text-white/20 uppercase tracking-widest">
          Official Private League System v3.0
        </p>
      </motion.div>
    </div>
  );
}
