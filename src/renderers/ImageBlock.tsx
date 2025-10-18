import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import type { StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import type { MarkdownTheme } from '../core/themes';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export interface ImageBlockProps {
  url: string;
  alt?: string;
  theme: MarkdownTheme;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  captionStyle?: StyleProp<TextStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  showCaption?: boolean;
}

export function ImageBlock({
  url,
  alt,
  theme,
  containerStyle,
  imageStyle,
  captionStyle,
  onPress,
  onLongPress,
  showCaption = true,
}: ImageBlockProps) {
  const [state, setState] = useState<LoadState>('idle');
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    if (!url) {
      setState('error');
      return () => {
        isMounted = false;
      };
    }

    setState('loading');

    Image.getSize(
      url,
      (width, height) => {
        if (!isMounted) {
          return;
        }
        if (Number.isFinite(width) && Number.isFinite(height) && height !== 0) {
          setAspectRatio(width / height);
        } else {
          setAspectRatio(undefined);
        }
      },
      () => {
        if (!isMounted) {
          return;
        }
        setAspectRatio(undefined);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [url]);

  const content = useMemo(() => {
    if (!url) {
      return (
        <View
          style={[
            styles.fallbackContainer,
            { borderColor: theme.codeBorderColor },
          ]}
        >
          <Text style={[styles.fallbackText, { color: theme.mutedTextColor }]}>
            {alt ? `![${alt}]` : '[Image unavailable]'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.mediaContainer}>
        <Image
          accessibilityLabel={alt}
          source={{ uri: url }}
          style={[
            styles.image,
            aspectRatio ? { aspectRatio } : styles.defaultAspectRatio,
            imageStyle,
          ]}
          resizeMode="contain"
          onLoadStart={() => {
            setState('loading');
          }}
          onLoad={() => {
            setState('loaded');
          }}
          onError={() => {
            setState('error');
          }}
        />
        {state === 'loading' ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={theme.linkColor} />
          </View>
        ) : null}
        {state === 'error' ? (
          <View
            style={[
              styles.overlay,
              styles.errorOverlay,
              { borderColor: theme.codeBorderColor },
            ]}
          >
            <Text
              style={[styles.fallbackText, { color: theme.mutedTextColor }]}
            >
              {alt ? `Unable to load ${alt}` : 'Unable to load image'}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }, [
    alt,
    aspectRatio,
    imageStyle,
    state,
    theme.codeBorderColor,
    theme.linkColor,
    theme.mutedTextColor,
    url,
  ]);

  const figure = (
    <View style={[styles.container, containerStyle]}>
      {content}
      {showCaption && alt ? (
        <Text
          style={[
            styles.caption,
            { color: theme.mutedTextColor },
            captionStyle,
          ]}
        >
          {alt}
        </Text>
      ) : null}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.pressable}
      >
        {figure}
      </Pressable>
    );
  }

  return figure;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  mediaContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  image: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  defaultAspectRatio: {
    aspectRatio: 16 / 9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  errorOverlay: {
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 8,
  },
  fallbackContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontStyle: 'italic',
    textAlign: 'center',
  },
  caption: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  pressable: {
    width: '100%',
  },
});
