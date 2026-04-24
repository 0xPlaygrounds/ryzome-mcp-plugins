import { pathToFileURL } from "node:url";
import {
	parseConfig,
	RyzomeApiError,
	toolRegistry,
	type RyzomeClientConfig,
} from "@ryzome-ai/ryzome-core";
import { z } from "zod";

// Validates the stdin payload before any tool runs so malformed input produces a
// clear RunnerFailure instead of failing deep inside a tool.execute call.
const runnerInputSchema = z.object({
	toolName: z.string(),
	params: z.unknown(),
	config: z.record(z.string(), z.unknown()).optional(),
});

export type RunnerInput = z.infer<typeof runnerInputSchema>;

export interface RunnerSuccess {
	ok: true;
	toolName: string;
	content: Array<{ type: "text"; text: string }>;
}

export interface RunnerFailure {
	ok: false;
	toolName?: string;
	error: {
		name: string;
		message: string;
		stage?: string;
		status?: number;
		retryable?: boolean;
		body?: string;
		canvasId?: string;
		documentId?: string;
	};
}

export type RunnerOutput = RunnerSuccess | RunnerFailure;

function notConfiguredError(): RunnerFailure {
	return {
		ok: false,
			error: {
				name: "ConfigError",
				message:
					"Ryzome API key not configured. Set `RYZOME_API_KEY` or create `~/.hermes/ryzome.json`.",
			},
	};
}

function serializeError(error: unknown, toolName?: string): RunnerFailure {
	if (error instanceof RyzomeApiError) {
		return {
			ok: false,
			toolName,
			error: {
				name: error.name,
				message: error.message,
				stage: error.stage,
				status: error.status,
				retryable: error.retryable,
				body: error.body,
				canvasId: error.canvasId,
				documentId: error.documentId,
			},
		};
	}

	if (error instanceof Error) {
		return {
			ok: false,
			toolName,
			error: {
				name: error.name,
				message: error.message,
			},
		};
	}

	return {
		ok: false,
		toolName,
		error: {
			name: "Error",
			message: String(error),
		},
	};
}

function resolveClientConfig(
	rawConfig: Record<string, unknown> | undefined,
): RyzomeClientConfig | null {
	const resolved = parseConfig(rawConfig ?? {});
	if (!resolved.apiKey) {
		return null;
	}

	return {
		apiKey: resolved.apiKey,
		apiUrl: resolved.apiUrl,
		appUrl: resolved.appUrl,
	};
}

export async function runTool(input: RunnerInput): Promise<RunnerOutput> {
	const tool = toolRegistry.find((candidate) => candidate.name === input.toolName);
	if (!tool) {
		return {
			ok: false,
			toolName: input.toolName,
			error: {
				name: "UnknownToolError",
				message: `Unknown Ryzome tool: ${input.toolName}`,
			},
		};
	}

	const clientConfig = resolveClientConfig(input.config);
	if (!clientConfig) {
		return notConfiguredError();
	}

	try {
		const result = await tool.execute(input.params, clientConfig);
		return {
			ok: true,
			toolName: tool.name,
			content: result.content,
		};
	} catch (error) {
		return serializeError(error, tool.name);
	}
}

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
	try {
		const rawInput = (await readStdin()).trim();
		if (!rawInput) {
			console.log(
				JSON.stringify({
					ok: false,
					error: {
						name: "InputError",
						message: "Expected a JSON payload on stdin.",
					},
				} satisfies RunnerFailure),
			);
			return;
		}

		const parsed = runnerInputSchema.safeParse(JSON.parse(rawInput));
		if (!parsed.success) {
			console.log(
				JSON.stringify({
					ok: false,
					error: {
						name: "InputError",
						message: `Invalid runner payload: ${parsed.error.message}`,
					},
				} satisfies RunnerFailure),
			);
			return;
		}
		const result = await runTool(parsed.data);
		console.log(JSON.stringify(result));
	} catch (error) {
		console.log(JSON.stringify(serializeError(error)));
	}
}

const isEntrypoint =
	typeof process.argv[1] === "string" &&
	pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntrypoint) {
	void main();
}
