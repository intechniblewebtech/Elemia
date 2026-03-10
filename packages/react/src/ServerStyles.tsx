import { StyleContext } from './context';

export interface ServerStylesProps {
  nonce?: string;
}

export function ServerStyles({ nonce }: ServerStylesProps = {}) {
  return (
    <StyleContext.Consumer>
      {(context) => {
        const effectiveNonce = nonce ?? context.nonce;
        const blocks = [...context.ssrBuffer.entries()].sort(([left], [right]) =>
          left.localeCompare(right),
        );

        if (blocks.length === 0) {
          return null;
        }

        return (
          <>
            {blocks.map(([blockName, css]) => (
              <style
                key={blockName}
                data-elemia-block={blockName}
                nonce={effectiveNonce}
                dangerouslySetInnerHTML={{ __html: css }}
              />
            ))}
          </>
        );
      }}
    </StyleContext.Consumer>
  );
}
