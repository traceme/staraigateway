import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'src/lib'),
			'$env/dynamic/private': path.resolve(__dirname, 'src/lib/server/__mocks__/env.ts')
		}
	},
	test: {
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/lib/server/**/*.ts'],
			exclude: [
				'src/lib/server/**/*.test.ts',
				'src/lib/server/__mocks__/**',
				'src/lib/server/__integration__/**'
			],
			thresholds: {
				lines: 80,
				functions: 80
			}
		}
	}
});
