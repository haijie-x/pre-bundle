import { ESBUILD_TARGET } from "./constants.mjs";
import path, { isAbsolute } from "node:path";
import esbuild from "esbuild";
import { resolveId, requireResolve } from "./resolver.mjs";
import { JsTypeReg } from "./constants.mjs";
import fsp from "node:fs/promises";
const esbuildDepBuildPlugin = () => {
  return {
    name: "esbuild:build",
    setup(build) {
      build.onResolve(
        {
          filter: /.*/,
        },
        async ({ path: id, importer }) => {
          const resolved = await resolveId(id, importer);
          if (!resolved)
            return {
              path: id,
              external: true,
            };
          return {
            path: resolved,
          };
        }
      );
      build.onLoad({ filter: JsTypeReg }, async ({ path: id }) => {
        let ext = path.extname(id).slice(1);
        let contents = await fsp.readFile(id, "utf-8");
        return {
          loader: ext === "mjs" ? "js" : ext,
          contents,
        };
      });
    },
  };
};

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
    entryPoints: Object.values(deps),
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
    plugins: [esbuildDepBuildPlugin()],
    charset: "utf8",
    supported: {
      "dynamic-import": true,
      "import-meta": true,
    },
  });

  try {
    await context.rebuild();
  } catch (e) {
    context.dispose().catch((e) => {
      console.error("Failed to dispose esbuild context\n" + e);
    });
  }
  return {
    buildDispose: context.dispose,
  };
};
