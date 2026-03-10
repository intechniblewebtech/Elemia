import { writeFile } from 'node:fs/promises';

export interface BlockManifest {
  name: string;
  elements: string[];
  modifiers: string[];
  naming: 'bem' | 'camel' | 'dashes';
  filePath: string;
}

export interface ElemiaManifest {
  blocks: BlockManifest[];
}

export async function writeManifest(outFile: string, manifest: ElemiaManifest): Promise<void> {
  await writeFile(outFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
