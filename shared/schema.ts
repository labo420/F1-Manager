import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const lobbies = pgTable("lobbies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  adminId: integer("admin_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lobbyMembers = pgTable("lobby_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  lobbyId: integer("lobby_id").references(() => lobbies.id).notNull(),
  teamName: text("team_name").notNull().default("TBD"),
  driverJollies: integer("driver_jokers").default(2).notNull(),
  constructorJollies: integer("constructor_jokers").default(2).notNull(),
  role: text("role").notNull().default("player"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  team: text("team").notNull(),
  number: integer("number"),
  isReserve: boolean("is_reserve").default(false).notNull(),
  originalDriverId: integer("original_driver_id"), // For reserve drivers inheriting history
});

export const constructors = pgTable("constructors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  color: text("color"),
});

export const races = pgTable("races", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  round: integer("round"),
  country: text("country"),
  circuitName: text("circuit_name"),
  circuitLength: text("circuit_length"),
  laps: integer("laps"),
  date: text("date").notNull(),
  fp1Date: text("fp1_date"), // Article 2 Deadline
  itaTime: text("ita_time"),
  hasSprint: boolean("has_sprint").default(false).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
});

export const selections = pgTable("selections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  raceId: integer("race_id").references(() => races.id).notNull(),
  driverId: integer("driver_id").references(() => drivers.id).notNull(),
  constructorId: integer("constructor_id").references(() => constructors.id).notNull(),
  lobbyId: integer("lobby_id").references(() => lobbies.id),
});

export const driverResults = pgTable("driver_results", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  raceId: integer("race_id").references(() => races.id).notNull(),
  driverId: integer("driver_id").references(() => drivers.id).notNull(),
  position: integer("position"),
  points: integer("points").default(0).notNull(),
  overtakes: integer("overtakes").default(0).notNull(),
  overtakesConceded: integer("overtakes_conceded").default(0).notNull(),
  fastestLap: boolean("fastest_lap").default(false).notNull(),
  isSprint: boolean("is_sprint").default(false).notNull(),
  qualifyingPosition: integer("qualifying_position"),
});

export const constructorResults = pgTable("constructor_results", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  raceId: integer("race_id").references(() => races.id).notNull(),
  constructorId: integer("constructor_id").references(() => constructors.id).notNull(),
  points: integer("points").default(0).notNull(),
});

export const draftState = pgTable("draft_state", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lobbyId: integer("lobby_id").references(() => lobbies.id).notNull(),
  raceId: integer("race_id").references(() => races.id).notNull(),
  draftOrder: text("draft_order").notNull(),
  currentDrafterIndex: integer("current_drafter_index").default(0).notNull(),
  isComplete: boolean("is_complete").default(false).notNull(),
});

export const userScores = pgTable("user_scores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  lobbyId: integer("lobby_id").references(() => lobbies.id).notNull(),
  raceId: integer("race_id").references(() => races.id).notNull(),
  driverPoints: integer("driver_points").default(0).notNull(),
  constructorPoints: integer("constructor_points").default(0).notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, avatarUrl: true, createdAt: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true });
export const insertConstructorSchema = createInsertSchema(constructors).omit({ id: true });
export const insertRaceSchema = createInsertSchema(races).omit({ id: true });
export const insertSelectionSchema = createInsertSchema(selections).omit({ id: true });
export const insertDriverResultSchema = createInsertSchema(driverResults).omit({ id: true });
export const insertConstructorResultSchema = createInsertSchema(constructorResults).omit({ id: true });
export const insertLobbyMemberSchema = createInsertSchema(lobbyMembers).omit({ id: true, createdAt: true }).extend({
  teamName: z.string().min(1, "Scuderia Name is required"),
});

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
  driverJollies: number;
  constructorJollies: number;
  role: string;
};

export type UsageInfo = {
  driverUsage: Record<number, number>;
  constructorUsage: Record<number, number>;
  driverJolliesRemaining: number;
  constructorJolliesRemaining: number;
  jolliesRemaining: number;
};

export type RaceFantasyWinners = {
  driverWinner: { userId: number; username: string; teamName: string; driverName: string; points: number } | null;
  constructorWinner: { userId: number; username: string; teamName: string; constructorName: string; points: number } | null;
};
