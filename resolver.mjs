import resolve from "enhanced-resolve";
import { bareImportReg } from "./constants.mjs";
import path from "node:path";

const createResolver = () => {
  return resolve.create({
    extensions: [".js", ".ts", ".tsx", ".jsx", ".mjs"],
    mainFields: ["browser", "module", "main"],
    mainFiles: ["index"],
    modules: ["node_modules", "node_modules/.pnpm/node_modules"],
    unsafeCache: true,
  });
};

export const requireResolve = createResolver();

export const resolveId = async (id, importer) => {
  return new Promise((r) => {
    if (bareImportReg.test(id)) {
      requireResolve(importer, id, (err, res) => {
        if (err) {
          r();
        }
        r(res);
      });
    } else if (path.isAbsolute(id)) {
      r(id);
    } else {
      r(path.resolve(path.dirname(importer), id));
    }
  });
};
