import { useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { MarkdownTheme } from 'react-native-markdown-stream';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  expanded: boolean;
  animation: Animated.Value;
  onToggle: () => void;
  children: ReactNode;
  theme: MarkdownTheme;
  cardStyle?: any;
}

export function CollapsibleCard({
  title,
  subtitle,
  expanded,
  animation,
  onToggle,
  children,
  theme,
  cardStyle,
}: CollapsibleCardProps) {
  const containerStyle = useMemo(() => {
    return {
      opacity: animation,
      transform: [
        {
          scaleY: Animated.add(0.92, Animated.multiply(0.08, animation)),
        },
      ],
    };
  }, [animation]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.codeBackgroundColor, borderColor: theme.codeBorderColor },
        cardStyle,
      ]}
    >
      <Pressable style={styles.cardHeader} onPress={onToggle}>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.cardSubtitle, { color: theme.mutedTextColor }]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.chevronContainer}>
          <Animated.Text
            style={[
              styles.chevron,
              {
                color: theme.mutedTextColor,
                transform: [
                  {
                    rotate: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-90deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            ▶
          </Animated.Text>
        </View>
      </Pressable>
      <Animated.View style={[styles.cardContent, containerStyle]} pointerEvents={expanded ? 'auto' : 'none'}>
        {expanded ? children : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
  },
  cardContent: {
    gap: 16,
  },
  chevronContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 14,
    fontWeight: '700',
  },
});
