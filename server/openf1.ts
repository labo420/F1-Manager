const OPENF1_BASE = "https://api.openf1.org/v1";
const FETCH_TIMEOUT_MS = 10000;

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

export async function calculateOvertakesFromSession(
  sessionKey: number
): Promise<Record<number, OvertakeData>> {
  const laps: OpenF1Lap[] = await fetchWithTimeout(
    `${OPENF1_BASE}/laps?session_key=${sessionKey}`
  );

  if (!laps || laps.length === 0) return {};

  const driverNumbers = [...new Set(laps.map((l) => l.driver_number))];
  const maxLap = Math.max(...laps.map((l) => l.lap_number));

  const lapStartTimes: Record<string, Date> = {};
  for (const lap of laps) {
    if (lap.date_start) {
      lapStartTimes[`${lap.driver_number}_${lap.lap_number}`] = new Date(
        lap.date_start
      );
    }
  }

  const positionByDriverByLap: Record<number, Record<number, number>> = {};
  for (const dn of driverNumbers) {
    positionByDriverByLap[dn] = {};
  }

  const allPositions: OpenF1PositionEntry[] = await fetchWithTimeout(
    `${OPENF1_BASE}/position?session_key=${sessionKey}`
  );

  if (!allPositions || allPositions.length === 0) return {};

  const positionByDriver: Record<number, OpenF1PositionEntry[]> = {};
  for (const entry of allPositions) {
    if (!positionByDriver[entry.driver_number]) {
      positionByDriver[entry.driver_number] = [];
    }
    positionByDriver[entry.driver_number].push(entry);
  }

  for (const dn of driverNumbers) {
    const entries = positionByDriver[dn] ?? [];
    entries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let lapNum = 1; lapNum <= maxLap; lapNum++) {
      const lapStartKey = `${dn}_${lapNum}`;
      const nextLapStartKey = `${dn}_${lapNum + 1}`;

      const lapStart = lapStartTimes[lapStartKey];
      const lapEnd = lapStartTimes[nextLapStartKey];

      if (!lapStart) continue;

      let lastPositionInLap: number | null = null;

      for (const entry of entries) {
        const entryDate = new Date(entry.date);
        if (entryDate < lapStart) continue;
        if (lapEnd && entryDate >= lapEnd) break;
        lastPositionInLap = entry.position;
      }

      if (lastPositionInLap !== null) {
        positionByDriverByLap[dn][lapNum] = lastPositionInLap;
      }
    }
  }

  const result: Record<number, OvertakeData> = {};
  for (const dn of driverNumbers) {
    result[dn] = { overtakes: 0, overtakesConceded: 0 };
  }

  for (const dn of driverNumbers) {
    const lapPositions = positionByDriverByLap[dn];
    const lapNums = Object.keys(lapPositions)
      .map(Number)
      .sort((a, b) => a - b);

    for (let i = 1; i < lapNums.length; i++) {
      const prevLap = lapNums[i - 1];
      const currLap = lapNums[i];

      if (currLap - prevLap > 2) continue;

      const prevPos = lapPositions[prevLap];
      const currPos = lapPositions[currLap];
      const delta = prevPos - currPos;

      if (Math.abs(delta) > 5) continue;

      if (delta > 0) {
        result[dn].overtakes += delta;
      } else if (delta < 0) {
        result[dn].overtakesConceded += Math.abs(delta);
      }
    }
  }

  return result;
}
