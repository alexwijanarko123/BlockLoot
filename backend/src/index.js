import fs from "fs";
import app from "./app.js";
import { config } from "./config.js";
import { isConfigured } from "./chain.js";
import { startIndexer } from "./indexer.js";

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });

if (config.jwtSecret === "dev-only-change-me") {
  console.warn("JWT_SECRET masih nilai bawaan. Ganti sebelum dipakai di luar mesin lokal.");
}

app.listen(config.port, () => {
  console.log(`BlockLoot API berjalan di ${config.publicBaseUrl}`);
  console.log(isConfigured()
    ? `Kontrak ${config.contractAddress} via ${config.rpcUrl}`
    : "Mode off-chain: RPC_URL atau CONTRACT_ADDRESS belum diisi.");
  startIndexer();
});
