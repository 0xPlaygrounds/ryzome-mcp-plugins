import { Type } from "@sinclair/typebox";
import { z } from "zod";
import { executeCanvasWithSteps } from "../lib/canvas-executor";
import type { StepInput } from "../lib/graph-builder";
import type { RyzomeClientConfig } from "../lib/ryzome-client";

export const planCanvasToolDef = {
	name: "create_ryzome_plan",
	description:
		"Create a Ryzome canvas from a plan. " +
		"Steps are auto-chained in order by default; optionally set id and dependsOn to express branching or merging.",
	parameters: Type.Object({
		title: Type.String({ description: "Canvas title" }),
		description: Type.Optional(
			Type.String({ description: "Canvas description" }),
		),
		steps: Type.Array(
			Type.Object({
				id: Type.Optional(
					Type.String({
						description: "Step identifier (defaults to step-{index})",
					}),
				),
				title: Type.String({ description: "Step title" }),
				description: Type.String({ description: "Step description / content" }),
				dependsOn: Type.Optional(
					Type.Array(Type.String(), {
						description:
							"IDs of steps this step depends on (defaults to previous step)",
					}),
				),
			}),
			{ description: "Steps to chain into a plan", minItems: 1 },
		),
	}),
};

const planCanvasParamsSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	steps: z
		.array(
			z.object({
				id: z.string().optional(),
				title: z.string(),
				description: z.string(),
				dependsOn: z.array(z.string()).optional(),
			}),
		)
		.min(1),
});

export async function executePlanCanvas(
	_id: string,
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
