import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Root } from 'mdast';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

export function parseMarkdown(markdown: string): Root {
  const tree = processor.parse(markdown);
  return processor.runSync(tree) as Root;
}
