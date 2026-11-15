import fs from "fs/promises";
import { config } from "./config.js";

function emptyStore() {
  return {
    nonces: {},
    drafts: [],
    profiles: [],
    orders: [],
    indexer: { lastBlock: null }
  };
}

export async function readStore() {
  try {
    const raw = await fs.readFile(config.storeFile, "utf8");
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch (error) {
    if (error.code === "ENOENT") return emptyStore();
    throw error;
  }
}

let queue = Promise.resolve();

export function updateStore(mutator) {
  const run = queue.then(async () => {
    const data = await readStore();
    const result = await mutator(data);
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.writeFile(config.storeFile, JSON.stringify(data, null, 2));
    return result;
  });
  queue = run.then(() => undefined, () => undefined);
  return run;
}
