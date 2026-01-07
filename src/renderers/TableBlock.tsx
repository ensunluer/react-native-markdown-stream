/* eslint-disable react-native/no-inline-styles */
import {
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
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
import type { Node, Parent } from 'unist';
import type { TableCell, TableRow } from 'mdast';
import type { MarkdownTheme } from '../core/themes';

export interface TableBlockProps {
  rows: TableRow[];
  alignments: Array<'left' | 'center' | 'right' | null>;
  theme: MarkdownTheme;
  containerStyle?: StyleProp<ViewStyle>;
  renderInlineChildren: (parent: Parent, keyPrefix: string) => ReactNode[];
}

const FONT_SIZE = 16; // This is currently fixed
const CHAR_WIDTH_ESTIMATE = FONT_SIZE * 0.7; // Assume em width is 70% of font size

const CELL_HORIZONTAL_PADDING = 8; // 8px on each side
const WIDTH_BUFFER = 1.1; // 10% buffer for font variations
const MAX_COLUMN_WIDTH = 35 * CHAR_WIDTH_ESTIMATE;

function isNumericLikeText(rawText: string): boolean {
  const text = rawText.trim();

  if (text.length === 0) {
    return false;
  }

  // Basic heuristic for numbers and monetary values:
  // - Optional +/- sign
  // - Optional leading currency symbol ($, €, £, ¥)
  // - Digits with optional thousand separators and decimal part
  // - Optional trailing percent sign
  const numericWithGroupingPattern =
    /^[-+]?[$€£¥]?\s*\d{1,3}(?:([,.\s])\d{3})*(?:[.,]\d+)?%?$/;
  const simpleNumericPattern = /^[-+]?[$€£¥]?\s*\d+(?:[.,]\d+)?%?$/;

  return (
    numericWithGroupingPattern.test(text) || simpleNumericPattern.test(text)
  );
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

// Extract text content from mdast node recursively
function getTextContent(node: Node): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => getTextContent(child as Node)).join('');
  }
  return '';
}

// Get max character count for each column
function getMaxColumnCharCounts(rows: TableRow[]): number[] {
  const counts: number[] = [];

  for (const row of rows) {
    for (let colIdx = 0; colIdx < row.children.length; colIdx++) {
      const cell = row.children[colIdx];
      if (!cell) continue;
      const charCount = getTextContent(cell).length;
      counts[colIdx] = Math.max(counts[colIdx] ?? 0, charCount);
    }
  }

  return counts;
}

/**
 *  Calculate the width for a single column based on the character count.
 */
function calculateSingleColumnWidth(longestCellCharCount: number): number {
  const naturalWidth =
    longestCellCharCount * CHAR_WIDTH_ESTIMATE * WIDTH_BUFFER +
    CELL_HORIZONTAL_PADDING * 2;

  return Math.min(MAX_COLUMN_WIDTH, naturalWidth);
}

function calculateColumnWidths(
  maxCharCountsByColumn: number[],
  tableWidth: number
): number[] {
  if (maxCharCountsByColumn.length === 0 || tableWidth === 0) {
    return [];
  }

  // First column: use natural width (minimum needed for content)
  const firstColumnWidth = calculateSingleColumnWidth(
    maxCharCountsByColumn[0] ?? 0
  );

  if (maxCharCountsByColumn.length === 1) {
    return [firstColumnWidth];
  }

  // Remaining columns: estimate natural widths
  const remainingCharCounts = maxCharCountsByColumn.slice(1);
  const remainingEstimatedWidths = remainingCharCounts.map((count) =>
    calculateSingleColumnWidth(count)
  );

  const remainingWidth = tableWidth - firstColumnWidth;
  const totalRemainingEstimated = remainingEstimatedWidths.reduce(
    (sum, w) => sum + w,
    0
  );

  // Scale remaining columns to fill available space (if they fit)
  let finalRemainingWidths: number[];
  if (totalRemainingEstimated <= remainingWidth) {
    const scaleFactor = remainingWidth / totalRemainingEstimated;
    finalRemainingWidths = remainingEstimatedWidths.map((w) => w * scaleFactor);
  } else {
    // Content overflows, use natural widths (table will scroll)
    finalRemainingWidths = remainingEstimatedWidths;
  }

  return [firstColumnWidth, ...finalRemainingWidths];
}

function TableCell({
  cell,
  cellKey,
  align,
  isHeader,
  isFirstColumn,
  theme,
  renderInlineChildren,
  width,
  height,
  onContentLayout,
  isLastRow,
}: {
  cell: TableCell;
  cellKey: string;
  align: 'left' | 'center' | 'right' | null | undefined;
  isHeader: boolean;
  isFirstColumn: boolean;
  theme: MarkdownTheme;
  renderInlineChildren: (parent: Parent, keyPrefix: string) => ReactNode[];
  width: number | undefined;
  height: number | undefined;
  onContentLayout: (event: LayoutChangeEvent) => void;
  isLastRow: boolean;
}) {
  const isNumericCell = isNumericLikeText(getTextContent(cell));

  const children = renderInlineChildren(cell, cellKey).filter(
    (child): child is ReactNode => child != null && child !== false
  );

  const textAlign = align ?? 'left';

  const border = (() => {
    if (isHeader) {
      return { borderColor: theme.tableHeavyBorderColor, borderBottomWidth: 1 };
    }
    if (isLastRow) {
      return { borderBottomWidth: 0 };
    }
    return { borderColor: theme.tableHeavyBorderColor, borderBottomWidth: 0.5 };
  })();

  return (
    <View
      style={[
        styles.cell,
        border,
        {
          alignItems: getAlignItems(textAlign),
        },

        width !== undefined ? { width } : {},
        // Use minHeight instead of height to prevent iOS from constraining
        // the inner content view, which causes incorrect (smaller) measurements
        height !== undefined ? { minHeight: height } : {},
      ]}
    >
      <View
        onLayout={onContentLayout}
        style={[
          styles.cellContentMeasure,
          { paddingLeft: isFirstColumn ? 0 : CELL_HORIZONTAL_PADDING },
        ]}
      >
        <Text
          style={[
            isHeader ? styles.headerText : styles.cellText,
            isNumericCell ? styles.numericText : null,
            { color: theme.textColor },
          ]}
        >
          {children.map((child, index) =>
            isValidElement(child) ? (
              cloneElement(child, { key: `${cellKey}-${index}` })
            ) : (
              <Text key={`${cellKey}-${index}`}>{String(child)}</Text>
            )
          )}
        </Text>
      </View>
    </View>
  );
}

function TableColumn({
  rows,
  columnIndex,
  isLastColumn,
  alignment,
  theme,
  renderInlineChildren,
  columnWidth,
  rowHeights,
  onCellLayout,
}: {
  rows: TableRow[];
  columnIndex: number;
  isLastColumn: boolean;
  alignment: 'left' | 'center' | 'right' | null;
  theme: MarkdownTheme;
  renderInlineChildren: (parent: Parent, keyPrefix: string) => ReactNode[];
  columnWidth: number | undefined;
  rowHeights: Map<number, number>;
  onCellLayout: (rowIndex: number, height: number) => void;
}) {
  const isFirstColumn = columnIndex === 0;
  return (
    <View
      style={[
        styles.column,
        {
          borderRightWidth: isLastColumn ? 0 : 0.5,
          borderColor: isFirstColumn
            ? theme.tableHeavyBorderColor
            : theme.tableLightBorderColor,
        },
      ]}
    >
      {rows.map((row, rowIndex) => {
        const cell = row.children[columnIndex];
        if (!cell) return null;

        const isHeader = rowIndex === 0;

        const isLastRow = rowIndex === rows.length - 1;
        const cellKey = `col-${columnIndex}-row-${rowIndex}`;
        const height = rowHeights.get(rowIndex);

        return (
          <View key={cellKey}>
            <TableCell
              cell={cell}
              cellKey={cellKey}
              align={alignment}
              isHeader={isHeader}
              isFirstColumn={isFirstColumn}
              theme={theme}
              renderInlineChildren={renderInlineChildren}
              width={columnWidth}
              height={height}
              onContentLayout={(e) =>
                onCellLayout(rowIndex, e.nativeEvent.layout.height)
              }
              isLastRow={isLastRow}
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
  const [tableWidth, setTableWidth] = useState(0);
  const [rowHeights, setRowHeights] = useState<Map<number, number>>(new Map());
  const heightMeasurementsRef = useRef<Map<string, number>>(new Map());
  const rowHeightsRef = useRef<Map<number, number>>(new Map());

  rowHeightsRef.current = rowHeights;

  const columnCount = useMemo(
    () => Math.max(...rows.map((row) => row.children.length), 0),
    [rows]
  );

  const maxCharCountByColumn = useMemo(
    () => getMaxColumnCharCounts(rows),
    [rows]
  );

  const columnWidths = useMemo(() => {
    if (tableWidth === 0) return [];
    return calculateColumnWidths(maxCharCountByColumn, tableWidth);
  }, [maxCharCountByColumn, tableWidth]);

  const isWidthReady = tableWidth > 0 && columnWidths.length === columnCount;

  const handleTableLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setTableWidth((prev) => (prev !== width ? width : prev));
  }, []);

  const handleCellLayout = useCallback(
    (columnIndex: number, rowIndex: number, height: number) => {
      const key = `${columnIndex}-${rowIndex}`;

      // Round to nearest 0.5 to prevent iOS floating point jitter
      const normalizedHeight = Math.round(height * 2) / 2;
      const current = heightMeasurementsRef.current.get(key);

      if (current === normalizedHeight) return;

      heightMeasurementsRef.current.set(key, normalizedHeight);

      // Calculate max height per row
      const newRowHeights = new Map<number, number>();

      heightMeasurementsRef.current.forEach((h, k) => {
        const rowIdx = parseInt(k.split('-')[1] ?? '0', 10);
        const existing = newRowHeights.get(rowIdx) ?? 0;
        newRowHeights.set(rowIdx, Math.max(existing, h));
      });

      // Check if anything changed - compare against ref, not state
      const currentRowHeights = rowHeightsRef.current;
      let hasChanges = newRowHeights.size !== currentRowHeights.size;
      if (!hasChanges) {
        newRowHeights.forEach((h, rowIdx) => {
          if (currentRowHeights.get(rowIdx) !== h) hasChanges = true;
        });
      }

      if (hasChanges) {
        setRowHeights(newRowHeights);
      }
    },
    []
  );

  const cellLayoutHandlers = useMemo(() => {
    const handlers: Array<(rowIndex: number, height: number) => void> = [];
    for (let i = 0; i < columnCount; i++) {
      handlers.push((rowIndex: number, height: number) => {
        handleCellLayout(i, rowIndex, height);
      });
    }
    return handlers;
  }, [columnCount, handleCellLayout]);

  if (rows.length === 0) {
    return null;
  }

  const scrollableColumnIndices = Array.from(
    { length: columnCount - 1 },
    (_, i) => i + 1
  );

  return (
    <View
      onLayout={handleTableLayout}
      style={[
        styles.tableContainer,
        { borderColor: theme.tableHeavyBorderColor },
        containerStyle,
      ]}
    >
      <View style={styles.tableBody}>
        {/* Fixed first column */}
        <TableColumn
          rows={rows}
          columnIndex={0}
          isLastColumn={false}
          alignment={alignments[0] ?? null}
          theme={theme}
          renderInlineChildren={renderInlineChildren}
          columnWidth={isWidthReady ? columnWidths[0] : undefined}
          rowHeights={rowHeights}
          onCellLayout={cellLayoutHandlers[0] ?? handleCellLayout.bind(null, 0)}
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
                isLastColumn={columnIndex === columnCount - 1}
                alignment={alignments[columnIndex] ?? null}
                theme={theme}
                renderInlineChildren={renderInlineChildren}
                columnWidth={
                  isWidthReady ? columnWidths[columnIndex] : undefined
                }
                rowHeights={rowHeights}
                onCellLayout={
                  cellLayoutHandlers[columnIndex] ??
                  handleCellLayout.bind(null, columnIndex)
                }
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
    //borderWidth: 1,
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
  cell: {
    overflow: 'hidden',
  },
  cellContentMeasure: {
    paddingHorizontal: CELL_HORIZONTAL_PADDING,
    paddingVertical: 8,
  },
  numericText: {
    fontVariant: ['tabular-nums'] as const,
    letterSpacing: -0.35,
  },
  cellText: {},
  headerText: {
    fontWeight: '600',
  },
});
