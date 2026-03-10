import { block } from '../../src';

const sharedSchema = {
  elements: ['title', 'body', 'footer', 'media'] as const,
  modifiers: {
    active: true,
    elevated: true,
    size: ['xs', 'sm', 'md', 'lg', 'xl'] as const,
    tone: ['neutral', 'brand', 'success', 'warning', 'danger'] as const,
    intent: {
      values: ['primary', 'secondary', 'tertiary'] as const,
    },
    state: {
      values: ['idle', 'loading', 'disabled'] as const,
      multi: true,
    },
    density: {
      map: (value: string) => value.trim().toLowerCase(),
    },
  },
} as const;

export const blocks = [
  block('bench-card-01', sharedSchema),
  block('bench-card-02', sharedSchema),
  block('bench-card-03', sharedSchema),
  block('bench-card-04', sharedSchema),
  block('bench-card-05', sharedSchema),
  block('bench-card-06', sharedSchema),
  block('bench-card-07', sharedSchema),
  block('bench-card-08', sharedSchema),
  block('bench-card-09', sharedSchema),
  block('bench-card-10', sharedSchema),
  block('bench-card-11', sharedSchema),
  block('bench-card-12', sharedSchema),
  block('bench-card-13', sharedSchema),
  block('bench-card-14', sharedSchema),
  block('bench-card-15', sharedSchema),
  block('bench-card-16', sharedSchema),
  block('bench-card-17', sharedSchema),
  block('bench-card-18', sharedSchema),
  block('bench-card-19', sharedSchema),
  block('bench-card-20', sharedSchema),
  block('bench-card-21', sharedSchema),
  block('bench-card-22', sharedSchema),
  block('bench-card-23', sharedSchema),
  block('bench-card-24', sharedSchema),
  block('bench-card-25', sharedSchema),
  block('bench-card-26', sharedSchema),
  block('bench-card-27', sharedSchema),
  block('bench-card-28', sharedSchema),
  block('bench-card-29', sharedSchema),
  block('bench-card-30', sharedSchema),
  block('bench-card-31', sharedSchema),
  block('bench-card-32', sharedSchema),
  block('bench-card-33', sharedSchema),
  block('bench-card-34', sharedSchema),
  block('bench-card-35', sharedSchema),
  block('bench-card-36', sharedSchema),
  block('bench-card-37', sharedSchema),
  block('bench-card-38', sharedSchema),
  block('bench-card-39', sharedSchema),
  block('bench-card-40', sharedSchema),
  block('bench-card-41', sharedSchema),
  block('bench-card-42', sharedSchema),
  block('bench-card-43', sharedSchema),
  block('bench-card-44', sharedSchema),
  block('bench-card-45', sharedSchema),
  block('bench-card-46', sharedSchema),
  block('bench-card-47', sharedSchema),
  block('bench-card-48', sharedSchema),
  block('bench-card-49', sharedSchema),
  block('bench-card-50', sharedSchema),
  block('bench-card-51', sharedSchema),
  block('bench-card-52', sharedSchema),
  block('bench-card-53', sharedSchema),
  block('bench-card-54', sharedSchema),
  block('bench-card-55', sharedSchema),
] as const;

export function renderFixtureSamples(): string[] {
  return blocks.map((b, index) => {
    const root = b(null, {
      active: index % 2 === 0,
      elevated: index % 3 === 0,
      size: 'md',
      tone: index % 2 === 0 ? 'brand' : 'neutral',
      intent: 'primary',
      state: ['idle', 'loading'],
      density: 'compact',
    });

    const title = b('title', {
      state: ['idle'],
      density: 'spacious',
    });

    return `${root} ${title}`;
  });
}

void renderFixtureSamples;
