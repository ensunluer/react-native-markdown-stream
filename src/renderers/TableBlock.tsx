import {
  cloneElement,
  isValidElement,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Parent } from 'unist';
import type { TableCell, TableRow } from 'mdast';
import type { MarkdownTheme } from '../core/themes';

export interface TableBlockProps {
  rows: TableRow[];
  alignments: Array<'left' | 'center' | 'right' | null>;
  theme: MarkdownTheme;
  containerStyle?: StyleProp<ViewStyle>;
  renderInlineChildren: (parent: Parent, keyPrefix: string) => ReactNode[];
}

const MIN_CELL_WIDTH = 80;
const MIN_CELL_HEIGHT = 36;

interface CellDimensions {
  width: number;
  height: number;
}

const getAlignItems = (
  textAlign: 'left' | 'center' | 'right'
): 'flex-start' | 'center' | 'flex-end' => {
  switch (textAlign) {
    case 'center':
      return 'center';
    case 'right':
      return 'flex-end';
    default:
      return 'flex-start';
  }
};

function TableCellBlock({
  cell,
  cellKey,
  align,
  isHeader,
  theme,
  renderInlineChildren,
  width,
  height,
  onLayout,
}: {
  cell: TableCell;
  cellKey: string;
  align: 'left' | 'center' | 'right' | null | undefined;
  isHeader: boolean;
  theme: MarkdownTheme;
  renderInlineChildren: (parent: Parent, keyPrefix: string) => ReactNode[];
  width: number | undefined;
  height: number | undefined;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const children = renderInlineChildren(cell, cellKey).filter(
    (child): child is ReactNode => child != null && child !== false
  );

  const textAlign = align ?? 'left';

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.tableCell,
        {
          borderColor: theme.tableBorderColor,
          alignItems: getAlignItems(textAlign),
        },
        width !== undefined ? { width } : { minWidth: MIN_CELL_WIDTH },
        height !== undefined ? { height } : { minHeight: MIN_CELL_HEIGHT },
      ]}
    >
      <Text
        style={[
          isHeader ? styles.tableHeaderText : styles.tableCellText,
          { color: theme.textColor },
        ]}
      >
        {children.map((child, index) =>
          isValidElement(child) ? (
            cloneElement(child, { key: `${cellKey}-${index}` })
          ) : (
            <Text key={`${cellKey}-${index}`}>{child as string}</Text>
          )
        )}
      </Text>
    </View>
  );
}

function TableColumn({
  rows,
  columnIndex,
  alignment,
  theme,
  renderInlineChildren,
  columnWidth,
  rowHeights,
  onCellLayout,
}: {
  rows: TableRow[];
  columnIndex: number;
  alignment: 'left' | 'center' | 'right' | null;
  theme: MarkdownTheme;
  renderInlineChildren: (parent: Parent, keyPrefix: string) => ReactNode[];
  columnWidth: number | undefined;
  rowHeights: Map<number, number>;
  onCellLayout: (
    columnIndex: number,
    rowIndex: number,
    width: number,
    height: number
  ) => void;
}) {
  return (
    <View style={styles.column}>
      {rows.map((row, rowIndex) => {
        const cell = row.children[columnIndex];
        if (!cell) return null;

        const isHeader = rowIndex === 0;
        const cellKey = `col-${columnIndex}-row-${rowIndex}`;
        const height = rowHeights.get(rowIndex);

        return (
          <View
            key={cellKey}
            style={
              isHeader
                ? { backgroundColor: theme.codeBackgroundColor }
                : undefined
            }
          >
            <TableCellBlock
              cell={cell}
              cellKey={cellKey}
              align={alignment}
              isHeader={isHeader}
              theme={theme}
              renderInlineChildren={renderInlineChildren}
              width={columnWidth}
              height={height}
              onLayout={(e) =>
                onCellLayout(
                  columnIndex,
                  rowIndex,
                  e.nativeEvent.layout.width,
                  e.nativeEvent.layout.height
                )
              }
            />
          </View>
        );
      })}
    </View>
  );
}

export function TableBlock({
  rows,
  alignments,
  theme,
  containerStyle,
  renderInlineChildren,
}: TableBlockProps) {
  const [columnWidths, setColumnWidths] = useState<Map<number, number>>(
    new Map()
  );
  const [rowHeights, setRowHeights] = useState<Map<number, number>>(new Map());
  const measurementsRef = useRef<Map<string, CellDimensions>>(new Map());
  const [isMeasured, setIsMeasured] = useState(false);

  const handleCellLayout = useCallback(
    (columnIndex: number, rowIndex: number, width: number, height: number) => {
      const key = `${columnIndex}-${rowIndex}`;
      const current = measurementsRef.current.get(key);

      if (current?.width === width && current?.height === height) return;

      measurementsRef.current.set(key, { width, height });

      // Calculate max width per column and max height per row
      const newColumnWidths = new Map<number, number>();
      const newRowHeights = new Map<number, number>();

      measurementsRef.current.forEach((dims, k) => {
        const parts = k.split('-');
        const colIdx = parseInt(parts[0] ?? '0', 10);
        const rowIdx = parseInt(parts[1] ?? '0', 10);

        const existingWidth = newColumnWidths.get(colIdx) ?? 0;
        newColumnWidths.set(colIdx, Math.max(existingWidth, dims.width));

        const existingHeight = newRowHeights.get(rowIdx) ?? 0;
        newRowHeights.set(rowIdx, Math.max(existingHeight, dims.height));
      });

      // Check if anything changed
      let hasChanges = false;

      newColumnWidths.forEach((w, colIdx) => {
        if (columnWidths.get(colIdx) !== w) hasChanges = true;
      });

      newRowHeights.forEach((h, rowIdx) => {
        if (rowHeights.get(rowIdx) !== h) hasChanges = true;
      });

      if (hasChanges) {
        setColumnWidths(newColumnWidths);
        setRowHeights(newRowHeights);
        setIsMeasured(true);
      }
    },
    [columnWidths, rowHeights]
  );

  if (rows.length === 0) {
    return null;
  }

  const columnCount = Math.max(...rows.map((row) => row.children.length));
  const scrollableColumnIndices = Array.from(
    { length: columnCount - 1 },
    (_, i) => i + 1
  );

  return (
    <View
      style={[
        styles.tableContainer,
        { borderColor: theme.tableBorderColor },
        containerStyle,
      ]}
    >
      <View style={styles.tableBody}>
        {/* Fixed first column */}
        <TableColumn
          rows={rows}
          columnIndex={0}
          alignment={alignments[0] ?? null}
          theme={theme}
          renderInlineChildren={renderInlineChildren}
          columnWidth={isMeasured ? columnWidths.get(0) : undefined}
          rowHeights={isMeasured ? rowHeights : new Map()}
          onCellLayout={handleCellLayout}
        />

        {/* Scrollable columns */}
        {scrollableColumnIndices.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scrollableColumns}
            contentContainerStyle={styles.scrollableContent}
          >
            {scrollableColumnIndices.map((columnIndex) => (
              <TableColumn
                key={`column-${columnIndex}`}
                rows={rows}
                columnIndex={columnIndex}
                alignment={alignments[columnIndex] ?? null}
                theme={theme}
                renderInlineChildren={renderInlineChildren}
                columnWidth={
                  isMeasured ? columnWidths.get(columnIndex) : undefined
                }
                rowHeights={isMeasured ? rowHeights : new Map()}
                onCellLayout={handleCellLayout}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    marginVertical: 12,
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableBody: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  scrollableColumns: {
    flex: 1,
  },
  scrollableContent: {
    flexDirection: 'row',
  },
  tableCell: {
    padding: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  tableCellContent: {
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tableCellText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tableHeaderText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
