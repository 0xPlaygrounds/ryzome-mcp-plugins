import { z } from "zod";
import { executeCanvasWithSteps } from "../lib/canvas-executor.js";
import type { StepInput, GroupInput } from "../lib/graph-builder.js";
import { objectIdStringSchema } from "../lib/ids.js";
import { provenanceSchema } from "../lib/provenance.js";
import type { RyzomeClientConfig } from "../lib/ryzome-client.js";

export const createCanvasToolName = "create_ryzome_canvas";
export const createCanvasToolDescription =
	"Create a Ryzome canvas with explicitly defined nodes and edges. " +
	"Nodes either create a new text document (title + description) or reference an existing document (documentId). " +
	"Positions are computed automatically unless x/y/width/height are given per node. " +
	"The result starts with a 'View: <url>' line — include that URL verbatim in your reply so the user can open the canvas.";

const hexColorSchema = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex string (e.g. '#FF6B6B')")
	.optional();

const canvasNodeInputSchema = z
	.object({
		id: z.string().describe("Unique node identifier (local to this call)"),
		nodeId: objectIdStringSchema
			.optional()
			.describe("Optional caller-supplied 24-hex id for the canvas node"),
		documentId: objectIdStringSchema
			.optional()
			.describe(
				"Reference an existing document by id instead of creating a new one",
			),
		title: z.string().optional().describe("Node title (new documents)"),
		description: z.string().optional().describe("Node content (new documents)"),
		color: hexColorSchema.describe("Node color as hex (e.g. '#FF6B6B')"),
		group: z
			.string()
			.optional()
			.describe("ID of the group this node belongs to"),
		x: z.number().optional().describe("Explicit x position (overrides layout)"),
		y: z.number().optional().describe("Explicit y position (overrides layout)"),
		width: z.number().positive().optional().describe("Explicit node width"),
		height: z.number().positive().optional().describe("Explicit node height"),
	})
	.superRefine((node, ctx) => {
		if (node.documentId) return;
		if (node.title === undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["title"],
				message: "title is required unless documentId is set",
			});
		}
		if (node.description === undefined) {
			ctx.addIssue({
				code: "custom",
				path: ["description"],
				message: "description is required unless documentId is set",
			});
		}
	});

export const createCanvasParamsSchema = z.object({
	id: objectIdStringSchema
		.optional()
		.describe("Optional caller-supplied 24-hex id for the canvas document"),
	title: z.string().describe("Canvas title"),
	description: z.string().optional().describe("Canvas description"),
	tags: z.array(z.string()).optional().describe("Canvas tags"),
	provenance: provenanceSchema.optional(),
	nodes: z
		.array(canvasNodeInputSchema)
		.min(1)
		.describe("Nodes to place on the canvas"),
	edges: z
		.array(
			z.object({
				id: objectIdStringSchema
					.optional()
					.describe("Optional caller-supplied 24-hex id for the edge"),
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
) {
	const params = createCanvasParamsSchema.parse(rawParams);

	const edgesByTo = new Map<string, string[]>();
	const edgeLabelsByTo = new Map<string, Record<string, string>>();
	const edgeIdsByTo = new Map<string, Record<string, string>>();
	for (const edge of params.edges ?? []) {
		const deps = edgesByTo.get(edge.to) ?? [];
		deps.push(edge.from);
		edgesByTo.set(edge.to, deps);
		if (edge.label) {
			const labels = edgeLabelsByTo.get(edge.to) ?? {};
			labels[edge.from] = edge.label;
			edgeLabelsByTo.set(edge.to, labels);
		}
		if (edge.id) {
			const ids = edgeIdsByTo.get(edge.to) ?? {};
			ids[edge.from] = edge.id;
			edgeIdsByTo.set(edge.to, ids);
		}
	}

	const steps: StepInput[] = params.nodes.map((node) => ({
		id: node.id,
		title: node.title ?? "",
		description: node.description ?? "",
		dependsOn: edgesByTo.get(node.id),
		edgeLabels: edgeLabelsByTo.get(node.id),
		edgeIds: edgeIdsByTo.get(node.id),
		color: node.color,
		group: node.group,
		documentId: node.documentId,
		nodeId: node.nodeId,
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
	}));

	const groups: GroupInput[] | undefined = params.groups;

	return executeCanvasWithSteps(
		{
			id: params.id,
			title: params.title,
			description: params.description,
			tags: params.tags,
			provenance: params.provenance,
			steps,
			groups,
		},
		clientConfig,
	);
}
