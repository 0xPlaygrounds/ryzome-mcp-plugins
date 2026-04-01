import { z } from "zod";
import { executeCanvasWithSteps } from "../lib/canvas-executor.js";
import type { StepInput } from "../lib/graph-builder.js";
import type { RyzomeClientConfig } from "../lib/ryzome-client.js";

export const researchCanvasToolName = "create_ryzome_research";
export const researchCanvasToolDescription =
	"Create a Ryzome canvas displaying research findings. " +
	"Control layout by setting dependsOn on findings (reference 'topic' for the root node or other finding ids).";

const hexColorSchema = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex string (e.g. '#FF6B6B')")
	.optional();

export const researchCanvasParamsSchema = z.object({
	title: z.string().describe("Canvas title"),
	description: z.string().optional().describe("Canvas description"),
	topic: z.string().describe("Root node title (auto-assigned id 'topic')"),
	topicColor: hexColorSchema.describe(
		"Root node color as hex (e.g. '#FF6B6B')",
	),
	findings: z
		.array(
			z.object({
				id: z.string().describe("Unique finding identifier"),
				title: z.string().describe("Finding title"),
				description: z.string().describe("Finding content"),
				dependsOn: z
					.array(z.string())
					.optional()
					.describe(
						"IDs of nodes this finding depends on (use 'topic' to connect to root)",
					),
				color: hexColorSchema.describe(
					"Finding color as hex (e.g. '#FF6B6B')",
				),
				group: z
					.string()
					.optional()
					.describe("ID of the group this finding belongs to"),
			}),
		)
		.min(1)
		.describe("Research findings"),
	groups: z
		.array(
			z.object({
				id: z.string().describe("Unique group identifier"),
				title: z
					.string()
					.optional()
					.describe("Group label displayed on the frame"),
				color: hexColorSchema.describe(
					"Group color as hex (e.g. '#4ECDC4')",
				),
			}),
		)
		.optional()
		.describe("Groups that visually contain findings"),
});

export async function executeResearchCanvas(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = researchCanvasParamsSchema.parse(rawParams);

	const topicStep: StepInput = {
		id: "topic",
		title: params.topic,
		description: params.topic,
		color: params.topicColor,
	};

	const findingSteps: StepInput[] = params.findings.map((f) => ({
		id: f.id,
		title: f.title,
		description: f.description,
		dependsOn: f.dependsOn,
		color: f.color,
		group: f.group,
	}));

	return executeCanvasWithSteps(
		{
			title: params.title,
			description: params.description,
			steps: [topicStep, ...findingSteps],
			groups: params.groups,
		},
		clientConfig,
	);
}
