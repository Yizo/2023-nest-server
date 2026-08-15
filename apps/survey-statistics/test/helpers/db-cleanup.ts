import { DataSource } from "typeorm";

export async function truncateTables(
	dataSource: DataSource,
	tableNames: string[],
) {
	if (!dataSource.isInitialized) {
		await dataSource.initialize();
	}

	if (tableNames.length === 0) {
		return;
	}

	const quoted = tableNames.map((name) => `"${name.replace(/"/g, '""')}"`);
	await dataSource.query(
		`TRUNCATE TABLE ${quoted.join(", ")} RESTART IDENTITY CASCADE`,
	);
}
