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

const CELL_HORIZONTAL_PADDING = 8; // 8px on each side
const WIDTH_BUFFER = 1.05; // 5% buffer for font variations
const MAX_COLUMN_WIDTH = 280; // Keep the columns relatively narrow for mobile devices (~25 average chars)

/**
 * Estimate the rendered width of text based on character categories.
 */
function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  const chars = Array.from(text); // Handle multi-byte characters properly

  for (const char of chars) {
    // Extra wide characters (80-90% of font size)
    if (/[mwMW@#%&]/.test(char)) {
      width += fontSize * 0.85;
    }
    // Wide characters (65-75% of font size) - uppercase, digits, currency
    else if (/[ABCDGHNOQRSUVXYZ0-9$€£¥]/.test(char)) {
      width += fontSize * 0.7;
    }
    // Medium-wide characters (50-60% of font size) - most lowercase
    else if (/[abdeghnopqsuvxyz?]/.test(char)) {
      width += fontSize * 0.55;
    }
    // Medium characters (40-45% of font size)
    else if (/[cEFJKLPT_krt]/.test(char)) {
      width += fontSize * 0.42;
    }
    // Narrow characters (28-35% of font size)
    else if (/[fIijl!\/\\|]/.test(char)) {
      width += fontSize * 0.3;
    }
    // Very narrow - punctuation and spacing (20-28% of font size)
    else if (/[.,;:\s'"`()-]/.test(char)) {
      width += fontSize * 0.25;
    }
    // Emoji and other unicode (roughly 2x)
    else if (char.codePointAt(0)! > 0x1f000) {
      width += fontSize * 2.0;
    }
    // Default fallback for other characters
    else {
      width += fontSize * 0.6;
    }
  }

  return width;
}

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

// Get max estimated width for each column
function getMaxColumnWidths(rows: TableRow[]): number[] {
  const widths: number[] = [];

  for (const row of rows) {
    for (let colIdx = 0; colIdx < row.children.length; colIdx++) {
      const cell = row.children[colIdx];
      if (!cell) continue;
      const text = getTextContent(cell);
      const estimatedWidth = estimateTextWidth(text, FONT_SIZE);
      widths[colIdx] = Math.max(widths[colIdx] ?? 0, estimatedWidth);
    }
  }

  return widths;
}

/**
 *  Calculate the width for a single column based on the estimated text width.
 */
function calculateSingleColumnWidth(estimatedContentWidth: number): number {
  const naturalWidth =
    estimatedContentWidth * WIDTH_BUFFER + CELL_HORIZONTAL_PADDING * 2;

  return Math.min(MAX_COLUMN_WIDTH, naturalWidth);
}

function calculateColumnWidths(
  maxWidthsByColumn: number[],
  tableWidth: number
): number[] {
  if (maxWidthsByColumn.length === 0 || tableWidth === 0) {
    return [];
  }

  // First column: use natural width (minimum needed for content)
  const firstColumnWidth = calculateSingleColumnWidth(
    maxWidthsByColumn[0] ?? 0
  );

  if (maxWidthsByColumn.length === 1) {
    return [firstColumnWidth];
  }

  // Remaining columns: estimate natural widths
  const remainingWidths = maxWidthsByColumn.slice(1);
  const remainingEstimatedWidths = remainingWidths.map((width) =>
    calculateSingleColumnWidth(width)
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
        border,
        {
          alignItems: getAlignItems(textAlign),
        },
        width !== undefined ? { width } : {},
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
            isHeader ? styles.headerText : null,
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

  const maxWidthsByColumn = useMemo(() => getMaxColumnWidths(rows), [rows]);

  const columnWidths = useMemo(() => {
    if (tableWidth === 0) return [];
    return calculateColumnWidths(maxWidthsByColumn, tableWidth);
  }, [maxWidthsByColumn, tableWidth]);

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
    borderRadius: 6,
  },
  tableBody: {
    flexDirection: 'row',
  },
  scrollableColumns: {
    flex: 1,
  },
  cellContentMeasure: {
    paddingHorizontal: CELL_HORIZONTAL_PADDING,
    paddingVertical: 8,
  },
  numericText: {
    fontVariant: ['tabular-nums'] as const,
    letterSpacing: -0.35,
  },
  headerText: {
    fontWeight: '600',
  },
});
