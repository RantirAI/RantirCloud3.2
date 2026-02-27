import { DecoratorNode, NodeKey, LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import { DocumentImage } from '../DocumentImage';

export type SerializedImageNode = Spread<{
  imageUrl: string | null;
  imagePrompt: string;
  alt: string;
}, SerializedLexicalNode>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __imageUrl: string | null;
  __imagePrompt: string;
  __alt: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__imageUrl, node.__imagePrompt, node.__alt, node.__key);
  }

  constructor(imageUrl: string | null, imagePrompt: string, alt: string, key?: NodeKey) {
    super(key);
    this.__imageUrl = imageUrl;
    this.__imagePrompt = imagePrompt;
    this.__alt = alt;
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'image-node-container my-4';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return new ImageNode(
      serializedNode.imageUrl,
      serializedNode.imagePrompt,
      serializedNode.alt
    );
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      imageUrl: this.__imageUrl,
      imagePrompt: this.__imagePrompt,
      alt: this.__alt,
      version: 1,
    };
  }

  getImageUrl(): string | null {
    return this.__imageUrl;
  }

  getImagePrompt(): string {
    return this.__imagePrompt;
  }

  decorate(): JSX.Element {
    return (
      <DocumentImage
        imageUrl={this.__imageUrl || undefined}
        imagePrompt={this.__imagePrompt}
        alt={this.__alt}
        className="w-full max-w-2xl mx-auto rounded-lg"
      />
    );
  }
}

export function $createImageNode(imageUrl: string | null, imagePrompt: string, alt: string = ''): ImageNode {
  return new ImageNode(imageUrl, imagePrompt, alt);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
