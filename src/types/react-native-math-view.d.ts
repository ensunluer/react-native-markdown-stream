declare module 'react-native-math-view' {
  import type { ComponentType } from 'react';
  import type { StyleProp, ViewStyle } from 'react-native';

  export interface MathViewProps {
    math: string;
    color?: string;
    style?: StyleProp<ViewStyle>;
  }

  const MathView: ComponentType<MathViewProps>;
  export default MathView;
}
