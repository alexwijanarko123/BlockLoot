import { isConfigured, getProvider, getReadContract } from "./chain.js";
import { config } from "./config.js";
import { readStore, updateStore } from "./store.js";
import { applyChainEvents } from "./sync.js";

const EVENT_NAMES = ["ItemListed", "ListingCancelled", "ItemBought", "OrderStatusChanged"];
const CHUNK = 2000;

export async function syncOnce() {
  if (!isConfigured()) return { scanned: 0 };

  const provider = getProvider();
  const latest = await provider.getBlockNumber();
  const stored = await readStore();
  const from = stored.indexer.lastBlock == null
    ? Math.max(0, latest - 5000)
    : stored.indexer.lastBlock + 1;

  if (from > latest) return { scanned: 0, from, latest };

  const contract = getReadContract();
  const logs = [];
  for (let start = from; start <= latest; start += CHUNK) {
    const end = Math.min(latest, start + CHUNK - 1);
    for (const name of EVENT_NAMES) {
      const found = await contract.queryFilter(contract.filters[name](), start, end);
      logs.push(...found);
    }
  }

  logs.sort((left, right) => left.blockNumber - right.blockNumber || left.index - right.index);

  await updateStore((data) => {
    applyChainEvents(data, logs, null);
    data.indexer.lastBlock = latest;
  });

  return { scanned: logs.length, from, latest };
}

export function startIndexer() {
  if (!isConfigured()) {
    console.log("Indexer diam: isi RPC_URL dan CONTRACT_ADDRESS untuk membaca event on-chain.");
    return;
  }

  const tick = async () => {
    try {
      const result = await syncOnce();
      if (result.scanned) {
        console.log(`Indexer menyimpan ${result.scanned} event sampai blok ${result.latest}.`);
      }
    } catch (error) {
      console.error("Indexer:", error.shortMessage || error.message);
    }
  };

  tick();
  setInterval(tick, config.indexerMs);
}
