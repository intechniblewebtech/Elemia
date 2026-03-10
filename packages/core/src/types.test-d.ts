import { expectType, expectError, expectAssignable } from 'tsd';
import { block, cx, getScopedName } from './index';
import type {
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

// ---------------------------------------------------------------------------
// cx() type tests
// ---------------------------------------------------------------------------
expectType<string>(cx());
expectType<string>(cx('foo', 'bar'));
expectType<string>(cx('foo', false, null, undefined));

// ClassInput accepts valid types
expectAssignable<ClassInput>('foo');
expectAssignable<ClassInput>(false);
expectAssignable<ClassInput>(null);
expectAssignable<ClassInput>(undefined);

// numbers are not ClassInput
expectError<ClassInput>(42);

// ---------------------------------------------------------------------------
// block() author mode — basic smoke tests
// ---------------------------------------------------------------------------
const authorBlock = block('card');
expectAssignable<BlockHelper>(authorBlock);

const injectedAuthorBlock = block('card', {
  __filePath: 'src/Card.ts',
  __salt: 'proj',
});
expectAssignable<BlockHelper>(injectedAuthorBlock);

// Callable returns string
expectType<string>(authorBlock(null));
expectType<string>(authorBlock('thumbnail'));
expectType<string>(authorBlock(null, { compact: true }));
expectType<string>(authorBlock(null, { size: 'lg' }));
expectType<string>(authorBlock(null, {}, 'extra'));

// Properties
expectType<Record<string, string> | null>(authorBlock.styles);
expectType<string>(authorBlock.root());
expectType<string>(authorBlock.root({ compact: true }));
expectType<boolean>(authorBlock.has('thumbnail'));
expectType<boolean>(authorBlock.has('thumbnail', 'active'));
expectType<boolean>(authorBlock.has('thumbnail', 'active', 'true'));
expectType<string>(authorBlock.descriptor.name);
expectType<'wrapper' | 'author'>(authorBlock.descriptor.mode);
expectType<string | null>(authorBlock.descriptor.scopedName);
expectType<readonly string[]>(authorBlock.descriptor.elements);
expectAssignable<Record<string, unknown>>(authorBlock.descriptor.modifiers);
expectType<string | null>(getScopedName(authorBlock.descriptor));

// ---------------------------------------------------------------------------
// block() wrapper mode — basic smoke tests
// ---------------------------------------------------------------------------
const styles: Record<string, string> = { card: 'card_abc' };
const wrapperBlock = block(styles, {});
expectAssignable<BlockHelper>(wrapperBlock);

// Returns string on call
expectType<string>(wrapperBlock(null));
expectType<string>(wrapperBlock('thumbnail'));

// b.styles is the CSS Module object or null
expectType<Record<string, string> | null>(wrapperBlock.styles);

// ---------------------------------------------------------------------------
// block() returns BlockHelper (generic constraints — expanded in CORE-10)
// ---------------------------------------------------------------------------
expectAssignable<BlockHelper>(block('my-block'));
expectAssignable<BlockHelper>(block({}, {}));

// These must be errors — wrong arg types
expectError(block(42));
expectError(block(true));

// ---------------------------------------------------------------------------
// CORE-02: Element name generic constraints
// ---------------------------------------------------------------------------

// Array schema — valid element compiles; invalid element is compile-time error
const arrayElementBlock = block('card', {
  elements: ['header', 'body', 'footer'] as const,
});
expectType<string>(arrayElementBlock('header'));
expectType<string>(arrayElementBlock('body'));
expectType<string>(arrayElementBlock('footer'));
expectError(arrayElementBlock('sidebar'));   // not in schema
expectError(arrayElementBlock('unknown'));   // not in schema

// Root call still works alongside element schema
expectType<string>(arrayElementBlock(null));
expectType<string>(arrayElementBlock(undefined));

// Record schema — element names inferred from keys
const recordElementBlock = block('card', {
  elements: {
    thumbnail: {},
    overlay: {},
  },
});
expectType<string>(recordElementBlock('thumbnail'));
expectType<string>(recordElementBlock('overlay'));
expectError(recordElementBlock('sidebar'));  // not in schema

// Empty array schema — any element string must error
const emptyElementBlock = block('card', { elements: [] as const });
expectError(emptyElementBlock('any'));       // no elements defined

// No schema (default) — any string is allowed
const noSchemaBlock = block('card');
expectType<string>(noSchemaBlock('anything'));  // no restriction

// Wrapper mode — element constraint from array schema
const wrapperStyles: Record<string, string> = {};
const wrapperElementBlock = block(wrapperStyles, {
  elements: ['icon', 'label'] as const,
});
expectType<string>(wrapperElementBlock('icon'));
expectType<string>(wrapperElementBlock('label'));
expectError(wrapperElementBlock('missing'));    // not in schema

// ---------------------------------------------------------------------------
// CORE-03: Modifier schema type tests
// ---------------------------------------------------------------------------

// Boolean modifier
const booleanModBlock = block('card', {
  modifiers: { disabled: true, featured: true },
});
expectType<string>(booleanModBlock(null, { disabled: true }));
expectType<string>(booleanModBlock(null, { disabled: false }));
// Non-boolean value for a boolean modifier is a type error
expectError(booleanModBlock(null, { disabled: 'yes' }));

// Enum modifier (readonly string[])
const enumModBlock = block('card', {
  modifiers: { size: ['sm', 'md', 'lg'] as const },
});
expectType<string>(enumModBlock(null, { size: 'lg' }));
expectType<string>(enumModBlock(null, { size: 'sm' }));
// Value not in the enum is a type error
expectError(enumModBlock(null, { size: 'xl' }));

// Multi-select modifier ({ values, multi: true })
const multiModBlock = block('card', {
  modifiers: { tone: { values: ['info', 'warning', 'error'] as const, multi: true } },
});
// Single string value is OK
expectType<string>(multiModBlock(null, { tone: 'info' }));
// Array of values is OK
expectType<string>(multiModBlock(null, { tone: ['info', 'warning'] as const }));
// Value not in the values list is a type error
expectError(multiModBlock(null, { tone: 'critical' }));

// Single-select modifier ({ values } without multi)
const singleSelectBlock = block('card', {
  modifiers: { status: { values: ['active', 'inactive'] as const } },
});
expectType<string>(singleSelectBlock(null, { status: 'active' }));
expectError(singleSelectBlock(null, { status: 'pending' }));  // not in values

// Custom map modifier ({ map })
const mapModBlock = block('card', {
  modifiers: { size: { map: (v: string) => v.toLowerCase() } },
});
// Any string is accepted for map modifiers
expectType<string>(mapModBlock(null, { size: 'LG' }));
// Non-string value for map modifier is a type error
expectError(mapModBlock(null, { size: true }));

// ---------------------------------------------------------------------------
// CORE-03: Disjoint element modifier enforcement
// ---------------------------------------------------------------------------

// Record-schema element: only element's own modifiers are accepted
const disjointStyles: Record<string, string> = {};
const iconCard = block(disjointStyles, {
  elements: {
    icon: { modifiers: { color: ['primary', 'muted'] as const } },
  },
  modifiers: { featured: true },
});
// Element's own modifier — OK
expectType<string>(iconCard('icon', { color: 'primary' }));
expectType<string>(iconCard('icon', { color: 'muted' }));
// Block-level modifier on element without inherit — type error
expectError(iconCard('icon', { featured: true }));
// Invalid value for element's enum modifier — type error
expectError(iconCard('icon', { color: 'secondary' }));

// Root call still uses block-level modifiers
expectType<string>(iconCard(null, { featured: true }));
expectError(iconCard(null, { color: 'primary' }));  // color is element-only

// b.root() uses block-level modifiers
expectType<string>(iconCard.root({ featured: true }));
expectError(iconCard.root({ color: 'primary' }));  // color is element-only

// ---------------------------------------------------------------------------
// CORE-10: strict inference scenarios (prompt-required)
// ---------------------------------------------------------------------------

const cardStyles: Record<string, string> = {
  card: 'card_hash',
  card__thumbnail: 'card__thumbnail_hash',
};

const card = block(cardStyles, {
  elements: ['thumbnail'] as const,
  modifiers: {
    compact: true,
    status: ['active', 'inactive'] as const,
    size: ['sm', 'md', 'lg'] as const,
  },
});

// Wrapper mode - element inference
expectType<string>(card('thumbnail'));
expectError(card('sidebar'));

// Wrapper mode - modifier inference
expectType<string>(card(null, { compact: true }));
expectError(card(null, { status: 'unknown' }));
expectError(card(null, { size: 'xl' }));

// Disjoint element modifier enforcement
const strictIconCard = block(cardStyles, {
  elements: {
    icon: { modifiers: { color: ['primary', 'muted'] as const } },
  },
  modifiers: { featured: true },
});
expectType<string>(strictIconCard('icon', { color: 'primary' }));
expectError(strictIconCard('icon', { featured: true }));

// Multi-select modifier
const alert = block('alert', {
  modifiers: { tone: { values: ['info', 'warning'] as const, multi: true } },
});
expectType<string>(alert(null, { tone: ['info', 'warning'] }));
expectType<string>(alert(null, { tone: 'info' }));

// b.root() type
expectType<string>(card.root());
expectType<string>(card.root({ compact: true }));

// b.has() type
expectType<boolean>(card.has('thumbnail'));

// b.styles type
expectType<Record<string, string> | null>(card.styles);

// ---------------------------------------------------------------------------
// CORE-10: exported type coverage
// ---------------------------------------------------------------------------

const authorCfg: AuthorConfig = {
  elements: ['header'] as const,
  modifiers: { compact: true },
  __filePath: 'src/Card.ts',
  __salt: 'proj',
};
expectAssignable<AuthorConfig>(authorCfg);

const wrapperCfg: WrapperConfig = {
  elements: { icon: {} },
  modifiers: { size: ['sm', 'lg'] as const },
  naming: 'auto',
};
expectAssignable<WrapperConfig>(wrapperCfg);

const descriptor: BlockDescriptor = {
  name: 'card',
  mode: 'author',
  scopedName: 'card_abc123',
  elements: ['header'],
  modifiers: { compact: true },
};
expectAssignable<BlockDescriptor>(descriptor);

const elementConfig: ElementConfig = {
  modifiers: { tone: ['info', 'warn'] as const },
  inherit: ['featured'],
};
expectAssignable<ElementConfig>(elementConfig);

type ElementSchemaSample = {
  icon: { modifiers: { color: ['primary', 'muted'] } };
};
type ElementNameSample = ElementName<ElementSchemaSample>;
expectType<ElementNameSample>('icon');

type ModSchemaSample = {
  compact: true;
  size: readonly ['sm', 'md'];
  tone: { values: readonly ['info', 'warning']; multi: true };
  mapTone: { map: (value: string) => string };
};

const modSchemaValue: ModifierSchema = {
  compact: true,
  size: ['sm', 'md'] as const,
};
expectAssignable<ModifierSchema>(modSchemaValue);

const modDefValue: ModifierDef = { values: ['info', 'warning'] as const, multi: true };
expectAssignable<ModifierDef>(modDefValue);

const modInputValue: ModifierInput<ModSchemaSample> = {
  compact: true,
  size: 'sm',
  tone: ['info', 'warning'],
  mapTone: 'LOUD',
};
expectAssignable<ModifierInput<ModSchemaSample>>(modInputValue);

const multiValue: ModifierValueOf<{ values: readonly ['info', 'warning']; multi: true }> = [
  'info',
  'warning',
];
expectAssignable<ModifierValueOf<{ values: readonly ['info', 'warning']; multi: true }>>(multiValue);

type ElementCallSample = ElementCallModifiers<
  { icon: { modifiers: { color: readonly ['primary', 'muted'] } } },
  'icon',
  { featured: true }
>;
const elementCallValue: ElementCallSample = { color: 'primary' };
expectAssignable<ElementCallSample>(elementCallValue);

const elementsSchemaValue: ElementsSchema = ['header', 'body'] as const;
expectAssignable<ElementsSchema>(elementsSchemaValue);

