import { htmlTypesReg, scriptReg, JsTypeReg } from "./constants.mjs";
import path from "node:path";
import esbuild from "esbuild";
import fsp from "node:fs/promises";
import { resolveId } from "./resolver.mjs";

const isInNodeModules = (id) => {
  return id.includes("node_modules");
};

const esbuildScanPlugin = ({ deps, miss }) => {
  return {
    name: "esbuild:scan",
    setup(build) {
      build.onResolve({ filter: htmlTypesReg }, async ({ path: id }) => {
        const resolved = await resolveId(id);
        if (resolved)
          return {
            path: id,
            namespace: "html",
          };
      });
      build.onLoad(
        { filter: htmlTypesReg, namespace: "html" },
        async ({ path }) => {
          let htmlString = await fsp.readFile(path, "utf-8");
          let match;
          let contents = "";
          while ((match = scriptReg.exec(htmlString)) !== null) {
            const type = match[1];
            const src = match[2];
            if (type === "module")
              contents += `import ${JSON.stringify(src)}\n`;
          }
          return {
            loader: "js",
            contents,
          };
        }
      );
      build.onResolve(
        {
          filter: /^[\w@][^:]/,
        },
        async ({ path: id, importer }) => {
          const resolved = await resolveId(id, importer);
          if (resolved && isInNodeModules(resolved)) {
            deps[id] = resolved;
            return { path: id, path: resolved };
          } else {
            miss[id] = importer;
            return { path: id, external: true };
          }
        }
      );
      build.onResolve(
        {
          filter: /.*/,
        },
        async ({ path: id, importer, pluginData }) => {
          const resolved = await resolveId(id, importer);
          if (resolved) {
            const namespace = htmlTypesReg.test(resolved) ? "html" : undefined;
            return {
              path: resolved,
              namespace,
            };
          } else {
            return { path: id, namespace: "empty" };
          }
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

export const createScanner = async (config) => {
  const { base } = config ?? {};
  const scanResult = {
    deps: {},
    miss: {},
  };
  const entries = [path.resolve(base, "index.html")];
  const context = await esbuild.context({
    absWorkingDir: base,
    write: false,
    stdin: {
      contents: entries.map((e) => `import ${JSON.stringify(e)}`).join("\n"),
      loader: "js",
    },
    bundle: true,
    format: "esm",
    logLevel: "silent",
    plugins: [esbuildScanPlugin(scanResult)],
  });
  try {
    await context.rebuild();
    const missIds = Object.keys(scanResult.miss);
    if (missIds.length) {
      throw new Error(
        `The following dependencies are imported but could not be resolved:\n${missIds
          .map((id) => `\t${id} imported by ${scanResult.miss[id]}`)
          .join(`\n`)}\nAre they installed?`
      );
    }
  } catch (e) {
    context.dispose().catch((e) => {
      console.error("Failed to dispose esbuild context\n" + e);
    });
  }
  return {
    scanResult,
    scanDispose: context.dispose,
  };
};
