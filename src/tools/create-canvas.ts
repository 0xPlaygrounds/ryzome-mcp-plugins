import { Type } from "@sinclair/typebox";
import { z } from "zod";
import { executeCanvasWithSteps } from "../lib/canvas-executor";
import type { StepInput } from "../lib/graph-builder";
import type { RyzomeClientConfig } from "../lib/ryzome-client";

export const createCanvasToolDef = {
	name: "create_ryzome_canvas",
	description:
		"Create a Ryzome canvas with explicitly defined nodes and edges.",
	parameters: Type.Object({
		title: Type.String({ description: "Canvas title" }),
		description: Type.Optional(
			Type.String({ description: "Canvas description" }),
		),
		nodes: Type.Array(
			Type.Object({
				id: Type.String({ description: "Unique node identifier" }),
				title: Type.String({ description: "Node title" }),
				description: Type.String({ description: "Node content" }),
			}),
			{ description: "Nodes to place on the canvas", minItems: 1 },
		),
		edges: Type.Optional(
			Type.Array(
				Type.Object({
					from: Type.String({ description: "Source node id" }),
					to: Type.String({ description: "Target node id" }),
					label: Type.Optional(Type.String({ description: "Edge label" })),
				}),
				{ description: "Edges connecting nodes" },
			),
		),
	}),
};

const createCanvasParamsSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	nodes: z
		.array(
			z.object({
				id: z.string(),
				title: z.string(),
				description: z.string(),
			}),
		)
		.min(1),
	edges: z
		.array(
			z.object({
				from: z.string(),
				to: z.string(),
				label: z.string().optional(),
			}),
		)
		.optional(),
});

export async function executeCreateCanvas(
	_id: string,
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = createCanvasParamsSchema.parse(rawParams);

	const edgesByTo = new Map<string, string[]>();
	for (const edge of params.edges ?? []) {
		const deps = edgesByTo.get(edge.to) ?? [];
		deps.push(edge.from);
		edgesByTo.set(edge.to, deps);
	}

	const steps: StepInput[] = params.nodes.map((node) => ({
		id: node.id,
		title: node.title,
		description: node.description,
		dependsOn: edgesByTo.get(node.id),
	}));

	return executeCanvasWithSteps(
		{ title: params.title, description: params.description, steps },
		clientConfig,
	);
}
