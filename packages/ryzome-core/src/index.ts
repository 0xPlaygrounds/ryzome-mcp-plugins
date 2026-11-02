export { parseConfig, hasCredential, toClientConfig } from "./config.js";
export type {
	RyzomeAuthMode,
	RyzomePluginConfig,
	ResolvedRyzomePluginConfig,
} from "./config.js";
export {
	DEFAULT_RYZOME_API_URL,
	DEFAULT_RYZOME_APP_URL,
	RYZOME_API_KEY_ENV_VARS,
	RYZOME_ACCESS_TOKEN_ENV_VARS,
	RYZOME_CREDENTIAL_SETUP_HINT,
} from "./config.js";

export {
	RyzomeClient,
	RyzomeApiError,
	resolveAuthMode,
} from "./lib/ryzome-client.js";
export {
	formatStructureReport,
	verifyDocumentStructure,
} from "./lib/verify-structure.js";
export type { StructureReport } from "./lib/verify-structure.js";
export { canvasOperationSchema } from "./lib/canvas-operations.js";
export type { CanvasOperationInput } from "./lib/canvas-operations.js";
export {
	buildCanvasAppUrl,
	buildDocumentAppUrl,
	buildDocumentViewAppUrl,
} from "./lib/app-url.js";
export { formatCanvasAsMarkdown } from "./lib/format-canvas-markdown.js";
export { formatDocumentAsMarkdown } from "./lib/format-document-markdown.js";
export {
	formatConversationAsMarkdown,
	buildConversationAppUrl,
} from "./lib/format-conversation-markdown.js";
export type { CanvasEditorView } from "./lib/format-canvas-markdown.js";
export type {
	DocumentContentView,
	DocumentMetadataView,
	DocumentOperation,
	DocumentView,
} from "./lib/client/index.js";
export type {
	ListDocumentsOptions,
	RyzomeClientAuthMode,
	RyzomeClientConfig,
	RyzomeRequestStage,
} from "./lib/ryzome-client.js";

export { toolRegistry } from "./tools/index.js";
export type { ToolEntry, ToolResult } from "./tools/index.js";
