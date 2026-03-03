import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const lobbies = sqliteTable("lobbies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  adminId: integer("admin_id").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const lobbyMembers = sqliteTable("lobby_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  lobbyId: integer("lobby_id").references(() => lobbies.id).notNull(),
  teamName: text("team_name").notNull().default("TBD"),
  jokerCount: integer("joker_count").default(4).notNull(),
  driverJokers: integer("driver_jokers").default(4).notNull(),
  constructorJokers: integer("constructor_jokers").default(4).notNull(),
  role: text("role").notNull().default("player"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const drivers = sqliteTable("drivers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  team: text("team").notNull(),
  number: integer("number"),
});

export const constructors = sqliteTable("constructors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color"),
});

export const races = sqliteTable("races", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  round: integer("round"),
  country: text("country"),
  circuitName: text("circuit_name"),
  circuitLength: text("circuit_length"),
  laps: integer("laps"),
  date: text("date").notNull(),
  itaTime: text("ita_time"),
  isLocked: integer("is_locked", { mode: "boolean" }).default(false).notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" }).default(false).notNull(),
});

export const selections = sqliteTable("selections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  raceId: integer("race_id").references(() => races.id).notNull(),
  driverId: integer("driver_id").references(() => drivers.id).notNull(),
  constructorId: integer("constructor_id").references(() => constructors.id).notNull(),
  lobbyId: integer("lobby_id").references(() => lobbies.id),
});

export const driverResults = sqliteTable("driver_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  raceId: integer("race_id").references(() => races.id).notNull(),
  driverId: integer("driver_id").references(() => drivers.id).notNull(),
  position: integer("position"),
  points: integer("points").default(0).notNull(),
  overtakes: integer("overtakes").default(0).notNull(),
  fastestLap: integer("fastest_lap", { mode: "boolean" }).default(false).notNull(),
});

export const constructorResults = sqliteTable("constructor_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  raceId: integer("race_id").references(() => races.id).notNull(),
  constructorId: integer("constructor_id").references(() => constructors.id).notNull(),
  points: integer("points").default(0).notNull(),
});

export const draftState = sqliteTable("draft_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lobbyId: integer("lobby_id").references(() => lobbies.id).notNull(),
  raceId: integer("race_id").references(() => races.id).notNull(),
  draftOrder: text("draft_order").notNull(),
  currentDrafterIndex: integer("current_drafter_index").default(0).notNull(),
  isComplete: integer("is_complete", { mode: "boolean" }).default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, avatarUrl: true, createdAt: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true });
export const insertConstructorSchema = createInsertSchema(constructors).omit({ id: true });
export const insertRaceSchema = createInsertSchema(races).omit({ id: true });
export const insertSelectionSchema = createInsertSchema(selections).omit({ id: true });
export const insertDriverResultSchema = createInsertSchema(driverResults).omit({ id: true });
export const insertConstructorResultSchema = createInsertSchema(constructorResults).omit({ id: true });
export const insertLobbyMemberSchema = createInsertSchema(lobbyMembers).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type Lobby = typeof lobbies.$inferSelect;
export type LobbyMember = typeof lobbyMembers.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Constructor = typeof constructors.$inferSelect;
export type Race = typeof races.$inferSelect;
export type Selection = typeof selections.$inferSelect;
export type DriverResult = typeof driverResults.$inferSelect;
export type ConstructorResult = typeof constructorResults.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSelection = z.infer<typeof insertSelectionSchema>;
export type InsertDriverResult = z.infer<typeof insertDriverResultSchema>;
export type InsertConstructorResult = z.infer<typeof insertConstructorResultSchema>;
export type InsertLobbyMember = z.infer<typeof insertLobbyMemberSchema>;
export type DraftState = typeof draftState.$inferSelect;

export type Membership = {
  lobbyId: number;
  lobbyName: string;
  lobbyCode: string;
  teamName: string;
  jokerCount: number;
  driverJokers: number;
  constructorJokers: number;
  role: string;
};

export type LeaderboardEntry = {
  userId: number;
  username: string;
  teamName: string;
  avatarUrl: string | null;
  totalPoints: number;
};

export type DriverLeaderboardEntry = LeaderboardEntry;
export type ConstructorLeaderboardEntry = LeaderboardEntry;

export type DraftStatus = {
  draftOrder: Array<{ userId: number; username: string; teamName: string; avatarUrl: string | null; hasPicked: boolean }>;
  currentDrafterIndex: number;
  currentDrafterId: number;
  currentDrafterName: string;
  isMyTurn: boolean;
  isComplete: boolean;
  takenDriverIds: number[];
  takenConstructorIds: number[];
};

export type UsageInfo = {
  driverUsage: Record<number, number>;
  constructorUsage: Record<number, number>;
  driverJokersRemaining: number;
  constructorJokersRemaining: number;
  jokersRemaining: number;
};

export type RaceFantasyWinners = {
  driverWinner: { userId: number; username: string; teamName: string; driverName: string; points: number } | null;
  constructorWinner: { userId: number; username: string; teamName: string; constructorName: string; points: number } | null;
};
