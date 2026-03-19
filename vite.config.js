import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const owner = process.env.GITHUB_REPOSITORY?.split("/")[0];
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const isUserSite = owner && repoName === `${owner}.github.io`;
  const base =
    process.env.GITHUB_ACTIONS && repoName && !isUserSite
      ? `/${repoName}/`
      : "/";

  return {
    base,
    plugins: [react()],
  };
});
