import { loadConfig } from "@/lib/config";
import { sync } from "@/sync";

const config = await loadConfig(process.argv[2] ?? "./config.json");
const report = await sync(config);

if (!report.success) process.exit(1);
