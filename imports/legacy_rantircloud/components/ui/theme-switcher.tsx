import { Monitor, Moon, Sun, Palette, Type, PanelTop } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { workspaceService } from "@/services/workspaceService";
import { applyThemeColor, applyThemeFont, applyTopbarColor } from "@/hooks/useWorkspaceTheme";

const THEME_COLORS = [
  { value: 'blue', label: 'Blue', color: '#3B82F6', hsl: '217.2 91.2% 59.8%' },
  { value: 'red', label: 'Red', color: '#EF4444', hsl: '0 84.2% 60.2%' },
  { value: 'green', label: 'Green', color: '#22C55E', hsl: '142.1 76.2% 36.3%' },
  { value: 'orange', label: 'Orange', color: '#F97316', hsl: '24.6 95% 53.1%' },
  { value: 'dark-blue', label: 'Dark Blue', color: '#1E3A8A', hsl: '224.3 76.3% 32.9%' },
  { value: 'purple', label: 'Purple', color: '#8B5CF6', hsl: '262.1 83.3% 57.8%' },
  { value: 'pink', label: 'Pink', color: '#EC4899', hsl: '330.4 81.2% 60.4%' },
  { value: 'teal', label: 'Teal', color: '#14B8A6', hsl: '173.4 80.4% 40%' },
];

const THEME_FONTS = [
  { value: 'Instrument Sans', label: 'Instrument Sans' },
  { value: 'Figtree', label: 'Figtree' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Work Sans', label: 'Work Sans' },
  { value: 'Fira Sans', label: 'Fira Sans' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Inconsolata', label: 'Inconsolata' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Sora', label: 'Sora' },
];

const TOPBAR_COLORS = [
  { value: 'default', label: 'Default', color: '#27272a' },
  { value: 'black', label: 'Black', color: '#09090b' },
  { value: 'slate', label: 'Slate', color: '#334155' },
  { value: 'dark-blue', label: 'Dark Blue', color: '#000124' },
  { value: 'blue', label: 'Blue', color: '#1e40af' },
  { value: 'indigo', label: 'Indigo', color: '#3730a3' },
  { value: 'purple', label: 'Purple', color: '#6b21a8' },
  { value: 'teal', label: 'Teal', color: '#115e59' },
  { value: 'emerald', label: 'Emerald', color: '#065f46' },
  { value: 'rose', label: 'Rose', color: '#9f1239' },
  { value: 'orange', label: 'Orange', color: '#9a3412' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [themeColor, setThemeColor] = useState('blue');
  const [themeFont, setThemeFont] = useState('Instrument Sans');
  const [topbarColor, setTopbarColor] = useState('default');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load workspace customization
  useEffect(() => {
    const loadCustomization = async () => {
      try {
        const workspace = await workspaceService.getCurrentWorkspace();
        if (!workspace) {
          setIsLoaded(true);
          return;
        }
        
        setWorkspaceId(workspace.id);
        
        const { data, error } = await supabase
          .from('workspace_customization')
          .select('theme_color, theme_font, topbar_bg_color')
          .eq('workspace_id', workspace.id)
          .maybeSingle();
        
        if (data && !error) {
          if (data.theme_color) setThemeColor(data.theme_color);
          if (data.theme_font) setThemeFont(data.theme_font);
          if (data.topbar_bg_color) setTopbarColor(data.topbar_bg_color);
        }
      } catch (error) {
        console.error('Error loading theme customization:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadCustomization();
  }, []);

  const saveCustomization = async (updates: { theme_color?: string; theme_font?: string; topbar_bg_color?: string }) => {
    if (!workspaceId) return;

    try {
      const { error } = await supabase
        .from('workspace_customization')
        .upsert(
          {
            workspace_id: workspaceId,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id' }
        );

      if (error) {
        console.error('Error saving theme customization:', error);
      }
    } catch (error) {
      console.error('Error saving theme customization:', error);
    }
  };

  const handleThemeColorChange = (value: string) => {
    setThemeColor(value);
    applyThemeColor(value);
    saveCustomization({ theme_color: value });
  };

  const handleThemeFontChange = (value: string) => {
    setThemeFont(value);
    applyThemeFont(value);
    saveCustomization({ theme_font: value });
  };

  const handleTopbarColorChange = (value: string) => {
    setTopbarColor(value);
    applyTopbarColor(value);
    saveCustomization({ topbar_bg_color: value });
  };

  const currentThemeColor = THEME_COLORS.find(c => c.value === themeColor);
  const currentTopbarColor = TOPBAR_COLORS.find(c => c.value === topbarColor);

  return (
    <div className="space-y-3">
      {/* Light/Dark Theme */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide font-inconsolata">Theme</span>
        <div className="flex items-center gap-1 p-1 bg-zinc-800 border border-zinc-700 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 rounded text-zinc-400 hover:text-white hover:bg-zinc-700",
              theme === "light" && "bg-zinc-700 text-white shadow-sm"
            )}
            onClick={() => setTheme("light")}
          >
            <Sun className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 rounded text-zinc-400 hover:text-white hover:bg-zinc-700",
              theme === "system" && "bg-zinc-700 text-white shadow-sm"
            )}
            onClick={() => setTheme("system")}
          >
            <Monitor className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 rounded text-zinc-400 hover:text-white hover:bg-zinc-700",
              theme === "dark" && "bg-zinc-700 text-white shadow-sm"
            )}
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Theme Color */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="h-3 w-3 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide font-inconsolata">Color</span>
        </div>
        <Select value={themeColor} onValueChange={handleThemeColorChange}>
          <SelectTrigger className="w-28 h-7 text-xs bg-zinc-800 border-zinc-700 text-white">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: currentThemeColor?.color }}
              />
              <span>{currentThemeColor?.label}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="z-[2200] bg-zinc-900 border-zinc-700">
            {THEME_COLORS.map((color) => (
              <SelectItem key={color.value} value={color.value} className="text-white hover:bg-zinc-800 focus:bg-zinc-800">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color.color }}
                  />
                  {color.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Theme Font */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Type className="h-3 w-3 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide font-inconsolata">Font</span>
        </div>
        <Select value={themeFont} onValueChange={handleThemeFontChange}>
          <SelectTrigger className="w-36 h-7 text-xs bg-zinc-800 border-zinc-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[2200] max-h-60 bg-zinc-900 border-zinc-700">
            {THEME_FONTS.map((font) => (
              <SelectItem 
                key={font.value} 
                value={font.value}
                className="text-white hover:bg-zinc-800 focus:bg-zinc-800"
                style={{ fontFamily: `"${font.value}", sans-serif` }}
              >
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TopBar Color */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PanelTop className="h-3 w-3 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide font-inconsolata">TopBar</span>
        </div>
        <Select value={topbarColor} onValueChange={handleTopbarColorChange}>
          <SelectTrigger className="w-28 h-7 text-xs bg-zinc-800 border-zinc-700 text-white">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border border-zinc-500 flex-shrink-0" 
                style={{ backgroundColor: currentTopbarColor?.color }}
              />
              <span>{currentTopbarColor?.label}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="z-[2200] bg-zinc-900 border-zinc-700">
            {TOPBAR_COLORS.map((color) => (
              <SelectItem key={color.value} value={color.value} className="text-white hover:bg-zinc-800 focus:bg-zinc-800">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border border-zinc-500" 
                    style={{ backgroundColor: color.color }}
                  />
                  {color.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
