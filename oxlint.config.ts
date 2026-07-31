import {linter as defaults} from './oxc.config.ts';

// Project-specific oxlint rule overrides.
// This file is preserved on template updates.
const rules: Record<string, unknown> = {
	'eslint/default-case': 'off',
	'eslint/func-style': 'off',
	'eslint/no-duplicate-imports': 'off',
	'eslint/no-underscore-dangle': 'off',
	'eslint/sort-vars': 'off',
	'typescript/consistent-return': 'off',
	'typescript/no-unnecessary-condition': 'off',
	'typescript/no-unsafe-assignment': 'off',
	'typescript/no-unsafe-call': 'off',
	'typescript/no-unsafe-member-access': 'off',
	'typescript/no-unsafe-type-assertion': 'off',
	'typescript/strict-boolean-expressions': 'off',
	'import/no-anonymous-default-export': 'off',
	'import/no-relative-parent-imports': 'off',
	'import/unambiguous': 'off',
	'unicorn/no-array-reverse': 'off',
	'unicorn/no-useless-spread': 'off',
	'unicorn/prefer-global-this': 'off',
	'unicorn/prefer-modern-dom-apis': 'off',
	'unicorn/prefer-number-properties': 'off',
	'unicorn/prefer-type-error': 'off',
	'unicorn/prefer-dom-node-append': 'off',
	'unicorn/prefer-dom-node-remove': 'off',
	'unicorn/consistent-function-scoping': 'off',
	'vitest/require-to-throw-message': 'off',
};

const overrides: Record<string, unknown>[] = [
	{
		files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
		rules: {
			'jsdoc/require-param': 'off',
			'jsdoc/require-param-type': 'off',
			'jsdoc/require-returns': 'off',
			'jsdoc/require-returns-type': 'off',
		},
	},
];

const config = {
	...defaults,
	rules: {...defaults.rules, ...rules},
	overrides: [...defaults.overrides, ...overrides],
	ignorePatterns: [
		...defaults.ignorePatterns,
		'src/lib/domain/**',
		'src/lib/locales/**',
		'src/lib/rendering/**',
		'src/lib/timeline/**',
		'src/lib/validation/**',
		'src/lib/vanilla/**',
		'src/lib/errors.ts',
		'src/lib/locale.ts',
		'src/lib/locale.test.ts',
	],
};

export default config;
