import { z } from "zod";
import { executeCanvasWithSteps } from "../lib/canvas-executor.js";
import type { StepInput, GroupInput } from "../lib/graph-builder.js";
import type { RyzomeClientConfig } from "../lib/ryzome-client.js";

export const createCanvasToolName = "create_ryzome_canvas";
export const createCanvasToolDescription =
	"Create a Ryzome canvas with explicitly defined nodes and edges.";

const hexColorSchema = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex string (e.g. '#FF6B6B')")
	.optional();

export const createCanvasParamsSchema = z.object({
	title: z.string().describe("Canvas title"),
	description: z.string().optional().describe("Canvas description"),
	nodes: z
		.array(
			z.object({
				id: z.string().describe("Unique node identifier"),
				title: z.string().describe("Node title"),
				description: z.string().describe("Node content"),
				color: hexColorSchema.describe("Node color as hex (e.g. '#FF6B6B')"),
				group: z
					.string()
					.optional()
					.describe("ID of the group this node belongs to"),
			}),
		)
		.min(1)
		.describe("Nodes to place on the canvas"),
	edges: z
		.array(
			z.object({
				from: z.string().describe("Source node id"),
				to: z.string().describe("Target node id"),
				label: z.string().optional().describe("Edge label"),
			}),
		)
		.optional()
		.describe("Edges connecting nodes"),
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
		.describe(
			"Groups that visually contain nodes. Nodes reference a group by its id.",
		),
});

export async function executeCreateCanvas(
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
		color: node.color,
		group: node.group,
	}));

	const groups: GroupInput[] | undefined = params.groups;

	return executeCanvasWithSteps(
		{ title: params.title, description: params.description, steps, groups },
		clientConfig,
	);
}
