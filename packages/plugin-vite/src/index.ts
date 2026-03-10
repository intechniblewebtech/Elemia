import { extractStyles, type ExtractedStyleAsset } from './extract';
import { injectFilePath } from './inject';
import {
	createResolverOverlayMessage,
	sendResolverOverlay,
	type ResolverMissPayload,
} from './overlay';

export { findCallSites } from './traverse';
export { injectFilePath } from './inject';
export { extractStyles } from './extract';
export { createResolverOverlayMessage, sendResolverOverlay } from './overlay';
export type { CallSite } from './types';
export type { ExtractedStyleAsset } from './extract';
export type { ResolverMissPayload } from './overlay';

export interface ElemiaVitePluginOptions {
	salt?: string;
	devOverlay?: boolean;
}

export function elemia(options: ElemiaVitePluginOptions = {}) {
	const salt = options.salt ?? '';
	const devOverlayEnabled = options.devOverlay === true;
	let isBuild = false;
	let devServer: { ws?: { send: (payload: { type: 'error'; err: { message: string; stack: string } }) => void } } | null = null;
	const extractedById = new Map<string, ExtractedStyleAsset[]>();

	return {
		name: 'elemia',
		enforce: 'pre' as const,
		configResolved(config: { command: string }) {
			isBuild = config.command === 'build';
		},
		configureServer(server: { ws?: { send: (payload: { type: 'error'; err: { message: string; stack: string } }) => void } }) {
			devServer = server;
		},
		transform(source: string, id: string) {
			const code = injectFilePath(source, id, salt);

			if (isBuild) {
				extractedById.set(id, extractStyles(code, id));
			}

			if (code === source) {
				return null;
			}

			return { code, map: null };
		},
		generateBundle(this: { emitFile: (asset: { type: 'asset'; fileName: string; source: string }) => void }) {
			if (!isBuild) {
				return;
			}

			for (const assets of extractedById.values()) {
				for (const asset of assets) {
					this.emitFile({
						type: 'asset',
						fileName: asset.fileName,
						source: asset.css,
					});

					this.emitFile({
						type: 'asset',
						fileName: `${asset.fileName}.map`,
						source: asset.sourceMap,
					});
				}
			}
		},
		api: {
			reportResolverMiss(payload: ResolverMissPayload) {
				if (isBuild || !devOverlayEnabled) {
					return;
				}

				sendResolverOverlay(devServer, payload);
			},
			formatResolverMiss(payload: ResolverMissPayload) {
				return createResolverOverlayMessage(payload);
			},
		},
	};
}
