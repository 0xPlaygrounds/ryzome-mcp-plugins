export function buildCanvasAppUrl(appUrl: string, canvasId: string): string {
	const appBase = appUrl.replace(/\/+$/, "");
	return `${appBase}/workspace?canvas=${encodeURIComponent(canvasId)}`;
}

export function buildDocumentAppUrl(appUrl: string, documentId: string): string {
	const appBase = appUrl.replace(/\/+$/, "");
	return `${appBase}/workspace?document=${encodeURIComponent(documentId)}`;
}

export function buildDocumentViewAppUrl(
	appUrl: string,
	document: {
		_id: { $oid: string };
		content: { _type: string };
	},
): string {
	return document.content._type === "Canvas"
		? buildCanvasAppUrl(appUrl, document._id.$oid)
		: buildDocumentAppUrl(appUrl, document._id.$oid);
}
