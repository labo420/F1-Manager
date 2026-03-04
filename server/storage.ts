import { db } from "./db";
import {
  users, lobbies, lobbyMembers, drivers, constructors, races, selections, driverResults, constructorResults, draftState,
  type User, type Lobby, type LobbyMember, type InsertUser, type Driver, type Constructor, type Race, type Selection,
  type DriverResult, type ConstructorResult, type LeaderboardEntry, type DraftState, type DraftStatus, type UsageInfo, type Membership, type RaceFantasyWinners
} from "@shared/schema";
import { eq, sql, and, asc, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresStore = connectPg(session);

export function setupSession(app: any) {
  app.use(
    session({
      store: new PostgresStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "f1-fantasy-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === "production",
      },
    }),
  );
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAvatar(userId: number, avatarUrl: string): Promise<User>;

  createLobby(name: string, code: string, adminId: number): Promise<Lobby>;
  getLobbyByCode(code: string): Promise<Lobby | undefined>;
  getLobbyPlayerCount(lobbyId: number): Promise<number>;

  addLobbyMember(userId: number, lobbyId: number, role: string, teamName?: string): Promise<LobbyMember>;
  getLobbyMember(userId: number, lobbyId: number): Promise<LobbyMember | undefined>;
  getUserMemberships(userId: number): Promise<Membership[]>;
  getLobbyMembers(lobbyId: number): Promise<(LobbyMember & { username: string; avatarUrl: string | null })[]>;
  updateMemberTeamName(userId: number, lobbyId: number, teamName: string): Promise<LobbyMember>;
  isUserInLobby(userId: number, lobbyId: number): Promise<boolean>;
  isUserAdminOfLobby(userId: number, lobbyId: number): Promise<boolean>;

  getDrivers(): Promise<Driver[]>;
  getConstructors(): Promise<Constructor[]>;

  getRaces(): Promise<Race[]>;
  getRace(id: number): Promise<Race | undefined>;
  updateRaceStatus(id: number, isLocked?: boolean, isCompleted?: boolean): Promise<Race>;

  getSelectionsForUserInLobby(userId: number, lobbyId: number): Promise<Selection[]>;
  upsertSelection(userId: number, raceId: number, driverId: number, constructorId: number, lobbyId: number): Promise<Selection>;

  submitDriverResult(raceId: number, driverId: number, points: number, overtakes: number, fastestLap: boolean, position?: number): Promise<DriverResult>;
  submitConstructorResult(raceId: number, constructorId: number, points: number): Promise<ConstructorResult>;
  getDriverResultsForRace(raceId: number): Promise<DriverResult[]>;
  getConstructorResultsForRace(raceId: number): Promise<ConstructorResult[]>;

  bulkSubmitRaceResults(raceId: number, results: Array<{ driverId: number; position: number; points: number; overtakes: number; fastestLap: boolean }>): Promise<void>;

  getDriverStandings(): Promise<Array<{ driverId: number; name: string; team: string; number: number | null; totalPoints: number; wins: number; podiums: number }>>;
  getConstructorStandings(): Promise<Array<{ constructorId: number; name: string; color: string | null; totalPoints: number }>>;
  getRaceArchive(): Promise<Array<Race & { topResults?: DriverResult[] }>>;
  getRaceDetails(raceId: number): Promise<{ race: Race; driverResults: Array<DriverResult & { driverName: string; driverTeam: string }>; constructorResults: Array<ConstructorResult & { constructorName: string }>; fastestLapDriver: string | null; totalOvertakes: number }>;

  getDriverLeaderboard(lobbyId: number): Promise<LeaderboardEntry[]>;
  getConstructorLeaderboard(lobbyId: number): Promise<LeaderboardEntry[]>;

  getDraftState(lobbyId: number, raceId: number): Promise<DraftState | undefined>;
  initializeDraft(lobbyId: number, raceId: number, orderUserIds: number[]): Promise<DraftState>;
  advanceDraft(lobbyId: number, raceId: number): Promise<DraftState>;
  getDraftStatus(lobbyId: number, raceId: number, currentUserId: number): Promise<DraftStatus>;
  getSelectionsForLobbyRace(lobbyId: number, raceId: number): Promise<Selection[]>;

  getUserUsageInfoInLobby(userId: number, lobbyId: number): Promise<UsageInfo>;
  consumeDriverJoker(userId: number, lobbyId: number, count: number): Promise<LobbyMember>;
  consumeConstructorJoker(userId: number, lobbyId: number, count: number): Promise<LobbyMember>;
  consumeJokerInLobby(userId: number, lobbyId: number, count: number): Promise<LobbyMember>;

  getRaceFantasyWinners(lobbyId: number, raceId: number): Promise<RaceFantasyWinners>;
  getLobbyRaceSelections(lobbyId: number, raceId: number): Promise<Array<{ userId: number; username: string; teamName: string; driverName: string; driverNumber: number | null; constructorName: string }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const allUsers = await db.select().from(users);
    return allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserAvatar(userId: number, avatarUrl: string): Promise<User> {
    const [user] = await db.update(users).set({ avatarUrl }).where(eq(users.id, userId)).returning();
    return user;
  }

  async createLobby(name: string, code: string, adminId: number): Promise<Lobby> {
    const [lobby] = await db.insert(lobbies).values({ name, code, adminId }).returning();
    await this.addLobbyMember(adminId, lobby.id, "admin");
    return lobby;
  }

  async getLobbyByCode(code: string): Promise<Lobby | undefined> {
    const uppercaseCode = code.trim().toUpperCase();
    const [lobby] = await db.select().from(lobbies).where(eq(lobbies.code, uppercaseCode));
    if (lobby) return lobby;
    const allLobbies = await db.select().from(lobbies);
    return allLobbies.find(l => l.code.trim().toUpperCase() === uppercaseCode);
  }

  async getLobbyPlayerCount(lobbyId: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(lobbyMembers).where(eq(lobbyMembers.lobbyId, lobbyId));
    return result.count;
  }

  async addLobbyMember(userId: number, lobbyId: number, role: string, teamName?: string): Promise<LobbyMember> {
    const existing = await this.getLobbyMember(userId, lobbyId);
    if (existing) return existing;
    const [member] = await db.insert(lobbyMembers).values({
      userId, lobbyId, role, teamName: teamName || "TBD", jolliesRemaining: 3
    }).returning();
    return member;
  }

  async getLobbyMember(userId: number, lobbyId: number): Promise<LobbyMember | undefined> {
    const [member] = await db.select().from(lobbyMembers).where(
      and(eq(lobbyMembers.userId, userId), eq(lobbyMembers.lobbyId, lobbyId))
    );
    return member;
  }

  async getUserMemberships(userId: number): Promise<Membership[]> {
    const members = await db.select().from(lobbyMembers).where(eq(lobbyMembers.userId, userId));
    if (members.length === 0) return [];
    const lobbyIds = members.map(m => m.lobbyId);
    const lobbyList = await db.select().from(lobbies).where(inArray(lobbies.id, lobbyIds));
    return members.map(m => {
      const lobby = lobbyList.find(l => l.id === m.lobbyId);
      return {
        lobbyId: m.lobbyId,
        lobbyName: lobby?.name || "Unknown",
        lobbyCode: lobby?.code || "",
        teamName: m.teamName,
        jokerCount: m.jokerCount,
        driverJokers: m.driverJokers,
        constructorJokers: m.constructorJokers,
        jolliesRemaining: m.jolliesRemaining,
        role: m.role,
      };
    });
  }

  async getLobbyMembers(lobbyId: number): Promise<(LobbyMember & { username: string; avatarUrl: string | null })[]> {
    const members = await db.select().from(lobbyMembers).where(eq(lobbyMembers.lobbyId, lobbyId)).orderBy(asc(lobbyMembers.createdAt));
    if (members.length === 0) return [];
    const userIds = members.map(m => m.userId);
    const userList = await db.select().from(users).where(inArray(users.id, userIds));
    return members.map(m => {
      const user = userList.find(u => u.id === m.userId);
      return { ...m, username: user?.username || "Unknown", avatarUrl: user?.avatarUrl || null };
    });
  }

  async updateMemberTeamName(userId: number, lobbyId: number, teamName: string): Promise<LobbyMember> {
    const [member] = await db.update(lobbyMembers)
      .set({ teamName })
      .where(and(eq(lobbyMembers.userId, userId), eq(lobbyMembers.lobbyId, lobbyId)))
      .returning();
    return member;
  }

  async isUserInLobby(userId: number, lobbyId: number): Promise<boolean> {
    const member = await this.getLobbyMember(userId, lobbyId);
    return !!member;
  }

  async isUserAdminOfLobby(userId: number, lobbyId: number): Promise<boolean> {
    const member = await this.getLobbyMember(userId, lobbyId);
    return member?.role === "admin";
  }

  async getDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers).orderBy(drivers.name);
  }

  async getConstructors(): Promise<Constructor[]> {
    return await db.select().from(constructors).orderBy(constructors.name);
  }

  async getRaces(): Promise<Race[]> {
    return await db.select().from(races).orderBy(races.date);
  }

  async getRace(id: number): Promise<Race | undefined> {
    const [race] = await db.select().from(races).where(eq(races.id, id));
    return race;
  }

  async updateRaceStatus(id: number, isLocked?: boolean, isCompleted?: boolean): Promise<Race> {
    const updates: Partial<Race> = {};
    if (isLocked !== undefined) updates.isLocked = isLocked;
    if (isCompleted !== undefined) updates.isCompleted = isCompleted;
    const [race] = await db.update(races).set(updates).where(eq(races.id, id)).returning();
    return race;
  }

  async getSelectionsForUserInLobby(userId: number, lobbyId: number): Promise<Selection[]> {
    return await db.select().from(selections).where(
      and(eq(selections.userId, userId), eq(selections.lobbyId, lobbyId))
    );
  }

  async upsertSelection(userId: number, raceId: number, driverId: number, constructorId: number, lobbyId: number): Promise<Selection> {
    const [existing] = await db.select().from(selections).where(
      and(eq(selections.userId, userId), eq(selections.raceId, raceId), eq(selections.lobbyId, lobbyId))
    );

    if (existing) {
      const [updated] = await db.update(selections)
        .set({ driverId, constructorId })
        .where(eq(selections.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(selections)
        .values({ userId, raceId, driverId, constructorId, lobbyId })
        .returning();
      return created;
    }
  }

  async submitDriverResult(raceId: number, driverId: number, points: number, overtakes: number, fastestLap: boolean, position?: number): Promise<DriverResult> {
    const [existing] = await db.select().from(driverResults)
      .where(and(eq(driverResults.raceId, raceId), eq(driverResults.driverId, driverId)));

    if (existing) {
      const [updated] = await db.update(driverResults)
        .set({ points, overtakes, fastestLap, position: position ?? null })
        .where(eq(driverResults.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(driverResults)
        .values({ raceId, driverId, points, overtakes, fastestLap, position: position ?? null })
        .returning();
      return created;
    }
  }

  async submitConstructorResult(raceId: number, constructorId: number, points: number): Promise<ConstructorResult> {
    const [existing] = await db.select().from(constructorResults)
      .where(and(eq(constructorResults.raceId, raceId), eq(constructorResults.constructorId, constructorId)));

    if (existing) {
      const [updated] = await db.update(constructorResults)
        .set({ points })
        .where(eq(constructorResults.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(constructorResults)
        .values({ raceId, constructorId, points })
        .returning();
      return created;
    }
  }

  async bulkSubmitRaceResults(raceId: number, results: Array<{ driverId: number; position: number; points: number; overtakes: number; fastestLap: boolean }>): Promise<void> {
    for (const r of results) {
      await this.submitDriverResult(raceId, r.driverId, r.points, r.overtakes, r.fastestLap, r.position);
    }
    const allDrivers = await this.getDrivers();
    const teamPoints: Record<string, number> = {};
    for (const r of results) {
      const driver = allDrivers.find(d => d.id === r.driverId);
      if (driver) {
        teamPoints[driver.team] = (teamPoints[driver.team] || 0) + r.points;
      }
    }
    const allConstructors = await this.getConstructors();
    for (const [teamName, pts] of Object.entries(teamPoints)) {
      const constructor = allConstructors.find(c => c.name === teamName);
      if (constructor) {
        await this.submitConstructorResult(raceId, constructor.id, pts);
      }
    }
    await this.updateRaceStatus(raceId, true, true);
  }

  async getDriverResultsForRace(raceId: number): Promise<DriverResult[]> {
    return await db.select().from(driverResults).where(eq(driverResults.raceId, raceId));
  }

  async getConstructorResultsForRace(raceId: number): Promise<ConstructorResult[]> {
    return await db.select().from(constructorResults).where(eq(constructorResults.raceId, raceId));
  }

  async getDriverStandings(): Promise<Array<{ driverId: number; name: string; team: string; number: number | null; totalPoints: number; wins: number; podiums: number }>> {
    const allDrivers = await this.getDrivers();
    const allResults = await db.select().from(driverResults);
    return allDrivers.map(d => {
      const driverRes = allResults.filter(r => r.driverId === d.id);
      const totalPoints = driverRes.reduce((sum, r) => sum + r.points, 0);
      const wins = driverRes.filter(r => r.position === 1).length;
      const podiums = driverRes.filter(r => r.position !== null && r.position <= 3).length;
      return { driverId: d.id, name: d.name, team: d.team, number: d.number, totalPoints, wins, podiums };
    }).sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins);
  }

  async getConstructorStandings(): Promise<Array<{ constructorId: number; name: string; color: string | null; totalPoints: number }>> {
    const allConstructors = await this.getConstructors();
    const allResults = await db.select().from(constructorResults);
    return allConstructors.map(c => {
      const cRes = allResults.filter(r => r.constructorId === c.id);
      const totalPoints = cRes.reduce((sum, r) => sum + r.points, 0);
      return { constructorId: c.id, name: c.name, color: c.color, totalPoints };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async getRaceArchive(): Promise<Array<Race & { topResults?: DriverResult[] }>> {
    return await db.select().from(races).orderBy(asc(races.round), asc(races.date));
  }

  async getRaceDetails(raceId: number): Promise<{ race: Race; driverResults: Array<DriverResult & { driverName: string; driverTeam: string }>; constructorResults: Array<ConstructorResult & { constructorName: string }>; fastestLapDriver: string | null; totalOvertakes: number }> {
    const [race] = await db.select().from(races).where(eq(races.id, raceId));
    const dResults = await db.select().from(driverResults).where(eq(driverResults.raceId, raceId));
    const cResults = await db.select().from(constructorResults).where(eq(constructorResults.raceId, raceId));
    const allDrivers = await this.getDrivers();
    const allConstructors = await this.getConstructors();

    const enrichedDriverResults = dResults.map(r => {
      const driver = allDrivers.find(d => d.id === r.driverId);
      return { ...r, driverName: driver?.name || "Unknown", driverTeam: driver?.team || "Unknown" };
    }).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

    const enrichedConstructorResults = cResults.map(r => {
      const constructor = allConstructors.find(c => c.id === r.constructorId);
      return { ...r, constructorName: constructor?.name || "Unknown" };
    }).sort((a, b) => b.points - a.points);

    const fastestLapResult = dResults.find(r => r.fastestLap);
    const fastestLapDriver = fastestLapResult ? allDrivers.find(d => d.id === fastestLapResult.driverId)?.name || null : null;
    const totalOvertakes = dResults.reduce((sum, r) => sum + r.overtakes, 0);

    return { race, driverResults: enrichedDriverResults, constructorResults: enrichedConstructorResults, fastestLapDriver, totalOvertakes };
  }

  async getDriverLeaderboard(lobbyId: number): Promise<LeaderboardEntry[]> {
    const members = await this.getLobbyMembers(lobbyId);
    const memberIds = members.map(m => m.userId);
    if (memberIds.length === 0) return [];

    const allSelections = await db.select().from(selections).where(
      and(eq(selections.lobbyId, lobbyId), inArray(selections.userId, memberIds))
    );
    const allDriverResults = await db.select().from(driverResults);

    const leaderboard: LeaderboardEntry[] = members.map(m => ({
      userId: m.userId,
      username: m.username,
      teamName: m.teamName,
      avatarUrl: m.avatarUrl,
      totalPoints: 0,
    }));

    for (const sel of allSelections) {
      const dResult = allDriverResults.find(r => r.raceId === sel.raceId && r.driverId === sel.driverId);
      let points = 0;
      if (dResult) {
        points += dResult.points;
        points += dResult.overtakes;
        if (dResult.fastestLap) points += 2;
      }
      const entry = leaderboard.find(l => l.userId === sel.userId);
      if (entry) entry.totalPoints += points;
    }
    return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async getConstructorLeaderboard(lobbyId: number): Promise<LeaderboardEntry[]> {
    const members = await this.getLobbyMembers(lobbyId);
    const memberIds = members.map(m => m.userId);
    if (memberIds.length === 0) return [];

    const allSelections = await db.select().from(selections).where(
      and(eq(selections.lobbyId, lobbyId), inArray(selections.userId, memberIds))
    );
    const allConstructorResults = await db.select().from(constructorResults);

    const leaderboard: LeaderboardEntry[] = members.map(m => ({
      userId: m.userId,
      username: m.username,
      teamName: m.teamName,
      avatarUrl: m.avatarUrl,
      totalPoints: 0,
    }));

    for (const sel of allSelections) {
      const cResult = allConstructorResults.find(r => r.raceId === sel.raceId && r.constructorId === sel.constructorId);
      if (cResult) {
        const entry = leaderboard.find(l => l.userId === sel.userId);
        if (entry) entry.totalPoints += cResult.points;
      }
    }
    return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async getSelectionsForLobbyRace(lobbyId: number, raceId: number): Promise<Selection[]> {
    return await db.select().from(selections).where(
      and(eq(selections.lobbyId, lobbyId), eq(selections.raceId, raceId))
    );
  }

  async getDraftState(lobbyId: number, raceId: number): Promise<DraftState | undefined> {
    const [state] = await db.select().from(draftState).where(
      and(eq(draftState.lobbyId, lobbyId), eq(draftState.raceId, raceId))
    );
    return state;
  }

  async initializeDraft(lobbyId: number, raceId: number, orderUserIds: number[]): Promise<DraftState> {
    const existing = await this.getDraftState(lobbyId, raceId);
    if (existing) return existing;
    const [state] = await db.insert(draftState).values({
      lobbyId, raceId,
      draftOrder: JSON.stringify(orderUserIds),
      currentDrafterIndex: 0,
      isComplete: false,
    }).returning();
    return state;
  }

  async advanceDraft(lobbyId: number, raceId: number): Promise<DraftState> {
    const state = await this.getDraftState(lobbyId, raceId);
    if (!state) throw new Error("Draft not initialized");
    const order: number[] = JSON.parse(state.draftOrder);
    const nextIndex = state.currentDrafterIndex + 1;
    const isComplete = nextIndex >= order.length;
    const [updated] = await db.update(draftState)
      .set({ currentDrafterIndex: isComplete ? order.length : nextIndex, isComplete })
      .where(and(eq(draftState.id, state.id), eq(draftState.currentDrafterIndex, state.currentDrafterIndex)))
      .returning();
    if (!updated) throw new Error("Draft advance conflict");
    return updated;
  }

  async getDraftStatus(lobbyId: number, raceId: number, currentUserId: number): Promise<DraftStatus> {
    let state = await this.getDraftState(lobbyId, raceId);
    const members = await this.getLobbyMembers(lobbyId);

    if (!state) {
      const race = await this.getRace(raceId);
      if (!race) throw new Error("Race not found");

      const allRaces = await this.getRaces();
      const sortedRaces = allRaces.sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
      const anyCompletedRace = sortedRaces.some(r => r.isCompleted && (r.round ?? 0) < (race.round ?? 0));

      let orderUserIds: number[];

      if (anyCompletedRace) {
        const leaderboard = await this.getDriverLeaderboard(lobbyId);
        orderUserIds = [...leaderboard].reverse().map(l => l.userId);
        const missingMembers = members.filter(m => !orderUserIds.includes(m.userId));
        orderUserIds = [...missingMembers.map(m => m.userId), ...orderUserIds];
      } else {
        orderUserIds = members
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map(m => m.userId)
          .reverse();
      }

      if (orderUserIds.length === 0) {
        orderUserIds = members.map(m => m.userId);
      }

      state = await this.initializeDraft(lobbyId, raceId, orderUserIds);
    }

    const order: number[] = JSON.parse(state.draftOrder);
    const lobbySelections = await this.getSelectionsForLobbyRace(lobbyId, raceId);

    const takenDriverIds = lobbySelections.map(s => s.driverId);
    const takenConstructorIds = lobbySelections.map(s => s.constructorId);

    const draftOrderWithInfo = order.map(userId => {
      const member = members.find(m => m.userId === userId);
      const hasPicked = lobbySelections.some(s => s.userId === userId);
      return {
        userId,
        username: member?.username || "Unknown",
        teamName: member?.teamName || "Unknown",
        avatarUrl: member?.avatarUrl || null,
        hasPicked,
      };
    });

    const currentDrafterId = state.isComplete ? -1 : (order[state.currentDrafterIndex] ?? -1);
    const currentDrafter = members.find(m => m.userId === currentDrafterId);

    return {
      draftOrder: draftOrderWithInfo,
      currentDrafterIndex: state.currentDrafterIndex,
      currentDrafterId,
      currentDrafterName: currentDrafter?.username || "",
      isMyTurn: currentDrafterId === currentUserId,
      isComplete: state.isComplete,
      takenDriverIds,
      takenConstructorIds,
    };
  }

  async getUserUsageInfoInLobby(userId: number, lobbyId: number): Promise<UsageInfo> {
    const allSelections = await this.getSelectionsForUserInLobby(userId, lobbyId);
    const member = await this.getLobbyMember(userId, lobbyId);

    const driverUsage: Record<number, number> = {};
    const constructorUsage: Record<number, number> = {};

    for (const sel of allSelections) {
      driverUsage[sel.driverId] = (driverUsage[sel.driverId] || 0) + 1;
      constructorUsage[sel.constructorId] = (constructorUsage[sel.constructorId] || 0) + 1;
    }

    return {
      driverUsage,
      constructorUsage,
      driverJokersRemaining: member?.driverJokers ?? 0,
      constructorJokersRemaining: member?.constructorJokers ?? 0,
      jokersRemaining: (member?.driverJokers ?? 0) + (member?.constructorJokers ?? 0),
    };
  }

  async consumeDriverJoker(userId: number, lobbyId: number, count: number): Promise<LobbyMember> {
    const member = await this.getLobbyMember(userId, lobbyId);
    if (!member) throw new Error("Member not found");
    const [updated] = await db.update(lobbyMembers)
      .set({ driverJokers: member.driverJokers - count })
      .where(and(eq(lobbyMembers.userId, userId), eq(lobbyMembers.lobbyId, lobbyId)))
      .returning();
    return updated;
  }

  async consumeConstructorJoker(userId: number, lobbyId: number, count: number): Promise<LobbyMember> {
    const member = await this.getLobbyMember(userId, lobbyId);
    if (!member) throw new Error("Member not found");
    const [updated] = await db.update(lobbyMembers)
      .set({ constructorJokers: member.constructorJokers - count })
      .where(and(eq(lobbyMembers.userId, userId), eq(lobbyMembers.lobbyId, lobbyId)))
      .returning();
    return updated;
  }

  async consumeJokerInLobby(userId: number, lobbyId: number, count: number): Promise<LobbyMember> {
    const member = await this.getLobbyMember(userId, lobbyId);
    if (!member) throw new Error("Member not found");
    const [updated] = await db.update(lobbyMembers)
      .set({ jokerCount: member.jokerCount - count })
      .where(and(eq(lobbyMembers.userId, userId), eq(lobbyMembers.lobbyId, lobbyId)))
      .returning();
    return updated;
  }

  async getRaceFantasyWinners(lobbyId: number, raceId: number): Promise<RaceFantasyWinners> {
    const lobbySelections = await this.getSelectionsForLobbyRace(lobbyId, raceId);
    if (lobbySelections.length === 0) return { driverWinner: null, constructorWinner: null };

    const members = await this.getLobbyMembers(lobbyId);
    const allDriverResults = await db.select().from(driverResults).where(eq(driverResults.raceId, raceId));
    const allConstructorResults = await db.select().from(constructorResults).where(eq(constructorResults.raceId, raceId));
    const allDrivers = await this.getDrivers();
    const allConstructors = await this.getConstructors();

    let bestDriverPick: { userId: number; points: number; driverName: string } | null = null;
    let bestConstructorPick: { userId: number; points: number; constructorName: string } | null = null;

    for (const sel of lobbySelections) {
      const dResult = allDriverResults.find(r => r.driverId === sel.driverId);
      let dPoints = 0;
      if (dResult) {
        dPoints = dResult.points + dResult.overtakes + (dResult.fastestLap ? 2 : 0);
      }
      if (!bestDriverPick || dPoints > bestDriverPick.points) {
        const driver = allDrivers.find(d => d.id === sel.driverId);
        bestDriverPick = { userId: sel.userId, points: dPoints, driverName: driver?.name || "Unknown" };
      }

      const cResult = allConstructorResults.find(r => r.constructorId === sel.constructorId);
      let cPoints = cResult?.points || 0;
      if (!bestConstructorPick || cPoints > bestConstructorPick.points) {
        const constructor = allConstructors.find(c => c.id === sel.constructorId);
        bestConstructorPick = { userId: sel.userId, points: cPoints, constructorName: constructor?.name || "Unknown" };
      }
    }

    const driverMember = bestDriverPick ? members.find(m => m.userId === bestDriverPick!.userId) : null;
    const constructorMember = bestConstructorPick ? members.find(m => m.userId === bestConstructorPick!.userId) : null;

    return {
      driverWinner: bestDriverPick && driverMember ? {
        userId: bestDriverPick.userId,
        username: driverMember.username,
        teamName: driverMember.teamName,
        driverName: bestDriverPick.driverName,
        points: bestDriverPick.points,
      } : null,
      constructorWinner: bestConstructorPick && constructorMember ? {
        userId: bestConstructorPick.userId,
        username: constructorMember.username,
        teamName: constructorMember.teamName,
        constructorName: bestConstructorPick.constructorName,
        points: bestConstructorPick.points,
      } : null,
    };
  }

  async getLobbyRaceSelections(lobbyId: number, raceId: number): Promise<Array<{ userId: number; username: string; teamName: string; driverName: string; driverNumber: number | null; constructorName: string }>> {
    const lobbySelections = await this.getSelectionsForLobbyRace(lobbyId, raceId);
    if (lobbySelections.length === 0) return [];
    const members = await this.getLobbyMembers(lobbyId);
    const allDrivers = await this.getDrivers();
    const allConstructors = await this.getConstructors();

    return lobbySelections.map(sel => {
      const member = members.find(m => m.userId === sel.userId);
      const driver = allDrivers.find(d => d.id === sel.driverId);
      const constructor = allConstructors.find(c => c.id === sel.constructorId);
      return {
        userId: sel.userId,
        username: member?.username || "Unknown",
        teamName: member?.teamName || "Unknown",
        driverName: driver?.name || "Unknown",
        driverNumber: driver?.number || null,
        constructorName: constructor?.name || "Unknown",
      };
    });
  }
}

export const storage = new DatabaseStorage();
