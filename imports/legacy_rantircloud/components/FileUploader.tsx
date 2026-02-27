
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { FileImage, File, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FileUploaderProps {
  type: "image" | "pdf";
  value: string | null;
  onChange: (url: string | null) => void;
}

export function FileUploader({ type, value, onChange }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const acceptTypes = {
    image: "image/*",
    pdf: "application/pdf",
  };

  const bucketName = type === "image" ? "tableapp-files" : "tableapp-files";

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;
    
    try {
      setUploading(true);
      
      // Create a progress tracker
      let lastLoaded = 0;
      const progressInterval = setInterval(() => {
        // Simulate progress until upload is complete
        if (progress < 90) {
          setProgress(prev => Math.min(prev + 5, 90));
        }
      }, 200);
      
      const { error: uploadError, data } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: true
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      onChange(publicUrl);
      toast.success(`${type === "image" ? "Image" : "PDF"} uploaded successfully`);
    } catch (error: any) {
      toast.error(`Error uploading: ${error.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000); // Reset progress after a delay
    }
  };
  
  const clearFile = () => {
    onChange(null);
  };

  return (
    <div className="w-full">
      {!value ? (
        <div className="flex flex-col items-center">
          <label 
            htmlFor={`file-upload-${type}`}
            className="cursor-pointer w-full"
          >
            <Card className="border-dashed border-2 p-4 flex flex-col items-center justify-center h-28 hover:border-primary transition-colors">
              {type === "image" ? (
                <FileImage className="h-6 w-6 text-muted-foreground mb-2" />
              ) : (
                <File className="h-6 w-6 text-muted-foreground mb-2" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? "Uploading..." : `Click to upload ${type === "image" ? "image" : "PDF"}`}
              </span>
              {uploading && <Progress value={progress} className="w-full mt-2" />}
            </Card>
          </label>
          <Input 
            id={`file-upload-${type}`}
            type="file" 
            accept={acceptTypes[type]}
            onChange={handleFileSelected}
            disabled={uploading}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative">
          {type === "image" ? (
            <div className="relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
              <img 
                src={value} 
                alt="Uploaded image" 
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <Card className="p-3 flex items-center">
              <File className="h-5 w-5 mr-2" />
              <span className="text-sm flex-1 truncate">
                {value.split('/').pop()}
              </span>
              <a 
                href={value} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline ml-2"
              >
                View
              </a>
            </Card>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={clearFile}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

