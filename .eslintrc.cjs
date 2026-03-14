module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true, // add this so node-based configs (vite, capacitor, etc.) don't error
  },
  globals: {
    cordova: "readonly", // ✅ prevents "cordova is not defined" errors
    Capacitor: "readonly", // optional if you use Capacitor
    showToast: "readonly", // prevent undefined error if it's globally defined
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["react","unused-imports"],
  settings: {
    react: {
      version: "detect", // ✅ fixes "React version not specified" warning
    },
  },
  rules: {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "no-unreachable": "error",
    "react/react-in-jsx-scope": "off",
      "unused-imports/no-unused-imports": "warn",
  "unused-imports/no-unused-vars": [
    "warn",
    { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }
  ],
  },
};
