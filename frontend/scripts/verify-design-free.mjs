import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const src = join(root, 'src');
const failures = [];

if (existsSync(join(src, 'design'))) failures.push('src/design still exists');
if (existsSync(join(src, 'components', 'figma-page.tsx'))) failures.push('Old design interpreter still exists');

const sourceFiles = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(tsx?|jsx?|json)$/.test(entry.name)) sourceFiles.push(file);
  }
}
walk(src);
for (const file of sourceFiles) {
  if (file.endsWith('.json')) failures.push(`Local JSON data in source: ${relative(root, file)}`);
  const text = readFileSync(file, 'utf8');
  if (/from\s*['"](?:@\/design\/|\.{1,2}\/design\/|[^'"]*figma-page)/i.test(text)) {
    failures.push(`Found a legacy design import: ${relative(root,file)}`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified ${sourceFiles.length} source files: no design JSON or design interpreter dependencies.`);
}
