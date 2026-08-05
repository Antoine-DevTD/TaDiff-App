import { spawnSync } from "node:child_process";

const result = spawnSync("git", ["grep", "-nE", "(Ã.|Â.|â€|Bibliotheque|Modeles d.email|Apercu du message|Questions posees|Themes demandes)", "--", "app/**/*.tsx", "components/**/*.tsx"], { encoding: "utf8" });
const output = result.stdout || "";
if (result.status !== 0 && result.status !== 1) {
  console.error(result.stderr || "Impossible de contrôler les copies françaises.");
  process.exit(result.status || 2);
}
if (output.trim()) {
  console.error("Copies françaises à relire :\n" + output);
  process.exit(1);
}
console.log("Copies françaises : aucun problème bloquant détecté.");
