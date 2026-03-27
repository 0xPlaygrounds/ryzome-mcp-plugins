import { Type } from "@sinclair/typebox";
import { z } from "zod";
import { executeCanvasWithSteps } from "../lib/canvas-executor";
import type { StepInput } from "../lib/graph-builder";
import type { RyzomeClientConfig } from "../lib/ryzome-client";

export const researchCanvasToolDef = {
	name: "create_ryzome_research",
	description:
		"Create a Ryzome canvas displaying research findings. " +
		"Control layout by setting dependsOn on findings (reference 'topic' for the root node or other finding ids).",
	parameters: Type.Object({
		title: Type.String({ description: "Canvas title" }),
		description: Type.Optional(
			Type.String({ description: "Canvas description" }),
		),
		topic: Type.String({
			description: "Root node title (auto-assigned id 'topic')",
		}),
		findings: Type.Array(
			Type.Object({
				id: Type.String({ description: "Unique finding identifier" }),
				title: Type.String({ description: "Finding title" }),
				description: Type.String({ description: "Finding content" }),
				dependsOn: Type.Optional(
					Type.Array(Type.String(), {
						description:
							"IDs of nodes this finding depends on (use 'topic' to connect to root)",
					}),
				),
			}),
			{ description: "Research findings", minItems: 1 },
		),
	}),
};

const researchCanvasParamsSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	topic: z.string(),
	findings: z
		.array(
			z.object({
				id: z.string(),
				title: z.string(),
				description: z.string(),
				dependsOn: z.array(z.string()).optional(),
			}),
		)
		.min(1),
});

export async function executeResearchCanvas(
	_id: string,
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
