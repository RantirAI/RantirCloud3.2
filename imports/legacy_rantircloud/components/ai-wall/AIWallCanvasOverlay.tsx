import { AIWallCanvas } from './AIWallCanvas';

export function AIWallCanvasOverlay() {
  return (
    <div className="absolute inset-0 z-30 bg-background flex flex-col">
      <AIWallCanvas />
    </div>
  );
}
