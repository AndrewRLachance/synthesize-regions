# TODO

## Synthesis Graph Follow-Ups

- Expand `isTypeCompatible` beyond exact `ts` string equality and the current small JSON Schema subset.
- Add richer LLM-facing `TemplateSummary` serialization so planners can inspect ports without seeing implementation details.
- Support more fragment-to-region conversions when there is a safe structured representation for non-expression region kinds.
- Add stricter `RawCodePolicy` options instead of the current placeholder plus existing syntax/security validation.
- Consider graph normalization utilities for inline nodes and shorthand inputs before compilation.
- Add README examples for union ports and raw-code ports once those APIs harden.
