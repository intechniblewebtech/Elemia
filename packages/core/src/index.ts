export { block } from './block';
export { cx } from './cx';
export { normalizePath } from './scope';
export { sanitizeBlockName } from './sanitize';
import type { BlockDescriptor } from './types';

export function getScopedName(descriptor: BlockDescriptor<any, any>): string | null {
  return descriptor.scopedName;
}

export type {
  AuthorConfig,
  BlockDescriptor,
  BlockHelper,
  ClassInput,
  ElementCallModifiers,
  ElementConfig,
  ElementName,
  ElementsSchema,
  ModifierDef,
  ModifierInput,
  ModifierSchema,
  ModifierValueOf,
  WrapperConfig,
} from './types';
