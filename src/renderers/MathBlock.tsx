import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { MarkdownTheme } from '../core/themes';

type MathViewProps = {
  math: string;
  style?: StyleProp<ViewStyle>;
  color?: string;
};

type MathViewComponent = React.ComponentType<MathViewProps>;

let cachedMathView: MathViewComponent | null | undefined;

function resolveMathView(): MathViewComponent | null {
  if (cachedMathView !== undefined) {
    return cachedMathView;
  }

  try {
    const mathModule = require('react-native-math-view');
    const component: MathViewComponent =
      mathModule?.default ?? mathModule?.MathView ?? mathModule;
    cachedMathView = component;
  } catch (error) {
    console.warn(
      '[react-native-markdown-stream] Unable to load react-native-math-view. Falling back to plain text rendering for math blocks.'
    );
    cachedMathView = null;
  }

  return cachedMathView;
}

export interface MathBlockProps {
  value: string;
  theme: MarkdownTheme;
  inline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function MathBlock({
  value,
  inline = false,
  theme,
  containerStyle,
  textStyle,
}: MathBlockProps) {
  const MathView = useMemo(resolveMathView, []);

  if (!value.trim()) {
    return null;
  }

  if (MathView) {
    return (
      <MathView
        math={value}
        color={theme.textColor}
        style={[
          inline ? styles.inlineMathView : styles.blockMathView,
          { backgroundColor: inline ? undefined : theme.codeBackgroundColor },
          containerStyle,
        ]}
      />
    );
  }

  if (inline) {
    return (
      <Text
        style={[styles.inlineFallback, { color: theme.textColor }, textStyle]}
      >
        {`$${value}$`}
      </Text>
    );
  }

  return (
    <View
      style={[
        styles.blockFallback,
        {
          borderColor: theme.codeBorderColor,
          backgroundColor: theme.codeBackgroundColor,
        },
        containerStyle,
      ]}
    >
      <Text
        style={[
          styles.blockFallbackText,
          { color: theme.textColor },
          textStyle,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineMathView: {
    paddingHorizontal: 4,
  },
  blockMathView: {
    padding: 8,
    borderRadius: 8,
    alignSelf: 'stretch',
    marginVertical: 8,
  },
  inlineFallback: {
    fontStyle: 'italic',
  },
  blockFallback: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  blockFallbackText: {
    fontSize: 16,
    lineHeight: 22,
  },
});
