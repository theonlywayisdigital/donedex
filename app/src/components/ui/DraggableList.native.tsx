import React from 'react';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';

export interface DraggableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (info: { item: T; index: number; drag: () => void; isActive: boolean }) => React.ReactElement;
  onDragEnd: (data: { data: T[] }) => void;
  scrollEnabled?: boolean;
}

/**
 * Native implementation using react-native-draggable-flatlist.
 * Provides smooth 60fps native-driven animations.
 */
export function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  onDragEnd,
  scrollEnabled = false,
}: DraggableListProps<T>) {
  const renderDraggableItem = ({ item, drag, isActive, getIndex }: RenderItemParams<T>) => {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator>
        {renderItem({ item, index, drag, isActive })}
      </ScaleDecorator>
    );
  };

  return (
    <DraggableFlatList
      data={data}
      keyExtractor={keyExtractor}
      onDragEnd={onDragEnd}
      renderItem={renderDraggableItem}
      scrollEnabled={scrollEnabled}
    />
  );
}

export default DraggableList;
