import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocateGeneratedViewers } from "../src/socialProof.ts";

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe("allocateGeneratedViewers", () => {
  const catalog = [
    { id: "in-stock", stock: 40 },
    { id: "low-stock", stock: 4 },
    { id: "sold-out", stock: 0 },
  ];

  it("spreads exactly baseCount viewers and omits zero product counts", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const result = allocateGeneratedViewers(8, catalog, lcg(seed));
      const productSum = Object.values(result.products).reduce((sum, count) => sum + count, 0);
      const sinkSum = result.sinks.home + result.sinks.shop + result.sinks.news;
      assert.equal(productSum + sinkSum, 8);
      assert.equal(typeof result.sinks.home, "number");
      assert.equal(typeof result.sinks.shop, "number");
      assert.equal(typeof result.sinks.news, "number");
      for (const [id, count] of Object.entries(result.products)) {
        assert.ok(count > 0, `${id} should be omitted when zero`);
        assert.ok(catalog.some((product) => product.id === id));
      }
    }
  });

  it("puts every generated viewer in sinks when the catalog is empty", () => {
    const result = allocateGeneratedViewers(6, [], () => 0);
    assert.equal(result.sinks.home + result.sinks.shop + result.sinks.news, 6);
    assert.deepEqual(result.products, {});
  });

  it("can stack multiple generated viewers on the same product", () => {
    const result = allocateGeneratedViewers(5, [{ id: "only", stock: 10 }], () => 0.99);
    assert.equal(result.products.only, 5);
    assert.equal(result.sinks.home + result.sinks.shop + result.sinks.news, 0);
  });
});
