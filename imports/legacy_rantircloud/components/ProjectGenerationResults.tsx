import { Database, Network, Grid3X3, ExternalLink } from "lucide-react";

interface CreatedProject {
  id: string;
  type: string;
  name: string;
  url: string;
}

interface ProjectGenerationResultsProps {
  results: CreatedProject[];
  onClear: () => void;
}

export function ProjectGenerationResults({ results, onClear }: ProjectGenerationResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="dashboard-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-light font-sans">Recently Generated</h2>
        <button 
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {results.map((project) => (
          <div key={project.id} className="border border-border rounded-md p-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              {project.type === 'database' && <Database className="h-4 w-4 text-orange-500" />}
              {project.type === 'flow' && <Network className="h-4 w-4 text-purple-500" />}
              {project.type === 'app' && <Grid3X3 className="h-4 w-4 text-blue-500" />}
              <span className="text-sm font-medium">{project.name}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 capitalize">{project.type} project</p>
            <a 
              href={project.url}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open project <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}