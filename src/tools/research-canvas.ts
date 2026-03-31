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
    topicColor: Type.Optional(
      Type.String({ description: "Root node color as hex (e.g. '#FF6B6B')" }),
    ),
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
        color: Type.Optional(
          Type.String({ description: "Finding color as hex (e.g. '#FF6B6B')" }),
        ),
        group: Type.Optional(
          Type.String({ description: "ID of the group this finding belongs to" }),
        ),
      }),
      { description: "Research findings", minItems: 1 },
    ),
    groups: Type.Optional(
      Type.Array(
        Type.Object({
          id: Type.String({ description: "Unique group identifier" }),
          title: Type.Optional(
            Type.String({ description: "Group label displayed on the frame" }),
          ),
          color: Type.Optional(
            Type.String({ description: "Group color as hex (e.g. '#4ECDC4')" }),
          ),
        }),
        { description: "Groups that visually contain findings" },
      ),
    ),
  }),
};

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex string (e.g. '#FF6B6B')")
  .optional();

const researchCanvasParamsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  topic: z.string(),
  topicColor: hexColorSchema,
  findings: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        dependsOn: z.array(z.string()).optional(),
        color: hexColorSchema,
        group: z.string().optional(),
      }),
    )
    .min(1),
  groups: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        color: hexColorSchema,
      }),
    )
    .optional(),
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
