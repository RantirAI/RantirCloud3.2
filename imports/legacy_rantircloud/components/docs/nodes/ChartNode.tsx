import { DecoratorNode, NodeKey, LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import { DocumentChart, ChartConfig } from '../DocumentChart';

export type SerializedChartNode = Spread<{
  chartConfig: ChartConfig;
}, SerializedLexicalNode>;

export class ChartNode extends DecoratorNode<JSX.Element> {
  __chartConfig: ChartConfig;

  static getType(): string {
    return 'chart';
  }

  static clone(node: ChartNode): ChartNode {
    return new ChartNode(node.__chartConfig, node.__key);
  }

  constructor(chartConfig: ChartConfig, key?: NodeKey) {
    super(key);
    this.__chartConfig = chartConfig;
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'chart-node-container my-4';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedChartNode): ChartNode {
    return new ChartNode(serializedNode.chartConfig);
  }

  exportJSON(): SerializedChartNode {
    return {
      type: 'chart',
      chartConfig: this.__chartConfig,
      version: 1,
    };
  }

  getChartConfig(): ChartConfig {
    return this.__chartConfig;
  }

  decorate(): JSX.Element {
    return <DocumentChart config={this.__chartConfig} />;
  }
}

export function $createChartNode(chartConfig: ChartConfig): ChartNode {
  return new ChartNode(chartConfig);
}

export function $isChartNode(node: LexicalNode | null | undefined): node is ChartNode {
  return node instanceof ChartNode;
}
