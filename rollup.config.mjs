import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import copy from "rollup-plugin-copy";

const basePlugins = [resolve(), typescript({ tsconfig: "./tsconfig.json" })];

export default [
  {
    // background.ts 為第一個進入點，順便把所有靜態資源複製到 dist/
    input: "src/background.ts",
    output: {
      file: "dist/background.js",
      format: "iife",
      sourcemap: true,
    },
    plugins: [
      ...basePlugins,
      copy({
        targets: [
          { src: "src/manifest.json", dest: "dist" },
          { src: "icons/*", dest: "dist/icons" },
          { src: "src/popup/popup.html", dest: "dist/popup" },
          { src: "src/popup/popup.css", dest: "dist/popup" },
          { src: "src/options/options.html", dest: "dist/options" },
          { src: "src/options/options.css", dest: "dist/options" },
        ],
      }),
    ],
  },
  {
    input: "src/popup/popup.ts",
    output: {
      file: "dist/popup/popup.js",
      format: "iife",
      sourcemap: true,
    },
    plugins: basePlugins,
  },
  {
    input: "src/options/options.ts",
    output: {
      file: "dist/options/options.js",
      format: "iife",
      sourcemap: true,
    },
    plugins: basePlugins,
  },
];
