import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Check, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/lib/ConfigContext";
import { useTranslation } from "react-i18next";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
}

const PhotoUploadSection = () => {
  const { t } = useTranslation();
  const { config } = useAppConfig();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFiles = useCallback((fileList: FileList) => {
    const validFiles = Array.from(fileList).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: t("upload.invalidFile"),
          description: t("upload.invalidFileMessage", { fileName: file.name }),
          variant: "destructive",
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t("upload.fileTooLarge"),
          description: t("upload.fileTooLargeMessage", { fileName: file.name }),
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
  }, [toast, t]);

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
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    // Update all pending files to uploading status
    setFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" as const } : f))
    );

    // Upload each file
    for (const uploadFile of pending) {
      try {
        // Read file as base64 and send JSON payload so supabase.functions.invoke works
        const arrayBuffer = await uploadFile.file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        const base64 = btoa(binary);

        if (!config?.uploadFolderId) {
          toast({
            title: t("upload.uploadUnavailable"),
            description: t("upload.uploadFolderNotConfigured"),
            variant: "destructive",
          });
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "error" as const } : f
            )
          );
          continue;
        }

        const payload = {
          fileName: uploadFile.file.name,
          mimeType: uploadFile.file.type,
          base64,
          folderId: config.uploadFolderId,
        };

        const { data, error } = await supabase.functions.invoke("upload-photo", {
          body: payload,
        });

        const backendError =
          error?.message ||
          (typeof data === "object" && data && "success" in data && (data as any).success === false
            ? (data as any).error
            : undefined);

        if (backendError) {
          console.error("Upload error:", error ?? data);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "error" as const } : f
            )
          );
          toast({
            title: t("upload.uploadFailed"),
            description: backendError,
            variant: "destructive",
          });
          continue;
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "success" as const } : f
          )
        );
      } catch (err) {
        console.error("Upload failed:", err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "error" as const } : f
          )
        );
        toast({
          title: t("upload.error"),
          description: err instanceof Error ? err.message : t("upload.errorMessage"),
          variant: "destructive",
        });
      }
    }

    toast({
      title: t("upload.success"),
      description: t("upload.successMessage"),
    });
  };

  const pendingFiles = files.filter((f) => f.status === "pending");
  const uploadedFiles = files.filter((f) => f.status === "success");

  return (
    <section id="upload" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-secondary/30 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blush/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 px-2 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm sm:text-base font-body text-gold font-semibold uppercase tracking-[0.3em] mb-4"
          >
            {t("upload.shareTheLove")}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-foreground mb-4"
          >
            {t("upload.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg font-body text-muted-foreground max-w-md mx-auto"
          >
            {t("upload.subtitle")}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="p-4 sm:p-6 md:p-8 lg:p-10 shadow-soft border-gold/10 bg-card/80 backdrop-blur-sm">
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 md:p-12 text-center transition-all duration-300 ${
                isDragging
                  ? "border-gold bg-gold/10 shadow-glow scale-[1.02]"
                  : "border-border hover:border-gold/50 hover:bg-gold/5 active:border-gold/70"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation"
              />

              <div className="flex flex-col items-center gap-3 sm:gap-4">
                <motion.div
                  animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/10 flex items-center justify-center"
                >
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-gold" />
                </motion.div>
                <div>
                  <p className="text-base sm:text-lg font-display font-medium text-foreground mb-1">
                    {t("upload.dragDrop")}
                  </p>
                  <p className="text-xs sm:text-sm font-body text-muted-foreground">
                    {t("upload.orClick")}
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
                      ? pendingFiles.length === 1
                        ? t("upload.photosReady", { count: pendingFiles.length })
                        : t("upload.photosReadyPlural", { count: pendingFiles.length })
                      : uploadedFiles.length === 1
                      ? t("upload.photosUploaded", { count: uploadedFiles.length })
                      : t("upload.photosUploadedPlural", { count: uploadedFiles.length })}
                  </h3>
                  {pendingFiles.length > 0 && (
                    <Button
                      onClick={uploadFiles}
                      className="bg-gold hover:bg-gold/90 text-primary-foreground h-10 sm:h-auto px-4 sm:px-6 text-sm sm:text-base touch-manipulation"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t("upload.uploadAll")}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
                            : uploadFile.status === "error"
                            ? "bg-destructive/50"
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
                          <X className="w-8 h-8 text-card" />
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