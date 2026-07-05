import type { Replacement, ReplacementExpression } from "../core/types.js";
import { isValidIdentifierName, validateIdentifierName } from "../validation/ast.js";

/** Branded-by-convention string intended to be parsed as a TypeScript expression. */
export type ExpressionCode = string;
/** Branded-by-convention string intended to be parsed as one or more statements. */
export type StatementCode = string;
/** Branded-by-convention string intended to be parsed as an object literal member. */
export type ObjectPropertyCode = string;
/** Branded-by-convention string intended to be parsed after an expression receiver. */
export type ExpressionSuffixCode = string;
export type VariableDeclarationKind = "const" | "let" | "var";

export interface ConstStatementOptions {
  /** Variable declaration keyword to emit; defaults to `const`. */
  kind?: VariableDeclarationKind;
}

export interface ObjectPropertyCodeOptions {
  /** Emit `[name]: value` instead of a literal property name. */
  computed?: boolean;
}

export interface ReplacementObjectPropertyOptions {
  /** Emit `[name]: value` instead of a literal property name. */
  computed?: boolean;
}

function joinComma(values: readonly string[]): string {
  return values.join(", ");
}

function quoteString(value: string): string {
  return JSON.stringify(value);
}

function propertyName(name: string): string {
  return isValidIdentifierName(name) ? name : quoteString(name);
}

function isPropertyIdentifierName(name: string): boolean {
  return /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(name);
}

function assertPropertyIdentifierName(name: string): void {
  if (!isPropertyIdentifierName(name)) {
    validateIdentifierName(name);
  }
}

function propertyAccess(object: ExpressionCode, key: string): ExpressionCode {
  return isPropertyIdentifierName(key) ? `${object}.${key}` : `${object}[${quoteString(key)}]`;
}

function assertFiniteNumber(value: number): void {
  if (!Number.isFinite(value)) {
    throw new TypeError("number code values must be finite.");
  }
}

function objectPropertiesFromRecord(properties: Record<string, ExpressionCode>): ObjectPropertyCode[] {
  return Object.entries(properties).map(([name, value]) => `${propertyName(name)}: ${value}`);
}

function isObjectPropertyCodeArray(
  value: Record<string, ExpressionCode> | readonly ObjectPropertyCode[]
): value is readonly ObjectPropertyCode[] {
  return Array.isArray(value);
}

/**
 * Small string builders for composing raw replacement `code` fields.
 *
 * These helpers do not replace TypeScript parsing or validation; generated
 * strings still flow through the normal replacement validation pipeline.
 */
export const code = {
  expr: {
    raw: (value: string): ExpressionCode => value,

    id: (name: string): ExpressionCode => {
      validateIdentifierName(name);
      return name;
    },

    prop: (object: ExpressionCode, key: string): ExpressionCode => propertyAccess(object, key),

    computedProp: (object: ExpressionCode, keyExpression: ExpressionCode): ExpressionCode =>
      `${object}[${keyExpression}]`,

    call: (callee: ExpressionCode, args: readonly ExpressionCode[] = []): ExpressionCode =>
      `${callee}(${joinComma(args)})`,

    array: (elements: readonly ExpressionCode[] = []): ExpressionCode => `[${joinComma(elements)}]`,

    object: (
      properties: Record<string, ExpressionCode> | readonly ObjectPropertyCode[] = {}
    ): ExpressionCode => {
      const serializedProperties = isObjectPropertyCodeArray(properties)
        ? [...properties]
        : objectPropertiesFromRecord(properties);

      return `{ ${joinComma(serializedProperties)} }`;
    },

    string: (value: string): ExpressionCode => quoteString(value),

    number: (value: number): ExpressionCode => {
      assertFiniteNumber(value);
      return String(value);
    },

    boolean: (value: boolean): ExpressionCode => value ? "true" : "false",

    null: (): ExpressionCode => "null",

    paren: (value: ExpressionCode): ExpressionCode => `(${value})`
  },

  suffix: {
    raw: (value: string): ExpressionSuffixCode => value,

    method: (name: string, args: readonly ExpressionCode[] = []): ExpressionSuffixCode => {
      assertPropertyIdentifierName(name);
      return `.${name}(${joinComma(args)})`;
    },

    optionalMethod: (name: string, args: readonly ExpressionCode[] = []): ExpressionSuffixCode => {
      assertPropertyIdentifierName(name);
      return `?.${name}(${joinComma(args)})`;
    },

    prop: (name: string): ExpressionSuffixCode => {
      assertPropertyIdentifierName(name);
      return `.${name}`;
    },

    optionalProp: (name: string): ExpressionSuffixCode => {
      assertPropertyIdentifierName(name);
      return `?.${name}`;
    }
  },

  stmt: {
    raw: (value: string): StatementCode => value,

    expression: (value: ExpressionCode): StatementCode => `${value};`,

    return: (value: ExpressionCode): StatementCode => `return ${value};`,

    const: (name: string, value: ExpressionCode, options: ConstStatementOptions = {}): StatementCode => {
      validateIdentifierName(name);
      return `${options.kind ?? "const"} ${name} = ${value};`;
    },

    block: (statements: readonly StatementCode[]): StatementCode => `{
${statements.join("\n")}
}`
  },

  prop: {
    pair: (
      name: string,
      value: ExpressionCode,
      options: ObjectPropertyCodeOptions = {}
    ): ObjectPropertyCode => options.computed ? `[${name}]: ${value}` : `${propertyName(name)}: ${value}`
  },

  replacement: {
    expression: (value: ExpressionCode): ReplacementExpression => ({
      kind: "expression",
      code: value
    }),

    expressionSuffix: (value: ExpressionSuffixCode): Replacement => ({
      kind: "expressionSuffix",
      code: value
    }),

    statement: (value: StatementCode): Replacement => ({
      kind: "statement",
      code: value
    }),

    objectProperty: (
      name: string,
      value: ReplacementExpression,
      options: ReplacementObjectPropertyOptions = {}
    ): Replacement =>
      options.computed === undefined
        ? { kind: "objectProperty", name, value }
        : { kind: "objectProperty", name, value, computed: options.computed }
  }
} as const;
