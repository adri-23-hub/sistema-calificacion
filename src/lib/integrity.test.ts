import { expect, it } from "vitest";
import { computePayloadHash } from "./crypto";
import { normalizeWeights } from "./config-weights";
it("sella criterios anidados y distingue redistribuciones de puntos", () => {
 const a={ items: [{ criterionId: "a", points: 2 }, { criterionId: "b", points: 8 }], total: 10 };
 const b={ items: [{ criterionId: "a", points: 8 }, { criterionId: "b", points: 2 }], total: 10 };
 expect(computePayloadHash(a)).not.toBe(computePayloadHash(b));
 expect(computePayloadHash(a)).toBe(computePayloadHash({total:10,items:a.items}));
 expect(computePayloadHash(a)).toMatch(/^v2:/);
});
it("normaliza el conjunto 1%,49%,50%",()=>{expect(normalizeWeights({a:1,b:49,c:50},["a","b","c"])).toEqual({a:0.01,b:0.49,c:0.5});});
it.each([{a:-1,b:2}, {a:NaN,b:1}, {a:Infinity,b:0}, {a:20,b:30}])("rechaza pesos inválidos %j",v=>{expect(()=>normalizeWeights(v,["a","b"])).toThrow();});
