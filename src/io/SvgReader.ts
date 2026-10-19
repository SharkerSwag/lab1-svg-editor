import { DOMParser, type Element, type Node } from '@xmldom/xmldom';
import type { LoadedDocument } from '../model/LoadedDocument.js';
import { Numbers } from '../model/Numbers.js';
import { Shape } from '../model/Shape.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { SvgDocument } from '../model/SvgDocument.js';
import { Translation } from './Translation.js';
import { XmlEscaper } from './XmlEscaper.js';

export class SvgReader {
  private readonly svgNamespace = 'http://www.w3.org/2000/svg';
  private readonly metadata = new Set(['title', 'desc', 'metadata']);

  constructor(private readonly factory = new ShapeFactory()) {}

  read(xml: string): LoadedDocument {
    new XmlEscaper().validate(xml);
    const parsed = new DOMParser({
      onError: (_level, message) => { throw new Error(message); },
      normalizeLineEndings: (source) => source.replace(/\r\n?/gu, '\n'),
    })
      .parseFromString(xml, 'application/xml');
    const root = parsed.documentElement;
    if (parsed.doctype !== null) { throw new Error('DTD is not supported'); }
    if (root === null || root.localName !== 'svg') { throw new Error('expected an SVG root'); }
    this.checkNamespace(root);
    const rootAttributes = this.attributes(root);
    const viewBox = rootAttributes.get('viewBox')?.trim().split(/[\s,]+/u).map((value) => Numbers.parse(value, 'viewBox'));
    if (viewBox !== undefined && viewBox.length !== 4) { throw new Error('viewBox must contain four numbers'); }
    const width = this.length(rootAttributes.get('width'), viewBox?.[2] ?? 800, 'canvas width');
    const height = this.length(rootAttributes.get('height'), viewBox?.[3] ?? 600, 'canvas height');
    if (viewBox !== undefined && (viewBox[0] !== 0 || viewBox[1] !== 0 || viewBox[2] !== width || viewBox[3] !== height)) {
      throw new Error('unsupported viewBox: expected 0 0 width height');
    }
    const inherited = new Map<string, string>();
    const warnings: string[] = [];
    const common = new Set(['fill', 'stroke', 'stroke-width', ...Shape.presentationNames]);
    for (const [name, value] of rootAttributes) {
      if (common.has(name)) { inherited.set(name, value); }
      else if (name === 'id') { warnings.push('warning: root svg id is not used for shape addressing'); }
      else if (!new Set(['width', 'height', 'viewBox', 'version', 'transform']).has(name)) {
        throw new Error(`unsupported SVG root attribute: ${name}`);
      }
    }
    const rootElements = this.elements(root);
    const allElements = [...this.walk(rootElements)];
    const used = new Set<string>();
    for (const element of allElements) {
      this.checkNamespace(element);
      if (element.hasAttribute('id')) {
        const id = element.getAttribute('id')!;
        if (id.length === 0 || /\s/u.test(id)) { throw new Error('id must be non-empty and contain no whitespace'); }
        if (used.has(id)) { throw new Error(`id already exists: ${id}`); }
        used.add(id);
      }
    }
    const ids = new Map<Element, string>();
    const counters = new Map<string, number>();
    for (const element of allElements) {
      let id = element.getAttribute('id');
      if (!element.hasAttribute('id')) {
        let serial = counters.get(this.tag(element)) ?? 0;
        do { serial += 1; id = `${this.tag(element)}${serial}`; } while (used.has(id!));
        counters.set(this.tag(element), serial);
        used.add(id!);
        warnings.push(`warning: assigned id ${id} to unnamed <${element.localName}>`);
      }
      ids.set(element, id!);
    }
    const document = new SvgDocument(width, height);
    const translation = Translation.parse(rootAttributes.get('transform') ?? '');
    this.checkContainerText(root);
    for (const element of rootElements) {
      document.add(this.readShape(element, ids, translation, inherited, warnings));
    }
    return { document, warnings };
  }

  private readShape(
    element: Element,
    ids: ReadonlyMap<Element, string>,
    parentTranslation: Translation,
    inherited: ReadonlyMap<string, string>,
    warnings: string[],
  ): Shape {
    const explicit = this.attributes(element);
    const attributes = new Map([...inherited, ...explicit]);
    const translation = parentTranslation.combined(Translation.parse(explicit.get('transform') ?? ''));
    const content = Array.from(element.childNodes).filter((node) => node.nodeType === 3 || node.nodeType === 4)
      .map((node) => node.nodeValue ?? '').join('');
    let shape = this.factory.fromSvg(this.tag(element), ids.get(element)!, attributes, content);
    const allowed = new Set(['id', 'fill', 'stroke', 'stroke-width', 'transform', ...shape.geometry.keys(), ...Shape.presentationNames]);
    for (const [name, value] of attributes) {
      if (Shape.presentationNames.has(name)) { shape = shape.withPresentation(name, value); }
      else if (name === 'data-kind') {
        warnings.push(`warning: ${shape.label} data-kind=${JSON.stringify(value)} loaded as ordinary ${shape.tag}`);
      } else if (!allowed.has(name)) { throw new Error(`unsupported attribute: ${name}`); }
    }
    const children = this.elements(element);
    if (shape.text === undefined) { this.checkContainerText(element); }
    if (children.length > 0) {
      const group = shape.asGroup();
      for (const child of children) { group.insert(this.readShape(child, ids, translation, new Map(), warnings)); }
      return group;
    }
    return translation.dx === 0 && translation.dy === 0 ? shape : shape.moved(translation.dx, translation.dy);
  }

  private length(value: string | undefined, fallback: number, name: string): number {
    return value === undefined ? fallback : Numbers.parse(value.trim().replace(/px$/u, ''), name);
  }

  private attributes(element: Element): Map<string, string> {
    return new Map(Array.from(element.attributes)
      .filter((attribute) => attribute.name !== 'xmlns' && !attribute.name.startsWith('xmlns:'))
      .map((attribute) => [attribute.name, attribute.value]));
  }

  private elements(node: Node): Element[] {
    return Array.from(node.childNodes).filter((child): child is Element => child.nodeType === 1)
      .filter((element) => !this.metadata.has(this.tag(element)));
  }

  private tag(element: Element): string { return element.localName ?? element.tagName; }

  private *walk(elements: readonly Element[]): Generator<Element> {
    for (const element of elements) { yield element; yield* this.walk(this.elements(element)); }
  }

  private checkNamespace(element: Element): void {
    if (element.namespaceURI !== null && element.namespaceURI !== '' && element.namespaceURI !== this.svgNamespace) {
      throw new Error(`unsupported namespace: ${element.namespaceURI}`);
    }
  }

  private checkContainerText(element: Element): void {
    if (Array.from(element.childNodes).some((child) => (child.nodeType === 3 || child.nodeType === 4) && (child.nodeValue ?? '').trim() !== '')) {
      throw new Error(`unexpected text inside <${element.localName}>`);
    }
  }
}
