import React from 'react';
import {
  NestableDraggableFlatList as RNDraggableFlatList,
  NestableScrollContainer as RNScrollContainer,
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';

export interface NestableDraggableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (info: { item: T; index: number; drag: () => void; isActive: boolean }) => React.ReactElement;
  onDragEnd: (data: { data: T[] }) => void;
  scrollEnabled?: boolean;
}

/**
 * Native implementation using react-native-draggable-flatlist.
 * Provides smooth 60fps native-driven animations for nested lists.
 */
export function NestableDraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  onDragEnd,
  scrollEnabled = false,
}: NestableDraggableListProps<T>) {
  const renderDraggableItem = ({ item, drag, isActive, getIndex }: RenderItemParams<T>) => {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        {renderItem({ item, index, drag, isActive })}
      </ScaleDecorator>
    );
  };

  return (
    <RNDraggableFlatList
      data={data}
      keyExtractor={keyExtractor}
      onDragEnd={onDragEnd}
      renderItem={renderDraggableItem}
      scrollEnabled={scrollEnabled}
    />
  );
}

/**
 * Native scroll container for nested draggable lists.
 */
export const NestableScrollContainer = RNScrollContainer;

export default NestableDraggableList;
