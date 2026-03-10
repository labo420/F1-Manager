import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ChevronLeft, Trophy } from "lucide-react";

export default function Leagues() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) return null;

  const leagues = user.memberships ?? [];

  if (leagues.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <button
            onClick={() => setLocation("/profile")}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-semibold uppercase tracking-wider mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Indietro
          </button>

          <div className="text-center space-y-4">
            <Trophy className="w-12 h-12 text-white/20 mx-auto" />
            <h2 className="text-xl font-display font-black text-white uppercase tracking-tight">Nessuna lega</h2>
            <p className="text-white/40">Non sei ancora iscritto a nessuna lega.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <button
          onClick={() => setLocation("/profile")}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-semibold uppercase tracking-wider mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Indietro
        </button>

        <div>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter mb-2">Le mie leghe</h1>
          <p className="text-white/40">{leagues.length} {leagues.length === 1 ? "lega attiva" : "leghe attive"}</p>
        </div>

        <div className="space-y-3">
          {leagues.map((m: any, idx: number) => (
            <motion.div
              key={m.lobbyId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel rounded-2xl p-5 border border-white/5 hover:border-primary/30 transition-all group"
              data-testid={`league-item-${m.lobbyId}`}
            >
              <div className="flex items-start gap-4">
                {m.lobbyImageUrl ? (
                  <img src={m.lobbyImageUrl} alt={m.lobbyName} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0 group-hover:bg-primary/10 transition-colors">
                    <Trophy className="w-6 h-6 text-white/20 group-hover:text-primary/50 transition-colors" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-white text-lg uppercase tracking-tight leading-none mb-2 truncate group-hover:text-primary transition-colors">
                    {m.lobbyName}
                  </h3>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Team</span>
                      <span className="text-sm font-semibold text-white">{m.teamName && m.teamName !== "TBD" ? m.teamName : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Ruolo</span>
                      {m.role === "admin" ? (
                        <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-primary/20">Admin</span>
                      ) : (
                        <span className="bg-white/5 text-white/50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-white/10">Player</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Codice</span>
                      <code className="text-primary font-mono font-bold bg-primary/10 px-2.5 py-0.5 rounded text-xs tracking-widest">{m.lobbyCode}</code>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
