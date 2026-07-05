export interface Input {
  foo: number;
  bar: string;
}

export interface Output {
  value: number;
  label: string;
  meta: Record<string, unknown>;
}

const baseConfig = {
  /** @TYPE objectProperty[] id=configProps **//** @END **/
};

export function transform(input: Input): Output {
  const value = compute(
    /** @TYPE expression[] id=args **//** @END **/
  );

  /** @TYPE statement[] id=body **/
  throw new Error("todo");
  /** @END **/
}
