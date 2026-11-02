import { z } from "zod";

export const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

/** A 24-character hex MongoDB ObjectId string. */
export const objectIdStringSchema = z
	.string()
	.regex(OBJECT_ID_PATTERN, "Must be a 24-character hex ObjectId");

export function isObjectIdString(value: unknown): value is string {
	return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}
