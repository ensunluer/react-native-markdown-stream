import { Fragment, isValidElement, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type {
  Blockquote,
  Code,
  Content,
  Heading,
  Image,
  Link,
  List,
  ListItem,
  Paragraph,
  Root,
  Text as TextNode,
} from 'mdast';
import type { Parent } from 'unist';
import { CodeBlock, type CodeBlockProps } from './CodeBlock';
import { MathBlock, type MathBlockProps } from './MathBlock';
import { TextBlock } from './TextBlock';
import { resolveTheme, type MarkdownTheme, type ThemePreference } from '../core/themes';

export interface MarkdownRendererComponents {
  codeBlock?: (props: CodeBlockProps) => ReactNode;
  inlineCode?: (props: { value: string; theme: MarkdownTheme }) => ReactNode;
  mathBlock?: (props: MathBlockProps) => ReactNode;
  mathInline?: (props: MathBlockProps) => ReactNode;
}

export interface MarkdownRendererProps {
  ast: Root;
  theme?: ThemePreference;
  components?: MarkdownRendererComponents;
  onLinkPress?: (url: string) => void;
  showCodeLineNumbers?: boolean;
}

interface RenderContext {
  inList?: boolean;
  inBlockquote?: boolean;
}

type InlineNode =
  | TextNode
  | Extract<Content, { type: 'strong' | 'emphasis' | 'delete' | 'inlineCode' | 'link' | 'break' | 'inlineMath' }>;

const INLINE_NODE_TYPES = new Set([
  'text',
  'strong',
  'emphasis',
  'delete',
  'inlineCode',
  'link',
  'break',
  'inlineMath',
]);

export function MarkdownRenderer({
  ast,
  theme,
  components,
  onLinkPress,
  showCodeLineNumbers = false,
}: MarkdownRendererProps) {
  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  const openLink = async (url: string) => {
    if (onLinkPress) {
      onLinkPress(url);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.warn('[react-native-markdown-stream] Failed to open link', error);
    }
  };

  const renderInlineChildren = (parent: Parent, keyPrefix: string): ReactNode[] =>
    parent.children.map((child, index) => renderInlineNode(child as InlineNode, `${keyPrefix}-${index}`));

  const renderInlineNode = (node: InlineNode, key: string): ReactNode => {
    switch (node.type) {
      case 'text':
        return (
          <Text key={key} style={[styles.paragraphText, { color: resolvedTheme.textColor }]}>
            {(node as TextNode).value}
          </Text>
        );
      case 'strong':
        return (
          <Text key={key} style={[styles.paragraphText, styles.bold, { color: resolvedTheme.textColor }]}>
            {renderInlineChildren(node as Parent, key)}
          </Text>
        );
      case 'emphasis':
        return (
          <Text key={key} style={[styles.paragraphText, styles.italic, { color: resolvedTheme.textColor }]}>
            {renderInlineChildren(node as Parent, key)}
          </Text>
        );
      case 'delete':
        return (
          <Text key={key} style={[styles.paragraphText, styles.strikethrough, { color: resolvedTheme.textColor }]}>
            {renderInlineChildren(node as Parent, key)}
          </Text>
        );
      case 'inlineCode': {
        const inlineCode = node as Extract<InlineNode, { type: 'inlineCode' }>;
        if (components?.inlineCode) {
          return (
            <Fragment key={key}>
              {components.inlineCode({ value: inlineCode.value, theme: resolvedTheme })}
            </Fragment>
          );
        }
        return (
          <Text
            key={key}
            style={[
              styles.inlineCode,
              {
                backgroundColor: resolvedTheme.codeBackgroundColor,
                color: resolvedTheme.codeTextColor,
              },
            ]}
          >
            {inlineCode.value}
          </Text>
        );
      }
      case 'link': {
        const linkNode = node as Link;
        return (
          <Text
            key={key}
            style={[styles.paragraphText, styles.link, { color: resolvedTheme.linkColor }]}
            onPress={() => {
              void openLink(linkNode.url);
            }}
          >
            {renderInlineChildren(linkNode, key)}
          </Text>
        );
      }
      case 'break':
        return (
          <Text key={key} style={[styles.paragraphText, { color: resolvedTheme.textColor }]}>
            {'\n'}
          </Text>
        );
      case 'inlineMath': {
        const value = (node as any).value ?? '';
        if (components?.mathInline) {
          return (
            <Fragment key={key}>
              {components.mathInline({ value, inline: true, theme: resolvedTheme })}
            </Fragment>
          );
        }
        return <MathBlock key={key} value={value} inline theme={resolvedTheme} />;
      }
      default:
        return null;
    }
  };

  const renderParagraph = (paragraph: Paragraph, key: string, context?: RenderContext) => {
    const children = renderInlineChildren(paragraph, key).filter(
      (child): child is ReactNode => child != null && child !== false,
    );
    return (
      <View
        key={key}
        style={[
          styles.paragraphContainer,
          context?.inList ? styles.paragraphInList : null,
        ]}
      >
        {children.map((child, index) =>
          isValidElement(child) ? (
            child
          ) : (
            <Text key={`${key}-${index}`} style={{ color: resolvedTheme.textColor }}>
              {child as string}
            </Text>
          ),
        )}
      </View>
    );
  };

  const renderHeading = (heading: Heading, key: string) => {
    const styleKey = `heading${heading.depth}` as const;
    const headingStyles = [
      styles.headingBase,
      (styles as Record<string, any>)[styleKey] ?? styles.headingDefault,
      { color: resolvedTheme.textColor },
    ];

    return (
      <TextBlock key={key} style={headingStyles}>
        {renderInlineChildren(heading, key)}
      </TextBlock>
    );
  };

  const renderCodeBlock = (code: Code, key: string) => {
    if (components?.codeBlock) {
      return (
        <Fragment key={key}>
          {components.codeBlock({
            value: code.value,
            language: code.lang ?? undefined,
            theme: resolvedTheme,
            showLineNumbers: showCodeLineNumbers,
          })}
        </Fragment>
      );
    }

    return (
      <CodeBlock
        key={key}
        value={code.value}
        language={code.lang ?? undefined}
        theme={resolvedTheme}
        showLineNumbers={showCodeLineNumbers}
      />
    );
  };

  const renderBlockquote = (blockquote: Blockquote, key: string) => (
    <View
      key={key}
      style={[
        styles.blockquote,
        {
          borderColor: resolvedTheme.quoteBorderColor,
          backgroundColor: resolvedTheme.quoteBackgroundColor,
        },
      ]}
    >
      {blockquote.children.map((child, index) =>
        renderNode(child as Content, `${key}-${index}`, { inBlockquote: true }),
      )}
    </View>
  );

  const renderList = (list: List, key: string) => {
    const start = list.start ?? 1;

    return (
      <View key={key} style={styles.listContainer}>
        {list.children.map((item, index) => {
          const marker = list.ordered ? `${start + index}.` : '\u2022';
          return (
            <View key={`${key}-${index}`} style={styles.listItem}>
              <Text style={[styles.listMarker, { color: resolvedTheme.mutedTextColor }]}>{marker}</Text>
              <View style={styles.listContent}>
                {(item as ListItem).children.map((child, childIndex) =>
                  renderNode(child as Content, `${key}-${index}-${childIndex}`, { inList: true }),
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderImage = (image: Image, key: string) => (
    <TextBlock key={key} style={[styles.imageFallback, { color: resolvedTheme.mutedTextColor }]}>
      {`![${image.alt ?? ''}](${image.url})`}
    </TextBlock>
  );

  const renderNode = (node: Content, key: string, context?: RenderContext): ReactNode => {
    switch (node.type) {
      case 'paragraph':
        return renderParagraph(node as Paragraph, key, context);
      case 'heading':
        return renderHeading(node as Heading, key);
      case 'code':
        return renderCodeBlock(node as Code, key);
      case 'blockquote':
        return renderBlockquote(node as Blockquote, key);
      case 'list':
        return renderList(node as List, key);
      case 'thematicBreak':
        return <View key={key} style={[styles.thematicBreak, { backgroundColor: resolvedTheme.codeBorderColor }]} />;
      case 'math': {
        const value = (node as any).value ?? '';
        if (components?.mathBlock) {
          return (
            <Fragment key={key}>
              {components.mathBlock({ value, inline: false, theme: resolvedTheme })}
            </Fragment>
          );
        }
        return <MathBlock key={key} value={value} theme={resolvedTheme} />;
      }
      case 'image':
        return renderImage(node as Image, key);
      case 'html':
        return null;
      case 'table':
        return (
          <TextBlock key={key} style={[styles.tableFallback, { color: resolvedTheme.mutedTextColor }]}>
            {'[Table rendering is not supported in this version]'}
          </TextBlock>
        );
      default:
        if (INLINE_NODE_TYPES.has(node.type)) {
          return (
            <TextBlock key={key} style={[styles.paragraph, { color: resolvedTheme.textColor }]}>
              {renderInlineNode(node as InlineNode, key)}
            </TextBlock>
          );
        }
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: resolvedTheme.backgroundColor }]}>
      {ast.children.map((node, index) => renderNode(node as Content, `block-${index}`))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 4,
  },
  paragraphContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  paragraphText: {
    fontSize: 16,
    lineHeight: 22,
  },
  paragraph: {
    marginBottom: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  paragraphInList: {
    marginBottom: 6,
  },
  headingBase: {
    marginVertical: 12,
    fontWeight: '700',
  },
  heading1: {
    fontSize: 28,
    lineHeight: 34,
  },
  heading2: {
    fontSize: 24,
    lineHeight: 30,
  },
  heading3: {
    fontSize: 20,
    lineHeight: 26,
  },
  heading4: {
    fontSize: 18,
    lineHeight: 24,
  },
  heading5: {
    fontSize: 16,
    lineHeight: 22,
  },
  heading6: {
    fontSize: 16,
    lineHeight: 22,
  },
  headingDefault: {
    fontSize: 18,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  inlineCode: {
    fontFamily: 'Courier',
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  link: {
    textDecorationLine: 'underline',
  },
  blockquote: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 8,
    borderRadius: 6,
  },
  listContainer: {
    marginVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  listMarker: {
    width: 24,
    fontSize: 16,
    lineHeight: 22,
  },
  listContent: {
    flex: 1,
  },
  thematicBreak: {
    height: 1,
    opacity: 0.3,
    marginVertical: 12,
  },
  imageFallback: {
    fontStyle: 'italic',
    opacity: 0.7,
    marginBottom: 12,
  },
  tableFallback: {
    fontStyle: 'italic',
    marginVertical: 12,
  },
});
