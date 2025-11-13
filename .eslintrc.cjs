module.exports = {
  root: true,
  ignorePatterns: ['**/dist/**', '**/node_modules/**'],
  overrides: [
    {
      files: ['packages/api/**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',
      parserOptions: { project: 'packages/api/tsconfig.json' },
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      rules: {},
    },
    {
      files: ['packages/webapp/**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',
      parserOptions: { project: 'packages/webapp/tsconfig.json' },
      plugins: ['@typescript-eslint', 'react'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
      ],
      settings: { react: { version: 'detect' } },
      rules: {},
    },
  ],
};
