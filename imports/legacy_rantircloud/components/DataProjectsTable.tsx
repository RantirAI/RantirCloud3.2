
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";

interface DataProject {
  id: string;
  name: string;
  description?: string;
  updated_at: string;
}

export function DataProjectsTable({ projects }: { projects: DataProject[] }) {
  if (!projects?.length) {
    return <div className="text-muted-foreground">No data projects found.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((proj) => (
          <TableRow key={proj.id}>
            <TableCell>
              <Link to={`/tables/${proj.id}`} className="font-semibold hover:underline">
                {proj.name}
              </Link>
            </TableCell>
            <TableCell>{proj.description || <span className="text-muted-foreground">No description</span>}</TableCell>
            <TableCell>{new Date(proj.updated_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <Link to={`/tables/${proj.id}`} className="text-primary hover:underline">View</Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
