import "server-only";
import { Client, Storage } from "node-appwrite";
import { databases } from "./generated/appwrite";
import { API_KEY, ENDPOINT, PROJECT_ID } from "./generated/appwrite/constants";

/**
 * Typed table handles from `appwrite generate` (the ORM layer).
 * Runs with the server API key; tables grant no client permissions, so every
 * read and write goes through lib/data.ts and lib/actions, scoped by ownerId (the Clerk user id).
 */
export const db = databases.use("cafe");
export const tables = {
  settings: db.use("Settings"),
  categories: db.use("Menu categories"),
  items: db.use("Menu items"),
  invoices: db.use("Invoices"),
  invoiceEvents: db.use("Invoice history"),
};

/** File storage, same key. The photo bucket grants no client access; photos are served through an owner-checked route. */
export const storage = new Storage(new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY));
export const PHOTO_BUCKET = "item-photos";
