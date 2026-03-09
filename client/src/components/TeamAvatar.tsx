const TEAM_LOGOS: Record<string, string> = {
  "mercedes":        "/logos/mercedes.png",
  "ferrari":         "/logos/ferrari.png",
  "mclaren":         "/logos/mclaren.png",
  "red bull racing": "/logos/redbull.png",
  "aston martin":    "/logos/astonmartin.png",
  "alpine":          "/logos/alpine.png",
  "williams":        "/logos/williams.png",
  "rb":              "/logos/rb.png",
  "racing bulls":    "/logos/rb.png",
  "haas":            "/logos/haas.png",
  "audi":            "/logos/audi.png",
  "cadillac":        "/logos/cadillac.png",
};

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#3671C6", "Ferrari": "#E8002D", "McLaren": "#FF8000",
  "Mercedes": "#27F4D2", "Aston Martin": "#229971", "Alpine": "#FF87BC",
  "Williams": "#64C4FF", "RB": "#6692FF", "Racing Bulls": "#6692FF",
  "Haas": "#B6BABD", "Audi": "#ff3300", "Cadillac": "#d1d1d1",
};

const SIZE_MAP = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-10 h-10" };

export function TeamAvatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const src = TEAM_LOGOS[name.toLowerCase()] ?? null;
  const dim = SIZE_MAP[size];
  const color = TEAM_COLORS[name] ?? "#444";

  if (!src) {
    return (
      <div
        className={`${dim} ${className} rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0 border uppercase`}
        style={{ backgroundColor: `${color}30`, borderColor: `${color}50` }}
      >
        {name.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className={`${dim} ${className} shrink-0 flex items-center justify-center`}>
      <img
        src={src}
        alt={name}
        className="w-full h-full object-contain"
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          el.style.display = "none";
          const fb = el.nextElementSibling as HTMLElement | null;
          if (fb) fb.style.display = "flex";
        }}
      />
      <div
        className="w-full h-full hidden rounded-lg items-center justify-center text-[9px] font-black text-white border uppercase"
        style={{ backgroundColor: `${color}30`, borderColor: `${color}50` }}
      >
        {name.slice(0, 2)}
      </div>
    </div>
  );
}
