import { Text } from 'react-native';
import type { TextProps } from 'react-native';
import type { ReactNode } from 'react';

export interface TextBlockProps extends TextProps {
  children: ReactNode;
}

export function TextBlock({ children, ...rest }: TextBlockProps) {
  return <Text {...rest}>{children}</Text>;
}
