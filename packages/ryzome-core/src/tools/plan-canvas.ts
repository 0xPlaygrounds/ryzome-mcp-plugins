import { z } from "zod";
import { executeCanvasWithSteps } from "../lib/canvas-executor.js";
import type { StepInput } from "../lib/graph-builder.js";
import type { RyzomeClientConfig } from "../lib/ryzome-client.js";

export const planCanvasToolName = "create_ryzome_plan";
export const planCanvasToolDescription =
	"Create a Ryzome canvas from a plan. " +
	"Steps are auto-chained in order by default; optionally set id and dependsOn to express branching or merging.";

export const planCanvasParamsSchema = z.object({
	title: z.string().describe("Canvas title"),
	description: z.string().optional().describe("Canvas description"),
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
			}),
		)
		.min(1)
		.describe("Steps to chain into a plan"),
});

export async function executePlanCanvas(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = planCanvasParamsSchema.parse(rawParams);

	const resolvedIds = params.steps.map((s, i) => s.id ?? `step-${i}`);

	const steps: StepInput[] = params.steps.map((s, i) => {
		const id = resolvedIds[i];
		const dependsOn = s.dependsOn ?? (i > 0 ? [resolvedIds[i - 1]] : undefined);
		return { id, title: s.title, description: s.description, dependsOn };
	});

	return executeCanvasWithSteps(
		{ title: params.title, description: params.description, steps },
		clientConfig,
	);
}
