import { z } from "zod";
import { objectIdStringSchema } from "../lib/ids.js";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import {
	formatStructureReport,
	verifyDocumentStructure,
} from "../lib/verify-structure.js";

export const verifyStructureToolName = "verify_ryzome_structure";
export const verifyStructureToolDescription =
	"Read back a Ryzome bundle or canvas and report its structure: member/node/edge counts, " +
	"unavailable members or nodes (NotFound, Unauthorized, Error), edges missing labels, and edges " +
	"referencing unknown node ids. Read-only; makes no changes.";

export const verifyStructureParamsSchema = z.object({
	rootId: objectIdStringSchema.describe(
		"ID of the bundle or canvas document to verify",
	),
});

export async function executeVerifyStructure(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = verifyStructureParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const document = await client.getDocument(params.rootId);
	const report = verifyDocumentStructure(document);

	return {
		content: [{ type: "text" as const, text: formatStructureReport(report) }],
		structuredContent: report,
	};
}
