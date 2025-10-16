import { useEffect, useMemo, useRef } from 'react';
import type { Root } from 'mdast';
import { parseMarkdown } from './core/parser';
import type { MarkdownRendererProps } from './renderers/MarkdownRenderer';
import { MarkdownRenderer } from './renderers/MarkdownRenderer';
import {
  useMarkdownStream,
  type MarkdownStreamOptions,
  type MarkdownStreamSource,
  type UseMarkdownStreamResult,
} from './hooks/useMarkdownStream';

export interface MarkdownStreamProps
  extends Omit<MarkdownRendererProps, 'ast'>,
    Pick<
      MarkdownStreamOptions,
      'autoStart' | 'onChunk' | 'onEnd' | 'onError' | 'revealMode' | 'revealDelay'
    > {
  source?: MarkdownStreamSource<string>;
  /**
   * Provide fully rendered markdown content. When provided, streaming is bypassed unless you call `start`.
   */
  content?: string;
  /**
   * Starting markdown value before any stream data arrives.
   */
  initialValue?: string;
  /**
   * Exposes the underlying stream controls (append, reset, start, stop).
   */
  onReady?: (controls: UseMarkdownStreamResult) => void;
  /**
   * Invoked whenever rendered content changes. `content` follows the reveal mode while
   * `fullContent` always contains everything received so far.
   */
  onContentChange?: (content: string, fullContent: string) => void;
  /**
   * When set to true the stream is stopped immediately.
   */
  shouldStop?: boolean;
}

export function MarkdownStream({
  source,
  content,
  initialValue,
  autoStart,
  onChunk,
  onEnd,
  onError,
  onReady,
  onContentChange,
  shouldStop,
  revealMode,
  revealDelay,
  theme = 'light',
  ...rendererProps
}: MarkdownStreamProps) {
  const stream = useMarkdownStream({
    source,
    initialValue: initialValue ?? content ?? '',
    autoStart,
    onChunk,
    onEnd,
    onError,
    revealMode,
    revealDelay,
  });

  useEffect(() => {
    if (typeof content === 'string') {
      stream.setContent(content);
    }
  }, [content, stream]);

  const hasNotifiedReadyRef = useRef(false);

  useEffect(() => {
    if (onReady && !hasNotifiedReadyRef.current) {
      onReady(stream);
      hasNotifiedReadyRef.current = true;
    }
  }, [onReady, stream]);

  useEffect(() => {
    hasNotifiedReadyRef.current = false;
  }, [onReady]);

  useEffect(() => {
    if (onContentChange) {
      onContentChange(stream.content, stream.fullContent);
    }
  }, [onContentChange, stream.content, stream.fullContent]);

  useEffect(() => {
    if (shouldStop) {
      stream.stop();
    }
  }, [shouldStop, stream]);

  const ast: Root = useMemo(() => parseMarkdown(stream.content), [stream.content]);

  return <MarkdownRenderer {...rendererProps} theme={theme} ast={ast} />;
}

export type {
  MarkdownRendererProps,
  MarkdownRendererComponents,
} from './renderers/MarkdownRenderer';
export type { MarkdownTheme, MarkdownThemeConfig, ThemeMode, ThemePreference } from './core/themes';
export type {
  MarkdownStreamOptions,
  MarkdownStreamSource,
  RevealMode,
  UseMarkdownStreamResult,
} from './hooks/useMarkdownStream';
export { useMarkdownStream } from './hooks/useMarkdownStream';
export { parseMarkdown } from './core/parser';
export { lightTheme, darkTheme, resolveTheme } from './core/themes';
