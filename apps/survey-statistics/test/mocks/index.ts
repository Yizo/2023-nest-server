import { Repository } from "typeorm";

export function createMockRepository<T = unknown>(): jest.Mocked<
	Pick<
		Repository<T>,
		| "find"
		| "findOne"
		| "save"
		| "create"
		| "delete"
		| "insert"
		| "count"
		| "softDelete"
		| "createQueryBuilder"
	>
> & { manager: { transaction: jest.Mock } } {
	return {
		find: jest.fn(),
		findOne: jest.fn(),
		save: jest.fn(),
		create: jest.fn((entity) => entity as T),
		delete: jest.fn(),
		insert: jest.fn(),
		count: jest.fn(),
		softDelete: jest.fn(),
		createQueryBuilder: jest.fn(),
		manager: {
			transaction: jest.fn((cb) => cb({})),
		},
	} as never;
}

export function createMockQueryBuilder(overrides: Record<string, jest.Mock> = {}) {
	const qb: Record<string, jest.Mock> = {
		leftJoinAndSelect: jest.fn(),
		leftJoin: jest.fn(),
		where: jest.fn(),
		andWhere: jest.fn(),
		orderBy: jest.fn(),
		addOrderBy: jest.fn(),
		select: jest.fn(),
		groupBy: jest.fn(),
		update: jest.fn(),
		set: jest.fn(),
		delete: jest.fn(),
		insert: jest.fn(),
		into: jest.fn(),
		values: jest.fn(),
		execute: jest.fn().mockResolvedValue({}),
		getMany: jest.fn().mockResolvedValue([]),
		getRawMany: jest.fn().mockResolvedValue([]),
		...overrides,
	};

	for (const key of Object.keys(qb)) {
		if (!["execute", "getMany", "getRawMany"].includes(key)) {
			qb[key].mockReturnValue(qb);
		}
	}

	return qb;
}

export function createMockQueryBuilderFactory() {
	const helper = {
		findPaginated: jest.fn().mockResolvedValue({ data: [], total: 0 }),
		buildQuery: jest.fn(),
	};

	return {
		createFromRepository: jest.fn().mockReturnValue(helper),
		_helper: helper,
	};
}

export function createMockQueue() {
	return {
		add: jest.fn().mockResolvedValue({ id: "job-1" }),
	};
}

export function createMockLogger() {
	return {
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
	};
}

export function createMockCache() {
	return {
		get: jest.fn(),
		set: jest.fn(),
		del: jest.fn(),
	};
}

export function createMockRequest(overrides: Partial<{
	ip: string;
	headers: Record<string, string>;
}> = {}) {
	return {
		ip: "127.0.0.1",
		headers: { "user-agent": "jest-test-agent" },
		...overrides,
	} as never;
}
