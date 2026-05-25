import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const attendanceType = pgEnum("attendance_type", ["entry", "exit"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    barcodeToken: text("barcode_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    barcodeTokenUq: uniqueIndex("users_barcode_token_uq").on(t.barcodeToken),
    emailIdx: index("users_email_idx").on(t.email),
  }),
);

export const attendanceLogs = pgTable(
  "attendance_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: attendanceType("type").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    autoClosed: boolean("auto_closed").notNull().default(false),
  },
  (t) => ({
    userTimeIdx: index("attendance_logs_user_time_idx").on(t.userId, t.timestamp),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type NewAttendanceLog = typeof attendanceLogs.$inferInsert;
