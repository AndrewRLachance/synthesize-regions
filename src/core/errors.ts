import type { MarkerArity, MarkerExpectedKind } from "./types.js";

/**
 * Context attached to package-specific errors.
 *
 * Offsets are zero-based character positions in the source text that was
 * passed by the caller, except when explicitly attached to an internal wrapper.
 */
export interface ErrorMetadata {
  id?: string;
  expectedKind?: MarkerExpectedKind;
  arity?: MarkerArity;
  replacementKind?: string;
  filePath?: string;
  line?: number;
  column?: number;
  start?: number;
  end?: number;
  bodyText?: string;
}

/**
 * Base class for all errors thrown intentionally by synthesize-regions.
 */
export class SynthesizeRegionsError extends Error {
  readonly metadata: ErrorMetadata;

  constructor(message: string, metadata: ErrorMetadata = {}) {
    super(message);
    this.name = new.target.name;
    this.metadata = metadata;
  }
}

/** A marker ID was discovered but no replacement value was provided. */
export class MissingReplacementError extends SynthesizeRegionsError {}
/** A replacement-map key did not correspond to any discovered marker ID. */
export class UnusedReplacementError extends SynthesizeRegionsError {}
/** Marker comments were malformed, unmatched, or overlapping. */
export class InvalidReplacementRegionError extends SynthesizeRegionsError {}
/** Nested replacement regions are rejected to keep replacement ordering simple. */
export class NestedReplacementRegionError extends SynthesizeRegionsError {}
/** A marker comment did not match the supported `@TYPE ... id=...` grammar. */
export class InvalidMarkerSyntaxError extends SynthesizeRegionsError {}
/** A marker requested an unknown expected kind. */
export class InvalidMarkerTypeError extends SynthesizeRegionsError {}
/** A marker used unsupported arity, such as `expressionSuffix[]`. */
export class InvalidMarkerArityError extends SynthesizeRegionsError {}
/** The placeholder body is not valid in the declared or inferred AST context. */
export class InvalidPlaceholderContextError extends SynthesizeRegionsError {}
/** A replacement kind is incompatible with the marker kind. */
export class InvalidReplacementKindError extends SynthesizeRegionsError {}
/** Raw replacement code failed TypeScript syntax validation. */
export class InvalidReplacementSyntaxError extends SynthesizeRegionsError {}
/** A marker ID, generated identifier, or identifier-oriented builder value is invalid. */
export class InvalidIdentifierError extends SynthesizeRegionsError {}
/** Many markers require at least one replacement item. */
export class EmptyManyReplacementError extends SynthesizeRegionsError {}
/** Raw replacement code violated the configured security policy. */
export class SecurityPolicyViolationError extends SynthesizeRegionsError {}
/** Generated output failed final syntactic or semantic validation. */
export class FinalValidationError extends SynthesizeRegionsError {}
/** A `@TEMPLATE` boundary was malformed, unmatched, or duplicated. */
export class InvalidSourceTemplateBoundaryError extends SynthesizeRegionsError {}
/** Source-template boundaries cannot be nested. */
export class NestedSourceTemplateBoundaryError extends SynthesizeRegionsError {}
