import { buildCanvasGraph, type StepInput, type GroupInput } from "./graph-builder";
import { RyzomeClient, type RyzomeClientConfig } from "./ryzome-client";
import { retryStage } from "./retry";

export async function executeCanvasWithSteps(
  params: { title: string; description?: string; steps: StepInput[]; groups?: GroupInput[] },
  clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const client = new RyzomeClient(clientConfig);

  const { canvas_id } = await client.createCanvas({
    name: params.title,
    description: params.description,
  });

  const canvasId = canvas_id.$oid;
  const graph = buildCanvasGraph(params.steps, canvasId, params.groups);

  await retryStage(() =>
    client.patchCanvas(canvasId, { operations: graph.operations }),
  );

  const appBase = clientConfig.appUrl.replace(/\/+$/, "");
  const canvasUrl = `${appBase}/view/${canvasId}`;

  const nodeCount = graph.operations.filter(
    (o) => o._type === "createNode",
  ).length;
  const edgeCount = graph.operations.filter(
    (o) => o._type === "createEdge",
  ).length;

  return {
    content: [
      {
        type: "text",
        text: [
          `Canvas created: **${params.title}**`,
          `Nodes: ${nodeCount} | Edges: ${edgeCount}`,
          `View: ${canvasUrl}`,
        ].join("\n"),
      },
    ],
  };
}
