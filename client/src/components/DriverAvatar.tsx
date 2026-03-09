const F1_CDN = (year: number, team: string, code: string) =>
  `https://media.formula1.com/image/upload/c_fill,w_80/q_auto/v1740000000/common/f1/${year}/${team}/${code}/${year}${team}${code}right.webp`;

export const DRIVER_IMAGES: Record<string, string> = {
  "RUS": F1_CDN(2026, "mercedes",      "georus01"),
  "ANT": F1_CDN(2026, "mercedes",      "andant01"),
  "LEC": F1_CDN(2026, "ferrari",       "chalec01"),
  "HAM": F1_CDN(2026, "ferrari",       "lewham01"),
  "NOR": F1_CDN(2026, "mclaren",       "lannor01"),
  "PIA": F1_CDN(2026, "mclaren",       "oscpia01"),
  "VER": F1_CDN(2026, "redbullracing", "maxver01"),
  "HAD": F1_CDN(2026, "redbullracing", "isahad01"),
  "LAW": F1_CDN(2026, "racingbulls",   "lialaw01"),
  "LIN": F1_CDN(2026, "racingbulls",   "arvlin01"),
  "ALO": F1_CDN(2026, "astonmartin",   "feralo01"),
  "STR": F1_CDN(2026, "astonmartin",   "lanstr01"),
  "GAS": F1_CDN(2026, "alpine",        "piegas01"),
  "COL": F1_CDN(2026, "alpine",        "fracol01"),
  "ALB": F1_CDN(2026, "williams",      "alealb01"),
  "SAI": F1_CDN(2026, "williams",      "carsai01"),
  "HUL": F1_CDN(2026, "audi",          "nichul01"),
  "BOR": F1_CDN(2026, "audi",          "gabbor01"),
  "BEA": F1_CDN(2026, "haas",          "olibea01"),
  "OCO": F1_CDN(2026, "haas",          "estoco01"),
  "PER": F1_CDN(2026, "cadillac",      "serper01"),
  "BOT": F1_CDN(2026, "cadillac",      "valbot01"),
  "TSU": F1_CDN(2025, "redbullracing", "yuktsu01"),
  "DOO": F1_CDN(2025, "alpine",        "jacdoo01"),
};

const DRIVER_IMAGES_BY_NUMBER: Record<number, string> = {
  63: DRIVER_IMAGES["RUS"], 12: DRIVER_IMAGES["ANT"], 6:  DRIVER_IMAGES["HAD"],
  16: DRIVER_IMAGES["LEC"], 81: DRIVER_IMAGES["PIA"], 1:  DRIVER_IMAGES["NOR"],
  4:  DRIVER_IMAGES["NOR"], 44: DRIVER_IMAGES["HAM"], 30: DRIVER_IMAGES["LAW"],
  41: DRIVER_IMAGES["LIN"], 5:  DRIVER_IMAGES["BOR"], 27: DRIVER_IMAGES["HUL"],
  87: DRIVER_IMAGES["BEA"], 31: DRIVER_IMAGES["OCO"], 10: DRIVER_IMAGES["GAS"],
  23: DRIVER_IMAGES["ALB"], 43: DRIVER_IMAGES["COL"], 14: DRIVER_IMAGES["ALO"],
  11: DRIVER_IMAGES["PER"], 77: DRIVER_IMAGES["BOT"], 3:  DRIVER_IMAGES["VER"],
  33: DRIVER_IMAGES["VER"], 55: DRIVER_IMAGES["SAI"], 7:  DRIVER_IMAGES["DOO"],
  22: DRIVER_IMAGES["TSU"], 18: DRIVER_IMAGES["STR"],
};

const DRIVER_CODE_BY_NAME: Record<string, string> = {
  "Max Verstappen": "VER", "Liam Lawson": "LAW", "Lewis Hamilton": "HAM",
  "Charles Leclerc": "LEC", "Lando Norris": "NOR", "Oscar Piastri": "PIA",
  "George Russell": "RUS", "Kimi Antonelli": "ANT", "Andrea Kimi Antonelli": "ANT",
  "Fernando Alonso": "ALO", "Lance Stroll": "STR", "Pierre Gasly": "GAS",
  "Jack Doohan": "DOO", "Yuki Tsunoda": "TSU", "Isack Hadjar": "HAD",
  "Carlos Sainz": "SAI", "Alex Albon": "ALB", "Alexander Albon": "ALB",
  "Nico Hulkenberg": "HUL", "Nico Hülkenberg": "HUL", "Gabriel Bortoleto": "BOR",
  "Oliver Bearman": "BEA", "Esteban Ocon": "OCO", "Franco Colapinto": "COL",
  "Sergio Perez": "PER", "Sergio Pérez": "PER", "Valtteri Bottas": "BOT",
  "Arvid Lindblad": "LIN",
};

export function getDriverImage(code?: string | null, number?: number | null, name?: string): string | null {
  if (code && DRIVER_IMAGES[code]) return DRIVER_IMAGES[code];
  if (number && DRIVER_IMAGES_BY_NUMBER[number]) return DRIVER_IMAGES_BY_NUMBER[number];
  if (name) {
    const c = DRIVER_CODE_BY_NAME[name];
    if (c && DRIVER_IMAGES[c]) return DRIVER_IMAGES[c];
  }
  return null;
}

export function DriverAvatar({
  code,
  number,
  name,
  teamColor,
  size = "md",
}: {
  code?: string | null;
  number?: number | null;
  name: string;
  teamColor?: string;
  size?: "sm" | "md";
}) {
  const src = getDriverImage(code, number, name);
  const dim = size === "sm" ? "w-6 h-6 text-[8px]" : "w-8 h-8 text-[10px]";

  if (!src) {
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center font-bold text-white shrink-0 border border-white/10`}
        style={{
          backgroundColor: teamColor ? `${teamColor}40` : "#333",
          borderColor: teamColor ? `${teamColor}60` : undefined,
        }}
      >
        {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${dim} rounded-full object-cover object-top shrink-0 border border-white/10`}
      style={{ borderColor: teamColor ? `${teamColor}60` : undefined }}
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = "none";
        const fallback = el.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = "flex";
      }}
    />
  );
}
