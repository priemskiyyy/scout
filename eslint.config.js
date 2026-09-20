import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const typescriptRules = {
  "@typescript-eslint/consistent-type-imports": "error",
  "@typescript-eslint/consistent-type-definitions": ["error", "type"],
  // A cast is how a provider boundary hides a lie about a response; decoding is
  // the only sanctioned way to turn `unknown` into a typed value.
  "@typescript-eslint/consistent-type-assertions": [
    "error",
    { assertionStyle: "never" },
  ],
  curly: ["error", "all"],
  "no-restricted-syntax": [
    "error",
    "TSEnumDeclaration",
    "SwitchStatement",
    "UnaryExpression[operator='void']",
    // Logical assignment hides a branch in an operator; a guard clause says
    // what happens when the value is already there.
    "AssignmentExpression[operator='??=']",
    "AssignmentExpression[operator='||=']",
    "AssignmentExpression[operator='&&=']",
  ],
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      ".artifacts/**",
      "docs/.vitepress/cache/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: typescriptRules,
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
      },
    },
  },
);
