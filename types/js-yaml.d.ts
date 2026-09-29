/**
 * Ambient type definitions for js-yaml v4.x
 */

declare module 'js-yaml' {
  export interface DumpOptions {
    indent?: number;
    noArrayIndent?: boolean;
    skipInvalid?: boolean;
    flowLevel?: number;
    styles?: Record<string, unknown>;
    schema?: unknown;
    sortKeys?: boolean | ((a: string, b: string) => number);
    lineWidth?: number;
    noRefs?: boolean;
    noCompatMode?: boolean;
    condenseFlow?: boolean;
    quotingType?: '"' | "'";
    forceQuotes?: boolean;
    replacer?: (key: string, value: unknown) => unknown;
  }

  export interface LoadOptions {
    filename?: string;
    onWarning?: (e: YAMLException) => void;
    schema?: unknown;
    json?: boolean;
    listener?: (op: string, state: unknown) => void;
  }

  export class YAMLException extends Error {
    name: string;
    message: string;
    reason: string;
    mark?: {
      name: string | null;
      buffer: string;
      position: number;
      line: number;
      column: number;
      snippet?: string;
    };
  }

  export function load(str: string, opts?: LoadOptions): unknown;
  export function loadAll(str: string, iterator?: (doc: unknown) => void, opts?: LoadOptions): unknown[];
  export function dump(obj: unknown, opts?: DumpOptions): string;

  export const DEFAULT_SCHEMA: unknown;
  export const CORE_SCHEMA: unknown;
  export const FAILSAFE_SCHEMA: unknown;
  export const JSON_SCHEMA: unknown;
}
