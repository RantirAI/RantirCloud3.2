import { DecoratorNode, NodeKey, LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import { DocumentVideo } from '../DocumentVideo';

export type SerializedVideoNode = Spread<{
  videoUrl: string | null;
  videoPrompt: string;
  thumbnailUrl?: string;
}, SerializedLexicalNode>;

export class VideoNode extends DecoratorNode<JSX.Element> {
  __videoUrl: string | null;
  __videoPrompt: string;
  __thumbnailUrl: string | undefined;

  static getType(): string {
    return 'video';
  }

  static clone(node: VideoNode): VideoNode {
    return new VideoNode(node.__videoUrl, node.__videoPrompt, node.__thumbnailUrl, node.__key);
  }

  constructor(videoUrl: string | null, videoPrompt: string, thumbnailUrl?: string, key?: NodeKey) {
    super(key);
    this.__videoUrl = videoUrl;
    this.__videoPrompt = videoPrompt;
    this.__thumbnailUrl = thumbnailUrl;
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'video-node-container my-4';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedVideoNode): VideoNode {
    return new VideoNode(
      serializedNode.videoUrl,
      serializedNode.videoPrompt,
      serializedNode.thumbnailUrl
    );
  }

  exportJSON(): SerializedVideoNode {
    return {
      type: 'video',
      videoUrl: this.__videoUrl,
      videoPrompt: this.__videoPrompt,
      thumbnailUrl: this.__thumbnailUrl,
      version: 1,
    };
  }

  getVideoUrl(): string | null {
    return this.__videoUrl;
  }

  getVideoPrompt(): string {
    return this.__videoPrompt;
  }

  decorate(): JSX.Element {
    return (
      <DocumentVideo
        videoUrl={this.__videoUrl || undefined}
        videoPrompt={this.__videoPrompt}
        thumbnailUrl={this.__thumbnailUrl}
        className="w-full max-w-2xl mx-auto rounded-lg"
      />
    );
  }
}

export function $createVideoNode(videoUrl: string | null, videoPrompt: string, thumbnailUrl?: string): VideoNode {
  return new VideoNode(videoUrl, videoPrompt, thumbnailUrl);
}

export function $isVideoNode(node: LexicalNode | null | undefined): node is VideoNode {
  return node instanceof VideoNode;
}
