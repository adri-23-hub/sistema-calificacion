export function normalizeWeights(value: unknown, keys: readonly string[]): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Pesos inválidos.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== keys.length) throw new Error("Criterios de pesos inválidos.");
  const values = keys.map(key => input[key]);
  if (values.some(v => typeof v !== "number" || !Number.isFinite(v) || v < 0)) throw new Error("Los pesos deben ser números finitos no negativos.");
  const sum = (values as number[]).reduce((a,b) => a+b,0);
  if (Math.abs(sum-1) > 0.0001 && Math.abs(sum-100) > 0.01) throw new Error("Los pesos deben sumar 1 o 100%.");
  return Object.fromEntries(keys.map(key => [key, (input[key] as number)/sum]));
}
export const weightKeys: Record<string, readonly string[]> = {
 "moduleA.weights": ["coreografia", "vestimenta", "entusiasmo"],
 "moduleA.criteria.weights": ["coreografia", "vestimenta", "entusiasmo"],
 "moduleB.criteria.weights": ["porteElegancia", "carismaSimpatia", "autenticidadTraje", "originalidadEstilo"],
 "moduleB.runway.weights": ["GALA", "CASUAL", "TIPICA"],
};
