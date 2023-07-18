import path from "node:path";
import { createScanner } from "./scan.mjs";
import { createDepBuild } from "./build.mjs";

const preBundle = async (config) => {
  const dispose = async function () {};
  let { scanResult, scanDispose } = await createScanner(config);
  await scanDispose();
  let { buildDispose } = await createDepBuild(config, scanResult);
  await buildDispose();
  return {
    dispose,
  };
};

(async () => preBundle({ base: path.resolve("target") }))();
