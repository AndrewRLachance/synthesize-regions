const values = [
  "a", 1, someValue
];

const options = {
  mode: "strict",
  count: 3
};

export function make() {
  const total = values.length;
  return { total, options };
}
