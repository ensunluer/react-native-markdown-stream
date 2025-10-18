import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { MarkdownTheme } from '../core/themes';

export interface CodeBlockProps {
  value: string;
  language?: string;
  theme: MarkdownTheme;
  containerStyle?: StyleProp<ViewStyle>;
  codeStyle?: StyleProp<TextStyle>;
  showLineNumbers?: boolean;
  onCopyPress?: () => boolean;
  copyButtonLabel?: string;
}

const fallbackFontFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export function CodeBlock({
  value,
  theme,
  containerStyle,
  codeStyle,
  showLineNumbers = false,
  onCopyPress,
  copyButtonLabel,
}: CodeBlockProps) {
  const lines = useMemo(() => {
    if (!value) {
      return [''];
    }
    return value.split(/\r?\n/);
  }, [value]);

  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showCopyButton = typeof onCopyPress === 'function';
  const copyLabel =
    copyState === 'copied' ? 'Copied' : (copyButtonLabel ?? 'Copy');

  const handleCopyPress = () => {
    if (!onCopyPress) {
      return;
    }
    const handled = onCopyPress();
    if (handled) {
      setCopyState('copied');
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        setCopyState('idle');
        resetTimerRef.current = null;
      }, 1500);
    }
  };

  useEffect(() => {
    setCopyState('idle');
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.codeBackgroundColor,
          borderColor: theme.codeBorderColor,
        },
        containerStyle,
      ]}
    >
      {showCopyButton ? (
        <View style={styles.copyRow}>
          <Pressable style={styles.copyButton} onPress={handleCopyPress}>
            <Text
              style={[
                styles.copyButtonText,
                {
                  color:
                    copyState === 'copied'
                      ? theme.mutedTextColor
                      : theme.linkColor,
                },
              ]}
            >
              {copyLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {lines.map((line, index) => (
        <View key={`line-${index}`} style={styles.lineContainer}>
          {showLineNumbers ? (
            <Text style={[styles.lineNumber, { color: theme.mutedTextColor }]}>
              {index + 1}
            </Text>
          ) : null}
          <Text
            style={[
              styles.codeText,
              {
                color: theme.codeTextColor,
              },
              codeStyle,
            ]}
          >
            {line.length > 0 ? line : ' '}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 8,
  },
  copyRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  copyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  copyButtonText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  lineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lineNumber: {
    width: 32,
    textAlign: 'right',
    marginRight: 12,
    opacity: 0.6,
    fontFamily: fallbackFontFamily,
  },
  codeText: {
    flexShrink: 1,
    flexGrow: 1,
    fontFamily: fallbackFontFamily,
    fontSize: 14,
    lineHeight: 20,
  },
});
