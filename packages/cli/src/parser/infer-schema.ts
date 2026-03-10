import { extractClassNames } from './parse-css';
import type { InferredElement, InferredNaming, InferredSchema } from '../types';

function detectNaming(classes: string[]): InferredNaming {
  const hasBem = classes.some((name) => name.includes('__') || name.includes('--'));
  const hasCamel = classes.some((name) => /[a-z][A-Z]/.test(name));
  const hasDashes = classes.some((name) => name.includes('-'));

  if (hasBem) {
    return 'bem';
  }

  if (hasCamel) {
    return 'camel';
  }

  if (hasDashes) {
    return 'dashes';
  }

  return 'bem';
}

function inferBlockName(classes: string[]): string | null {
  const blockCandidates = classes.filter((name) => !name.includes('__') && !name.includes('--'));

  return blockCandidates[0] ?? null;
}

export function inferSchema(css: string): InferredSchema {
  const classes = extractClassNames(css);

  if (classes.length === 0) {
    return {
      naming: 'bem',
      block: null,
      elements: [],
      classes: [],
      ambiguous: [],
    };
  }

  const naming = detectNaming(classes);
  const blockName = inferBlockName(classes);
  const blockModifiers = new Set<string>();
  const elements = new Map<string, Set<string>>();
  const ambiguous = new Set<string>();

  if (!blockName) {
    for (const className of classes) {
      ambiguous.add(className);
    }

    return {
      naming,
      block: null,
      elements: [],
      classes,
      ambiguous: Array.from(ambiguous).sort((a, b) => a.localeCompare(b)),
    };
  }

  for (const className of classes) {
    if (className === blockName) {
      continue;
    }

    if (className.startsWith(`${blockName}__`)) {
      const elementPart = className.slice(blockName.length + 2);
      const [elementName, elementModifier] = elementPart.split('--');

      if (!elementName) {
        ambiguous.add(className);
        continue;
      }

      if (!elements.has(elementName)) {
        elements.set(elementName, new Set<string>());
      }

      if (elementModifier) {
        elements.get(elementName)?.add(elementModifier);
      }

      continue;
    }

    if (className.startsWith(`${blockName}--`)) {
      const modifier = className.slice(blockName.length + 2);
      if (modifier.length > 0) {
        blockModifiers.add(modifier);
      } else {
        ambiguous.add(className);
      }
      continue;
    }

    // Unknown naming forms are preserved for manual review in later migration steps.
    ambiguous.add(className);
  }

  const inferredElements: InferredElement[] = Array.from(elements.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, modifiers]) => ({
      name,
      modifiers: Array.from(modifiers).sort((a, b) => a.localeCompare(b)),
    }));

  return {
    naming,
    block: {
      name: blockName,
      modifiers: Array.from(blockModifiers).sort((a, b) => a.localeCompare(b)),
    },
    elements: inferredElements,
    classes,
    ambiguous: Array.from(ambiguous).sort((a, b) => a.localeCompare(b)),
  };
}
