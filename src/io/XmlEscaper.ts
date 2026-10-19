export class XmlEscaper {
  validate(value: string): void {
    if (/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(value)) {
      throw new Error('text contains a character not allowed in XML 1.0');
    }
  }

  text(value: string): string {
    this.validate(value);
    return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/\r/gu, '&#13;');
  }

  attribute(value: string): string {
    return this.text(value).replace(/"/gu, '&quot;').replace(/'/gu, '&apos;')
      .replace(/\n/gu, '&#10;').replace(/\t/gu, '&#9;');
  }
}
