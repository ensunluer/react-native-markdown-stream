declare module 'expo-linear-gradient' {
  import type { ComponentType, ReactNode } from 'react';
  import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    locations?: number[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
  }

  export const LinearGradient: ComponentType<LinearGradientProps>;
  export default LinearGradient;
}
