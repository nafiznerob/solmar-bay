// Solmar Bay, handed in: main.ts for the gta6-01 bounty (Node 22, standard
// library only). It takes the game in game/ and the screenshots in
// screenshots/ from beside this file, copies them into the output directory
// the grader hands it, and writes /output/dossier.json with the vendored
// make.fun library, so the judge reads the same summary the scorer checks.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// It runs twice and writes the same bytes both times.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

function copyTree(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree(gameDir, join(outputDir, 'game'));
copyTree(shotsDir, join(outputDir, 'screenshots'));

// The scorer's own caps, from the kit's reference/gate.json: the text cap
// shapes the dossier's bytes, and the rest refuse an entry the scorer
// would refuse anyway (more than 4 screenshots or one over 256 KiB; game/
// over 993 files or 48 MiB in all, or a path under it over 1000 bytes).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
