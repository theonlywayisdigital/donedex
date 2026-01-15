import React, { useCallback, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

export interface DraggableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (info: { item: T; index: number; drag: () => void; isActive: boolean }) => React.ReactElement;
  onDragEnd: (data: { data: T[] }) => void;
  scrollEnabled?: boolean;
}

/**
 * Web implementation using HTML5 drag-drop API.
 * The .native.tsx version uses react-native-draggable-flatlist for native platforms.
 */
export function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  onDragEnd,
}: DraggableListProps<T>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragItemRef.current = index;
    setDraggedIndex(index);
    // Set drag image to be more subtle
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }, [dragOverIndex]);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = dragItemRef.current;

    if (dragIndex !== null && dragIndex !== dropIndex) {
      const newData = [...data];
      const [removed] = newData.splice(dragIndex, 1);
      newData.splice(dropIndex, 0, removed);
      onDragEnd({ data: newData });
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  }, [data, onDragEnd]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  }, []);

  return (
    <View>
      {data.map((item, index) => {
        const key = keyExtractor(item);
        const isActive = draggedIndex === index;
        const isDragOver = dragOverIndex === index && draggedIndex !== index;

        return (
          <div
            key={key}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              opacity: isActive ? 0.5 : 1,
              transform: isActive ? 'scale(1.02)' : 'none',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
              borderTop: isDragOver ? `3px solid ${colors.primary.DEFAULT}` : '3px solid transparent',
              marginTop: isDragOver ? -3 : 0,
            }}
          >
            {renderItem({
              item,
              index,
              drag: () => {}, // Not used on web - HTML5 handles it via draggable attribute
              isActive,
            })}
          </div>
        );
      })}
    </View>
  );
}

export default DraggableList;
