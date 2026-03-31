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
        color: Type.Optional(
          Type.String({ description: "Step color as hex (e.g. '#FF6B6B')" }),
        ),
        group: Type.Optional(
          Type.String({ description: "ID of the group this step belongs to" }),
        ),
      }),
      { description: "Steps to chain into a plan", minItems: 1 },
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
        { description: "Groups that visually contain steps" },
      ),
    ),
  }),
};

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex string (e.g. '#FF6B6B')")
  .optional();

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
    return { id, title: s.title, description: s.description, dependsOn, color: s.color, group: s.group };
  });

  return executeCanvasWithSteps(
    { title: params.title, description: params.description, steps, groups: params.groups },
    clientConfig,
  );
}
