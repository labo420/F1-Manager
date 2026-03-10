const OPENF1_BASE = "https://api.openf1.org/v1";
const FETCH_TIMEOUT_MS = 15000;
const PIT_BUFFER_MS = 30_000;
const SKIP_LAPS = 3;

interface OpenF1Session {
  session_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_short_name: string;
  year: number;
}

interface OpenF1PositionEntry {
  date: string;
  session_key: number;
  driver_number: number;
  position: number;
}

interface OpenF1Lap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string;
  lap_duration: number | null;
}

interface OpenF1Pit {
  session_key: number;
  driver_number: number;
  date: string;
  lap_number: number;
  pit_duration: number;
}

interface PitWindow {
  driverNumber: number;
  start: number;
  end: number;
}

export interface OvertakeData {
  overtakes: number;
  overtakesConceded: number;
}

async function fetchWithTimeout(url: string): Promise<any[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`OpenF1 HTTP ${res.status}: ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function findOpenF1Session(
  raceDateIso: string,
  isSprint: boolean
): Promise<OpenF1Session | null> {
  const targetDate = new Date(raceDateIso);
  const year = targetDate.getUTCFullYear();

  const sessions: OpenF1Session[] = await fetchWithTimeout(
    `${OPENF1_BASE}/sessions?year=${year}&session_type=Race`
  );

  const wantedName = isSprint ? "Sprint" : "Race";
  const raceDay = targetDate.toISOString().slice(0, 10);

  const match = sessions.find((s) => {
    if (s.session_name !== wantedName) return false;
    const sDay = new Date(s.date_start).toISOString().slice(0, 10);
    const diff = Math.abs(
      new Date(raceDay).getTime() - new Date(sDay).getTime()
    );
    return diff <= 2 * 24 * 60 * 60 * 1000;
  });

  return match ?? null;
}

function isInPit(
  driverNumber: number,
  timestampMs: number,
  pitWindows: PitWindow[]
): boolean {
  for (const w of pitWindows) {
    if (w.driverNumber === driverNumber && timestampMs >= w.start && timestampMs <= w.end) {
      return true;
    }
  }
  return false;
}

function getLapAtTime(
  driverNumber: number,
  timestampMs: number,
  lapStartMap: Record<string, number>
): number {
  let lap = 0;
  for (const key of Object.keys(lapStartMap)) {
    const [dn, ln] = key.split("_").map(Number);
    if (dn !== driverNumber) continue;
    if (lapStartMap[key] <= timestampMs) {
      lap = Math.max(lap, ln);
    }
  }
  return lap;
}

export async function calculateOvertakesFromSession(
  sessionKey: number
): Promise<Record<number, OvertakeData>> {
  const [laps, allPositions, allPits] = await Promise.all([
    fetchWithTimeout(`${OPENF1_BASE}/laps?session_key=${sessionKey}`),
    fetchWithTimeout(`${OPENF1_BASE}/position?session_key=${sessionKey}`),
    fetchWithTimeout(`${OPENF1_BASE}/pit?session_key=${sessionKey}`),
  ]) as [OpenF1Lap[], OpenF1PositionEntry[], OpenF1Pit[]];

  if (!laps || laps.length === 0) return {};
  if (!allPositions || allPositions.length === 0) return {};

  const driverNumbers = [...new Set(laps.map((l) => l.driver_number))];

  const lapStartMap: Record<string, number> = {};
  for (const lap of laps) {
    if (lap.date_start) {
      lapStartMap[`${lap.driver_number}_${lap.lap_number}`] = new Date(lap.date_start).getTime();
    }
  }

  const pitWindows: PitWindow[] = [];
  for (const pit of (allPits || [])) {
    if (!pit.date || !pit.pit_duration) continue;
    const start = new Date(pit.date).getTime() - PIT_BUFFER_MS;
    const end = new Date(pit.date).getTime() + (pit.pit_duration * 1000) + PIT_BUFFER_MS;
    pitWindows.push({ driverNumber: pit.driver_number, start, end });
  }

  allPositions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const result: Record<number, OvertakeData> = {};
  for (const dn of driverNumbers) {
    result[dn] = { overtakes: 0, overtakesConceded: 0 };
  }

  const currentPos: Record<number, number> = {};
  const posToDriver: Record<number, number> = {};

  for (const entry of allPositions) {
    const { driver_number: dn, position: newPos } = entry;
    const entryMs = new Date(entry.date).getTime();

    if (!(dn in currentPos)) {
      currentPos[dn] = newPos;
      posToDriver[newPos] = dn;
      if (!result[dn]) result[dn] = { overtakes: 0, overtakesConceded: 0 };
      continue;
    }

    const oldPos = currentPos[dn];
    if (oldPos === newPos) continue;

    const delta = oldPos - newPos;

    if (delta === 1) {
      const lap = getLapAtTime(dn, entryMs, lapStartMap);
      if (lap > SKIP_LAPS) {
        if (!isInPit(dn, entryMs, pitWindows)) {
          const loser = posToDriver[newPos];
          if (loser !== undefined && loser !== dn && !isInPit(loser, entryMs, pitWindows)) {
            result[dn].overtakes += 1;
            if (!result[loser]) result[loser] = { overtakes: 0, overtakesConceded: 0 };
            result[loser].overtakesConceded += 1;
          }
        }
      }
    }

    posToDriver[newPos] = dn;
    if (posToDriver[oldPos] === dn) {
      delete posToDriver[oldPos];
    }
    currentPos[dn] = newPos;
  }

  return result;
}
