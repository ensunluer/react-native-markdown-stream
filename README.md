# react-native-markdown-stream

A lightweight React Native renderer that turns streaming Markdown (chat responses, AI completions, docs) into polished UI in real time.

## Highlights

- **Streaming-first:** `AsyncIterable`, `ReadableStream`, generators, or manual chunk pushes all work out of the box.
- **Reveal controls:** Animate output per chunk, word, or character with configurable delays.
- **Theming without repainting the screen:** ship light/dark presets, or merge your own colors with a simple config object.
- **Code & math aware:** inline/code blocks with optional copy actions, math rendering via the optional `react-native-math-view` peer.
- **Zero native code:** works in the classic architecture and the New Architecture (Fabric/TurboModules) without extra steps.

<details>
<summary>Contents</summary>

- [Installation](#installation)
- [Metro configuration](#metro-configuration)
- [Quick start](#quick-start)
- [Streaming sources](#supported-stream-sources)
- [Component props](#markdownstream-props)
- [Customising the renderer](#customising-the-renderer)
- [Theming](#theming)
- [Hook API](#using-usemarkdownstream-directly)
- [Type exports](#other-exports)
- [Running the example](#running-the-example-app)
- [Contributing](#contributing)
</details>

## Installation

```sh
# yarn
yarn add react-native-markdown-stream

# npm
npm install react-native-markdown-stream
```

### Optional math support

Install the optional peer if you want LaTeX blocks to render with `react-native-math-view`:

```sh
yarn add react-native-math-view
```

Without it installed, math blocks gracefully fall back to styled text.

## Metro configuration

The library bundles modern ESM packages from the `remark/unified` ecosystem. Metro 0.72+ understands them as long as package exports are enabled.

Add or update `metro.config.js` in your app:

```js
// metro.config.js
const {getDefaultConfig} = require('metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  config.resolver.unstable_enablePackageExports = true;
  return config;
})();
```

Using Expo or a monorepo? Mirror the example app:

```js
// example/metro.config.js
const path = require('path');
const {getDefaultConfig} = require('@expo/metro-config');
const {withMetroConfig} = require('react-native-monorepo-config');

const root = path.resolve(__dirname, '..');
const config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});

config.resolver.unstable_enablePackageExports = true;

module.exports = config;
```

## Quick start

```tsx
import {MarkdownStream} from 'react-native-markdown-stream';

const STREAM_URL = 'https://example.com/chat-stream';

export function ChatMessage() {
  return (
    <MarkdownStream
      source={listenToSSE(STREAM_URL)}
      revealMode="word"
      revealDelay={24}
      enableCodeCopy
      enableImageLightbox
      theme={{
        base: 'dark',
        colors: {
          linkColor: '#4ade80',
          quoteBorderColor: '#22c55e',
        },
      }}
    />
  );
}

function* staticExample() {
  yield '# Hello\n';
  yield 'Streaming markdown arrives chunk by chunk.\n';
}

async function* listenToSSE(url: string) {
  const response = await fetch(url);
  if (!response.body) {
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const {value, done} = await reader.read();
    if (done) break;
    yield decoder.decode(value);
  }

  reader.releaseLock();
}
```

### Controlled usage

Pass the `content` prop to render pre-computed Markdown (and still opt into streaming later if you call `onReady` controls).

```tsx
<MarkdownStream content={markdownString} onReady={(controls) => controls.start()} />
```

## Supported stream sources

`source` accepts any of the following:

- `AsyncIterable<string>` or `Iterable<string>` (generators, async generators).
- A function returning one of the above (lazy initialisation).
- A `ReadableStream` (SSE, `fetch` with streaming responses).
- Call `controls.appendChunk()` manually via the `onReady` callback for complete control.

All chunks (strings, `Uint8Array`, objects with `toString`) are normalised to strings before parsing.

## `MarkdownStream` props

| Prop | Type | Description |
| --- | --- | --- |
| `source` | `MarkdownStreamSource<string>` | Primary stream. Optional if you control content manually. |
| `content` | `string` | Fully rendered markdown. Bypasses streaming until you call `start`. |
| `initialValue` | `string` | Markdown shown before the first chunk arrives. |
| `theme` | `'light' \| 'dark' \| MarkdownTheme \| MarkdownThemeConfig` | Pick a preset or merge custom colors; defaults to light theme with transparent background. |
| `revealMode` | `'chunk' \| 'word' \| 'character'` | Controls how new content animates in. |
| `revealDelay` | `number` | Delay (ms) between reveals; ignored when `revealMode="chunk"`. |
| `autoStart` | `boolean` | Start streaming as soon as `source` exists (default `true`). |
| `onReady` | `(controls: UseMarkdownStreamResult) => void` | Exposes stream controls (append, reset, start, stop). |
| `onChunk` / `onEnd` / `onError` | callbacks | Tap into stream lifecycle events. |
| `showCodeLineNumbers` | `boolean` | Adds line numbers to fenced code blocks. |
| `enableCodeCopy` | `boolean` | Shows a copy action on code blocks (uses clipboard when available). |
| `codeCopyLabel` | `string` | Custom label for the copy button. |
| `onCodeCopy` | `({value, language}) => boolean \| void` | Return `true` to mark the copy action as handled. Fires before the built-in clipboard logic. |
| `onImagePress` | `({url, alt}) => boolean \| void` | Intercept image taps. Return `true` to skip built-in lightbox. |
| `enableImageLightbox` | `boolean` | Presents a modal preview when images are tapped. |
| `onBlockLongPress` | `({node}) => void` | Receive long-press events for any block node. |
| `blockLongPressDelay` | `number` | Milliseconds before the long-press fires (default `300`). |
| `components` | `Partial<MarkdownRendererComponents>` | Override individual renderers (`codeBlock`, `inlineCode`, `mathBlock`, `image`, …). |

## Customising the renderer

Every major element exposes a customization hook:

- Provide `components` to override code/math/image rendering with your own component tree.
- Style code blocks via `CodeBlock` `containerStyle`/`codeStyle` props if you bring your own.
- Hook into `onImagePress`, `enableImageLightbox`, and `onBlockLongPress` for richer media UX.
- Implement your own copy logic with `onCodeCopy` (e.g. analytics or custom tooltips).

## Theming

Light and dark themes ship by default, both with transparent backgrounds so they blend into your layout. Override a single token or a whole palette by passing a `MarkdownTheme` or `MarkdownThemeConfig`.

```tsx
import {MarkdownStream} from 'react-native-markdown-stream';

<MarkdownStream
  theme={{
    base: 'light',
    colors: {
      backgroundColor: 'transparent',
      textColor: '#0f172a',
      linkColor: '#f97316',
      quoteBorderColor: '#fb923c',
    },
  }}
/>;
```

Call `resolveTheme` if you need the concrete palette outside the component.

## Using `useMarkdownStream` directly

The hook powers the component and can run headless when you need custom rendering.

```tsx
import {useMarkdownStream} from 'react-native-markdown-stream';

export function CustomRenderer({source}) {
  const stream = useMarkdownStream({
    source,
    revealMode: 'character',
    onChunk: (chunk) => console.log('chunk', chunk.length),
  });

  return (
    <ScrollView>
      <Text>{stream.content}</Text>
      <Button title="Skip animation" onPress={() => stream.setRevealMode('chunk')} />
    </ScrollView>
  );
}
```

The hook returns the current `content`, the accumulated `fullContent`, status flags, and control helpers (`appendChunk`, `reset`, `start`, `stop`, `setRevealMode`, `setRevealDelay`).

## Other exports

```ts
import {
  MarkdownRenderer,
  parseMarkdown,
  useMarkdownStream,
  lightTheme,
  darkTheme,
  resolveTheme,
  type MarkdownTheme,
  type MarkdownThemeConfig,
  type ThemeMode,
  type MarkdownRendererComponents,
} from 'react-native-markdown-stream';
```

Use `MarkdownRenderer` when you already have an mdast `Root`, or to wrap custom parsed content.

## Running the example app

```sh
yarn install
yarn example          # starts Expo in the example/ workspace

# or target a platform directly
yarn workspace react-native-markdown-stream-example android
yarn workspace react-native-markdown-stream-example ios
```

The example showcases reveal modes, code copy actions, image lightbox, and long-press handlers.

## Architecture support

The package is JavaScript-only and works unchanged in both the classic bridge and the New Architecture (Fabric/TurboModules). No native modules, pods, or Gradle steps are required.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

---

© [Enes Ünlüer](https://github.com/ensunluer)
