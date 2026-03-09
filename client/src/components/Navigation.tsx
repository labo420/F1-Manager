import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Flag, Trophy, LayoutDashboard, Settings, LogOut, Calendar, Home, UserCircle, ArrowLeft, Warehouse } from "lucide-react";

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

  const showBackButton = location !== "/" && location !== "/auth";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Link href="/" className="p-2 text-muted-foreground hover:text-white transition-colors" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <Link href="/" className="flex items-center gap-2 group cursor-pointer" data-testid="nav-home-logo">
              <div className="w-8 h-8 bg-primary rounded-tr-lg rounded-bl-lg f1-slant flex items-center justify-center group-hover:red-glow transition-all">
                <Flag className="w-5 h-5 text-white f1-slant-reverse" />
              </div>
              <span className="font-display font-black text-xl tracking-tight text-white uppercase hidden sm:block">
                F1 Fantasy <span className="text-primary">League</span>
              </span>
            </Link>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2 -my-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  className={`
                    flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md font-medium text-xs sm:text-sm transition-all duration-200 shrink-0
                    ${location === item.href
                      ? "bg-white/10 text-white shadow-[inset_0_-2px_0_0_hsl(var(--primary))]"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"}
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  <span className={item.label === "Home" ? "hidden sm:inline" : ""}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="avatar" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-white/20" data-testid="img-avatar-nav" />
            )}
            <div className="hidden lg:flex flex-col items-end mr-2">
              <span className="text-xs text-muted-foreground">@{user.username}</span>
            </div>

            <button
              onClick={() => logout()}
              data-testid="button-logout"
              className="p-1.5 sm:p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-background/95 backdrop-blur-xl z-50">
        <div className="flex justify-around items-center h-16 px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center w-full h-full gap-1
                ${location === item.href ? "text-primary" : "text-muted-foreground"}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium uppercase truncate w-full text-center px-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
