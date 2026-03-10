#!/usr/bin/env node

import { check } from './commands/check';
import { compare } from './commands/compare';
import { convert } from './commands/convert';
import { generateTypes } from './commands/generate-types';
import { manifest } from './commands/manifest';
import {
  EXIT_SUCCESS,
  EXIT_USAGE_ERROR,
  EXIT_VALIDATION_ERROR,
  renderCommandHelp,
  renderHelp,
} from './help';

export interface CliIO {
  out: (message: string) => void;
  err: (message: string) => void;
}

interface ParsedFlags {
  strict: boolean;
  json: boolean;
  dryRun: boolean;
  replace: boolean;
  cwd?: string;
  help: boolean;
}

function parseFlags(args: string[]): { positionals: string[]; flags: ParsedFlags } {
  const positionals: string[] = [];
  const flags: ParsedFlags = {
    strict: false,
    json: false,
    dryRun: false,
    replace: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--strict') {
      flags.strict = true;
      continue;
    }

    if (arg === '--json') {
      flags.json = true;
      continue;
    }

    if (arg === '--dry-run') {
      flags.dryRun = true;
      continue;
    }

    if (arg === '--replace') {
      flags.replace = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      flags.help = true;
      continue;
    }

    if (arg === '--cwd') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --cwd');
      }
      flags.cwd = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`);
    }

    positionals.push(arg);
  }

  return { positionals, flags };
}

export async function runCli(argv: string[], io: CliIO = {
  out: (message) => process.stdout.write(`${message}\n`),
  err: (message) => process.stderr.write(`${message}\n`),
}): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === '--help' || command === '-h') {
    io.out(renderHelp());
    return EXIT_SUCCESS;
  }

  let parsed;
  try {
    parsed = parseFlags(rest);
  } catch (error) {
    io.err(error instanceof Error ? error.message : 'Invalid CLI arguments.');
    io.err(renderCommandHelp(command));
    return EXIT_USAGE_ERROR;
  }

  const { positionals, flags } = parsed;

  if (flags.help) {
    io.out(renderCommandHelp(command));
    return EXIT_SUCCESS;
  }

  try {
    if (command === 'generate-types') {
      if (positionals.length === 0) {
        io.err(renderCommandHelp(command));
        return EXIT_USAGE_ERROR;
      }

      await generateTypes(positionals, {
        dryRun: flags.dryRun,
        ...(flags.cwd ? { cwd: flags.cwd } : {}),
      });
      return EXIT_SUCCESS;
    }

    if (command === 'check') {
      const cssFile = positionals[0];
      const schemaFile = positionals[1];
      if (!cssFile) {
        io.err(renderCommandHelp(command));
        return EXIT_USAGE_ERROR;
      }

      const result = await check(cssFile, schemaFile, {
        strict: flags.strict,
        json: flags.json,
      });

      io.out(result.output);
      return result.exitCode === 1 ? EXIT_VALIDATION_ERROR : EXIT_SUCCESS;
    }

    if (command === 'manifest') {
      const [input, outFile] = positionals;
      if (!input || !outFile) {
        io.err(renderCommandHelp(command));
        return EXIT_USAGE_ERROR;
      }

      const result = await manifest(input, outFile, flags.cwd ? { cwd: flags.cwd } : {});
      io.out(JSON.stringify(result, null, 2));
      return EXIT_SUCCESS;
    }

    if (command === 'convert') {
      const [input] = positionals;
      if (!input) {
        io.err(renderCommandHelp(command));
        return EXIT_USAGE_ERROR;
      }

      const result = await convert(input, {
        replace: flags.replace,
        ...(flags.cwd ? { cwd: flags.cwd } : {}),
      });

      io.out(JSON.stringify(result, null, 2));
      return EXIT_SUCCESS;
    }

    if (command === 'compare') {
      const [originalCssFile, convertedBlockTsFile] = positionals;
      if (!originalCssFile || !convertedBlockTsFile) {
        io.err(renderCommandHelp(command));
        return EXIT_USAGE_ERROR;
      }

      const result = await compare(originalCssFile, convertedBlockTsFile, {
        strict: flags.strict,
      });

      io.out(result.output);
      return result.exitCode === 1 ? EXIT_VALIDATION_ERROR : EXIT_SUCCESS;
    }

    io.err(renderHelp());
    return EXIT_USAGE_ERROR;
  } catch (error) {
    io.err(error instanceof Error ? error.message : 'Command failed.');
    return EXIT_USAGE_ERROR;
  }
}
