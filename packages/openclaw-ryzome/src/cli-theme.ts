import chalk from "chalk";

export const hasColors =
	process.env.NO_COLOR == null &&
	(["1", "2", "3"].includes(process.env.FORCE_COLOR ?? "") || process.stdout.isTTY);

export const dim = (s: string) => (hasColors ? chalk.dim(s) : s);
export const accent = (s: string) => (hasColors ? chalk.hex("#F2A65A")(s) : s);
export const success = (s: string) => (hasColors ? chalk.hex("#7DD3A5")(s) : s);
export const bold = (s: string) => (hasColors ? chalk.bold(s) : s);
export const info = (s: string) => (hasColors ? chalk.hex("#8CC8FF")(s) : s);

// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI escape matching
const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function visibleWidth(s: string): number {
	const stripped = s.replace(ANSI_RE, "");
	let width = 0;
	for (const ch of stripped) {
		const cp = ch.codePointAt(0) ?? 0;
		// Wide characters: CJK, fullwidth forms, emoji
		if (
			(cp >= 0x1100 && cp <= 0x115f) ||
			(cp >= 0x2e80 && cp <= 0x303e) ||
			(cp >= 0x3040 && cp <= 0x33bf) ||
			(cp >= 0xac00 && cp <= 0xd7af) ||
			(cp >= 0xf900 && cp <= 0xfaff) ||
			(cp >= 0xfe10 && cp <= 0xfe6f) ||
			(cp >= 0xff01 && cp <= 0xff60) ||
			(cp >= 0xffe0 && cp <= 0xffe6) ||
			(cp >= 0x1f000 && cp <= 0x1faff) ||
			(cp >= 0x20000 && cp <= 0x2fffd)
		) {
			width += 2;
		} else {
			width += 1;
		}
	}
	return width;
}

export function wrapText(text: string, maxWidth: number): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		if (visibleWidth(candidate) <= maxWidth) {
			current = candidate;
		} else {
			if (current) lines.push(current);
			current = word;
		}
	}
	if (current) lines.push(current);
	return lines;
}
