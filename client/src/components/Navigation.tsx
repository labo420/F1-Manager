import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Trophy, LayoutDashboard, Settings, LogOut, Calendar, Home, UserCircle, Warehouse, Activity } from "lucide-react";
import { TelemetryPanel } from "@/components/TelemetryPanel";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const hasMemberships = user.memberships && user.memberships.length > 0;
  const isAdmin = hasMemberships && user.memberships.some(m => m.role === "admin");

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/f1-2026", label: "F1 2026", icon: Calendar },
  ];

  if (hasMemberships) {
    navItems.splice(1, 0, { href: "/paddock", label: "Paddock", icon: Warehouse });
    navItems.splice(2, 0, { href: "/leaderboard", label: "Standings", icon: Trophy });
  }

  if (isAdmin) {
    navItems.push({ href: "/admin", label: "Race Control", icon: Settings });
  }

  navItems.push({ href: "/profile", label: "Profile", icon: UserCircle });

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-3 shrink-0" data-testid="nav-home-logo">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/500px-F1.svg.png"
                alt="Formula 1"
                className="h-6 w-auto object-contain"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                  const fallback = el.nextSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <span className="hidden" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'white', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                F1
              </span>
              <div className="h-4 w-px bg-white/15 hidden sm:block" />
              <span className="font-display font-semibold text-sm text-white/70 uppercase tracking-wider hidden sm:block">
                Fantasy League
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-md font-medium text-xs transition-all duration-150 shrink-0
                    ${location === item.href
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white hover:bg-white/5"}
                  `}
                >
                  <item.icon className={`w-3.5 h-3.5 ${location === item.href ? "text-primary" : ""}`} />
                  <span className={item.label === "Home" ? "hidden sm:inline" : ""}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt="avatar"
                className="w-7 h-7 rounded-full object-cover border border-white/15"
                data-testid="img-avatar-nav"
              />
            )}
            <span className="hidden lg:block text-xs text-white/40 font-medium px-2">@{user.username}</span>

            <button
              onClick={() => logout()}
              data-testid="button-logout"
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {location === "/f1-2026" && (
        <div className="border-t border-white/10 bg-zinc-950/50 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto">
            <TelemetryPanel />
          </div>
        </div>
      )}

      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-zinc-950/95 backdrop-blur-xl z-50 safe-bottom">
        <div className="flex justify-around items-center h-14 px-2" style={{ paddingLeft: 'max(0.5rem, env(safe-area-inset-left))', paddingRight: 'max(0.5rem, env(safe-area-inset-right))' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-md transition-colors
                ${location === item.href ? "text-white" : "text-white/40"}
              `}
            >
              <item.icon className={`w-4 h-4 ${location === item.href ? "text-primary" : ""}`} />
              <span className="text-[9px] font-medium uppercase tracking-wide truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
