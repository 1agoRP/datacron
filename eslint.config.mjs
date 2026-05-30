import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const relaxedProjectRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  'prefer-const': 'off',
  'react/no-unescaped-entities': 'off',
  'import/no-anonymous-default-export': 'off',
};

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      '.pytest_cache/**',
      '.ruff_cache/**',
      'node_modules/**',
      'graphify-out/**',
      'backend/**',
      'scratch/**',
      '*.html',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ['src/**/*.{ts,tsx}', 'middleware.ts'],
    rules: relaxedProjectRules,
  },
];

export default eslintConfig;
