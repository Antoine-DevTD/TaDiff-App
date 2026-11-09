import assert from "node:assert/strict";
import test from "node:test";
import { createResourceBlock } from "../../lib/resources.ts";
import * as tree from "../../components/resources/editor-tree.ts";

test("déposer et déplacer préserve les identifiants et l’ordre entre colonnes", () => {
  const a = createResourceBlock("text"), b = createResourceBlock("link"), columns = createResourceBlock("columns");
  const original = [a, b, columns];
  const moved = tree.placeResourceBlock(original, b, { parentId: columns.id, column: 1 }, 0);
  assert.deepEqual(moved.map(item => item.id), [a.id, columns.id]);
  assert.equal(moved[1].columns[1][0], b);
  const returned = tree.placeResourceBlock(moved, b, null, 0);
  assert.deepEqual(returned.map(item => item.id), [b.id, a.id, columns.id]);
  assert.equal(returned[2].columns[1].length, 0);
  assert.deepEqual(tree.placeResourceBlock(original, a, null, 2).map(item => item.id), [b.id, a.id, columns.id]);
});

test("un dépôt invalide ne perd rien : cycle, parent absent, profondeur, limite", () => {
  const text = createResourceBlock("text"), inner = { ...createResourceBlock("columns"), columns: [[text], []] };
  const outer = { ...createResourceBlock("columns"), columns: [[inner], []] }, original = [outer];
  assert.equal(tree.placeResourceBlock(original, outer, { parentId: inner.id, column: 1 }, 0), original);
  assert.equal(tree.placeResourceBlock(original, text, { parentId: "missing", column: 0 }, 0), original);
  const extra = { ...createResourceBlock("columns"), columns: [[createResourceBlock("text")], []] };
  assert.equal(tree.placeResourceBlock(original, extra, { parentId: inner.id, column: 0 }, 0), original);
  const full = Array.from({ length: 80 }, () => createResourceBlock("text"));
  assert.equal(tree.placeResourceBlock(full, text, null, 0), full);
});
