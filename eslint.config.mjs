import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // The standard SSR "mounted" flag and scroll/animation-on-load effects
      // intentionally call setState once inside an effect. Keep this visible as
      // a warning rather than a hard error so the pre-commit gate stays usable.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
