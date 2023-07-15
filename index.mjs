import path from "node:path";
import { createScanner } from "./scanImports.mjs";

const preBundle = async (config) => {
  const { base } = config ?? {};
  await createScanner(config);
};

(async () => preBundle({ base: path.resolve("target") }))();
