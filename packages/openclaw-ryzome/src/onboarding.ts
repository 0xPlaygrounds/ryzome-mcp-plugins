import { accent, bold, dim, info, wrapText } from "./cli-theme.js";

type DemoIdea = {
	label: string;
	toolHint: string;
	prompt: string;
};

export const DEMO_IDEAS: DemoIdea[] = [
	{
		label: "Map your OpenClaw agent setup",
		toolHint: "create_ryzome_canvas",
		prompt:
			"Map your OpenClaw agent configuration as a canvas. Show each agent and subagent as a node, with edges for delegation. Include model, personality, and purpose in each node.",
	},
	{
		label: "Outline this project's architecture",
		toolHint: "create_ryzome_canvas",
		prompt:
			"Create a canvas mapping this project's architecture. Each major module or service gets a node. Connect them with edges showing data flow and dependencies.",
	},
	{
		label: "Plan your current sprint or task",
		toolHint: "create_ryzome_plan",
		prompt:
			"Build a plan canvas for what you're working on right now. Break it into steps \u2014 what needs to happen, in what order. Use branching for parallel work.",
	},
	{
		label: "Research a technical topic",
		toolHint: "create_ryzome_research",
		prompt:
			"Pick a technical topic and create a research canvas. Start with the core question as the root, then branch into findings as you explore different angles.",
	},
	{
		label: "Visualize a decision you're weighing",
		toolHint: "create_ryzome_canvas",
		prompt:
			"Map a decision or trade-off as a canvas. Each option is a node, edges show how they relate or conflict. Use descriptions for pros, cons, and open questions.",
	},
];

export function printDemoMenu(): void {
	const lines = [
		"",
		dim("  Want to try creating your first canvas? Here are a few ideas:"),
		"",
		...DEMO_IDEAS.map(
			(idea, i) => `     ${accent(`${i + 1}`)}  ${bold(idea.label)}`,
		),
		"",
	];
	console.log(lines.join("\n"));
}

export function printDemoSuggestion(idea: DemoIdea): void {
	const cols = process.stdout.columns || 80;
	const proseWidth = Math.max(cols - 6, 20);
	const wrapped = wrapText(idea.prompt, proseWidth);

	const lines = [
		"",
		accent("  Try this:"),
		"",
		...wrapped.map((l) => `  ${dim('"')}${l}`),
		dim('  "'),
		"",
		`  ${info("Tool:")} ${idea.toolHint}`,
		"",
	];
	console.log(lines.join("\n"));
}

export function printDemoHints(): void {
	const lines = [
		"",
		accent("  Try creating your first canvas:"),
		"",
		...DEMO_IDEAS.map(
			(idea) =>
				`  ${dim("•")} ${idea.prompt} ${dim(`(${idea.toolHint})`)}`,
		),
		"",
	];
	console.log(lines.join("\n"));
}

export function printSkipMessage(): void {
	console.log("");
	console.log(
		dim("  No problem. You can create a canvas anytime with the ryzome tools."),
	);
	console.log("");
}

export async function promptDemoCanvas(
	ask: (question: string) => Promise<string>,
): Promise<void> {
	if (!process.stdin.isTTY) return;

	printDemoMenu();

	const answer = (
		await ask(dim(`  Pick one (1-${DEMO_IDEAS.length}), or press Enter to skip: `))
	).trim();

	if (!answer || answer === "0") {
		printSkipMessage();
		return;
	}

	const choice = Number.parseInt(answer, 10);
	if (Number.isNaN(choice) || choice < 1 || choice > DEMO_IDEAS.length) {
		printSkipMessage();
		return;
	}

	printDemoSuggestion(DEMO_IDEAS[choice - 1]);
}
