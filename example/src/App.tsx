import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
type ScrollHandle = { scrollToEnd?: (options?: { animated?: boolean }) => void };
import {
  MarkdownStream,
  type UseMarkdownStreamResult,
  type RevealMode,
  lightTheme,
  darkTheme,
  type MarkdownThemeConfig,
  type ThemeMode,
} from 'react-native-markdown-stream';

const STREAM_CHUNKS = [
  '# react-native-markdown-stream\n\n',
  '> Example usage for live markdown streaming 👇\n\n',
  'Streaming content arrives to the user chunk by chunk, and the component updates automatically.\n\n',
  '## Supported Markdown Types\n\n',
  '- [x] **GFM** lists\n' +
    '- [x] _Italic_ and **Bold** emphasis\n' +
    '- [x] ~~Strikethrough~~ text\n' +
    '- [x] `inline code` samples\n' +
    '- [x] [Links](https://github.com/ensunluer/react-native-markdown-stream)\n\n',
  '### Ordered Steps\n\n' +
    '1. Prepare the `useMarkdownStream` hook\n' +
    '2. Connect your streaming source\n' +
    '3. Choose theme and highlight options\n\n',
  '```tsx\n' +
    "import { MarkdownStream } from 'react-native-markdown-stream';\n\n" +
    'export function LiveChat({ stream }) {\n' +
    '  return (\n' +
    '    <MarkdownStream\n' +
    '      source={stream}\n' +
    '      theme="dark"\n' +
    '      showCodeLineNumbers\n' +
    '    />\n' +
    '  );\n' +
    '}\n' +
    '```\n\n',
  '---\n\n',
  '> **Tip:** You can use lists and code highlighting inside block quotes within the stream.\n\n',
  'Math support is also available:\n\n',
  '$$\n' +
    'e^{i\\pi} + 1 = 0\n' +
    '$$\n\n',
  'Inline math example: $c^2 = a^2 + b^2$.\n\n',
  '- Advanced list example:\n' +
    '  - Nested item\n' +
    '    - With `inline code`\n' +
    '    - ~~Optional strikethrough~~\n\n',
  '```bash\n' +
    'curl https://api.example.com/chat-stream \\\n' +
    "  -H 'Accept: text/event-stream'\n" +
    '  -H "Authorization: Bearer $TOKEN"\n' +
    '```\n\n',
  '| Syntax | Support | Note |\n' +
    '| --- | --- | --- |\n' +
    '| Table | ⚠️ | Currently displayed as plain text |\n\n',
  '_Streaming complete!_ ✅\n',
];

function createDemoStream(delayMs: number) {
  return async function* demoGenerator() {
    for (const chunk of STREAM_CHUNKS) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      yield chunk;
    }
  };
}

export default function App() {
  const colorScheme = useColorScheme();
  const streamControlsRef = useRef<UseMarkdownStreamResult | null>(null);
  const scrollViewRef = useRef<ScrollHandle | null>(null);
  const [revealMode, setRevealMode] = useState<RevealMode>('word');
  const [revealDelay, setRevealDelay] = useState(28);
  const [contentVersion, setContentVersion] = useState(0);

  const streamFactory = useMemo(() => createDemoStream(600), []);

  const handleReady = useCallback((controls: UseMarkdownStreamResult) => {
    streamControlsRef.current = controls;
  }, []);

  const handleRestart = useCallback(() => {
    const controls = streamControlsRef.current;
    if (!controls) {
      return;
    }
    controls.reset();
    void controls.start();
  }, []);

  const handleRevealModeChange = useCallback(
    (mode: RevealMode) => {
      setRevealMode(mode);
      if (mode === 'chunk') {
        setRevealDelay(0);
      } else if (mode === 'word') {
        setRevealDelay(32);
      } else {
        setRevealDelay(20);
      }
    },
    [],
  );

  const handleSpeedAdjust = useCallback((delta: number) => {
    setRevealDelay((current) => {
      const next = Math.max(0, Math.round(current + delta));
      return next;
    });
  }, []);

  const handleScrollViewRef = useCallback((ref: ScrollHandle | null) => {
    scrollViewRef.current = ref;
  }, []);

  useEffect(() => {
    if (revealMode === 'chunk' && revealDelay !== 0) {
      setRevealDelay(0);
    }
  }, [revealDelay, revealMode]);

  const handleContentChange = useCallback(() => {
    setContentVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd?.({ animated: true });
  }, [contentVersion]);

  const baseMode: ThemeMode = colorScheme === 'dark' ? 'dark' : 'light';
  const activeTheme = baseMode === 'dark' ? darkTheme : lightTheme;
  const containerBackground = baseMode === 'dark' ? '#0B1120' : '#FFFFFF';

  const streamTheme = useMemo<MarkdownThemeConfig>(
    () => ({
      base: baseMode,
      colors: {
        linkColor: '#F97316',
        quoteBorderColor: '#F97316',
      },
    }),
    [baseMode],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: containerBackground }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        ref={handleScrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: activeTheme.textColor }]}>react-native-markdown-stream</Text>
        <Text style={[styles.caption, { color: activeTheme.mutedTextColor }]}>
          Expo, React Native CLI and Bare workflow for streaming markdown rendering example.
        </Text>
        <View style={styles.buttonRow}>
          <View style={styles.buttonWrapper}>
            <Button title="Fresh Start" onPress={handleRestart} />
          </View>
        </View>
        <View style={styles.modeContainer}>
          <Text style={[styles.modeLabel, { color: activeTheme.mutedTextColor }]}>Reveal</Text>
          <View style={styles.modeButtons}>
            {(['chunk', 'word', 'character'] as RevealMode[]).map((mode) => {
              const isActive = revealMode === mode;
              return (
                <Pressable
                  key={mode}
                  style={[
                    styles.modeButton,
                    {
                      borderColor: isActive ? activeTheme.linkColor : activeTheme.mutedTextColor,
                      backgroundColor: isActive
                        ? activeTheme.codeBackgroundColor
                        : 'transparent',
                    },
                  ]}
                  onPress={() => handleRevealModeChange(mode)}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      { color: isActive ? activeTheme.linkColor : activeTheme.mutedTextColor },
                    ]}
                  >
                    {mode === 'chunk' ? 'Chunk' : mode === 'word' ? 'Word' : 'Character'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {revealMode !== 'chunk' ? (
            <View style={styles.speedControls}>
              <Pressable style={styles.speedButton} onPress={() => handleSpeedAdjust(8)}>
                <Text style={[styles.speedText, { color: activeTheme.linkColor }]}>Slower</Text>
              </Pressable>
              <Text style={[styles.speedValue, { color: activeTheme.mutedTextColor }]}>
                {revealDelay} ms
              </Text>
              <Pressable style={styles.speedButton} onPress={() => handleSpeedAdjust(-8)}>
                <Text style={[styles.speedText, { color: activeTheme.linkColor }]}>Faster</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <MarkdownStream
          theme={streamTheme}
          source={streamFactory}
          onReady={handleReady}
          onContentChange={handleContentChange}
          revealMode={revealMode}
          revealDelay={revealDelay}
          showCodeLineNumbers
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  caption: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 8,
  },
  buttonWrapper: {
    minWidth: 140,
  },
  modeContainer: {
    gap: 8,
  },
  modeLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  speedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  speedValue: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
