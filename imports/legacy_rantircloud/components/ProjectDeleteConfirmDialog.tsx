 import { useState } from 'react';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 import { Loader2 } from 'lucide-react';
 import { toast } from 'sonner';
 import { databaseService } from '@/services/databaseService';
 import { appBuilderService } from '@/services/appBuilderService';
 import { flowService } from '@/services/flowService';
 
 
 export type ProjectType = 'database' | 'flow' | 'app';
 
 interface ProjectDeleteConfirmDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   projectId: string | null;
   projectName: string;
   projectType: ProjectType;
   onSuccess?: () => void;
 }
 
 export function ProjectDeleteConfirmDialog({
   open,
   onOpenChange,
   projectId,
   projectName,
   projectType,
   onSuccess,
 }: ProjectDeleteConfirmDialogProps) {
   const [isDeleting, setIsDeleting] = useState(false);
 
   const getProjectTypeLabel = () => {
     switch (projectType) {
       case 'database':
         return 'database';
       case 'flow':
         return 'flow';
        case 'app':
          return 'app';
        default:
         return 'project';
     }
   };
 
   const handleDelete = async () => {
     if (!projectId) return;
 
     setIsDeleting(true);
     try {
       switch (projectType) {
         case 'database':
           await databaseService.deleteDatabase(projectId);
           break;
         case 'flow':
           await flowService.deleteFlowProject(projectId);
           break;
         case 'app':
           await appBuilderService.deleteAppProject(projectId);
            // Dispatch event for app deletion
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('project-deleted', { detail: { projectId } }));
            }
           break;
       }
 
       toast.success(`${getProjectTypeLabel()} deleted successfully`);
       onOpenChange(false);
       onSuccess?.();
     } catch (error: any) {
       toast.error(error.message || `Failed to delete ${getProjectTypeLabel()}`);
     } finally {
       setIsDeleting(false);
     }
   };
 
   return (
     <AlertDialog open={open} onOpenChange={onOpenChange}>
       <AlertDialogContent>
         <AlertDialogHeader>
           <AlertDialogTitle>Delete {getProjectTypeLabel()}?</AlertDialogTitle>
           <AlertDialogDescription>
             Are you sure you want to delete "{projectName}"? This action cannot be undone.
             {projectType === 'database' && (
               <span className="block mt-2 text-destructive">
                 All tables and data within this database will be permanently deleted.
               </span>
             )}
             {projectType === 'flow' && (
               <span className="block mt-2 text-destructive">
                 All flow data, versions, and configurations will be permanently deleted.
               </span>
             )}
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
           <AlertDialogAction
             onClick={handleDelete}
             disabled={isDeleting}
             className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
           >
             {isDeleting ? (
               <>
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 Deleting...
               </>
             ) : (
               'Delete'
             )}
           </AlertDialogAction>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   );
 }