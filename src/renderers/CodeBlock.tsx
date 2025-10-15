import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { MarkdownTheme } from '../core/themes';

export interface CodeBlockProps {
  value: string;
  language?: string;
  theme: MarkdownTheme;
  containerStyle?: StyleProp<ViewStyle>;
  codeStyle?: StyleProp<TextStyle>;
  showLineNumbers?: boolean;
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
}: CodeBlockProps) {
  const lines = useMemo(() => {
    if (!value) {
      return [''];
    }
    return value.split(/\r?\n/);
  }, [value]);

  return (
    <View style={[styles.container, { backgroundColor: theme.codeBackgroundColor, borderColor: theme.codeBorderColor }, containerStyle]}>
      {lines.map((line, index) => (
        <View key={`line-${index}`} style={styles.lineContainer}>
          {showLineNumbers ? (
            <Text style={[styles.lineNumber, { color: theme.mutedTextColor }]}>{index + 1}</Text>
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
