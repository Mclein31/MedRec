import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/theme';

interface DragHandleProps {
  style?: ViewStyle;
}

export const DragHandle: React.FC<DragHandleProps> = ({ style }) => {
  return (
    <View style={[styles.handleContainer, style]} pointerEvents="none">
      <View style={styles.handle} />
    </View>
  );
};

const styles = StyleSheet.create({
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 2,
    marginBottom: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dragHandle,
  },
});
