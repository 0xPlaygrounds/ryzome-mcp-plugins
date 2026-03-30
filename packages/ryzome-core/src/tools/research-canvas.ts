import { z } from "zod";
import { executeCanvasWithSteps } from "../lib/canvas-executor.js";
import type { StepInput } from "../lib/graph-builder.js";
import type { RyzomeClientConfig } from "../lib/ryzome-client.js";

export const researchCanvasToolName = "create_ryzome_research";
export const researchCanvasToolDescription =
	"Create a Ryzome canvas displaying research findings. " +
	"Control layout by setting dependsOn on findings (reference 'topic' for the root node or other finding ids).";

export const researchCanvasParamsSchema = z.object({
	title: z.string().describe("Canvas title"),
	description: z.string().optional().describe("Canvas description"),
	topic: z.string().describe("Root node title (auto-assigned id 'topic')"),
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
			}),
		)
		.min(1)
		.describe("Research findings"),
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
	};

	const findingSteps: StepInput[] = params.findings.map((f) => ({
		id: f.id,
		title: f.title,
		description: f.description,
		dependsOn: f.dependsOn,
	}));

	return executeCanvasWithSteps(
		{
			title: params.title,
			description: params.description,
			steps: [topicStep, ...findingSteps],
		},
		clientConfig,
	);
}
