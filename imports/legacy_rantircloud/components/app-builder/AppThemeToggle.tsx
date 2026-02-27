import { useCanvasTheme } from '@/hooks/useCanvasTheme';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppThemeToggleProps {
  style?: 'button' | 'switch' | 'segmented';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
  lightLabel?: string;
  darkLabel?: string;
  systemLabel?: string;
  className?: string;
}

export function AppThemeToggle({
  style = 'button',
  size = 'md',
  showLabels = true,
  orientation = 'horizontal',
  lightLabel = 'Light',
  darkLabel = 'Dark', 
  systemLabel = 'Auto',
  className,
  ...props
}: AppThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useCanvasTheme();

  const buttonSizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-6 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  if (style === 'switch') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Sun className={cn(iconSizes[size], resolvedTheme === 'light' ? 'text-amber-500' : 'text-muted-foreground')} />
        <Switch
          checked={resolvedTheme === 'dark'}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          {...props}
        />
        <Moon className={cn(iconSizes[size], resolvedTheme === 'dark' ? 'text-blue-500' : 'text-muted-foreground')} />
      </div>
    );
  }

  if (style === 'segmented') {
    return (
      <div className={cn(
        'inline-flex items-center justify-center rounded-lg bg-muted p-1',
        orientation === 'vertical' && 'flex-col',
        className
      )}>
        <Button
          variant={theme === 'light' ? 'default' : 'ghost'}
          size="sm"
          className={cn('flex items-center gap-2', buttonSizes[size])}
          onClick={() => setTheme('light')}
        >
          <Sun className={iconSizes[size]} />
          {showLabels && <span>{lightLabel}</span>}
        </Button>
        <Button
          variant={theme === 'system' ? 'default' : 'ghost'}
          size="sm"
          className={cn('flex items-center gap-2', buttonSizes[size])}
          onClick={() => setTheme('system')}
        >
          <Monitor className={iconSizes[size]} />
          {showLabels && <span>{systemLabel}</span>}
        </Button>
        <Button
          variant={theme === 'dark' ? 'default' : 'ghost'}
          size="sm"
          className={cn('flex items-center gap-2', buttonSizes[size])}
          onClick={() => setTheme('dark')}
        >
          <Moon className={iconSizes[size]} />
          {showLabels && <span>{darkLabel}</span>}
        </Button>
      </div>
    );
  }

  // Default button style
  return (
    <Button
      variant="outline"
      className={cn(
        'flex items-center gap-2',
        buttonSizes[size],
        className
      )}
      onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
      {...props}
    >
      {resolvedTheme === 'light' ? (
        <>
          <Sun className={iconSizes[size]} />
          {showLabels && <span>{lightLabel}</span>}
        </>
      ) : (
        <>
          <Moon className={iconSizes[size]} />
          {showLabels && <span>{darkLabel}</span>}
        </>
      )}
    </Button>
  );
}