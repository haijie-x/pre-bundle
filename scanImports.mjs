import {
  htmlTypesReg,
  scriptReg,
  JsTypeReg,
  bareImportReg,
} from "./constants.mjs";
import path from "node:path";
import esbuild from "esbuild";
import fsp from "node:fs/promises";
import module from "node:module";

const isInNodeModules = (id) => {
  return id.includes("node_modules");
};

const resolveId = (id, importer) => {
  if (bareImportReg.test(id)) {
    const require = module.createRequire(importer);
    let depId = require.resolve(id);
    return depId;
  }
  return path.isAbsolute(id) ? id : path.resolve(path.dirname(importer), id);
};

const esbuildScanPlugin = ({ dep, missing }) => {
  return {
    name: "esbuild:scan",
    setup(build) {
      build.onResolve({ filter: htmlTypesReg }, async ({ path: id }) => {
        const resolved = resolveId(id);
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
          const resolved = resolveId(id, importer);
          if (resolved) {
            if (isInNodeModules(resolved)) {
              dep[id] = resolved;
              return { path: id, path: resolved };
            }
          } else {
            missing[id] = importer;
            return;
          }
        }
      );
      build.onResolve(
        {
          filter: /.*/,
        },
        async ({ path: id, importer, pluginData }) => {
          const resolved = resolveId(id, importer);
          if (resolved) {
            const namespace = htmlTypesReg.test(resolved) ? "html" : undefined;
            return {
              path: resolved,
              namespace,
            };
          } else {
            return { path: id, external: true };
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
    dep: {},
    missing: {},
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
    console.log(scanResult);
    return scanResult;
  } catch (e) {
    console.log(e);
    context.context?.dispose().catch((e) => {
      console.error("Failed to dispose esbuild context\n" + e);
    });
  }
};
