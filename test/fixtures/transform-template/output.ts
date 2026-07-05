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
  mode: "strict",
  retries: 2
};

export function transform(input: Input): Output {
  const value = compute(
    input, input.foo + 1
  );

  const label = input.bar.toUpperCase();
  return { value, label, meta: baseConfig };
}
