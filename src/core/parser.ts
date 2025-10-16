import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Root } from 'mdast';
import { sanitizeIncompleteMarkdown } from './incomplete-markdown';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

export function parseMarkdown(markdown: string): Root {
  const safeMarkdown = sanitizeIncompleteMarkdown(markdown);
  const tree = processor.parse(safeMarkdown);
  return processor.runSync(tree) as Root;
}
