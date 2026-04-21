export interface LayoutNodeInput {
	id: string;
	width?: number;
	height?: number;
	group?: string;
	dependsOn?: string[];
}

export interface LayoutEdgeInput {
	from: string;
	to: string;
}

export interface LayoutGroupInput {
	id: string;
	title?: string;
	padding?: number;
	/**
	 * Override the layout direction for this group's members only. When omitted,
	 * the group inherits the root layout direction. Useful for canvases whose
	 * subgraphs want different orientations (e.g., a vertical pipeline nested
	 * inside a horizontally-flowing outer graph).
	 */
	direction?: LayoutDirection;
	/**
	 * Override the algorithm used inside this group. Set to `"rectpacking"`
	 * for edgeless clusters (moodboards) while the root stays `"layered"`.
	 */
	algorithm?: LayoutAlgorithm;
	/**
	 * Target aspect ratio (width / height) forwarded as `elk.aspectRatio`
	 * when using `rectpacking`. Ignored for `layered`.
	 */
	aspectRatio?: number;
}

export interface LayoutInput {
	nodes: LayoutNodeInput[];
	edges?: LayoutEdgeInput[];
	groups?: LayoutGroupInput[];
}

export interface LayoutRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface LayoutResult {
	nodes: Record<string, LayoutRect>;
	groups: Record<string, LayoutRect>;
}

export type LayoutDirection = "DOWN" | "RIGHT" | "UP" | "LEFT";

/**
 * Supported elkjs algorithms. `layered` is the default Sugiyama-style
 * flow layout for DAGs. `rectpacking` packs edgeless or near-edgeless
 * inputs into a rectangle — used for moodboard-style clusters.
 */
export type LayoutAlgorithm = "layered" | "rectpacking";

export interface LayoutSpacing {
	/** Space between sibling nodes in the same layer. */
	nodeNode?: number;
	/** Space between layers (rows, for direction DOWN). */
	nodeNodeBetweenLayers?: number;
	/** Minimum space between an edge and any node. */
	edgeNode?: number;
}

export interface LayoutOptions {
	/**
	 * Resolves a node's rendered dimensions. If omitted, nodes fall back to the
	 * caller-supplied `width`/`height` on the node, or the defaults (320x180).
	 */
	measureNode?: (node: LayoutNodeInput) => { width: number; height: number };
	/** Layout direction. Default "DOWN". */
	direction?: LayoutDirection;
	/** Override ELK spacing keys. Defaults match the existing 80/60/40 visual language. */
	spacing?: LayoutSpacing;
	/** Padding applied around every group's members. Default 40 (60 on top for label room). */
	groupPadding?: number;
	/**
	 * Root-level ELK algorithm. Default `"layered"`. Use `"rectpacking"` when
	 * the input has no (or few) edges and should be packed into a rectangle.
	 */
	algorithm?: LayoutAlgorithm;
	/**
	 * Target aspect ratio (width / height) forwarded as `elk.aspectRatio` when
	 * using `rectpacking`. Ignored for `layered`.
	 */
	aspectRatio?: number;
}
