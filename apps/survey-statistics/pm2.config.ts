export default {
	apps: [
		{
			name: "surveyStatistics",
			script: "dist/src/main.js",
			env: {
				NODE_ENV: "development",
			},
			env_production: {
				NODE_ENV: "production",
			},
		},
	],
} as const;
