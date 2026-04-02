import { RyzomeApiError } from "./ryzome-client.js";

const MAX_RETRIES = 2;

export async function retryStage<T>(operation: () => Promise<T>): Promise<T> {
	let lastError: unknown;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			const shouldRetry =
				error instanceof RyzomeApiError &&
				error.retryable &&
				attempt < MAX_RETRIES;
			if (!shouldRetry) {
				throw error;
			}

			await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
		}
	}

	throw lastError;
}
