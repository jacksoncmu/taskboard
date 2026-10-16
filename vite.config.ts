import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Relative base so the build works from any static host path (e.g. GitHub Pages /taskboard/).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-switch",
            "sonner",
          ],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          date: ["date-fns"],
        },
      },
    },
  },
  test: {
    environment: "node",
  },
});
