import { z } from "zod";
import { executeCanvasWithSteps } from "../lib/canvas-executor.js";
import type { StepInput } from "../lib/graph-builder.js";
import { objectIdStringSchema } from "../lib/ids.js";
import { provenanceSchema } from "../lib/provenance.js";
import type { RyzomeClientConfig } from "../lib/ryzome-client.js";

export const planCanvasToolName = "create_ryzome_plan";
export const planCanvasToolDescription =
	"Create a Ryzome canvas from a plan. " +
	"Steps are auto-chained in order by default; optionally set id and dependsOn to express branching or merging. " +
	"The result starts with a 'View: <url>' line — include that URL verbatim in your reply so the user can open the canvas.";

const hexColorSchema = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex string (e.g. '#FF6B6B')")
	.optional();

export const planCanvasParamsSchema = z.object({
	id: objectIdStringSchema
		.optional()
		.describe("Optional caller-supplied 24-hex id for the canvas document"),
	title: z.string().describe("Canvas title"),
	description: z.string().optional().describe("Canvas description"),
	tags: z.array(z.string()).optional().describe("Canvas tags"),
	provenance: provenanceSchema.optional(),
	steps: z
		.array(
			z.object({
				id: z
					.string()
					.optional()
					.describe("Step identifier (defaults to step-{index})"),
				title: z.string().describe("Step title"),
				description: z.string().describe("Step description / content"),
				dependsOn: z
					.array(z.string())
					.optional()
					.describe(
						"IDs of steps this step depends on (defaults to previous step)",
					),
				nodeId: objectIdStringSchema
					.optional()
					.describe("Optional caller-supplied 24-hex id for the canvas node"),
				color: hexColorSchema.describe("Step color as hex (e.g. '#FF6B6B')"),
				group: z
					.string()
					.optional()
					.describe("ID of the group this step belongs to"),
			}),
		)
		.min(1)
		.describe("Steps to chain into a plan"),
	groups: z
		.array(
			z.object({
				id: z.string().describe("Unique group identifier"),
				title: z
					.string()
					.optional()
					.describe("Group label displayed on the frame"),
				color: hexColorSchema.describe("Group color as hex (e.g. '#4ECDC4')"),
			}),
		)
		.optional()
		.describe("Groups that visually contain steps"),
});

export async function executePlanCanvas(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = planCanvasParamsSchema.parse(rawParams);

	const resolvedIds = params.steps.map((s, i) => s.id ?? `step-${i}`);

	const steps: StepInput[] = params.steps.map((s, i) => {
		const id = resolvedIds[i];
		const dependsOn = s.dependsOn ?? (i > 0 ? [resolvedIds[i - 1]] : undefined);
		return {
			id,
			title: s.title,
			description: s.description,
			dependsOn,
			nodeId: s.nodeId,
			color: s.color,
			group: s.group,
		};
	});

	return executeCanvasWithSteps(
		{
			id: params.id,
			title: params.title,
			description: params.description,
			tags: params.tags,
			provenance: params.provenance,
			steps,
			groups: params.groups,
		},
		clientConfig,
	);
}
