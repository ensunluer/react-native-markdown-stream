import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StreamBuffer } from '../core/stream-buffer';

type ReadableStreamReaderLike<T> = {
  read: () => Promise<{ done: boolean; value: T }>;
  releaseLock: () => void;
};

type ReadableStreamLike<T> = {
  getReader: () => ReadableStreamReaderLike<T>;
};

export type MarkdownStreamSource<T = unknown> =
  | AsyncIterable<T>
  | Iterable<T>
  | (() => AsyncIterable<T> | Iterable<T> | Promise<AsyncIterable<T> | Iterable<T>>)
  | ReadableStreamLike<T>;

export type RevealMode = 'chunk' | 'word' | 'character';

export interface MarkdownStreamOptions<T = string> {
  source?: MarkdownStreamSource<T>;
  initialValue?: string;
  autoStart?: boolean;
  onChunk?: (chunk: string) => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
  revealMode?: RevealMode;
  revealDelay?: number;
}

export interface UseMarkdownStreamResult {
  content: string;
  fullContent: string;
  isStreaming: boolean;
  appendChunk: (chunk: string) => void;
  reset: () => void;
  setContent: (value: string) => void;
  start: (source?: MarkdownStreamSource) => Promise<void>;
  stop: () => void;
  setRevealMode: (mode: RevealMode) => void;
  setRevealDelay: (delay: number) => void;
}

type AsyncOrSyncIterable<T> = AsyncIterable<T> | Iterable<T>;
type ResolvedSource<T> = AsyncOrSyncIterable<T> | ReadableStreamLike<T>;

const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : undefined;
const DEFAULT_REVEAL_DELAY = 28;

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return typeof (value as AsyncIterable<T>)?.[Symbol.asyncIterator] === 'function';
}

function isIterable<T>(value: unknown): value is Iterable<T> {
  return typeof (value as Iterable<T>)?.[Symbol.iterator] === 'function';
}

function isReadableStream<T>(value: unknown): value is ReadableStreamLike<T> {
  return typeof value === 'object' && value !== null && typeof (value as ReadableStreamLike<T>).getReader === 'function';
}

function normalizeChunk(chunk: unknown): string {
  if (typeof chunk === 'string') {
    return chunk;
  }

  if (chunk instanceof Uint8Array) {
    if (textDecoder) {
      return textDecoder.decode(chunk);
    }
    return Array.from(chunk)
      .map((value) => String.fromCharCode(value))
      .join('');
  }

  if (chunk == null) {
    return '';
  }

  if (typeof chunk === 'object' && 'toString' in chunk) {
    return String(chunk);
  }

  return String(chunk);
}

async function resolveSource<T>(source: MarkdownStreamSource<T>): Promise<ResolvedSource<T>> {
  if (typeof source === 'function') {
    const result = source();
    return Promise.resolve(result);
  }

  return source;
}

async function* toAsyncIterable<T>(source: MarkdownStreamSource<T>): AsyncGenerator<string> {
  const resolved = await resolveSource(source);

  if (isReadableStream(resolved)) {
    const reader = resolved.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        yield normalizeChunk(value);
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }

  if (isAsyncIterable(resolved)) {
    for await (const chunk of resolved) {
      yield normalizeChunk(chunk);
    }
    return;
  }

  if (isIterable(resolved)) {
    for (const chunk of resolved) {
      yield normalizeChunk(chunk);
    }
    return;
  }

  throw new Error('[react-native-markdown-stream] Unsupported stream source');
}

function tokenize(chunk: string, mode: RevealMode): string[] {
  if (mode === 'character') {
    return chunk.split('');
  }

  if (mode === 'word') {
    const tokens = chunk.match(/(\s+|\S+)/g);
    return tokens ?? [chunk];
  }

  return [chunk];
}

function clampDelay(value: number | undefined): number {
  if (value == null) {
    return DEFAULT_REVEAL_DELAY;
  }
  if (Number.isNaN(value)) {
    return DEFAULT_REVEAL_DELAY;
  }
  return Math.max(0, value);
}

export function useMarkdownStream<T = string>({
  source,
  initialValue = '',
  autoStart = true,
  onChunk,
  onEnd,
  onError,
  revealMode = 'chunk',
  revealDelay = DEFAULT_REVEAL_DELAY,
}: MarkdownStreamOptions<T> = {}): UseMarkdownStreamResult {
  const bufferRef = useRef(new StreamBuffer(initialValue));
  const controllerRef = useRef<{ cancelled: boolean } | null>(null);
  const sourceRef = useRef<MarkdownStreamSource<T> | undefined>(source);
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTokensRef = useRef<string[]>([]);
  const revealModeRef = useRef<RevealMode>(revealMode);
  const revealDelayRef = useRef<number>(clampDelay(revealDelay));
  const callbacksRef = useRef<{
    onChunk?: (chunk: string) => void;
    onEnd?: () => void;
    onError?: (error: unknown) => void;
  }>({
    onChunk,
    onEnd,
    onError,
  });

  const [content, setContent] = useState(initialValue);
  const [fullContent, setFullContent] = useState(initialValue);
  const [isStreaming, setIsStreaming] = useState(false);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const flushRevealQueue = useCallback(() => {
    pendingTokensRef.current = [];
    clearRevealTimer();
  }, [clearRevealTimer]);

  useEffect(() => {
    callbacksRef.current = { onChunk, onEnd, onError };
  }, [onChunk, onEnd, onError]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    revealModeRef.current = revealMode;
    if (revealMode === 'chunk') {
      flushRevealQueue();
      setContent(bufferRef.current.value);
    }
  }, [flushRevealQueue, revealMode]);

  useEffect(() => {
    revealDelayRef.current = clampDelay(revealDelay);
  }, [revealDelay]);

  useEffect(() => {
    bufferRef.current = new StreamBuffer(initialValue);
    pendingTokensRef.current = [];
    clearRevealTimer();
    setContent(initialValue);
    setFullContent(initialValue);
  }, [clearRevealTimer, initialValue]);

  useEffect(
    () => () => {
      clearRevealTimer();
    },
    [clearRevealTimer],
  );

  const startRevealLoop = useCallback(() => {
    if (revealTimerRef.current || pendingTokensRef.current.length === 0) {
      return;
    }

    const delay = revealDelayRef.current;
    if (delay <= 0) {
      const tokens = pendingTokensRef.current.splice(0);
      if (tokens.length > 0) {
        setContent((prev) => prev + tokens.join(''));
      }
      return;
    }

    revealTimerRef.current = setInterval(() => {
      const token = pendingTokensRef.current.shift();
      if (token == null) {
        clearRevealTimer();
        return;
      }

      setContent((prev) => prev + token);
    }, delay);
  }, [clearRevealTimer]);

  const appendTokens = useCallback(
    (tokens: string[]) => {
      if (tokens.length === 0) {
        return;
      }
      pendingTokensRef.current.push(...tokens);
      startRevealLoop();
    },
    [startRevealLoop],
  );

  const stop = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.cancelled = true;
      controllerRef.current = null;
      setIsStreaming(false);
    }
    flushRevealQueue();
  }, [flushRevealQueue]);

  const appendChunk = useCallback(
    (chunk: string) => {
      if (!chunk) {
        return;
      }

      bufferRef.current.append(chunk);
      const nextFullValue = bufferRef.current.value;
      setFullContent(nextFullValue);

      const mode = revealModeRef.current;
      if (mode === 'chunk') {
        flushRevealQueue();
        setContent(nextFullValue);
      } else {
        const tokens = tokenize(chunk, mode);
        appendTokens(tokens);
      }

      callbacksRef.current.onChunk?.(chunk);
    },
    [appendTokens, flushRevealQueue],
  );

  const setContentDirect = useCallback(
    (value: string) => {
      bufferRef.current = new StreamBuffer(value);
      setFullContent(value);
      flushRevealQueue();
      setContent(value);
    },
    [flushRevealQueue],
  );

  const reset = useCallback(() => {
    bufferRef.current.reset();
    if (initialValue) {
      bufferRef.current.append(initialValue);
    }
    const nextValue = bufferRef.current.value;
    pendingTokensRef.current = [];
    clearRevealTimer();
    setFullContent(nextValue);
    setContent(nextValue);
  }, [clearRevealTimer, initialValue]);

  const start = useCallback(
    async (overrideSource?: MarkdownStreamSource) => {
      const activeSource = (overrideSource as MarkdownStreamSource<T>) ?? sourceRef.current;
      if (!activeSource) {
        return;
      }

      stop();

      const controller = { cancelled: false };
      controllerRef.current = controller;
      setIsStreaming(true);

      try {
        for await (const chunk of toAsyncIterable(activeSource)) {
          if (controller.cancelled) {
            break;
          }
          appendChunk(chunk);
        }

        if (!controller.cancelled) {
          callbacksRef.current.onEnd?.();
        }
      } catch (error) {
        if (!controller.cancelled) {
          callbacksRef.current.onError?.(error);
        }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        setIsStreaming(false);
      }
    },
    [appendChunk, stop],
  );

  useEffect(() => {
    if (!source || autoStart === false) {
      return;
    }
    start();
    return () => stop();
  }, [autoStart, source, start, stop]);

  const setRevealMode = useCallback((mode: RevealMode) => {
    revealModeRef.current = mode;
    if (mode === 'chunk') {
      flushRevealQueue();
      setContent(bufferRef.current.value);
    }
  }, [flushRevealQueue]);

  const setRevealDelay = useCallback((delay: number) => {
    revealDelayRef.current = clampDelay(delay);
  }, []);

  return useMemo(
    () => ({
      content,
      fullContent,
      isStreaming,
      appendChunk,
      reset,
      setContent: setContentDirect,
      start,
      stop,
      setRevealMode,
      setRevealDelay,
    }),
    [
      appendChunk,
      content,
      fullContent,
      isStreaming,
      reset,
      setContentDirect,
      setRevealDelay,
      setRevealMode,
      start,
      stop,
    ],
  );
}
