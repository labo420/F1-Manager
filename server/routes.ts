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
import { findOpenF1Session, calculateOvertakesFromSession } from "./openf1";

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

  app.patch("/api/user/bio", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { bio } = z.object({ bio: z.string().max(1000).nullable() }).parse(req.body);
      const user = await storage.updateUserBio(req.session.userId, bio || "");
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
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
      res.status(201).json({ 
        success: true,
        code: lobby.code, 
        lobbyId: lobby.id,
        name: lobby.name,
        adminId: lobby.adminId
      });
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
      
      const lobby = await storage.getLobbyByCode(code);
      if (!lobby) return res.status(404).json({ message: "Lobby not found. Please check the invite code." });
      
      const already = await storage.isUserInLobby(req.session.userId, lobby.id);
      if (already) return res.status(409).json({ message: "You are already in this league" });
      
      const playerCount = await storage.getLobbyPlayerCount(lobby.id);
      if (playerCount >= 10) return res.status(409).json({ message: "Lobby is full (max 10 players)" });
      
      try {
        await storage.addLobbyMember(req.session.userId, lobby.id, "player", teamName);
        res.status(200).json({ success: true, lobbyId: lobby.id });
      } catch (dbErr) {
        console.error("Database error joining lobby:", dbErr);
        res.status(500).json({ message: "Failed to join the league. Please try again later." });
      }
    } catch (err) {
      console.error("Join lobby error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "An unexpected error occurred. Please try again." });
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

  app.get("/api/lobby/:lobbyId/race/:raceId/standings", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId);
    const raceId = Number(req.params.raceId);
    const inLobby = await storage.isUserInLobby(req.session.userId, lobbyId);
    if (!inLobby) return res.status(403).json({ message: "Not a member" });
    const standings = await storage.getRaceStandings(lobbyId, raceId);
    res.status(200).json(standings);
  });

  app.get("/api/races", async (_req, res) => {
    const raceList = await storage.getRaces();
    const now = new Date();
    const oneHourMs = 60 * 60 * 1000;
    for (const race of raceList) {
      const timeUntilRace = new Date(race.date).getTime() - now.getTime();
      if (!race.isLocked && !race.isCompleted && timeUntilRace > 0 && timeUntilRace <= oneHourMs) {
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
      
      // If unlocked by admin, allow picks regardless of deadline
      if (race.isLocked) {
        const now = new Date();
        const deadline = race.fp1Date ? new Date(race.fp1Date) : new Date(new Date(race.date).getTime() - 48 * 60 * 60 * 1000);
        if (now > deadline) return res.status(403).json({ message: "Draft is closed (FP1 has started)" });
        return res.status(403).json({ message: "Picks are locked" });
      }

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

      const usageInfo = await storage.getUserUsageInfoInLobby(req.session.userId, input.lobbyId);
      const driverUsageCount = usageInfo.driverUsage[input.driverId] || 0;
      const constructorUsageCount = usageInfo.constructorUsage[input.constructorId] || 0;

      // Article 3: Pool Constraints
      // Driver: Every driver at least once. 2 Jollies (max 2 picks per driver)
      if (driverUsageCount >= 2) {
        return res.status(400).json({ message: "You have already used this driver 2 times (limit reached with Jolly)." });
      }
      
      const isManualJolly = req.body.useJolly === true;

      if (driverUsageCount === 1 && !isManualJolly) {
        return res.status(400).json({ message: "This is your 2nd pick for this driver. You must click 'Use Jolly' to confirm." });
      }

      if (driverUsageCount === 1 && usageInfo.driverJolliesRemaining <= 0) {
        return res.status(400).json({ message: "No Driver Jollies remaining to pick this driver a second time." });
      }

      // Constructor: Exactly 2 times. 2 Jollies (allows a 3rd pick)
      if (constructorUsageCount >= 3) {
        return res.status(400).json({ message: "You have already used this constructor 3 times (limit reached with Jolly)." });
      }

      if (constructorUsageCount === 2 && !isManualJolly) {
        return res.status(400).json({ message: "This is your 3rd pick for this constructor. You must click 'Use Jolly' to confirm." });
      }

      if (constructorUsageCount === 2 && usageInfo.constructorJolliesRemaining <= 0) {
        return res.status(400).json({ message: "No Team Jollies remaining for a 3rd selection." });
      }

      // Obligated Picks logic (simplified for Fast Mode)
      const allRaces = await storage.getRaces();
      const remainingRaces = allRaces.filter(r => !r.isCompleted && new Date(r.date) >= new Date(race.date)).length;
      
      const allDrivers = await storage.getDrivers();
      const usedDriverIds = Object.keys(usageInfo.driverUsage).map(Number);
      const unusedDriversCount = allDrivers.length - usedDriverIds.length;
      
      if (unusedDriversCount === remainingRaces && !usedDriverIds.includes(input.driverId)) {
        // Enforcing pick if it's one of the last remaining unique drivers needed
      }

      const needsDriverJoker = driverUsageCount === 1;
      const needsConstructorJoker = constructorUsageCount === 2;

      const selection = await storage.upsertSelection(req.session.userId, input.raceId, input.driverId, input.constructorId, input.lobbyId);

      if (isManualJolly) {
        if (needsDriverJoker) {
          await storage.consumeDriverJoker(req.session.userId, input.lobbyId, 1);
        }
        if (needsConstructorJoker) {
          await storage.consumeConstructorJoker(req.session.userId, input.lobbyId, 1);
        }
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

  app.post("/api/admin/race/:id/finalize", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const memberships = await storage.getUserMemberships(req.session.userId);
      const isAnyAdmin = memberships.some(m => m.role === "admin");
      if (!isAnyAdmin) return res.status(403).json({ message: "Admin access required" });

      const raceId = Number(req.params.id);
      const race = await storage.getRace(raceId);
      if (!race) return res.status(404).json({ message: "Race not found" });

      await db.update(races).set({ isCompleted: true }).where(eq(races.id, raceId));
      res.status(200).json({ success: true, message: "Results finalized and standings updated." });
    } catch (err) {
      console.error("Finalize error:", err);
      res.status(500).json({ message: "Failed to finalize results" });
    }
  });

  app.get("/api/admin/race/:id/openf1-overtakes", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const memberships = await storage.getUserMemberships(req.session.userId);
      const isAnyAdmin = memberships.some(m => m.role === "admin");
      if (!isAnyAdmin) return res.status(403).json({ message: "Admin access required" });

      const raceId = Number(req.params.id);
      const race = await storage.getRace(raceId);
      if (!race) return res.status(404).json({ message: "Race not found" });

      const session = await findOpenF1Session(race.date, race.hasSprint && !!req.query.sprint);
      if (!session) {
        return res.status(404).json({ message: "Sessione OpenF1 non trovata. La gara potrebbe non essere ancora disponibile." });
      }

      const overtakesData = await calculateOvertakesFromSession(session.session_key);

      const allDrivers = await storage.getDrivers();

      const result = allDrivers
        .filter(d => d.number !== null && d.number !== undefined)
        .map(d => {
          const data = overtakesData[d.number!] ?? { overtakes: 0, overtakesConceded: 0 };
          return {
            driverId: d.id,
            driverName: d.name,
            driverNumber: d.number,
            overtakes: data.overtakes,
            overtakesConceded: data.overtakesConceded,
          };
        });

      res.json({ sessionKey: session.session_key, sessionName: session.session_name, circuit: session.circuit_short_name, results: result });
    } catch (err: any) {
      console.error("OpenF1 overtakes error:", err);
      res.status(500).json({ message: err?.message || "Errore nel recupero dati OpenF1" });
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
    const CONSTRUCTOR_NAME_MAP: Record<string, string> = {
      "Red Bull": "Red Bull Racing", "Racing Bulls": "RB", "RB F1 Team": "RB",
      "Haas F1 Team": "Haas", "Alpine F1 Team": "Alpine", "Cadillac F1 Team": "Cadillac",
    };
    const buildFromDb = async () => {
      try {
        return await storage.getDriverStandings();
      } catch {
        return [];
      }
    };
    try {
      const year = new Date().getFullYear();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      let standingsRes: Response | null = null;
      let resultsRes: Response | null = null;
      try {
        [standingsRes, resultsRes] = await Promise.all([
          fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings/?format=json&limit=100`, { signal: controller.signal }),
          fetch(`https://api.jolpi.ca/ergast/f1/${year}/results/?format=json&limit=500`, { signal: controller.signal }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
      if (!standingsRes?.ok) return res.json(await buildFromDb());
      const standingsData = await standingsRes.json() as any;
      const resultsData = resultsRes?.ok ? await resultsRes.json() as any : null;
      const apiStandings = standingsData.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
      if (apiStandings.length === 0) return res.json(await buildFromDb());

      const podiumsByCode: Record<string, number> = {};
      if (resultsData) {
        for (const race of resultsData.MRData?.RaceTable?.Races ?? []) {
          for (const result of race.Results ?? []) {
            if (parseInt(result.position) <= 3) {
              const code = result.Driver.code;
              podiumsByCode[code] = (podiumsByCode[code] || 0) + 1;
            }
          }
        }
      }

      const localDrivers = await storage.getDrivers();
      const matchedLocalIds = new Set<number>();
      const standings = apiStandings.map((s: any) => {
        const code: string = s.Driver.code;
        const fullName = `${s.Driver.givenName} ${s.Driver.familyName}`;
        const apiNumber = parseInt(s.Driver.permanentNumber);
        const local = localDrivers.find(d =>
          d.number === apiNumber || d.name.toLowerCase().includes(s.Driver.familyName.toLowerCase())
        );
        if (local) matchedLocalIds.add(local.id);
        const rawTeam: string = s.Constructors?.[0]?.name ?? "";
        return {
          driverId: local?.id ?? 0,
          name: local?.name ?? fullName,
          team: local?.team ?? (CONSTRUCTOR_NAME_MAP[rawTeam] || rawTeam),
          number: local?.number ?? (isNaN(apiNumber) ? null : apiNumber),
          totalPoints: parseFloat(s.points) || 0,
          wins: parseInt(s.wins) || 0,
          podiums: podiumsByCode[code] || 0,
        };
      });
      for (const d of localDrivers) {
        if (!matchedLocalIds.has(d.id)) {
          standings.push({ driverId: d.id, name: d.name, team: d.team, number: d.number, totalPoints: 0, wins: 0, podiums: 0 });
        }
      }
      res.json(standings);
    } catch {
      res.json(await buildFromDb());
    }
  });

  app.get("/api/f1/constructor-standings", async (_req, res) => {
    const CONSTRUCTOR_NAME_MAP: Record<string, string> = {
      "Red Bull": "Red Bull Racing", "Racing Bulls": "RB", "RB F1 Team": "RB",
      "Haas F1 Team": "Haas", "Alpine F1 Team": "Alpine", "Cadillac F1 Team": "Cadillac",
    };
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings/?format=json`);
      if (!response.ok) throw new Error("Jolpica standings unavailable");
      const data = await response.json() as any;
      const apiStandings = data.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
      if (apiStandings.length === 0) throw new Error("No standings data");

      const localConstructors = await storage.getConstructors();
      const standings = apiStandings.map((s: any) => {
        const rawName: string = s.Constructor.name;
        const name = CONSTRUCTOR_NAME_MAP[rawName] || rawName;
        const local = localConstructors.find(c => c.name.toLowerCase() === name.toLowerCase());
        return {
          constructorId: local?.id ?? 0,
          name: local?.name ?? name,
          color: local?.color ?? null,
          totalPoints: parseFloat(s.points) || 0,
        };
      });
      res.json(standings);
    } catch {
      res.json(await storage.getConstructorStandings());
    }
  });

  app.get("/api/f1/races", async (_req, res) => {
    const archive = await storage.getRaceArchive();
    res.json(archive);
  });

  app.get("/api/f1/race/:id/details", async (req, res) => {
    const TEAM_NAME_MAP: Record<string, string> = {
      "Red Bull": "Red Bull Racing", "Racing Bulls": "RB", "RB F1 Team": "RB",
      "Haas F1 Team": "Haas", "Alpine F1 Team": "Alpine", "Cadillac F1 Team": "Cadillac",
      "Kick Sauber": "Audi", "Sauber": "Audi", "Alfa Romeo": "Audi",
      "Aston Martin Aramco": "Aston Martin",
    };
    const normalizeTeam = (name: string) => TEAM_NAME_MAP[name] || name;

    try {
      const raceId = Number(req.params.id);
      const race = await storage.getRace(raceId);
      if (!race) return res.status(404).json({ message: "Race not found" });

      const year = new Date(race.date).getFullYear();
      const round = race.round;
      const externalRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results/?format=json`);

      if (externalRes.ok) {
        const externalData = await externalRes.json() as any;
        const raceResults = externalData.MRData?.RaceTable?.Races?.[0]?.Results;

        if (raceResults && raceResults.length > 0) {
          const localDrivers = await storage.getDrivers();
          const localConstructors = await storage.getConstructors();
          const constructorPoints: Record<string, number> = {};

          const driverResults = raceResults.map((r: any, idx: number) => {
            const driverNum = parseInt(r.number);
            const fullName = `${r.Driver.givenName} ${r.Driver.familyName}`;
            const teamName = normalizeTeam(r.Constructor.name);
            const local = localDrivers.find(d =>
              d.number === driverNum || d.name.toLowerCase().includes(r.Driver.familyName.toLowerCase())
            );
            const isRetired = ["R", "D", "E", "W", "F", "N"].includes(r.positionText);
            const pts = parseFloat(r.points) || 0;

            constructorPoints[teamName] = (constructorPoints[teamName] || 0) + pts;

            return {
              id: idx + 1,
              driverId: local?.id ?? 0,
              position: isRetired ? null : parseInt(r.position),
              points: pts,
              overtakes: 0,
              fastestLap: r.FastestLap?.rank === "1",
              driverName: local?.name ?? fullName,
              driverTeam: local?.team ?? teamName,
              time: r.Time?.time ?? null,
              gap: r.position === "1" ? null : (r.Time?.time ?? null),
              status: r.status ?? null,
            };
          });

          const constructorResults = Object.entries(constructorPoints).map(([name, points], idx) => {
            const local = localConstructors.find(c => c.name.toLowerCase() === name.toLowerCase());
            return { constructorId: local?.id ?? idx + 100, points, constructorName: local?.name ?? name };
          }).sort((a, b) => b.points - a.points);

          const fastestLapResult = raceResults.find((r: any) => r.FastestLap?.rank === "1");
          const fastestLapDriver = fastestLapResult
            ? `${fastestLapResult.Driver.givenName} ${fastestLapResult.Driver.familyName}`
            : null;

          return res.json({ race, driverResults, constructorResults, fastestLapDriver, totalOvertakes: 0 });
        }
      }

      // Fallback: local DB results
      const details = await storage.getRaceDetails(raceId);
      res.json(details);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch race details" });
    }
  });

  app.get("/api/f1/sessions-status", async (_req, res) => {
    try {
      const year = new Date().getFullYear();
      const [raceRes, qualRes] = await Promise.all([
        fetch(`https://api.openf1.org/v1/sessions?year=${year}&session_type=Race`),
        fetch(`https://api.openf1.org/v1/sessions?year=${year}&session_type=Qualifying`),
      ]);
      if (!raceRes.ok || !qualRes.ok) {
        return res.status(502).json({ message: "Failed to fetch sessions from OpenF1" });
      }
      const [raceSessions, qualSessions] = await Promise.all([raceRes.json(), qualRes.json()]);
      res.json({ raceSessions, qualSessions });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch session status" });
    }
  });

  app.get("/api/f1/race/:id/qualifying", async (req, res) => {
    try {
      const raceId = Number(req.params.id);
      const race = await storage.getRace(raceId);
      if (!race) return res.status(404).json({ message: "Race not found" });
      const year = new Date(race.date).getFullYear();
      const round = race.round;
      const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/qualifying/?format=json`);
      if (!response.ok) return res.status(502).json({ message: "Failed to fetch qualifying data" });
      const data = await response.json();
      const qualResults = data.MRData?.RaceTable?.Races?.[0]?.QualifyingResults;
      if (!qualResults || qualResults.length === 0) return res.json([]);
      const teamNameMap: Record<string, string> = {
        "Red Bull": "Red Bull Racing",
        "Racing Bulls": "RB",
        "RB F1 Team": "RB",
        "Kick Sauber": "Audi",
        "Sauber": "Audi",
        "Alfa Romeo": "Audi",
        "Haas F1 Team": "Haas",
        "Alpine F1 Team": "Alpine",
        "Cadillac F1 Team": "Cadillac",
        "Aston Martin Aramco": "Aston Martin",
      };
      const normalizeTeam = (name: string) => teamNameMap[name] || name;
      const parseQualTime = (t: string | undefined): number | null => {
        if (!t) return null;
        const parts = t.split(":");
        if (parts.length === 2) {
          return parseInt(parts[0]) * 60000 + parseFloat(parts[1]) * 1000;
        }
        return parseFloat(t) * 1000;
      };
      const formatGap = (ms: number): string => {
        const s = ms / 1000;
        return `+${s.toFixed(3)}`;
      };
      const mapped = qualResults.map((r: any) => ({
        position: parseInt(r.position),
        driverNumber: parseInt(r.number),
        driverCode: r.Driver.code || null,
        driverName: `${r.Driver.givenName} ${r.Driver.familyName}`,
        teamName: normalizeTeam(r.Constructor.name),
        q1: r.Q1 || null,
        q2: r.Q2 || null,
        q3: r.Q3 || null,
        bestTimeMs: parseQualTime(r.Q3) ?? parseQualTime(r.Q2) ?? parseQualTime(r.Q1),
      }));
      const poleMs = mapped[0]?.bestTimeMs ?? null;
      const withGaps = mapped.map((r: any) => ({
        ...r,
        gap: r.position === 1 || poleMs === null || r.bestTimeMs === null
          ? null
          : formatGap(r.bestTimeMs - poleMs),
        bestTimeMs: undefined,
      }));
      res.json(withGaps);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch qualifying results" });
    }
  });

  app.get("/api/f1/race/:id/sprint", async (req, res) => {
    try {
      const raceId = Number(req.params.id);
      const race = await storage.getRace(raceId);
      if (!race) return res.status(404).json({ message: "Race not found" });
      const year = new Date(race.date).getFullYear();
      const round = race.round;
      const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/sprint/?format=json`);
      if (!response.ok) return res.json([]);
      const data = await response.json();
      const sprintResults = data.MRData?.RaceTable?.Races?.[0]?.SprintResults;
      if (!sprintResults || sprintResults.length === 0) return res.json([]);
      const teamNameMap: Record<string, string> = {
        "Red Bull": "Red Bull Racing",
        "Racing Bulls": "RB",
        "RB F1 Team": "RB",
        "Kick Sauber": "Audi",
        "Sauber": "Audi",
        "Alfa Romeo": "Audi",
        "Haas F1 Team": "Haas",
        "Alpine F1 Team": "Alpine",
        "Cadillac F1 Team": "Cadillac",
        "Aston Martin Aramco": "Aston Martin",
      };
      const normalizeTeam = (name: string) => teamNameMap[name] || name;
      const mapped = sprintResults.map((r: any) => ({
        position: parseInt(r.position),
        driverNumber: parseInt(r.number),
        driverName: `${r.Driver.givenName} ${r.Driver.familyName}`,
        teamName: normalizeTeam(r.Constructor.name),
        time: r.Time?.time || null,
        gap: r.position === 1 ? null : (r.Time?.time ? `+${r.Time.time}` : null),
        status: r.status || null,
        points: parseFloat(r.points) || 0,
        fastestLap: r.FastestLap?.rank === "1",
      }));
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch sprint results" });
    }
  });

  app.get("/api/f1/race/:id/external-results", async (req, res) => {
    try {
      const raceId = Number(req.params.id);
      const race = await storage.getRace(raceId);
      if (!race) return res.status(404).json({ message: "Race not found" });
      const year = new Date(race.date).getFullYear();
      const round = race.round;
      const [raceRes, qualRes] = await Promise.all([
        fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results/?format=json`),
        fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/qualifying/?format=json`),
      ]);
      if (!raceRes.ok) return res.status(502).json({ message: "Failed to fetch race results" });
      const raceData = await raceRes.json();
      const raceResults = raceData.MRData?.RaceTable?.Races?.[0]?.Results;
      if (!raceResults || raceResults.length === 0) return res.json([]);
      let qualMap: Record<number, number> = {};
      if (qualRes.ok) {
        const qualData = await qualRes.json();
        const qualResults = qualData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [];
        qualResults.forEach((q: any) => {
          qualMap[parseInt(q.number)] = parseInt(q.position);
        });
      }
      const teamNameMap: Record<string, string> = {
        "Red Bull": "Red Bull Racing",
        "Racing Bulls": "RB",
        "RB F1 Team": "RB",
        "Kick Sauber": "Audi",
        "Sauber": "Audi",
        "Alfa Romeo": "Audi",
        "Haas F1 Team": "Haas",
        "Alpine F1 Team": "Alpine",
        "Cadillac F1 Team": "Cadillac",
        "Aston Martin Aramco": "Aston Martin",
      };
      const normalizeTeam = (name: string) => teamNameMap[name] || name;
      const mapped = raceResults.map((r: any) => {
        const driverNum = parseInt(r.number);
        return {
          position: r.positionText === "R" || r.positionText === "D" || r.positionText === "E" || r.positionText === "W" || r.positionText === "F" || r.positionText === "N" ? null : parseInt(r.position),
          driverNumber: driverNum,
          driverCode: r.Driver.code || null,
          driverName: `${r.Driver.givenName} ${r.Driver.familyName}`,
          teamName: normalizeTeam(r.Constructor.name),
          points: parseFloat(r.points) || 0,
          status: r.status,
          time: r.Time?.time || null,
          gap: r.position === "1" ? null : (r.Time?.time ? r.Time.time : r.status),
          fastestLap: r.FastestLap?.rank === "1",
          qualifyingPosition: qualMap[driverNum] || null,
          positionText: r.positionText,
        };
      });
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch external race results" });
    }
  });

  app.post("/api/user/avatar", upload.single("avatar"), async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await storage.updateUserAvatar(req.session.userId, avatarUrl);
    res.json(user);
  });

  app.patch("/api/user/avatar-url", async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { url } = z.object({ url: z.string().url() }).parse(req.body);
      const user = await storage.updateUserAvatar(req.session.userId, url);
      res.json(user);
    } catch {
      res.status(400).json({ message: "Invalid URL" });
    }
  });

  app.patch("/api/user/password", async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { currentPassword, newPassword } = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(1) }).parse(req.body);
      const user = await storage.getUser(req.session.userId);
      if (!user || user.password !== currentPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      await storage.updateUserPassword(req.session.userId, newPassword);
      res.json({ message: "Password updated" });
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.patch("/api/lobby/:id/image", async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = parseInt(req.params.id);
    if (isNaN(lobbyId)) return res.status(400).json({ message: "Invalid lobby ID" });
    try {
      const { url } = z.object({ url: z.string().url() }).parse(req.body);
      const isAdmin = await storage.isUserAdminOfLobby(req.session.userId, lobbyId);
      if (!isAdmin) return res.status(403).json({ message: "Admin access required" });
      const lobby = await storage.updateLobbyImage(lobbyId, url);
      res.json(lobby);
    } catch {
      res.status(400).json({ message: "Invalid URL" });
    }
  });

  app.post("/api/lobby/:id/image/upload", upload.single("image"), async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = parseInt(req.params.id);
    if (isNaN(lobbyId)) return res.status(400).json({ message: "Invalid lobby ID" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const isAdmin = await storage.isUserAdminOfLobby(req.session.userId, lobbyId);
    if (!isAdmin) return res.status(403).json({ message: "Admin access required" });
    const imageUrl = `/uploads/avatars/${req.file.filename}`;
    const lobby = await storage.updateLobbyImage(lobbyId, imageUrl);
    res.json(lobby);
  });

  app.delete("/api/lobby/:id", async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = parseInt(req.params.id);
    if (isNaN(lobbyId)) return res.status(400).json({ message: "Invalid lobby ID" });
    const isAdmin = await storage.isUserAdminOfLobby(req.session.userId, lobbyId);
    if (!isAdmin) return res.status(403).json({ message: "Admin access required" });
    await storage.deleteLobby(lobbyId);
    res.json({ message: "Lobby deleted successfully" });
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

  app.get("/api/admin/lobby/:lobbyId/race/:raceId/picks", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const lobbyId = Number(req.params.lobbyId);
    const raceId = Number(req.params.raceId);
    const isAdmin = await storage.isUserAdminOfLobby(req.session.userId, lobbyId);
    if (!isAdmin) return res.status(403).json({ message: "Admin access required" });
    const picks = await storage.getLobbyRaceSelections(lobbyId, raceId);
    res.json(picks);
  });

  app.post("/api/lobby/:lobbyId/use-jolly", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const lobbyId = Number(req.params.lobbyId);
      const member = await storage.getLobbyMember(req.session.userId, lobbyId);
      if (!member) return res.status(404).json({ message: "Member not found" });
      if (member.driverJollies + member.constructorJollies <= 0) return res.status(400).json({ message: "No jollies remaining" });
      
      const [updated] = await db.update(lobbyMembers)
        .set({ 
          driverJollies: member.driverJollies > 0 ? member.driverJollies - 1 : 0,
          constructorJollies: member.driverJollies <= 0 ? member.constructorJollies - 1 : member.constructorJollies
        })
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

  const driversNeedReseed = existingDrivers.length < 22 ||
    existingDrivers.some(d => d.name === "Max Verstappen" && d.number !== 3) ||
    existingDrivers.some(d => d.name === "Jack Doohan");

  const needsRaceReseed = existingRaces.length < 24 ||
    !racesHaveCircuitData ||
    !racesHaveItaTime ||
    existingRaces.some(r => r.name === "Australian Grand Prix" && r.circuitLength !== "5,278") ||
    existingRaces.some(r => r.name === "Austrian Grand Prix" && r.circuitLength !== "4,326") ||
    existingRaces.some(r => r.name === "Spanish Grand Prix (Madrid)" && r.circuitLength !== "5,416") ||
    existingRaces.some(r => r.name === "Saudi Arabian Grand Prix" && r.circuitLength !== "6,175");

  if (!driversNeedReseed && !needsRaceReseed) return;

  console.log("Seeding database with F1 2026 data...");

  if (driversNeedReseed) {
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
      { name: "Max Verstappen", team: "Red Bull Racing", number: 3 },
      { name: "Isack Hadjar", team: "Red Bull Racing", number: 6 },
      { name: "Lewis Hamilton", team: "Ferrari", number: 44 },
      { name: "Charles Leclerc", team: "Ferrari", number: 16 },
      { name: "Lando Norris", team: "McLaren", number: 1 },
      { name: "Oscar Piastri", team: "McLaren", number: 81 },
      { name: "George Russell", team: "Mercedes", number: 63 },
      { name: "Kimi Antonelli", team: "Mercedes", number: 12 },
      { name: "Fernando Alonso", team: "Aston Martin", number: 14 },
      { name: "Lance Stroll", team: "Aston Martin", number: 18 },
      { name: "Pierre Gasly", team: "Alpine", number: 10 },
      { name: "Franco Colapinto", team: "Alpine", number: 43 },
      { name: "Liam Lawson", team: "RB", number: 30 },
      { name: "Arvid Lindblad", team: "RB", number: 41 },
      { name: "Carlos Sainz", team: "Williams", number: 55 },
      { name: "Alex Albon", team: "Williams", number: 23 },
      { name: "Nico Hulkenberg", team: "Audi", number: 27 },
      { name: "Gabriel Bortoleto", team: "Audi", number: 5 },
      { name: "Oliver Bearman", team: "Haas", number: 87 },
      { name: "Esteban Ocon", team: "Haas", number: 31 },
      { name: "Sergio Pérez", team: "Cadillac", number: 11 },
      { name: "Valtteri Bottas", team: "Cadillac", number: 77 },
    ]);
  }
  if (needsRaceReseed || driversNeedReseed) {
    if (!driversNeedReseed && existingRaces.length > 0) {
      await db.delete(driverResults);
      await db.delete(constructorResults);
      await db.delete(selections);
      await db.delete(userScores);
      await db.delete(draftState);
      await db.delete(races);
    }
    const raceValues = getHardcodedRaces();
    if (raceValues.length > 0) {
      await db.insert(races).values(raceValues);
    }
  }

  console.log("F1 2026 database seeding completed.");
}

function getHardcodedRaces() {
  return [
    { name: "Australian Grand Prix", round: 1, country: "Australia", circuitName: "Albert Park Circuit", circuitLength: "5,278", laps: 58, date: "2026-03-08T04:00:00.000Z", itaTime: "05:00" },
    { name: "Chinese Grand Prix", round: 2, country: "China", circuitName: "Shanghai International Circuit", circuitLength: "5,451", laps: 56, date: "2026-03-15T07:00:00.000Z", itaTime: "08:00" },
    { name: "Japanese Grand Prix", round: 3, country: "Japan", circuitName: "Suzuka International Racing Course", circuitLength: "5,807", laps: 53, date: "2026-03-29T05:00:00.000Z", itaTime: "07:00" },
    { name: "Bahrain Grand Prix", round: 4, country: "Bahrain", circuitName: "Bahrain International Circuit", circuitLength: "5,412", laps: 57, date: "2026-04-12T15:00:00.000Z", itaTime: "17:00" },
    { name: "Saudi Arabian Grand Prix", round: 5, country: "Saudi Arabia", circuitName: "Jeddah Corniche Circuit", circuitLength: "6,175", laps: 50, date: "2026-04-19T17:00:00.000Z", itaTime: "19:00" },
    { name: "Miami Grand Prix", round: 6, country: "USA", circuitName: "Miami International Autodrome", circuitLength: "5,412", laps: 57, date: "2026-05-03T20:00:00.000Z", itaTime: "22:00" },
    { name: "Canadian Grand Prix", round: 7, country: "Canada", circuitName: "Circuit Gilles Villeneuve", circuitLength: "4,361", laps: 70, date: "2026-05-24T20:00:00.000Z", itaTime: "22:00" },
    { name: "Monaco Grand Prix", round: 8, country: "Monaco", circuitName: "Circuit de Monaco", circuitLength: "3,337", laps: 78, date: "2026-06-07T13:00:00.000Z", itaTime: "15:00" },
    { name: "Spanish Grand Prix", round: 9, country: "Spain", circuitName: "Circuit de Barcelona-Catalunya", circuitLength: "4,657", laps: 66, date: "2026-06-14T13:00:00.000Z", itaTime: "15:00" },
    { name: "Austrian Grand Prix", round: 10, country: "Austria", circuitName: "Red Bull Ring", circuitLength: "4,326", laps: 71, date: "2026-06-28T13:00:00.000Z", itaTime: "15:00" },
    { name: "British Grand Prix", round: 11, country: "UK", circuitName: "Silverstone Circuit", circuitLength: "5,891", laps: 52, date: "2026-07-05T14:00:00.000Z", itaTime: "16:00" },
    { name: "Belgian Grand Prix", round: 12, country: "Belgium", circuitName: "Circuit de Spa-Francorchamps", circuitLength: "7,004", laps: 44, date: "2026-07-19T13:00:00.000Z", itaTime: "15:00" },
    { name: "Hungarian Grand Prix", round: 13, country: "Hungary", circuitName: "Hungaroring", circuitLength: "4,381", laps: 70, date: "2026-07-26T13:00:00.000Z", itaTime: "15:00" },
    { name: "Dutch Grand Prix", round: 14, country: "Netherlands", circuitName: "Circuit Zandvoort", circuitLength: "4,259", laps: 72, date: "2026-08-23T13:00:00.000Z", itaTime: "15:00" },
    { name: "Italian Grand Prix", round: 15, country: "Italy", circuitName: "Autodromo Nazionale Monza", circuitLength: "5,793", laps: 53, date: "2026-09-06T13:00:00.000Z", itaTime: "15:00" },
    { name: "Spanish Grand Prix (Madrid)", round: 16, country: "Spain", circuitName: "Circuito de Madrid", circuitLength: "5,416", laps: 57, date: "2026-09-13T13:00:00.000Z", itaTime: "15:00" },
    { name: "Azerbaijan Grand Prix", round: 17, country: "Azerbaijan", circuitName: "Baku City Circuit", circuitLength: "6,003", laps: 51, date: "2026-09-26T11:00:00.000Z", itaTime: "13:00" },
    { name: "Singapore Grand Prix", round: 18, country: "Singapore", circuitName: "Marina Bay Street Circuit", circuitLength: "4,927", laps: 62, date: "2026-10-11T12:00:00.000Z", itaTime: "14:00" },
    { name: "United States Grand Prix", round: 19, country: "USA", circuitName: "Circuit of the Americas", circuitLength: "5,513", laps: 56, date: "2026-10-25T20:00:00.000Z", itaTime: "21:00" },
    { name: "Mexico City Grand Prix", round: 20, country: "Mexico", circuitName: "Autodromo Hermanos Rodriguez", circuitLength: "4,304", laps: 71, date: "2026-11-01T20:00:00.000Z", itaTime: "21:00" },
    { name: "Sao Paulo Grand Prix", round: 21, country: "Brazil", circuitName: "Autodromo Jose Carlos Pace", circuitLength: "4,309", laps: 71, date: "2026-11-08T17:00:00.000Z", itaTime: "18:00" },
    { name: "Las Vegas Grand Prix", round: 22, country: "USA", circuitName: "Las Vegas Strip Circuit", circuitLength: "6,201", laps: 50, date: "2026-11-21T04:00:00.000Z", itaTime: "05:00" },
    { name: "Qatar Grand Prix", round: 23, country: "Qatar", circuitName: "Lusail International Circuit", circuitLength: "5,419", laps: 57, date: "2026-11-29T16:00:00.000Z", itaTime: "17:00" },
    { name: "Abu Dhabi Grand Prix", round: 24, country: "UAE", circuitName: "Yas Marina Circuit", circuitLength: "5,281", laps: 58, date: "2026-12-06T13:00:00.000Z", itaTime: "14:00" },
  ];
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
