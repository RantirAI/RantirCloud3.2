import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppBuilderStore } from '@/stores/appBuilderStore';

interface FlexProps {
  direction: string;
  justify: string;
  align: string;
  gap: number;
  rowGap: number;
  columnGap: number;
}

interface FlowLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const LINE_COUNT = 3;
const LINE_COLOR = 'rgba(59, 130, 246, 0.3)';
const ARROW_SIZE = 4;
const EXPANDED_FILL = 'rgba(59, 130, 246, 0.04)';

function parseGap(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function computeFlowLines(
  bounds: Bounds,
  flex: FlexProps,
  expanded: boolean
): FlowLine[] {
  const { width, height } = bounds;
  const isRow = flex.direction === 'row' || flex.direction === 'row-reverse';
  const isReverse = flex.direction === 'row-reverse' || flex.direction === 'column-reverse';

  const mainSize = isRow ? width : height;
  const crossSize = isRow ? height : width;

  // Gap along the cross axis for spacing between symbolic lines
  const crossGap = isRow ? flex.rowGap || flex.gap : flex.columnGap || flex.gap;
  const visualGap = expanded ? Math.max(crossGap, 12) : Math.max(crossGap, 6);

  // Line length along main axis based on justifyContent
  const lineLength = expanded ? mainSize * 0.85 : mainSize * 0.5;

  // Calculate cross-axis positions for the 3 lines
  const totalCrossSpan = (LINE_COUNT - 1) * visualGap;
  const lineThickness = expanded ? crossSize * 0.06 : crossSize * 0.04;

  // Cross-axis positions based on alignItems
  const crossPositions: number[] = [];
  const getCrossStart = () => {
    switch (flex.align) {
      case 'center':
        return (crossSize - totalCrossSpan) / 2;
      case 'flex-end':
        return crossSize - totalCrossSpan - 8;
      case 'stretch':
        return (crossSize - totalCrossSpan) / 2;
      case 'flex-start':
      default:
        return 8;
    }
  };

  const crossStart = getCrossStart();
  for (let i = 0; i < LINE_COUNT; i++) {
    crossPositions.push(crossStart + i * visualGap);
  }

  // Main-axis positions based on justifyContent
  const getMainPositions = (): { start: number; end: number }[] => {
    const padding = 8;
    const segmentLength = lineLength / LINE_COUNT;

    switch (flex.justify) {
      case 'center': {
        const offset = (mainSize - lineLength) / 2;
        return crossPositions.map((_, i) => ({
          start: offset + i * (segmentLength * 0.1),
          end: offset + lineLength - i * (segmentLength * 0.1),
        }));
      }
      case 'flex-end': {
        const offset = mainSize - lineLength - padding;
        return crossPositions.map(() => ({
          start: offset,
          end: mainSize - padding,
        }));
      }
      case 'space-between': {
        return crossPositions.map((_, i) => {
          const ratio = i / (LINE_COUNT - 1);
          const center = padding + ratio * (mainSize - 2 * padding);
          const half = segmentLength * 0.4;
          return { start: center - half, end: center + half };
        });
      }
      case 'space-around': {
        const slotSize = mainSize / LINE_COUNT;
        return crossPositions.map((_, i) => {
          const center = slotSize * (i + 0.5);
          const half = segmentLength * 0.4;
          return { start: center - half, end: center + half };
        });
      }
      case 'space-evenly': {
        const slot = mainSize / (LINE_COUNT + 1);
        return crossPositions.map((_, i) => {
          const center = slot * (i + 1);
          const half = segmentLength * 0.4;
          return { start: center - half, end: center + half };
        });
      }
      case 'flex-start':
      default: {
        return crossPositions.map(() => ({
          start: padding,
          end: padding + lineLength,
        }));
      }
    }
  };

  // For stretch alignment in expanded mode, lines span more of cross axis
  const getCrossExtent = (crossPos: number) => {
    if (flex.align === 'stretch') {
      const stretchLen = expanded ? crossSize * 0.7 : crossSize * 0.4;
      return { crossStart: crossPos - stretchLen / 2 + totalCrossSpan / 2, crossEnd: crossPos + stretchLen / 2 - totalCrossSpan / 2 };
    }
    return { crossStart: crossPos, crossEnd: crossPos };
  };

  const mainPositions = getMainPositions();
  const lines: FlowLine[] = [];

  crossPositions.forEach((crossPos, i) => {
    const main = mainPositions[i];
    let mainStart = main.start;
    let mainEnd = main.end;

    if (isReverse) {
      mainStart = mainSize - main.end;
      mainEnd = mainSize - main.start;
    }

    if (isRow) {
      lines.push({ x1: mainStart, y1: crossPos, x2: mainEnd, y2: crossPos });
    } else {
      lines.push({ x1: crossPos, y1: mainStart, x2: crossPos, y2: mainEnd });
    }
  });

  return lines;
}

function getArrowPoints(line: FlowLine, direction: string): string {
  const isRow = direction === 'row' || direction === 'row-reverse';
  const isReverse = direction === 'row-reverse' || direction === 'column-reverse';

  // Arrow at the end of the line
  const endX = isReverse ? line.x1 : line.x2;
  const endY = isReverse ? line.y1 : line.y2;

  if (isRow) {
    const dir = isReverse ? 1 : -1;
    return `${endX + dir * ARROW_SIZE},${endY - ARROW_SIZE} ${endX},${endY} ${endX + dir * ARROW_SIZE},${endY + ARROW_SIZE}`;
  } else {
    const dir = isReverse ? 1 : -1;
    return `${endX - ARROW_SIZE},${endY + dir * ARROW_SIZE} ${endX},${endY} ${endX + ARROW_SIZE},${endY + dir * ARROW_SIZE}`;
  }
}

export function FlexOverlay({ componentId }: { componentId: string }) {
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [flexProps, setFlexProps] = useState<FlexProps | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const { zoom } = useAppBuilderStore();
  const prevComponentId = useRef(componentId);

  // Reset expanded when component changes
  useEffect(() => {
    if (prevComponentId.current !== componentId) {
      setExpanded(false);
      prevComponentId.current = componentId;
    }
  }, [componentId]);

  // Measure bounds + read computed flex styles
  const measure = useCallback(() => {
    const el = document.querySelector(`[data-component-id="${componentId}"]`) as HTMLElement | null;
    if (!el) {
      setBounds(null);
      setFlexProps(null);
      return;
    }

    const computed = getComputedStyle(el);
    if (computed.display !== 'flex' && computed.display !== 'inline-flex') {
      setBounds(null);
      setFlexProps(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const contentWrapper = document.querySelector('[data-canvas-content]');
    if (!contentWrapper) return;

    const contentRect = contentWrapper.getBoundingClientRect();

    setBounds({
      left: (rect.left - contentRect.left) / zoom,
      top: (rect.top - contentRect.top) / zoom,
      width: rect.width / zoom,
      height: rect.height / zoom,
    });

    setFlexProps({
      direction: computed.flexDirection || 'row',
      justify: computed.justifyContent || 'flex-start',
      align: computed.alignItems || 'stretch',
      gap: parseGap(computed.gap),
      rowGap: parseGap(computed.rowGap),
      columnGap: parseGap(computed.columnGap),
    });
  }, [componentId, zoom]);

  useEffect(() => {
    measure();
    // Fade in
    requestAnimationFrame(() => setVisible(true));

    const el = document.querySelector(`[data-component-id="${componentId}"]`) as HTMLElement | null;
    if (!el) return;

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const mo = new MutationObserver(measure);
    mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });

    const scrollContainer = document.querySelector('.canvas-scroll-container');
    if (scrollContainer) scrollContainer.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);

    // Poll for style changes from property panel
    const interval = setInterval(measure, 300);

    return () => {
      ro.disconnect();
      mo.disconnect();
      clearInterval(interval);
      if (scrollContainer) scrollContainer.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      setVisible(false);
    };
  }, [componentId, zoom, measure]);

  // Escape to exit expanded mode
  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    const handleClick = () => setExpanded(false);
    window.addEventListener('keydown', handleKeyDown);
    // Delay click listener to avoid immediate trigger
    const timer = setTimeout(() => window.addEventListener('click', handleClick), 100);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
      clearTimeout(timer);
    };
  }, [expanded]);

  if (!bounds || !flexProps) return null;

  const lines = computeFlowLines(bounds, flexProps, expanded);

  return (
    <svg
      className="absolute"
      style={{
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease-in-out',
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      {/* Expanded mode: background fills between lines */}
      {expanded && lines.length >= 2 && (
        <rect
          x={0}
          y={0}
          width={bounds.width}
          height={bounds.height}
          fill={EXPANDED_FILL}
          rx={2}
        />
      )}

      {/* Flow lines */}
      {lines.map((line, i) => (
        <line
          key={`line-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={LINE_COLOR}
          strokeWidth={1}
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
      ))}

      {/* Direction arrows */}
      {lines.map((line, i) => (
        <polyline
          key={`arrow-${i}`}
          points={getArrowPoints(line, flexProps.direction)}
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Line end caps (small circles at start of each line) */}
      {lines.map((line, i) => {
        const isReverse = flexProps.direction === 'row-reverse' || flexProps.direction === 'column-reverse';
        const sx = isReverse ? line.x2 : line.x1;
        const sy = isReverse ? line.y2 : line.y1;
        return (
          <circle
            key={`cap-${i}`}
            cx={sx}
            cy={sy}
            r={1.5}
            fill={LINE_COLOR}
          />
        );
      })}
    </svg>
  );
}
