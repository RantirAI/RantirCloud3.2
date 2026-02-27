import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/compact/Input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RotateCcw, RotateCw, Plus, X, ImageIcon, Circle, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradientStop {
  color: string;
  position: number;
}

interface GradientBuilderProps {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

type GradientType = 'none' | 'linear' | 'radial' | 'conic';

export function GradientBuilder({ value, onChange, open, onOpenChange, children }: GradientBuilderProps) {
  const [type, setType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState(180);
  const [stops, setStops] = useState<GradientStop[]>([
    { color: '#000000', position: 0 },
    { color: '#ffffff', position: 100 }
  ]);
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);

  // Parse existing gradient value on open
  useEffect(() => {
    if (open && value) {
      parseGradient(value);
    }
  }, [open, value]);

  const parseGradient = (gradientStr: string) => {
    if (!gradientStr || gradientStr === 'none') {
      setType('none');
      return;
    }

    const linearMatch = gradientStr.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
    const radialMatch = gradientStr.match(/radial-gradient\((.+)\)/);
    const conicMatch = gradientStr.match(/conic-gradient\((.+)\)/);

    if (linearMatch) {
      setType('linear');
      setAngle(parseInt(linearMatch[1]));
      parseStops(linearMatch[2]);
    } else if (radialMatch) {
      setType('radial');
      parseStops(radialMatch[1]);
    } else if (conicMatch) {
      setType('conic');
      parseStops(conicMatch[1]);
    }
  };

  const parseStops = (stopsStr: string) => {
    const stopRegex = /(#[a-fA-F0-9]{6}|rgba?\([^)]+\))\s*(\d+)?%?/g;
    const matches = [...stopsStr.matchAll(stopRegex)];
    if (matches.length >= 2) {
      setStops(matches.map((match, i) => ({
        color: match[1],
        position: match[2] ? parseInt(match[2]) : (i / (matches.length - 1)) * 100
      })));
    }
  };

  const generateGradient = () => {
    if (type === 'none') return 'none';
    
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);
    const stopsStr = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');
    
    switch (type) {
      case 'linear':
        return `linear-gradient(${angle}deg, ${stopsStr})`;
      case 'radial':
        return `radial-gradient(circle, ${stopsStr})`;
      case 'conic':
        return `conic-gradient(from ${angle}deg, ${stopsStr})`;
      default:
        return 'none';
    }
  };

  const handleApply = () => {
    onChange(generateGradient());
    onOpenChange(false);
  };

  const addStop = () => {
    const newPosition = 50;
    setStops([...stops, { color: '#888888', position: newPosition }]);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    setStops(stops.filter((_, i) => i !== index));
    if (selectedStopIndex >= stops.length - 1) {
      setSelectedStopIndex(stops.length - 2);
    }
  };

  const updateStop = (index: number, updates: Partial<GradientStop>) => {
    setStops(stops.map((stop, i) => i === index ? { ...stop, ...updates } : stop));
  };

  const previewGradient = generateGradient();

  const typeOptions: { type: GradientType; icon: React.ReactNode; label: string }[] = [
    { type: 'none', icon: <X className="h-4 w-4" />, label: 'None' },
    { type: 'linear', icon: <div className="w-4 h-4 rounded-sm bg-gradient-to-r from-black to-white" />, label: 'Linear' },
    { type: 'radial', icon: <Circle className="h-4 w-4" />, label: 'Radial' },
    { type: 'conic', icon: <Moon className="h-4 w-4" />, label: 'Conic' },
  ];

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          {/* Type Selection */}
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Type</Label>
            <div className="flex gap-1 mt-1">
              {typeOptions.map((option) => (
                <Button
                  key={option.type}
                  variant={type === option.type ? 'default' : 'outline'}
                  size="sm"
                  className={cn("flex-1 h-9", type === option.type && "bg-primary")}
                  onClick={() => setType(option.type)}
                >
                  {option.icon}
                </Button>
              ))}
            </div>
          </div>

          {type !== 'none' && (
            <>
              {/* Angle Control */}
              {(type === 'linear' || type === 'conic') && (
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Angle</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setAngle((a) => (a - 45 + 360) % 360)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Slider
                      value={[angle]}
                      onValueChange={(v) => setAngle(v[0])}
                      min={0}
                      max={360}
                      step={1}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setAngle((a) => (a + 45) % 360)}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      value={angle}
                      onChange={(e) => setAngle(parseInt(e.target.value) || 0)}
                      className="w-14 h-7 text-xs text-center"
                    />
                    <span className="text-xs text-muted-foreground">D</span>
                  </div>
                </div>
              )}

              {/* Stops Visualization */}
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Stops</Label>
                <div 
                  className="relative h-4 rounded mt-1 cursor-pointer"
                  style={{ background: previewGradient !== 'none' ? `linear-gradient(90deg, ${stops.map(s => `${s.color} ${s.position}%`).join(', ')})` : '#ccc' }}
                >
                  {stops.map((stop, index) => (
                    <div
                      key={index}
                      className={cn(
                        "absolute top-0 w-3 h-4 -ml-1.5 cursor-pointer border-2 rounded-sm",
                        selectedStopIndex === index ? "border-primary" : "border-white"
                      )}
                      style={{ left: `${stop.position}%`, backgroundColor: stop.color }}
                      onClick={() => setSelectedStopIndex(index)}
                    />
                  ))}
                </div>
              </div>

              {/* Color Stop Editor */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase text-muted-foreground">Color</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={addStop}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="color"
                    value={stops[selectedStopIndex]?.color || '#000000'}
                    onChange={(e) => updateStop(selectedStopIndex, { color: e.target.value })}
                    className="w-8 h-7 p-0.5 border rounded cursor-pointer"
                  />
                  <Input
                    value={stops[selectedStopIndex]?.color || '#000000'}
                    onChange={(e) => updateStop(selectedStopIndex, { color: e.target.value })}
                    className="flex-1 h-7 text-xs"
                  />
                  <Input
                    type="number"
                    value={stops[selectedStopIndex]?.position || 0}
                    onChange={(e) => updateStop(selectedStopIndex, { position: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    className="w-14 h-7 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  {stops.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeStop(selectedStopIndex)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Preview</Label>
                <div
                  className="h-16 rounded border mt-1"
                  style={{ background: previewGradient !== 'none' ? previewGradient : '#ccc' }}
                />
              </div>
            </>
          )}

          {/* Apply Button */}
          <Button onClick={handleApply} className="w-full">
            Apply Gradient
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
