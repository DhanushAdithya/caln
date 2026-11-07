import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { swPlugin } from "./sw-plugin.ts";

export default defineConfig({
  base: process.env.CALN_BASE || "/",
  plugins: [preact(), swPlugin()],
});
