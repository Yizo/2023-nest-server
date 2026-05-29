export async function waitForRecord<T>(
	findFn: () => Promise<T | null | undefined>,
	options: { timeout?: number; interval?: number } = {},
): Promise<T> {
	const timeout = options.timeout ?? 8000;
	const interval = options.interval ?? 200;
	const start = Date.now();

	while (Date.now() - start < timeout) {
		const record = await findFn();
		if (record) {
			return record;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	throw new Error("Timed out waiting for database record");
}
