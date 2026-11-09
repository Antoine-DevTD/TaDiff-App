import type { ResourceBlock } from "@/types/resources";

export type BlockDestination = { parentId: string; column: 0 | 1 } | null;

export function findResourceBlock(blocks: ResourceBlock[], id: string | null): ResourceBlock | undefined {
  if (!id) return undefined;
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.type === "columns") {
      for (const column of block.columns) {
        const found = findResourceBlock(column, id);
        if (found) return found;
      }
    }
  }
}

export function editResourceBlock(blocks: ResourceBlock[], id: string, edit: (block: ResourceBlock) => ResourceBlock | null): ResourceBlock[] {
  let changed = false;
  const result = blocks.flatMap((block) => {
    if (block.id === id) {
      const edited = edit(block);
      changed ||= edited !== block;
      return edited ? [edited] : [];
    }
    if (block.type !== "columns") return [block];
    const columns = block.columns.map((column) => editResourceBlock(column, id, edit)) as [ResourceBlock[], ResourceBlock[]];
    if (columns.every((column, index) => column === block.columns[index])) return [block];
    changed = true;
    return [{ ...block, columns }];
  });
  return changed ? result : blocks;
}

export function editResourceList(blocks: ResourceBlock[], destination: BlockDestination, edit: (list: ResourceBlock[]) => ResourceBlock[]): ResourceBlock[] {
  if (!destination) return edit(blocks);
  return editResourceBlock(blocks, destination.parentId, (block) => block.type !== "columns" ? block : {
    ...block,
    columns: block.columns.map((column, index) => index === destination.column ? edit(column) : column) as [ResourceBlock[], ResourceBlock[]],
  });
}

export function duplicateResourceBlock(block: ResourceBlock): ResourceBlock {
  return {
    ...structuredClone(block),
    id: crypto.randomUUID(),
    ...(block.type === "columns" ? { columns: block.columns.map((column) => column.map(duplicateResourceBlock)) as [ResourceBlock[], ResourceBlock[]] } : {}),
  } as ResourceBlock;
}

export function resourceBlockCount(blocks: ResourceBlock[]): number {
  return blocks.reduce((count, block) => count + 1 + (block.type === "columns" ? block.columns.reduce((total, column) => total + resourceBlockCount(column), 0) : 0), 0);
}

/** Insert before the target index (in the original list). Reject invalid moves atomically. */
export function placeResourceBlock(blocks: ResourceBlock[], block: ResourceBlock, destination: BlockDestination, index: number): ResourceBlock[] {
  if (!Number.isInteger(index) || index < 0) return blocks;
  const parent = destination ? findResourceBlock(blocks, destination.parentId) : null;
  if (destination && (parent?.type !== "columns" || findResourceBlock([block], destination.parentId))) return blocks;
  const list = parent?.type === "columns" && destination ? parent.columns[destination.column] : blocks;
  if (!list || index > list.length) return blocks;
  const sourceIndex = list.findIndex((item) => item.id === block.id);
  const existing = findResourceBlock(blocks, block.id);
  const without = existing ? editResourceBlock(blocks, block.id, () => null) : blocks;
  const insertAt = sourceIndex >= 0 && sourceIndex < index ? index - 1 : index;
  const next = editResourceList(without, destination, (items) => [...items.slice(0, insertAt), existing || block, ...items.slice(insertAt)]);
  function validDepth(items: ResourceBlock[], depth = 0): boolean {
    return depth <= 2 && items.every((item) => item.type !== "columns" || item.columns.every((column) => !column.length || validDepth(column, depth + 1)));
  }
  if (resourceBlockCount(next) > 80 || !validDepth(next)) return blocks;
  return next;
}
