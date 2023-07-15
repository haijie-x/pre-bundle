import { ESBUILD_TARGET } from "./constants.mjs";
import path from "node:path";
import esbuild from "esbuild";

export const createDepBuild = async (config, scanResult) => {
  const { base } = config ?? {};
  const platform = "browser";
  const { deps } = scanResult ?? {};
  if (!Object.keys(deps)?.length)
    return {
      buildDispose: async () => {},
    };
  const context = await esbuild.context({
    absWorkingDir: base,
    entryPoints: Object.keys(deps),
    bundle: true,
    platform,
    format: "esm",
    banner:
      platform === "node"
        ? {
            js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
          }
        : undefined,
    target: ESBUILD_TARGET,
    logLevel: "error",
    splitting: true,
    sourcemap: true,
    outdir: path.join(base, ".pre"),
    metafile: true,
    // plugins,
    charset: "utf8",
    supported: {
      "dynamic-import": true,
      "import-meta": true,
    },
  });

  try {
    await context.rebuild();
  } catch (e) {
    console.log(e);
    context.dispose().catch((e) => {
      console.error("Failed to dispose esbuild context\n" + e);
    });
  }
  return {
    buildDispose: context.dispose,
  };
};
