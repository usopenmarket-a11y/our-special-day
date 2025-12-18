import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, X, Check, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { weddingConfig } from "@/lib/weddingConfig";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
}

const PhotoUploadSection = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFiles = useCallback((fileList: FileList) => {
    const validFiles = Array.from(fileList).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    const newFiles: UploadedFile[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, [toast]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    const pendingFilesToUpload = files.filter((f) => f.status === "pending");
    if (pendingFilesToUpload.length === 0) return;

    // Update all pending files to uploading status
    setFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" as const } : f))
    );

    let successCount = 0;
    let errorCount = 0;

    // Upload each file to Google Drive via Supabase Edge Function
    for (const uploadFile of pendingFilesToUpload) {
      try {
        const formData = new FormData();
        formData.append("file", uploadFile.file);
        formData.append("folderId", weddingConfig.uploadFolderId);

        // Use fetch directly for FormData uploads
        const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-photo`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || `Upload failed: ${response.status}`);
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "success" as const } : f
          )
        );
        successCount++;
      } catch (error) {
        console.error("Error uploading file:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "error" as const } : f
          )
        );
        errorCount++;
      }
    }

    // Show toast based on results
    if (successCount > 0 && errorCount === 0) {
      toast({
        title: "Photos uploaded! 📸",
        description: `Successfully uploaded ${successCount} photo${successCount > 1 ? "s" : ""}. Thank you for sharing your memories with us.`,
      });
    } else if (successCount > 0 && errorCount > 0) {
      toast({
        title: "Partial upload complete",
        description: `Uploaded ${successCount} photo${successCount > 1 ? "s" : ""}, but ${errorCount} failed. Please try again.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Upload failed",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pendingFiles = files.filter((f) => f.status === "pending");
  const uploadedFiles = files.filter((f) => f.status === "success");

  return (
    <section id="upload" className="py-20 px-4 bg-secondary/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-body text-gold uppercase tracking-[0.3em] mb-4">
            Share The Love
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-semibold text-foreground mb-4">
            Upload Your Photos
          </h2>
          <p className="text-lg font-body text-muted-foreground max-w-md mx-auto">
            Help us capture every moment by sharing your photos from the celebration
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="p-8 shadow-soft border-gold/10">
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                isDragging
                  ? "border-gold bg-gold/5"
                  : "border-border hover:border-gold/50"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gold" />
                </div>
                <div>
                  <p className="text-lg font-display font-medium text-foreground mb-1">
                    Drag & drop your photos here
                  </p>
                  <p className="text-sm font-body text-muted-foreground">
                    or click to browse • Max 10MB per file
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Grid */}
            {files.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-medium text-foreground">
                    {pendingFiles.length > 0
                      ? `${pendingFiles.length} photo${pendingFiles.length > 1 ? "s" : ""} ready to upload`
                      : `${uploadedFiles.length} photo${uploadedFiles.length > 1 ? "s" : ""} uploaded`}
                  </h3>
                  {pendingFiles.length > 0 && (
                    <Button
                      onClick={uploadFiles}
                      className="bg-gold hover:bg-gold/90 text-primary-foreground"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload All
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {files.map((uploadFile) => (
                    <div
                      key={uploadFile.id}
                      className="relative aspect-square rounded-lg overflow-hidden group"
                    >
                      <img
                        src={uploadFile.preview}
                        alt="Upload preview"
                        className="w-full h-full object-cover"
                      />

                      {/* Status Overlay */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center transition-all ${
                          uploadFile.status === "uploading"
                            ? "bg-foreground/50"
                            : uploadFile.status === "success"
                            ? "bg-sage/50"
                            : "bg-transparent group-hover:bg-foreground/30"
                        }`}
                      >
                        {uploadFile.status === "uploading" && (
                          <div className="w-8 h-8 border-2 border-card border-t-transparent rounded-full animate-spin" />
                        )}
                        {uploadFile.status === "success" && (
                          <Check className="w-8 h-8 text-card" />
                        )}
                        {uploadFile.status === "error" && (
                          <div className="text-destructive text-xs text-center px-2">
                            Failed
                          </div>
                        )}
                        {uploadFile.status === "pending" && (
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-destructive-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default PhotoUploadSection;
