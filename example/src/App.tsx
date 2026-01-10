import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CollapsibleCard } from './components/CollapsibleCard';
type ScrollHandle = {
  scrollToEnd?: (options?: { animated?: boolean }) => void;
  scrollTo?: (options: { x?: number; y?: number; animated?: boolean }) => void;
};
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
  '$$\n' + 'e^{i\\pi} + 1 = 0\n' + '$$\n\n',
  'Inline math example: $c^2 = a^2 + b^2$.\n\n',
  '![Live Markdown preview](https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=800&q=80 "Live Markdown rendering")\n\n',
  '_Images support error/loading states, captions, and lightbox previews._\n\n',
  '![React Native logo](https://reactnative.dev/img/tiny_logo.png "React Native logo")\n\n',
  '_Tip:_ Tap the image to open the built-in lightbox.\n\n',
  '_Bonus:_ Long-press any block to trigger a demo action.\n\n',
  '- Advanced list example:\n' +
    '  - Nested item\n' +
    '    - With `inline code`\n' +
    '    - ~~Optional strikethrough~~\n\n',
  '- Ordered list example:\n' +
    '  1. First item\n' +
    '  2. Second item\n' +
    '  3. Third item\n\n' +
    '  4. Fourth item\n\n' +
    '  5. Fifth item\n\n' +
    '  6. Sixth item\n\n' +
    '  7. Seventh item\n\n' +
    '  8. Eighth item\n\n' +
    '  9. Ninth item\n\n' +
    '  10. Tenth item\n\n' +
    '```bash\n' +
    'curl https://api.example.com/chat-stream \\\n' +
    "  -H 'Accept: text/event-stream'\n" +
    '  -H "Authorization: Bearer $TOKEN"\n' +
    '```\n\n',
  '| Name | Price | Quantity | Description | Origin |\n',
  '| --- | ---: | ---: | --- | ---  |\n',
  '| Cherry | $0.25 | 30 | Small stone fruit with vibrant red color and sweet-tart taste. Excellent for desserts and preserves. Available in sweet and sour varieties, cherries are packed with antioxidants. These delicate fruits have a short growing season, typically harvested in late spring to early summer. Their glossy skin and juicy flesh make them a favorite for fresh eating, baking into pies, or processing into jams and preserves. Rich in vitamins C and A, cherries also contain melatonin which may aid sleep. | Originating from the region between the Black and Caspian Seas, cherries were brought to Rome by General Lucullus around 72 BC and subsequently spread throughout Europe and eventually to the Americas. |\n',
  '| Apple | $1.00 | 10 | A crisp and juicy fruit. | Originally cultivated in Central Asia thousands of years ago, apples spread through Europe via ancient trade routes and arrived in North America with European colonists in the 17th century. |\n',
  '| Banana | $0.50 | 20 | Elongated yellow fruit with soft, creamy flesh. Rich in potassium and easily digestible. | Native to Southeast Asia and the South Pacific, bananas have been cultivated for over 7,000 years. |\n',
  '\n\n',
  '| ID | Formatting | Left Aligned | Center Aligned | Right Aligned |\n',
  '| :--- | --- | :--- | :---: | ---: |\n',
  '| 1 | _Italic text_ | $100.00 | +10 | 100 |\n',
  '| 2 | ^Super^script | $150.00 | -10 | 150 |\n',
  '| 3 | **_Combined_** | $200.00 | +20 | 200 |\n',
  '| 4 | Mix `inline` code | $111.00 | -3 | 111 |',
  '\n\n',
  '_Streaming complete!_ ✅\n',
];

const GradientButton = ({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
      pulse.stopAnimation();
    };
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });

  return (
    <Pressable onPress={onPress} style={styles.gradientButtonWrapper}>
      <Animated.View
        style={[styles.gradientAnimated, { transform: [{ scale }] }]}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899', '#F97316']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientButton}
        >
          <Text style={styles.gradientButtonText}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

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
  const [linkColor, setLinkColor] = useState('#F97316');
  const [quoteBorderColor, setQuoteBorderColor] = useState('#F97316');
  const [backgroundColorOverride, setBackgroundColorOverride] = useState('');
  const [enableCodeCopyToggle, setEnableCodeCopyToggle] = useState(true);
  const [enableImageLightboxToggle, setEnableImageLightboxToggle] =
    useState(true);
  const [enableStopControl, setEnableStopControl] = useState(true);
  const [enableScrollToTop, setEnableScrollToTop] = useState(true);
  const [hasStreamEnded, setHasStreamEnded] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [shouldShowScrollTop, setShouldShowScrollTop] = useState(false);
  const scrollTopAnim = useRef(new Animated.Value(0)).current;
  const [isPlaybackExpanded, setIsPlaybackExpanded] = useState(true);
  const [isThemeExpanded, setIsThemeExpanded] = useState(true);
  const playbackAnim = useRef(new Animated.Value(1)).current;
  const themeAnim = useRef(new Animated.Value(1)).current;

  const createCollapsibleToggle = useCallback(
    (
      current: boolean,
      setState: (next: boolean) => void,
      animation: Animated.Value
    ) => {
      const next = !current;
      setState(next);
      Animated.timing(animation, {
        toValue: next ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    },
    []
  );

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
    setHasStreamEnded(false);
    setShouldShowScrollTop(false);
    setScrollOffset(0);
  }, []);

  const handleStop = useCallback(() => {
    const controls = streamControlsRef.current;
    if (!controls) {
      return;
    }
    controls.stop();
    setHasStreamEnded(true);
  }, []);

  const handleRevealModeChange = useCallback((mode: RevealMode) => {
    setRevealMode(mode);
    if (mode === 'chunk') {
      setRevealDelay(0);
    } else if (mode === 'word') {
      setRevealDelay(32);
    } else {
      setRevealDelay(20);
    }
  }, []);

  const handleSpeedAdjust = useCallback((delta: number) => {
    setRevealDelay((current) => {
      const next = Math.max(0, Math.round(current + delta));
      return next;
    });
  }, []);

  const handleScrollViewRef = useCallback((ref: ScrollHandle | null) => {
    scrollViewRef.current = ref;
  }, []);

  const handleScroll = useCallback((event: any) => {
    const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
    setScrollOffset(offsetY);
  }, []);

  useEffect(() => {
    if (revealMode === 'chunk' && revealDelay !== 0) {
      setRevealDelay(0);
    }
  }, [revealDelay, revealMode]);

  const handleContentChange = useCallback(() => {
    setContentVersion((value) => value + 1);
    setHasStreamEnded(false);
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
        linkColor,
        quoteBorderColor,
        ...(backgroundColorOverride
          ? { backgroundColor: backgroundColorOverride }
          : {}),
      },
    }),
    [backgroundColorOverride, baseMode, linkColor, quoteBorderColor]
  );

  const handleCodeCopy = useCallback(
    ({ language }: { value: string; language?: string | null }) => {
      Alert.alert(
        'Copy Code',
        `Attempting to copy a ${language ?? 'plain text'} block.`
      );
      return false;
    },
    []
  );

  const handleBlockLongPress = useCallback(
    (payload: { node: { type: string } }) => {
      Alert.alert(
        'Long Press',
        `You long-pressed a ${payload.node.type} block.`
      );
    },
    []
  );

  const handleScrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo?.({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    const shouldShow =
      enableScrollToTop && hasStreamEnded && scrollOffset >= 40;
    setShouldShowScrollTop(shouldShow);
  }, [enableScrollToTop, hasStreamEnded, scrollOffset]);

  useEffect(() => {
    Animated.timing(scrollTopAnim, {
      toValue: shouldShowScrollTop ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [scrollTopAnim, shouldShowScrollTop]);

  const scrollTopAnimatedStyle = {
    opacity: scrollTopAnim,
    transform: [
      {
        translateY: scrollTopAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: containerBackground }]}
    >
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <ScrollView
        ref={handleScrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.centerColumn}>
          <View style={styles.header}>
            <Text
              style={[styles.overline, { color: activeTheme.mutedTextColor }]}
            >
              Streaming Markdown Demo
            </Text>
            <Text style={[styles.title, { color: activeTheme.textColor }]}>
              react-native-markdown-stream
            </Text>
            <Text
              style={[styles.caption, { color: activeTheme.mutedTextColor }]}
            >
              Live AI/chat transcripts rendered with reveal controls, code copy,
              images, and more.
            </Text>
          </View>

          <CollapsibleCard
            title="Playback"
            subtitle="Adjust how incoming text appears."
            theme={activeTheme}
            animation={playbackAnim}
            expanded={isPlaybackExpanded}
            onToggle={() =>
              createCollapsibleToggle(
                isPlaybackExpanded,
                setIsPlaybackExpanded,
                playbackAnim
              )
            }
            cardStyle={styles.controlsCard}
          >
            <View style={styles.modeButtons}>
              {(['chunk', 'word', 'character'] as RevealMode[]).map((mode) => {
                const isActive = revealMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[
                      styles.modeButton,
                      {
                        borderColor: isActive
                          ? activeTheme.linkColor
                          : activeTheme.codeBorderColor,
                        backgroundColor: isActive
                          ? activeTheme.backgroundColor === 'transparent'
                            ? 'rgba(37, 99, 235, 0.08)'
                            : activeTheme.backgroundColor
                          : 'transparent',
                      },
                    ]}
                    onPress={() => handleRevealModeChange(mode)}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        {
                          color: isActive
                            ? activeTheme.linkColor
                            : activeTheme.mutedTextColor,
                        },
                      ]}
                    >
                      {mode === 'chunk'
                        ? 'Chunk'
                        : mode === 'word'
                          ? 'Word'
                          : 'Character'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {revealMode !== 'chunk' ? (
              <View style={styles.speedControls}>
                <Pressable
                  style={[
                    styles.speedButton,
                    { borderColor: activeTheme.codeBorderColor },
                  ]}
                  onPress={() => handleSpeedAdjust(8)}
                >
                  <Text
                    style={[
                      styles.speedButtonText,
                      { color: activeTheme.linkColor },
                    ]}
                  >
                    Slower
                  </Text>
                </Pressable>
                <View style={styles.speedReadout}>
                  <Text
                    style={[
                      styles.speedValue,
                      { color: activeTheme.textColor },
                    ]}
                  >
                    {revealDelay} ms
                  </Text>
                  <Text
                    style={[
                      styles.speedLabel,
                      { color: activeTheme.mutedTextColor },
                    ]}
                  >
                    Delay
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.speedButton,
                    { borderColor: activeTheme.codeBorderColor },
                  ]}
                  onPress={() => handleSpeedAdjust(-8)}
                >
                  <Text
                    style={[
                      styles.speedButtonText,
                      { color: activeTheme.linkColor },
                    ]}
                  >
                    Faster
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text
                style={[
                  styles.chunkHint,
                  { color: activeTheme.mutedTextColor },
                ]}
              >
                Chunk mode shows each incoming piece instantly.
              </Text>
            )}

            <View style={styles.actionsRow}>
              <GradientButton title="Restart Stream" onPress={handleRestart} />
              {enableStopControl ? (
                <Pressable
                  style={[
                    styles.stopButton,
                    { borderColor: activeTheme.codeBorderColor },
                  ]}
                  onPress={handleStop}
                >
                  <Text
                    style={[
                      styles.stopButtonText,
                      { color: activeTheme.mutedTextColor },
                    ]}
                  >
                    Stop
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </CollapsibleCard>

          <CollapsibleCard
            title="Theme & Features"
            theme={activeTheme}
            animation={themeAnim}
            expanded={isThemeExpanded}
            onToggle={() =>
              createCollapsibleToggle(
                isThemeExpanded,
                setIsThemeExpanded,
                themeAnim
              )
            }
            cardStyle={styles.configCard}
          >
            <Animated.View>
              <View style={styles.fieldGroup}>
                <View style={styles.fieldRow}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: activeTheme.mutedTextColor },
                    ]}
                  >
                    Link Color
                  </Text>
                  <TextInput
                    value={linkColor}
                    onChangeText={setLinkColor}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.fieldInput,
                      {
                        color: activeTheme.textColor,
                        borderColor: activeTheme.codeBorderColor,
                      },
                    ]}
                    placeholder="#F97316"
                    placeholderTextColor={`${activeTheme.mutedTextColor}99`}
                  />
                </View>
                <View style={styles.fieldRow}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: activeTheme.mutedTextColor },
                    ]}
                  >
                    Quote Border
                  </Text>
                  <TextInput
                    value={quoteBorderColor}
                    onChangeText={setQuoteBorderColor}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.fieldInput,
                      {
                        color: activeTheme.textColor,
                        borderColor: activeTheme.codeBorderColor,
                      },
                    ]}
                    placeholder="#F97316"
                    placeholderTextColor={`${activeTheme.mutedTextColor}99`}
                  />
                </View>
                <View style={styles.fieldRow}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: activeTheme.mutedTextColor },
                    ]}
                  >
                    Background
                  </Text>
                  <TextInput
                    value={backgroundColorOverride}
                    onChangeText={setBackgroundColorOverride}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.fieldInput,
                      {
                        color: activeTheme.textColor,
                        borderColor: activeTheme.codeBorderColor,
                      },
                    ]}
                    placeholder="transparent"
                    placeholderTextColor={`${activeTheme.mutedTextColor}99`}
                  />
                </View>
              </View>

              <View style={styles.switchGrid}>
                <View style={styles.switchRow}>
                  <View>
                    <Text
                      style={[
                        styles.switchLabel,
                        { color: activeTheme.textColor },
                      ]}
                    >
                      Code copy
                    </Text>
                    <Text
                      style={[
                        styles.switchHint,
                        { color: activeTheme.mutedTextColor },
                      ]}
                    >
                      Show copy action on fenced blocks.
                    </Text>
                  </View>
                  <Switch
                    value={enableCodeCopyToggle}
                    onValueChange={setEnableCodeCopyToggle}
                    trackColor={{ false: '#d4d4d8', true: '#6366F1' }}
                    thumbColor={enableCodeCopyToggle ? '#f8fafc' : '#f4f4f5'}
                  />
                </View>
                <View style={styles.switchRow}>
                  <View>
                    <Text
                      style={[
                        styles.switchLabel,
                        { color: activeTheme.textColor },
                      ]}
                    >
                      Image lightbox
                    </Text>
                    <Text
                      style={[
                        styles.switchHint,
                        { color: activeTheme.mutedTextColor },
                      ]}
                    >
                      Tap to preview images fullscreen.
                    </Text>
                  </View>
                  <Switch
                    value={enableImageLightboxToggle}
                    onValueChange={setEnableImageLightboxToggle}
                    trackColor={{ false: '#d4d4d8', true: '#6366F1' }}
                    thumbColor={
                      enableImageLightboxToggle ? '#f8fafc' : '#f4f4f5'
                    }
                  />
                </View>
                <View style={styles.switchRow}>
                  <View>
                    <Text
                      style={[
                        styles.switchLabel,
                        { color: activeTheme.textColor },
                      ]}
                    >
                      Stop control
                    </Text>
                    <Text
                      style={[
                        styles.switchHint,
                        { color: activeTheme.mutedTextColor },
                      ]}
                    >
                      Add a button to halt streaming.
                    </Text>
                  </View>
                  <Switch
                    value={enableStopControl}
                    onValueChange={setEnableStopControl}
                    trackColor={{ false: '#d4d4d8', true: '#6366F1' }}
                    thumbColor={enableStopControl ? '#f8fafc' : '#f4f4f5'}
                  />
                </View>
                <View style={styles.switchRow}>
                  <View>
                    <Text
                      style={[
                        styles.switchLabel,
                        { color: activeTheme.textColor },
                      ]}
                    >
                      Scroll-to-top helper
                    </Text>
                    <Text
                      style={[
                        styles.switchHint,
                        { color: activeTheme.mutedTextColor },
                      ]}
                    >
                      Show a floating button when the stream ends.
                    </Text>
                  </View>
                  <Switch
                    value={enableScrollToTop}
                    onValueChange={setEnableScrollToTop}
                    trackColor={{ false: '#d4d4d8', true: '#6366F1' }}
                    thumbColor={enableScrollToTop ? '#f8fafc' : '#f4f4f5'}
                  />
                </View>
              </View>
            </Animated.View>
          </CollapsibleCard>

          <View
            style={[
              styles.previewCard,
              {
                backgroundColor:
                  activeTheme.backgroundColor === 'transparent'
                    ? containerBackground
                    : activeTheme.backgroundColor,
                borderColor: activeTheme.codeBorderColor,
              },
            ]}
          >
            <MarkdownStream
              theme={streamTheme}
              source={streamFactory}
              onReady={handleReady}
              onContentChange={handleContentChange}
              onEnd={() => setHasStreamEnded(true)}
              revealMode={revealMode}
              revealDelay={revealDelay}
              showCodeLineNumbers
              enableCodeCopy={enableCodeCopyToggle}
              onCodeCopy={handleCodeCopy}
              enableImageLightbox={enableImageLightboxToggle}
              onBlockLongPress={handleBlockLongPress}
            />
          </View>
        </View>
      </ScrollView>
      <Animated.View
        style={[styles.scrollTopButtonContainer, scrollTopAnimatedStyle]}
        pointerEvents={shouldShowScrollTop ? 'auto' : 'none'}
      >
        <Pressable
          style={[
            styles.scrollTopButton,
            {
              backgroundColor: activeTheme.codeBackgroundColor,
              borderColor: activeTheme.codeBorderColor,
            },
          ]}
          onPress={handleScrollToTop}
        >
          <Text
            style={[styles.scrollTopIcon, { color: activeTheme.linkColor }]}
          >
            ↑
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    gap: 20,
  },
  centerColumn: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    gap: 20,
  },
  header: {
    gap: 12,
  },
  overline: {
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  caption: {
    fontSize: 15,
    lineHeight: 22,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  speedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  speedButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  speedValue: {
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  speedReadout: {
    alignItems: 'center',
    gap: 2,
    minWidth: 72,
  },
  speedLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chunkHint: {
    marginTop: 16,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  controlsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  configCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 20,
  },
  controlsHeader: {
    gap: 4,
  },
  controlsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  controlsHint: {
    fontSize: 13,
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  gradientButtonWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  gradientAnimated: {
    borderRadius: 999,
  },
  gradientButton: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.4,
  },
  stopButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  stopButtonText: {
    fontWeight: '600',
  },
  previewCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  fieldGroup: {
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 160,
  },
  switchGrid: {
    gap: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchHint: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollTopButtonContainer: {
    position: 'absolute',
    right: 24,
    bottom: 32,
  },
  scrollTopButton: {
    borderRadius: 999,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  scrollTopIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
});
