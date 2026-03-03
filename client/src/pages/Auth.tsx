import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Flag, ShieldCheck, Lock, User } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register, user, isLoggingIn, isRegistering } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      setLocation("/");
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
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background z-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex w-20 h-20 bg-primary rounded-tr-3xl rounded-bl-3xl f1-slant items-center justify-center mb-6 shadow-[0_0_30px_rgba(230,0,0,0.3)]">
            <Flag className="w-10 h-10 text-white f1-slant-reverse" />
          </div>
          <h1 className="text-5xl font-display font-black text-white uppercase tracking-tighter italic">F1 Fantasy</h1>
          <p className="text-muted-foreground mt-3 uppercase tracking-[0.3em] text-[10px] font-black opacity-60">The Global Paddock Showdown</p>
        </div>

        <div className="glass-panel rounded-3xl p-1 overflow-hidden shadow-2xl">
          <div className="bg-zinc-900/90 backdrop-blur-xl rounded-[22px] p-8">
            <div className="flex bg-zinc-950/50 p-1 rounded-xl mb-8 border border-white/5">
              <button
                onClick={() => setIsLogin(true)}
                data-testid="tab-login"
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-lg ${
                  isLogin ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                data-testid="tab-register"
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-lg ${
                  !isLogin ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    data-testid="input-username"
                    className="w-full bg-zinc-950 border-2 border-white/5 rounded-xl pl-12 pr-4 py-4 text-white focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-zinc-700 font-bold"
                    placeholder="CHAMPION_2024"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-password"
                    className="w-full bg-zinc-950 border-2 border-white/5 rounded-xl pl-12 pr-4 py-4 text-white focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-zinc-700 font-bold"
                    placeholder="........"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || isRegistering}
                data-testid="button-submit"
                className="w-full mt-4 bg-primary text-white rounded-xl py-4 font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 italic shadow-lg shadow-primary/20"
              >
                {isLoggingIn || isRegistering ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isLogin ? (
                  "Login"
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" /> Register
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-8 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
          Official Private League System v3.0
        </p>
      </motion.div>
    </div>
  );
}
