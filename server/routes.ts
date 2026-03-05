import type { Express } from "express";
import type { Server } from "http";
import { storage, setupSession } from "./storage";
import { z } from "zod";
import { db } from "./db";
import { lobbies, users, drivers, constructors, races, driverResults, constructorResults, selections, lobbyMembers, draftState, userScores } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import multer from "multer";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.resolve("uploads/avatars");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, _file, cb) => {
      const ext = path.extname(_file.originalname) || ".png";
      cb(null, `${req.session.userId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP allowed"));
  },
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupSession(app);

  const express = await import("express");
  app.use("/uploads", (req: any, res: any, next: any) => {
    res.setHeader("Cache-Control", "public, max-age=31536000");
    next();
  }, express.static(path.resolve("uploads")));

  app.post("/api/register", async (req, res) => {
    try {
      const input = z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(input);
      req.session.userId = user.id;
      const memberships = await storage.getUserMemberships(user.id);
      res.status(201).json({ ...user, memberships });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const input = z.object({ username: z.string(), password: z.string() }).parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      if (!user || user.password !== input.password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.session.userId = user.id;
      const memberships = await storage.getUserMemberships(user.id);
      res.status(200).json({ ...user, memberships });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Could not log out" });
      res.status(200).json({ success: true });
    });
  });

  app.get("/api/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const memberships = await storage.getUserMemberships(user.id);
    res.status(200).json({ ...user, memberships });
  });

  app.post("/api/lobby", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { name, teamName } = z.object({ 
        name: z.string().min(1),
        teamName: z.string().min(1)
      }).parse(req.body);
      const code = `F1-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const lobby = await storage.createLobby(name, code, req.session.userId, teamName);
      res.status(201).json({ code: lobby.code, lobbyId: lobby.id });
    } catch (err) {
      console.error("Create lobby error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/lobby/join", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { code, teamName } = z.object({ 
        code: z.string().min(4).max(10),
        teamName: z.string().min(1)
      }).parse(req.body);
      const cleanCode = code.trim().toUpperCase();
      const lobby = await storage.getLobbyByCode(cleanCode);
      if (!lobby) return res.status(404).json({ message: "Lobby not found" });
      const already = await storage.isUserInLobby(req.session.userId, lobby.id);
      if (already) return res.status(409).json({ message: "You are already in this league" });
      const playerCount = await storage.getLobbyPlayerCount(lobby.id);
      if (playerCount >= 10) return res.status(409).json({ message: "Lobby is full (max 10 players)" });
      await storage.addLobbyMember(req.session.userId, lobby.id, "player", teamName);
      res.status(200).json({ success: true, lobbyId: lobby.id });
    } catch (err) {
      console.error("Join lobby error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/lobby/:lobbyId/team-name", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const lobbyId = Number(req.params.lobbyId);
      const { teamName } = z.object({ teamName: z.string().min(1) }).parse(req.body);
      const member = await storage.updateMemberTeamName(req.session.userId, lobbyId, teamName);
      res.json(member);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get("/api/lobby/:lobbyId", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId);
    const inLobby = await storage.isUserInLobby(req.session.userId, lobbyId);
    if (!inLobby) return res.status(403).json({ message: "Not a member of this lobby" });
    const [lobby] = await db.select().from(lobbies).where(eq(lobbies.id, lobbyId));
    if (!lobby) return res.status(404).json({ message: "Lobby not found" });
    res.json(lobby);
  });

  app.get("/api/lobby/:lobbyId/members", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId);
    const inLobby = await storage.isUserInLobby(req.session.userId, lobbyId);
    if (!inLobby) return res.status(403).json({ message: "Not a member" });
    const members = await storage.getLobbyMembers(lobbyId);
    res.json(members);
  });

  app.get("/api/leaderboard/:lobbyId/drivers", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId);
    const inLobby = await storage.isUserInLobby(req.session.userId, lobbyId);
    if (!inLobby) return res.status(403).json({ message: "Not a member" });
    const leaderboard = await storage.getDriverLeaderboard(lobbyId);
    res.status(200).json(leaderboard);
  });

  app.get("/api/leaderboard/:lobbyId/constructors", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId);
    const inLobby = await storage.isUserInLobby(req.session.userId, lobbyId);
    if (!inLobby) return res.status(403).json({ message: "Not a member" });
    const leaderboard = await storage.getConstructorLeaderboard(lobbyId);
    res.status(200).json(leaderboard);
  });

  app.get("/api/races", async (_req, res) => {
    const raceList = await storage.getRaces();
    const now = new Date();
    const oneHourMs = 60 * 60 * 1000;
    for (const race of raceList) {
      if (!race.isLocked && !race.isCompleted && new Date(race.date).getTime() - now.getTime() <= oneHourMs) {
        await storage.updateRaceStatus(race.id, true);
        race.isLocked = true;
      }
    }
    res.status(200).json(raceList);
  });

  app.get("/api/drivers", async (_req, res) => {
    const driverList = await storage.getDrivers();
    res.status(200).json(driverList);
  });

  app.get("/api/constructors", async (_req, res) => {
    const constructorList = await storage.getConstructors();
    res.status(200).json(constructorList);
  });

  app.get("/api/selections/:lobbyId/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId);
    const sels = await storage.getSelectionsForUserInLobby(req.session.userId, lobbyId);
    res.status(200).json(sels);
  });

  app.post("/api/selections", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const input = z.object({
        raceId: z.number(),
        driverId: z.number(),
        constructorId: z.number(),
        lobbyId: z.number(),
      }).parse(req.body);

      const race = await storage.getRace(input.raceId);
      if (!race) return res.status(404).json({ message: "Race not found" });
      const now = new Date();
      const autoLocked = !race.isLocked && new Date(race.date).getTime() - now.getTime() <= 60 * 60 * 1000;
      if (autoLocked) await storage.updateRaceStatus(race.id, true);
      if (race.isLocked || autoLocked) return res.status(403).json({ message: "Picks are locked" });

      const inLobby = await storage.isUserInLobby(req.session.userId, input.lobbyId);
      if (!inLobby) return res.status(403).json({ message: "Not a member of this lobby" });

      const draftStatus = await storage.getDraftStatus(input.lobbyId, input.raceId, req.session.userId);
      if (draftStatus.isComplete) return res.status(403).json({ message: "Draft is complete for this race" });
      if (!draftStatus.isMyTurn) return res.status(403).json({ message: `It's not your turn. Waiting for ${draftStatus.currentDrafterName} to pick.` });

      if (draftStatus.takenDriverIds.includes(input.driverId)) {
        return res.status(400).json({ message: "This driver has already been picked by another player" });
      }
      if (draftStatus.takenConstructorIds.includes(input.constructorId)) {
        return res.status(400).json({ message: "This constructor has already been picked by another player" });
      }

      const allUserSelections = await storage.getSelectionsForUserInLobby(req.session.userId, input.lobbyId);
      const existingForRace = allUserSelections.find(s => s.raceId === input.raceId);

      const usageInfo = await storage.getUserUsageInfoInLobby(req.session.userId, input.lobbyId);

      const driverUsageCount = usageInfo.driverUsage[input.driverId] || 0;
      const constructorUsageCount = usageInfo.constructorUsage[input.constructorId] || 0;

      // Rule: Max 3 times. 3rd time costs a Joker.
      if (driverUsageCount >= 3) return res.status(400).json({ message: "You have already used this driver 3 times in this lobby." });
      if (constructorUsageCount >= 3) return res.status(400).json({ message: "You have already used this constructor 3 times in this lobby." });

      const needsDriverJoker = driverUsageCount === 2;
      const needsConstructorJoker = constructorUsageCount === 2;

      if (needsDriverJoker && usageInfo.driverJokersRemaining <= 0) {
        return res.status(400).json({ message: "No Driver Jollies remaining for the 3rd selection." });
      }
      if (needsConstructorJoker && usageInfo.constructorJokersRemaining <= 0) {
        return res.status(400).json({ message: "No Team Jollies remaining for the 3rd selection." });
      }

      const selection = await storage.upsertSelection(req.session.userId, input.raceId, input.driverId, input.constructorId, input.lobbyId);

      if (needsDriverJoker) {
        await storage.consumeDriverJoker(req.session.userId, input.lobbyId, 1);
      }
      if (needsConstructorJoker) {
        await storage.consumeConstructorJoker(req.session.userId, input.lobbyId, 1);
      }

      await storage.advanceDraft(input.lobbyId, input.raceId);
      res.status(200).json(selection);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Selection error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/draft/:lobbyId/:raceId", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const lobbyId = Number(req.params.lobbyId);
      const raceId = Number(req.params.raceId);
      const inLobby = await storage.isUserInLobby(req.session.userId, lobbyId);
      if (!inLobby) return res.status(403).json({ message: "Not a member" });
      const draftStatus = await storage.getDraftStatus(lobbyId, raceId, req.session.userId);
      res.status(200).json(draftStatus);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/usage/:lobbyId", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const lobbyId = Number(req.params.lobbyId);
      const usageInfo = await storage.getUserUsageInfoInLobby(req.session.userId, lobbyId);
      res.status(200).json(usageInfo);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const requireLobbyAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId || req.body?.lobbyId);
    if (!lobbyId) return res.status(400).json({ message: "Lobby ID required" });
    const isAdmin = await storage.isUserAdminOfLobby(req.session.userId, lobbyId);
    if (!isAdmin) return res.status(403).json({ message: "Admin access required" });
    next();
  };

  app.patch("/api/races/:id/status", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const input = z.object({ isLocked: z.boolean().optional(), isCompleted: z.boolean().optional() }).parse(req.body);
      const raceId = Number(req.params.id);
      const memberships = await storage.getUserMemberships(req.session.userId);
      const isAnyAdmin = memberships.some(m => m.role === "admin");
      if (!isAnyAdmin) return res.status(403).json({ message: "Admin access required" });
      const race = await storage.updateRaceStatus(raceId, input.isLocked, input.isCompleted);
      res.status(200).json(race);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/admin/race/:id/bulk-results", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const memberships = await storage.getUserMemberships(req.session.userId);
      const isAnyAdmin = memberships.some(m => m.role === "admin");
      if (!isAnyAdmin) return res.status(403).json({ message: "Admin access required" });

      const raceId = Number(req.params.id);
      const race = await storage.getRace(raceId);
      if (!race) return res.status(404).json({ message: "Race not found" });

      const schema = z.object({
        results: z.array(z.object({
          driverId: z.number(),
          position: z.number().min(1).max(20),
          points: z.number().min(0),
          overtakes: z.number().min(0),
          fastestLap: z.boolean(),
        }))
      });
      const { results, lobbyId } = schema.extend({ lobbyId: z.number().optional() }).parse(req.body);
      await storage.bulkSubmitRaceResults(raceId, results, lobbyId);
      res.status(200).json({ success: true, message: "Official results saved." });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Bulk results error:", err);
      res.status(500).json({ message: "Failed to save results" });
    }
  });

  app.get("/api/results/race/:id", async (req, res) => {
    try {
      const raceId = Number(req.params.id);
      const drResults = await storage.getDriverResultsForRace(raceId);
      const conResults = await storage.getConstructorResultsForRace(raceId);
      res.json({ driverResults: drResults, constructorResults: conResults });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  app.get("/api/f1/driver-standings", async (_req, res) => {
    const standings = await storage.getDriverStandings();
    res.json(standings);
  });

  app.get("/api/f1/constructor-standings", async (_req, res) => {
    const standings = await storage.getConstructorStandings();
    res.json(standings);
  });

  app.get("/api/f1/races", async (_req, res) => {
    const archive = await storage.getRaceArchive();
    res.json(archive);
  });

  app.get("/api/f1/race/:id/details", async (req, res) => {
    try {
      const raceId = Number(req.params.id);
      const details = await storage.getRaceDetails(raceId);
      if (!details.race) return res.status(404).json({ message: "Race not found" });
      res.json(details);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch race details" });
    }
  });

  app.post("/api/user/avatar", upload.single("avatar"), async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await storage.updateUserAvatar(req.session.userId, avatarUrl);
    res.json(user);
  });

  app.get("/api/lobby/:lobbyId/race/:raceId/fantasy-winners", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId);
    const raceId = Number(req.params.raceId);
    const inLobby = await storage.isUserInLobby(req.session.userId, lobbyId);
    if (!inLobby) return res.status(403).json({ message: "Not a member" });
    const winners = await storage.getRaceFantasyWinners(lobbyId, raceId);
    res.json(winners);
  });

  app.get("/api/lobby/:lobbyId/race/:raceId/picks", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId);
    const raceId = Number(req.params.raceId);
    const inLobby = await storage.isUserInLobby(req.session.userId, lobbyId);
    if (!inLobby) return res.status(403).json({ message: "Not a member" });
    const race = await storage.getRace(raceId);
    if (!race) return res.status(404).json({ message: "Race not found" });
    if (!race.isLocked && !race.isCompleted) {
      return res.status(403).json({ message: "Picks are not yet visible (race not locked)" });
    }
    const picks = await storage.getLobbyRaceSelections(lobbyId, raceId);
    res.json(picks);
  });

  app.post("/api/lobby/:lobbyId/use-jolly", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const lobbyId = Number(req.params.lobbyId);
      const member = await storage.getLobbyMember(req.session.userId, lobbyId);
      if (!member) return res.status(404).json({ message: "Member not found" });
      if (member.jolliesRemaining <= 0) return res.status(400).json({ message: "No jollies remaining" });
      
      const [updated] = await db.update(lobbyMembers)
        .set({ jolliesRemaining: member.jolliesRemaining - 1 })
        .where(and(eq(lobbyMembers.userId, req.session.userId), eq(lobbyMembers.lobbyId, lobbyId)))
        .returning();
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  seedDatabase().catch(console.error);

  return httpServer;
}

const ITA_RACE_TIMES: Record<number, string> = {
  1: "05:00", 2: "08:00", 3: "07:00", 4: "17:00", 5: "19:00",
  6: "22:00", 7: "22:00", 8: "15:00", 9: "15:00", 10: "15:00",
  11: "16:00", 12: "15:00", 13: "15:00", 14: "15:00", 15: "15:00",
  16: "15:00", 17: "13:00", 18: "14:00", 19: "21:00", 20: "21:00",
  21: "18:00", 22: "05:00", 23: "17:00", 24: "14:00",
};

function getUtcFromItaTime(raceDate: Date, itaTimeStr: string): Date {
  const [hours, minutes] = itaTimeStr.split(":").map(Number);
  const year = raceDate.getFullYear();
  const month = raceDate.getMonth();
  const day = raceDate.getDate();

  const lastSunMar = new Date(year, 2, 31);
  while (lastSunMar.getDay() !== 0) lastSunMar.setDate(lastSunMar.getDate() - 1);
  const lastSunOct = new Date(year, 9, 31);
  while (lastSunOct.getDay() !== 0) lastSunOct.setDate(lastSunOct.getDate() - 1);

  const isCEST = raceDate >= lastSunMar && raceDate < lastSunOct;
  const offset = isCEST ? 2 : 1;

  const utc = new Date(Date.UTC(year, month, day, hours - offset, minutes));
  return utc;
}

async function seedDatabase() {
  const existingDrivers = await storage.getDrivers();
  const existingRaces = await storage.getRaces();
  const racesHaveItaTime = existingRaces.length > 0 && existingRaces[0]?.itaTime;
  const racesHaveCircuitData = existingRaces.length > 0 && existingRaces[0]?.circuitName;

  if (existingDrivers.length >= 20 && existingRaces.length >= 24 && racesHaveCircuitData && racesHaveItaTime) return;

  console.log("Seeding database with F1 2026 data...");

  if (existingDrivers.length < 20) {
    await db.delete(driverResults);
    await db.delete(constructorResults);
    await db.delete(selections);
    await db.delete(drivers);
    await db.delete(constructors);
    await db.delete(races);

    await db.insert(constructors).values([
      { name: "Red Bull Racing", color: "#3671C6" },
      { name: "Ferrari", color: "#E8002D" },
      { name: "McLaren", color: "#FF8000" },
      { name: "Mercedes", color: "#27F4D2" },
      { name: "Aston Martin", color: "#229971" },
      { name: "Alpine", color: "#FF87BC" },
      { name: "RB", color: "#6692FF" },
      { name: "Williams", color: "#64C4FF" },
      { name: "Audi", color: "#ff3300" },
      { name: "Haas", color: "#B6BABD" },
      { name: "Cadillac", color: "#d1d1d1" },
    ]);

    await db.insert(drivers).values([
      { name: "Max Verstappen", team: "Red Bull Racing", number: 1 },
      { name: "Liam Lawson", team: "Red Bull Racing", number: 30 },
      { name: "Lewis Hamilton", team: "Ferrari", number: 44 },
      { name: "Charles Leclerc", team: "Ferrari", number: 16 },
      { name: "Lando Norris", team: "McLaren", number: 4 },
      { name: "Oscar Piastri", team: "McLaren", number: 81 },
      { name: "George Russell", team: "Mercedes", number: 63 },
      { name: "Kimi Antonelli", team: "Mercedes", number: 12 },
      { name: "Fernando Alonso", team: "Aston Martin", number: 14 },
      { name: "Lance Stroll", team: "Aston Martin", number: 18 },
      { name: "Pierre Gasly", team: "Alpine", number: 10 },
      { name: "Jack Doohan", team: "Alpine", number: 7 },
      { name: "Yuki Tsunoda", team: "RB", number: 22 },
      { name: "Isack Hadjar", team: "RB", number: 6 },
      { name: "Carlos Sainz", team: "Williams", number: 55 },
      { name: "Alex Albon", team: "Williams", number: 23 },
      { name: "Nico Hulkenberg", team: "Audi", number: 27 },
      { name: "Gabriel Bortoleto", team: "Audi", number: 5 },
      { name: "Oliver Bearman", team: "Haas", number: 87 },
      { name: "Esteban Ocon", team: "Haas", number: 31 },
    ]);
  }

  const needsRaceReseed = existingRaces.length < 24 || existingRaces.some(r => !r.circuitName) || !racesHaveItaTime || existingRaces.some(r => r.name === "Australian Grand Prix" && r.circuitLength !== "5,278");
  if (needsRaceReseed) {
    if (existingRaces.length > 0) {
      await db.delete(driverResults);
      await db.delete(constructorResults);
      await db.delete(selections);
      await db.delete(userScores);
      await db.delete(draftState);
      await db.delete(races);
    }
    const raceValues = parseCalendarCSV();
    await db.insert(races).values(raceValues);
  }

  console.log("F1 2026 database seeding completed.");
}

const CIRCUIT_NAMES: Record<string, string> = {
  "australia": "Albert Park Circuit",
  "china": "Shanghai International Circuit",
  "japan": "Suzuka International Racing Course",
  "bahrain": "Bahrain International Circuit",
  "saudi arabia": "Jeddah Corniche Circuit",
  "miami": "Miami International Autodrome",
  "canada": "Circuit Gilles Villeneuve",
  "monaco": "Circuit de Monaco",
  "barcelona - catalunya": "Circuit de Barcelona-Catalunya",
  "austria": "Red Bull Ring",
  "great britain": "Silverstone Circuit",
  "belgium": "Circuit de Spa-Francorchamps",
  "hungary": "Hungaroring",
  "netherlands": "Circuit Zandvoort",
  "italy": "Autodromo Nazionale Monza",
  "spain": "Circuito de Madrid",
  "azerbaijan": "Baku City Circuit",
  "singapore": "Marina Bay Street Circuit",
  "united states": "Circuit of the Americas",
  "mexico": "Autodromo Hermanos Rodriguez",
  "brazil": "Autodromo Jose Carlos Pace",
  "las vegas": "Las Vegas Strip Circuit",
  "qatar": "Lusail International Circuit",
  "abu dhabi": "Yas Marina Circuit",
};

const GP_NAMES: Record<string, { name: string; country: string }> = {
  "australia": { name: "Australian Grand Prix", country: "Australia" },
  "china": { name: "Chinese Grand Prix", country: "China" },
  "japan": { name: "Japanese Grand Prix", country: "Japan" },
  "bahrain": { name: "Bahrain Grand Prix", country: "Bahrain" },
  "saudi arabia": { name: "Saudi Arabian Grand Prix", country: "Saudi Arabia" },
  "miami": { name: "Miami Grand Prix", country: "USA" },
  "canada": { name: "Canadian Grand Prix", country: "Canada" },
  "monaco": { name: "Monaco Grand Prix", country: "Monaco" },
  "barcelona - catalunya": { name: "Spanish Grand Prix", country: "Spain" },
  "austria": { name: "Austrian Grand Prix", country: "Austria" },
  "great britain": { name: "British Grand Prix", country: "UK" },
  "belgium": { name: "Belgian Grand Prix", country: "Belgium" },
  "hungary": { name: "Hungarian Grand Prix", country: "Hungary" },
  "netherlands": { name: "Dutch Grand Prix", country: "Netherlands" },
  "italy": { name: "Italian Grand Prix", country: "Italy" },
  "spain": { name: "Spanish Grand Prix (Madrid)", country: "Spain" },
  "azerbaijan": { name: "Azerbaijan Grand Prix", country: "Azerbaijan" },
  "singapore": { name: "Singapore Grand Prix", country: "Singapore" },
  "united states": { name: "United States Grand Prix", country: "USA" },
  "mexico": { name: "Mexico City Grand Prix", country: "Mexico" },
  "brazil": { name: "Sao Paulo Grand Prix", country: "Brazil" },
  "las vegas": { name: "Las Vegas Grand Prix", country: "USA" },
  "qatar": { name: "Qatar Grand Prix", country: "Qatar" },
  "abu dhabi": { name: "Abu Dhabi Grand Prix", country: "UAE" },
};

function parseCalendarCSV() {
  const csvPath = path.resolve("attached_assets", "Nuovo_Foglio_di_lavoro_di_Microsoft_Excel_1772619582302.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter(l => l.trim().length > 0);
  const dataLines = lines.slice(1);

  const MONTH_MAP: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  const raceValues: Array<{
    name: string; round: number; country: string; circuitName: string;
    circuitLength: string | null; laps: number | null; date: string; itaTime: string;
  }> = [];

  dataLines.forEach((line, idx) => {
    const parts = line.split(";").map(s => s.trim());
    const dateStr = parts[0];
    const gpKey = parts[1]?.toLowerCase();
    const lengthRaw = parts[2];
    const lapsRaw = parts[3];

    const dateMatch = dateStr.match(/(\d{1,2})\s+(?:to\s+\d{1,2}\s+)?(\w{3})/i)
      || dateStr.match(/(\d{1,2})\s+(\w{3})\s+to/i);
    if (!dateMatch) return;

    let endDayMatch = dateStr.match(/to\s+(\d{1,2})\s+(\w{3})/i);
    if (!endDayMatch) {
      endDayMatch = dateStr.match(/(\d{1,2})\s+(\w{3})$/i);
    }

    const raceDay = endDayMatch ? endDayMatch[1] : dateMatch[1];
    const raceMonth = endDayMatch ? endDayMatch[2].toLowerCase() : dateMatch[2].toLowerCase();
    const monthNum = MONTH_MAP[raceMonth];
    if (!monthNum) return;

    const paddedDay = raceDay.padStart(2, "0");
    const roundNumber = idx + 1;
    const itaTime = ITA_RACE_TIMES[roundNumber] || "15:00";

    const tempDate = new Date(`2026-${monthNum}-${paddedDay}T12:00:00Z`);
    const raceDate = getUtcFromItaTime(tempDate, itaTime);

    const gp = GP_NAMES[gpKey];
    if (!gp) return;

    const circuitName = CIRCUIT_NAMES[gpKey] || gp.name;
    const circuitLength = lengthRaw ? lengthRaw.replace(/\s*km\s*/i, "").trim() || null : null;
    const laps = lapsRaw ? parseInt(lapsRaw, 10) || null : null;

    raceValues.push({
      name: gp.name,
      round: roundNumber,
      country: gp.country,
      circuitName,
      circuitLength,
      laps,
      date: raceDate.toISOString(),
      itaTime,
    });
  });

  return raceValues;
}
