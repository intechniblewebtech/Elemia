export type InferredNaming = 'bem' | 'camel' | 'dashes';

export interface InferredElement {
  name: string;
  modifiers: string[];
}

export interface InferredBlock {
  name: string;
  modifiers: string[];
}

export interface InferredSchema {
  naming: InferredNaming;
  block: InferredBlock | null;
  elements: InferredElement[];
  classes: string[];
  ambiguous: string[];
}
