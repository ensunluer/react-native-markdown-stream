import {
  Fragment,
  cloneElement,
  isValidElement,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  Blockquote,
  Code,
  Content,
  Heading,
  Image as MdastImage,
  Link,
  List,
  ListItem,
  Paragraph,
  Root,
  Table,
  Text as TextNode,
} from 'mdast';
import type { Parent } from 'unist';
import { CodeBlock, type CodeBlockProps } from './CodeBlock';
import { MathBlock, type MathBlockProps } from './MathBlock';
import { ImageBlock, type ImageBlockProps } from './ImageBlock';
import { TextBlock } from './TextBlock';
import { TableBlock, type TableBlockProps } from './TableBlock';
import {
  resolveTheme,
  type MarkdownTheme,
  type ThemePreference,
} from '../core/themes';
import { INCOMPLETE_LINK_PLACEHOLDER } from '../core/incomplete-markdown';

export interface MarkdownRendererComponents {
  codeBlock?: (props: CodeBlockProps) => ReactNode;
  inlineCode?: (props: { value: string; theme: MarkdownTheme }) => ReactNode;
  mathBlock?: (props: MathBlockProps) => ReactNode;
  mathInline?: (props: MathBlockProps) => ReactNode;
  image?: (props: ImageBlockProps & { node: MdastImage }) => ReactNode;
  table?: (props: TableBlockProps & { node: Table }) => ReactNode;
}

export interface MarkdownRendererProps {
  ast: Root;
  theme?: ThemePreference;
  components?: MarkdownRendererComponents;
  onLinkPress?: (url: string) => void;
  showCodeLineNumbers?: boolean;
  onCodeCopy?: (code: {
    value: string;
    language?: string | null;
  }) => boolean | void;
  enableCodeCopy?: boolean;
  codeCopyLabel?: string;
  onImagePress?: (image: { url: string; alt?: string }) => boolean | void;
  enableImageLightbox?: boolean;
  onBlockLongPress?: (payload: { node: Content }) => void;
  blockLongPressDelay?: number;
}

interface RenderContext {
  inList?: boolean;
  inBlockquote?: boolean;
}

type InlineNode =
  | TextNode
  | Extract<
      Content,
      {
        type:
          | 'strong'
          | 'emphasis'
          | 'delete'
          | 'inlineCode'
          | 'link'
          | 'break'
          | 'inlineMath';
      }
    >;

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
  onCodeCopy,
  enableCodeCopy = false,
  codeCopyLabel,
  onImagePress,
  enableImageLightbox = false,
  onBlockLongPress,
  blockLongPressDelay = 300,
}: MarkdownRendererProps) {
  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    alt?: string;
  } | null>(null);
  const [lightboxAspectRatio, setLightboxAspectRatio] = useState<
    number | undefined
  >(undefined);
  const containerStyle = useMemo(() => {
    if (
      !resolvedTheme.backgroundColor ||
      resolvedTheme.backgroundColor === 'transparent'
    ) {
      return null;
    }
    return { backgroundColor: resolvedTheme.backgroundColor };
  }, [resolvedTheme.backgroundColor]);

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

  const renderInlineChildren = (
    parent: Parent,
    keyPrefix: string
  ): ReactNode[] =>
    parent.children.map((child, index) =>
      renderInlineNode(child as InlineNode, `${keyPrefix}-${index}`)
    );

  const renderInlineNode = (node: InlineNode, key: string): ReactNode => {
    switch (node.type) {
      case 'text':
        return (
          <Text
            key={key}
            style={[styles.paragraphText, { color: resolvedTheme.textColor }]}
          >
            {(node as TextNode).value}
          </Text>
        );
      case 'strong':
        return (
          <Text
            key={key}
            style={[
              styles.paragraphText,
              styles.bold,
              { color: resolvedTheme.textColor },
            ]}
          >
            {renderInlineChildren(node as Parent, key)}
          </Text>
        );
      case 'emphasis':
        return (
          <Text
            key={key}
            style={[
              styles.paragraphText,
              styles.italic,
              { color: resolvedTheme.textColor },
            ]}
          >
            {renderInlineChildren(node as Parent, key)}
          </Text>
        );
      case 'delete':
        return (
          <Text
            key={key}
            style={[
              styles.paragraphText,
              styles.strikethrough,
              { color: resolvedTheme.textColor },
            ]}
          >
            {renderInlineChildren(node as Parent, key)}
          </Text>
        );
      case 'inlineCode': {
        const inlineCode = node as Extract<InlineNode, { type: 'inlineCode' }>;
        if (components?.inlineCode) {
          return (
            <Fragment key={key}>
              {components.inlineCode({
                value: inlineCode.value,
                theme: resolvedTheme,
              })}
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
        const isIncompleteLink = linkNode.url === INCOMPLETE_LINK_PLACEHOLDER;

        if (isIncompleteLink) {
          return (
            <Text
              key={key}
              style={[styles.paragraphText, { color: resolvedTheme.textColor }]}
            >
              {renderInlineChildren(linkNode, key)}
            </Text>
          );
        }

        return (
          <Text
            key={key}
            style={[
              styles.paragraphText,
              styles.link,
              { color: resolvedTheme.linkColor },
            ]}
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
          <Text
            key={key}
            style={[styles.paragraphText, { color: resolvedTheme.textColor }]}
          >
            {'\n'}
          </Text>
        );
      case 'inlineMath': {
        const value = (node as any).value ?? '';
        if (components?.mathInline) {
          return (
            <Fragment key={key}>
              {components.mathInline({
                value,
                inline: true,
                theme: resolvedTheme,
              })}
            </Fragment>
          );
        }
        return (
          <MathBlock key={key} value={value} inline theme={resolvedTheme} />
        );
      }
      default:
        return null;
    }
  };

  const renderParagraph = (
    paragraph: Paragraph,
    key: string,
    context?: RenderContext
  ) => {
    const children = renderInlineChildren(paragraph, key).filter(
      (child): child is ReactNode => child != null && child !== false
    );
    const element = (
      <View
        style={[
          styles.paragraphContainer,
          context?.inList ? styles.paragraphInList : null,
        ]}
      >
        {children.map((child, index) =>
          isValidElement(child) ? (
            cloneElement(child, { key: `${key}-${index}` })
          ) : (
            <Text
              key={`${key}-${index}`}
              style={{ color: resolvedTheme.textColor }}
            >
              {child as string}
            </Text>
          )
        )}
      </View>
    );
    return wrapBlock(paragraph, key, element);
  };

  const renderHeading = (heading: Heading, key: string) => {
    const styleKey = `heading${heading.depth}` as const;
    const headingStyles = [
      styles.headingBase,
      (styles as Record<string, any>)[styleKey] ?? styles.headingDefault,
      { color: resolvedTheme.textColor },
    ];

    const element = (
      <TextBlock style={headingStyles}>
        {renderInlineChildren(heading, key)}
      </TextBlock>
    );
    return wrapBlock(heading, key, element);
  };

  const attemptClipboardCopy = (value: string): boolean => {
    try {
      const maybeNavigator =
        typeof navigator !== 'undefined'
          ? (navigator as unknown as {
              clipboard?: {
                writeText?: (input: string) => Promise<void> | void;
              };
            })
          : undefined;
      if (maybeNavigator?.clipboard?.writeText) {
        void maybeNavigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // Ignore clipboard errors to keep UI responsive.
    }
    return false;
  };

  const renderCodeBlock = (code: Code, key: string) => {
    const handleCopyPress = () => {
      let handledByUser = false;
      if (onCodeCopy) {
        handledByUser =
          onCodeCopy({ value: code.value, language: code.lang }) === true;
      }
      if (!handledByUser && enableCodeCopy) {
        handledByUser = attemptClipboardCopy(code.value);
      }
      return handledByUser;
    };

    const shouldShowCopyButton = enableCodeCopy || Boolean(onCodeCopy);

    if (components?.codeBlock) {
      const element = (
        <Fragment>
          {components.codeBlock({
            value: code.value,
            language: code.lang ?? undefined,
            theme: resolvedTheme,
            showLineNumbers: showCodeLineNumbers,
          })}
        </Fragment>
      );
      return wrapBlock(code, key, element);
    }

    const element = (
      <CodeBlock
        value={code.value}
        language={code.lang ?? undefined}
        theme={resolvedTheme}
        showLineNumbers={showCodeLineNumbers}
        onCopyPress={shouldShowCopyButton ? handleCopyPress : undefined}
        copyButtonLabel={codeCopyLabel}
      />
    );
    return wrapBlock(code, key, element);
  };

  const renderBlockquote = (blockquote: Blockquote, key: string) => {
    const element = (
      <View
        style={[
          styles.blockquote,
          {
            borderColor: resolvedTheme.quoteBorderColor,
            backgroundColor: resolvedTheme.quoteBackgroundColor,
          },
        ]}
      >
        {blockquote.children.map((child, index) =>
          renderNode(child as Content, `${key}-${index}`, {
            inBlockquote: true,
          })
        )}
      </View>
    );

    return wrapBlock(blockquote, key, element);
  };

  const renderList = (list: List, key: string) => {
    const start = list.start ?? 1;
    const markerStyle = list.ordered
      ? styles.listOrderedMarker
      : styles.listMarker;

    const markerWidth = (() => {
      const { length } = list.children;

      // Adjust ordered list marker width based on list length
      if (list.ordered) {
        if (length < 10) {
          return 16;
        }
        if (length < 100) {
          return 28;
        }
        return 32;
      }
      return 16;
    })();

    const element = (
      <View style={styles.listContainer}>
        {list.children.map((item, index) => {
          const marker = list.ordered ? `${start + index}.` : '\u2022';
          return (
            <View key={`${key}-${index}`} style={styles.listItem}>
              <Text
                style={[
                  markerStyle,
                  { color: resolvedTheme.textColor, width: markerWidth },
                ]}
              >
                {marker}
              </Text>
              <View style={styles.listContent}>
                {(item as ListItem).children.map((child, childIndex) =>
                  renderNode(
                    child as Content,
                    `${key}-${index}-${childIndex}`,
                    { inList: true }
                  )
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
    return wrapBlock(list, key, element);
  };

  const handleImagePress = (image: { url: string; alt?: string }) => {
    if (onImagePress) {
      const handled = onImagePress(image);
      if (handled === true) {
        return;
      }
    }
    if (enableImageLightbox) {
      setLightboxImage(image);
      if (image.url) {
        Image.getSize(
          image.url,
          (width, height) => {
            if (
              Number.isFinite(width) &&
              Number.isFinite(height) &&
              height !== 0
            ) {
              setLightboxAspectRatio(width / height);
            } else {
              setLightboxAspectRatio(undefined);
            }
          },
          () => {
            setLightboxAspectRatio(undefined);
          }
        );
      }
    }
  };

  const renderImage = (image: MdastImage, key: string) => {
    const fallbackUrl = typeof image.url === 'string' ? image.url : '';

    if (components?.image) {
      const element = (
        <Fragment>
          {components.image({
            node: image,
            url: fallbackUrl,
            alt: image.alt ?? undefined,
            theme: resolvedTheme,
            onPress: () =>
              handleImagePress({
                url: fallbackUrl,
                alt: image.alt ?? undefined,
              }),
            onLongPress: onBlockLongPress
              ? () => onBlockLongPress({ node: image })
              : undefined,
          })}
        </Fragment>
      );
      return wrapBlock(image, key, element, false);
    }

    const element = (
      <ImageBlock
        url={fallbackUrl}
        alt={image.alt ?? undefined}
        theme={resolvedTheme}
        onPress={
          fallbackUrl
            ? (event) => {
                event.stopPropagation();
                handleImagePress({
                  url: fallbackUrl,
                  alt: image.alt ?? undefined,
                });
              }
            : undefined
        }
        onLongPress={
          onBlockLongPress
            ? (event) => {
                event.stopPropagation();
                onBlockLongPress({ node: image });
              }
            : undefined
        }
      />
    );

    return wrapBlock(image, key, element, false);
  };

  const renderTable = (table: Table, key: string) => {
    const alignments = table.align ?? [];
    const rows = table.children;

    if (components?.table) {
      const element = (
        <Fragment>
          {components.table({
            node: table,
            rows,
            alignments,
            theme: resolvedTheme,
            renderInlineChildren,
          })}
        </Fragment>
      );
      return wrapBlock(table, key, element);
    }

    const element = (
      <TableBlock
        rows={rows}
        alignments={alignments}
        theme={resolvedTheme}
        renderInlineChildren={renderInlineChildren}
      />
    );

    return wrapBlock(table, key, element);
  };

  const renderNode = (
    node: Content,
    key: string,
    context?: RenderContext
  ): ReactNode => {
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
        return wrapBlock(
          node,
          key,
          <View
            style={[
              styles.thematicBreak,
              { backgroundColor: resolvedTheme.codeBorderColor },
            ]}
          />
        );
      case 'math': {
        const value = (node as any).value ?? '';
        if (components?.mathBlock) {
          const element = (
            <Fragment>
              {components.mathBlock({
                value,
                inline: false,
                theme: resolvedTheme,
              })}
            </Fragment>
          );
          return wrapBlock(node, key, element);
        }
        return wrapBlock(
          node,
          key,
          <MathBlock value={value} theme={resolvedTheme} />
        );
      }
      case 'image':
        return renderImage(node as MdastImage, key);
      case 'html':
        return null;
      case 'table':
        return renderTable(node as Table, key);
      default:
        if (INLINE_NODE_TYPES.has(node.type)) {
          return wrapBlock(
            node,
            key,
            <TextBlock
              style={[styles.paragraph, { color: resolvedTheme.textColor }]}
            >
              {renderInlineNode(node as InlineNode, key)}
            </TextBlock>,
            false
          );
        }
        return null;
    }
  };

  function wrapBlock(
    node: Content | { type: string },
    key: string,
    element: ReactNode,
    allowLongPress: boolean = true
  ): ReactNode {
    if (element == null) {
      return null;
    }

    if (!allowLongPress || !onBlockLongPress) {
      if (isValidElement(element)) {
        return cloneElement(element, { key });
      }
      return <Fragment key={key}>{element}</Fragment>;
    }

    if (!isValidElement(element)) {
      return (
        <Pressable
          key={key}
          onLongPress={() => onBlockLongPress?.({ node: node as Content })}
          delayLongPress={blockLongPressDelay}
          style={styles.blockPressable}
        >
          {typeof element === 'string' ? (
            <Text style={{ color: resolvedTheme.textColor }}>{element}</Text>
          ) : (
            element
          )}
        </Pressable>
      );
    }

    return (
      <Pressable
        key={key}
        onLongPress={() => onBlockLongPress?.({ node: node as Content })}
        delayLongPress={blockLongPressDelay}
        style={styles.blockPressable}
      >
        {cloneElement(element, { key: undefined })}
      </Pressable>
    );
  }

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxAspectRatio(undefined);
  };

  const lightbox =
    enableImageLightbox && lightboxImage ? (
      <Modal
        transparent
        animationType="fade"
        visible
        onRequestClose={closeLightbox}
      >
        <Pressable style={styles.lightboxBackdrop} onPress={closeLightbox}>
          <View style={styles.lightboxContent}>
            <Text
              style={[
                styles.lightboxHint,
                { color: resolvedTheme.mutedTextColor },
              ]}
            >
              Tap to close
            </Text>
            <View style={styles.lightboxImageWrapper}>
              <Image
                source={{ uri: lightboxImage.url }}
                resizeMode="contain"
                style={[
                  styles.lightboxImage,
                  lightboxAspectRatio
                    ? { aspectRatio: lightboxAspectRatio }
                    : null,
                ]}
                accessible
                accessibilityLabel={lightboxImage.alt}
              />
              {lightboxImage.alt ? (
                <Text
                  style={[
                    styles.lightboxCaption,
                    { color: resolvedTheme.mutedTextColor },
                  ]}
                >
                  {lightboxImage.alt}
                </Text>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Modal>
    ) : null;

  return (
    <Fragment>
      <View style={[styles.container, containerStyle]}>
        {ast.children.map((node, index) =>
          renderNode(node as Content, `block-${index}`)
        )}
      </View>
      {lightbox}
    </Fragment>
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
    alignItems: 'flex-start',
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
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'left',
  },
  listOrderedMarker: {
    marginRight: 6,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'right',
    fontWeight: '700',
    fontVariant: ['tabular-nums', 'lining-nums'],
  },
  listContent: {
    flex: 1,
  },
  thematicBreak: {
    height: 1,
    opacity: 0.3,
    marginVertical: 12,
  },
  blockPressable: {
    width: '100%',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  lightboxContent: {
    flex: 1,
    justifyContent: 'center',
  },
  lightboxImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 12,
  },
  lightboxImage: {
    width: '100%',
    aspectRatio: 1,
  },
  lightboxCaption: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  lightboxHint: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 12,
  },
});
