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
		include: ['src/**/*.test.ts']
	}
});
