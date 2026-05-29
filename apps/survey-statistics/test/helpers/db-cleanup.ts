import { DataSource } from "typeorm";

export async function truncateTables(
	dataSource: DataSource,
	tableNames: string[],
) {
	if (!dataSource.isInitialized) {
		await dataSource.initialize();
	}

	await dataSource.query("SET FOREIGN_KEY_CHECKS = 0");
	for (const tableName of tableNames) {
		await dataSource.query(`TRUNCATE TABLE \`${tableName}\``);
	}
	await dataSource.query("SET FOREIGN_KEY_CHECKS = 1");
}
