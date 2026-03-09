const F1_CDN = "https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/2018-redesign-assets/team%20logos";
const WIKI = "https://upload.wikimedia.org/wikipedia";

const TEAM_LOGOS: Record<string, string> = {
  "mercedes":         `${F1_CDN}/mercedes.png`,
  "ferrari":          `${F1_CDN}/ferrari.png`,
  "mclaren":          `${F1_CDN}/mclaren.png`,
  "alpine":           `${F1_CDN}/alpine.png`,
  "williams":         `${F1_CDN}/williams.png`,
  "rb":               `${F1_CDN}/rb.png`,
  "racing bulls":     `${F1_CDN}/rb.png`,
  "haas":             `${F1_CDN}/haas.png`,
  "red bull racing":  `${WIKI}/en/thumb/f/fa/Red_Bull_Racing_Logo_2026.svg/240px-Red_Bull_Racing_Logo_2026.svg.png`,
  "aston martin":     `${WIKI}/en/thumb/1/15/Aston_Martin_Aramco_2024_logo.png/240px-Aston_Martin_Aramco_2024_logo.png`,
  "audi":             `${WIKI}/commons/thumb/0/03/Audif1.com_logo17_%28cropped%29.svg/240px-Audif1.com_logo17_%28cropped%29.svg.png`,
  "cadillac":         `${WIKI}/en/thumb/b/bc/Cadillac_Formula_1_Team_Logo_%282025%29.svg/240px-Cadillac_Formula_1_Team_Logo_%282025%29.svg.png`,
};

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#3671C6", "Ferrari": "#E8002D", "McLaren": "#FF8000",
  "Mercedes": "#27F4D2", "Aston Martin": "#229971", "Alpine": "#FF87BC",
  "Williams": "#64C4FF", "RB": "#6692FF", "Racing Bulls": "#6692FF",
  "Haas": "#B6BABD", "Audi": "#ff3300", "Cadillac": "#d1d1d1",
};

function getTeamLogo(name: string): string | null {
  return TEAM_LOGOS[name.toLowerCase()] ?? null;
}

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
  const src = getTeamLogo(name);
  const dim = SIZE_MAP[size];
  const color = TEAM_COLORS[name] ?? "#444";

  if (!src) {
    return (
      <div
        className={`${dim} ${className} rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0 border border-white/10 uppercase`}
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
        className="w-full h-full hidden rounded-lg items-center justify-center text-[9px] font-black text-white border border-white/10 uppercase"
        style={{ backgroundColor: `${color}30`, borderColor: `${color}50` }}
      >
        {name.slice(0, 2)}
      </div>
    </div>
  );
}
