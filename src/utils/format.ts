export function formatFloat(x: number, decimal: number = 2) {
  let p = Math.pow(10, decimal);
  return Math.round(x * p) / p;
}
