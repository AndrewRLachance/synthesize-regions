# Base Pattern Catalog

The base catalog contains production graph combinators rather than raw-code conveniences. Every code-valued input is a fragment reference. Domain and leaf catalogs are responsible for producing fragments with compatible, self-contained TypeScript and JSON Schema metadata.

Generic templates require explicit `typeArguments` on every graph node. TypeScript descriptors preserve correlated input and output types; JSON Schemas remain conservative fixed contracts.

## Conditions

- in — [`PropertyIn`](../samples/samplesBasePatterns.ts)
- and — [`ConditionAnd`](../samples/samplesBasePatterns.ts)
- or — [`ConditionOr`](../samples/samplesBasePatterns.ts)
- xor — [`ConditionXor`](../samples/samplesBasePatterns.ts)
- xand/xnor — [`ConditionXand`](../samples/samplesBasePatterns.ts)
- not — [`ConditionNot`](../samples/samplesBasePatterns.ts)
- nand — [`ConditionNand`](../samples/samplesBasePatterns.ts)
- nor — [`ConditionNor`](../samples/samplesBasePatterns.ts)
- implication — [`ConditionImplication`](../samples/samplesBasePatterns.ts)
- converse implication — [`ConditionConverseImplication`](../samples/samplesBasePatterns.ts)
- iff — [`ConditionIff`](../samples/samplesBasePatterns.ts)
- non-implication — [`ConditionNonImplication`](../samples/samplesBasePatterns.ts)
- converse non-implication — [`ConditionConverseNonImplication`](../samples/samplesBasePatterns.ts)
- boolean formula application — [`ConditionFormulaCall`](../samples/samplesBasePatterns.ts)
- exists / `some` — [`ArrayExists`](../samples/samplesBasePatterns.ts)
- forall / `every` — [`ArrayForAll`](../samples/samplesBasePatterns.ts)

`ConditionXand` and `ConditionIff` intentionally retain separate model identities even though both compile to strict boolean equality.

## Statements and Conditionals

- statement block — [`StatementBlock`](../samples/samplesBasePatterns.ts)
- if — [`IfStatement`](../samples/samplesBasePatterns.ts)
- if/else — [`IfElse`](../samples/samplesBasePatterns.ts)
- recursive if/else-if chain — [`IfElseChain`](../samples/samplesBasePatterns.ts)
- typed ternary chain — [`Ternary`](../samples/samplesBasePatterns.ts)
- object-pattern match with fallback — [`ObjectPatternMatchWithFallback`](../samples/samplesBasePatterns.ts)

`ObjectPatternMatchWithFallback` assumes `match` from `ts-pattern` is available in the generated context. Its `matchedHandler` remains callable, while `fallbackResult` accepts an `R` expression and is evaluated lazily through `.otherwise(() => fallbackResult)`. Another `ObjectPatternMatchWithFallback<R>` can therefore connect directly to `fallbackResult`.

Variadic native switch composition is intentionally unsupported. A native case clause is not a statement, and this catalog does not add a `switchCase` region kind or concatenate statement fragments with syntax-bearing separators.

## Arrays, Loops, and Application

- map — [`ArrayMap`](../samples/samplesBasePatterns.ts)
- filter — [`ArrayFilter`](../samples/samplesBasePatterns.ts)
- find — [`ArrayFind`](../samples/samplesBasePatterns.ts)
- find index — [`ArrayFindIndex`](../samples/samplesBasePatterns.ts)
- flat map — [`ArrayFlatMap`](../samples/samplesBasePatterns.ts)
- `forEach` call returning `void` — [`ArrayForEachCall`](../samples/samplesBasePatterns.ts)
- assumed type-sugar extension call — [`TypeSugarExtensionCall`](../samples/samplesBasePatterns.ts)
- while condition holds — [`WhileHolds`](../samples/samplesBasePatterns.ts)
- intentional continuous loop — [`WhileTrue`](../samples/samplesBasePatterns.ts)
- incremental index loop — [`ForIndex`](../samples/samplesBasePatterns.ts)
- typed `for...of` loop — [`ForEach`](../samples/samplesBasePatterns.ts)

Array inputs are readonly. Callback return values are ignored by statement-level loops. `WhileTrue` provides no normal termination mechanism; its application must throw, never return, or terminate through external behavior.

## Chaining

Chaining uses ordinary fragment compatibility rather than a separate chain region:

- condition outputs can feed boolean inputs on other condition templates;
- `IfElseChain.otherwise` accepts another `IfElseChain`, `IfStatement`, `IfElse`, or `StatementBlock`;
- either `Ternary<T>` result branch can accept another `Ternary<T>`;
- `ObjectPatternMatchWithFallback<R>.fallbackResult` can accept another object-pattern match with the same `R`;
- array operations returning arrays can feed compatible readonly-array inputs when their concrete type arguments align;
- `TypeSugarExtensionCall` can feed another extension call through its `receiver` port.

Scalar and `void` array results such as `ArrayFind`, `ArrayFindIndex`, and `ArrayForEachCall` are terminal with respect to array-operation chaining unless another domain template explicitly accepts those result types.
