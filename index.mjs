import path from "node:path";
import { createScanner } from "./scan.mjs";
import { createDepBuild } from "./build.mjs";

const preBundle = async (config) => {
  const dispose = async function () {
    await scanDispose();
    await buildDispose();
  };
  let { scanResult, scanDispose } = await createScanner(config);
  let { buildDispose } = await createDepBuild(config, scanResult);
  return {
    dispose,
  };
};

(async () =>
  preBundle({ base: path.resolve("target") }).then(({ dispose }) => {
    dispose();
  }))();
