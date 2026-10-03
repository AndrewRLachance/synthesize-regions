# Base Pattern Catalog

The base catalog contains production graph combinators rather than raw-code conveniences. Every code-valued input is a fragment reference. Domain and leaf catalogs are responsible for producing fragments with compatible, self-contained TypeScript and JSON Schema metadata.

Generic templates require explicit `typeArguments` on every graph node. TypeScript descriptors preserve correlated input and output types; JSON Schemas remain conservative fixed contracts.

## Conditions

- in — [`PropertyIn`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- and — [`ConditionAnd`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- or — [`ConditionOr`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- xor — [`ConditionXor`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- xand/xnor — [`ConditionXand`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- not — [`ConditionNot`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- nand — [`ConditionNand`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- nor — [`ConditionNor`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- implication — [`ConditionImplication`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- converse implication — [`ConditionConverseImplication`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- iff — [`ConditionIff`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- non-implication — [`ConditionNonImplication`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- converse non-implication — [`ConditionConverseNonImplication`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- boolean formula application — [`ConditionFormulaCall`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- exists / `some` — [`ArrayExists`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- forall / `every` — [`ArrayForAll`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)

`ConditionXand` and `ConditionIff` intentionally retain separate model identities even though both compile to strict boolean equality.

## Statements and Conditionals

- statement block — [`StatementBlock`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- if — [`IfStatement`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- if/else — [`IfElse`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- recursive if/else-if chain — [`IfElseChain`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- typed ternary chain — [`Ternary`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- object-pattern match with fallback — [`ObjectPatternMatchWithFallback`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)

`ObjectPatternMatchWithFallback` assumes `match` from `ts-pattern` is available in the generated context. Its `matchedHandler` remains callable, while `fallbackResult` accepts an `R` expression and is evaluated lazily through `.otherwise(() => fallbackResult)`. Another `ObjectPatternMatchWithFallback<R>` can therefore connect directly to `fallbackResult`.

Variadic native switch composition is intentionally unsupported. A native case clause is not a statement, and this catalog does not add a `switchCase` region kind or concatenate statement fragments with syntax-bearing separators.

## Arrays, Loops, and Application

- map — [`ArrayMap`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- filter — [`ArrayFilter`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- find — [`ArrayFind`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- find index — [`ArrayFindIndex`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- flat map — [`ArrayFlatMap`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- `forEach` call returning `void` — [`ArrayForEachCall`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- assumed type-sugar extension call — [`TypeSugarExtensionCall`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- while condition holds — [`WhileHolds`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- intentional continuous loop — [`WhileTrue`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- incremental index loop — [`ForIndex`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)
- typed `for...of` loop — [`ForEach`](../core-templates/src/packs/base/e-samplesBasePatterns.ts)

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
