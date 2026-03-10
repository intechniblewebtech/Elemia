import { diffSemanticClasses, formatSemanticDiff } from '../compare/diff';

export interface CompareOptions {
  strict?: boolean;
}

export interface CompareResult {
  exitCode: 0 | 1;
  output: string;
  diff: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
}

export async function compare(
  originalCssFile: string,
  convertedBlockTsFile: string,
  options: CompareOptions = {},
): Promise<CompareResult> {
  const semanticDiff = await diffSemanticClasses(originalCssFile, convertedBlockTsFile);
  const output = formatSemanticDiff(semanticDiff);
  const isStrict = options.strict === true;

  return {
    exitCode: isStrict && semanticDiff.hasDifferences ? 1 : 0,
    output,
    diff: {
      added: semanticDiff.added,
      removed: semanticDiff.removed,
      unchanged: semanticDiff.unchanged,
    },
  };
}
