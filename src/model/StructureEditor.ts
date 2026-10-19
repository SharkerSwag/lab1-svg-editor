import { Group } from './Group.js';
import type { Shape } from './Shape.js';
import type { SvgDocument } from './SvgDocument.js';

export class StructureEditor {
  constructor(private readonly document: SvgDocument) {}

  group(newId: string, ids: readonly string[]): void {
    const group = new Group(newId);
    if (this.document.has(newId)) { throw new Error(`id already exists: ${newId}`); }
    if (ids.length < 2) { throw new Error('group requires at least two shapes'); }
    const unique = new Set<string>();
    for (const id of ids) {
      this.document.shape(id);
      if (unique.has(id)) { throw new Error(`duplicate shape id: ${id}`); }
      unique.add(id);
    }
    for (const id of ids) {
      if (ids.some((other) => other !== id && this.isAncestor(id, other))) {
        throw new Error(`cannot group a container into its own descendant: ${id}`);
      }
    }

    const parent = this.commonParent(ids);
    const insertion = Math.min(...ids.map((id) => this.document.positionOf(this.branchUnder(id, parent))));
    const selected = [...this.preorder(this.document.children)].filter((shape) => unique.has(shape.id));
    for (const shape of selected) { group.insert(shape); }
    for (const shape of selected) { this.document.remove(shape.id); }
    this.document.add(group, parent, insertion);
  }

  ungroup(id: string): void {
    const group = this.document.shape(id).asGroup();
    const parent = this.document.parentOf(id);
    if (parent === undefined) { throw new Error(`cannot ungroup top-level container: ${id}`); }
    const insertion = this.document.positionOf(id);
    this.document.remove(id);
    group.children.forEach((child, offset) => this.document.add(child, parent, insertion + offset));
  }

  addTo(groupId: string, id: string): void {
    if (!this.document.has(groupId)) { throw new Error(`no such container: ${groupId}`); }
    this.document.shape(groupId).asGroup();
    const shape = this.document.shape(id);
    if (id === groupId || this.isAncestor(id, groupId)) {
      throw new Error(`cannot move a container into its own descendant: ${id}`);
    }
    this.document.remove(id);
    this.document.add(shape, groupId);
  }

  reorder(id: string, front: boolean): void {
    const shape = this.document.shape(id);
    const parent = this.document.parentOf(id);
    this.document.remove(id);
    this.document.add(shape, parent, front ? undefined : 0);
  }

  private isAncestor(ancestor: string, id: string): boolean {
    let current = this.document.parentOf(id);
    while (current !== undefined) {
      if (current === ancestor) { return true; }
      current = this.document.parentOf(current);
    }
    return false;
  }

  private commonParent(ids: readonly string[]): string | undefined {
    let parent = this.document.parentOf(ids[0]!);
    while (parent !== undefined && !ids.every((id) => this.isAncestor(parent!, id))) {
      parent = this.document.parentOf(parent);
    }
    return parent;
  }

  private branchUnder(id: string, parent: string | undefined): string {
    let branch = id;
    while (this.document.parentOf(branch) !== parent) { branch = this.document.parentOf(branch)!; }
    return branch;
  }

  private *preorder(shapes: readonly Shape[]): Generator<Shape> {
    for (const shape of shapes) { yield shape; yield* this.preorder(shape.children); }
  }
}
