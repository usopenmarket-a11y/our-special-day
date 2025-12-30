import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Check, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/lib/ConfigContext";
import { useTranslation } from "react-i18next";
import { toArabicNumerals } from "@/lib/arabicNumbers";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
}

const PhotoUploadSection = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { config } = useAppConfig();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  // Allowed file types
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo', // AVI
    'video/webm',
  ];

  // Allowed file extensions (for files that might not have proper MIME type)
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.mp4', '.mov', '.avi', '.webm'];

  const isValidFileType = (file: File): boolean => {
    // Check MIME type (handle empty MIME types from some devices)
    const mimeType = file.type?.toLowerCase() || '';
    if (mimeType && allowedImageTypes.includes(mimeType)) {
      return true;
    }
    
    // Check file extension as fallback (for files with incorrect or missing MIME types)
    const fileName = file.name.toLowerCase();
    return allowedExtensions.some(ext => fileName.endsWith(ext));
  };

  const isVideoFile = (file: File): boolean => {
    // Check MIME type (handle empty MIME types from some devices)
    const mimeType = file.type || '';
    if (mimeType && mimeType.startsWith('video/')) {
      return true;
    }
    
    // Check file extension as fallback
    const fileName = file.name.toLowerCase();
    return ['.mp4', '.mov', '.avi', '.webm'].some(ext => fileName.endsWith(ext));
  };

  const handleFiles = useCallback((fileList: FileList) => {
    const validFiles = Array.from(fileList).filter((file) => {
      // Check file type - accept JPEG, PNG, GIF, HEIC, and video files
      if (!isValidFileType(file)) {
        console.warn(`File rejected: ${file.name}`, {
          type: file.type || '(empty)',
          size: file.size,
          extension: file.name.split('.').pop()?.toLowerCase()
        });
        toast({
          title: t("upload.invalidFile"),
          description: t("upload.invalidFileMessage", { fileName: file.name }),
          variant: "destructive",
        });
        return false;
      }
      
      // Check file size - different limits for images vs videos
      const isVideo = isVideoFile(file);
      const maxSize = isVideo 
        ? 500 * 1024 * 1024  // 500MB for videos
        : 50 * 1024 * 1024;   // 50MB for images
      
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const maxSizeMB = isVideo ? 500 : 50;
        toast({
          title: t("upload.fileTooLarge"),
          description: t("upload.fileTooLargeMessage", { 
            fileName: file.name, 
            fileSize: fileSizeMB,
            maxSize: maxSizeMB,
            fileType: isVideo ? t("upload.video") : t("upload.image")
          }),
          variant: "destructive",
        });
        return false;
      }
      
      // No dimension restrictions - accept any image/video dimensions
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

    let successCount = 0;
    let errorCount = 0;

    // Upload each file
    for (const uploadFile of pending) {
      try {
        // Validate file before processing
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
          errorCount++;
          continue;
        }

        // Validate file size again (client-side check) - different limits for images vs videos
        const isVideo = isVideoFile(uploadFile.file);
        const maxSize = isVideo 
          ? 500 * 1024 * 1024  // 500MB for videos
          : 50 * 1024 * 1024;  // 50MB for images
        
        if (uploadFile.file.size > maxSize) {
          const fileSizeMB = (uploadFile.file.size / (1024 * 1024)).toFixed(2);
          const maxSizeMB = isVideo ? 500 : 50;
          toast({
            title: t("upload.fileTooLarge"),
            description: t("upload.fileTooLargeMessage", { 
              fileName: uploadFile.file.name, 
              fileSize: fileSizeMB,
              maxSize: maxSizeMB,
              fileType: isVideo ? t("upload.video") : t("upload.image")
            }),
            variant: "destructive",
          });
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "error" as const } : f
            )
          );
          errorCount++;
          continue;
        }

        const fileSizeMB = (uploadFile.file.size / 1024 / 1024).toFixed(2);
        console.log(`Uploading: ${uploadFile.file.name} (${fileSizeMB}MB, type: ${uploadFile.file.type}, ${isVideo ? 'video' : 'image'})`);

        // Read file as base64
        // Use FileReader API for better handling of large files
        let base64: string;
        try {
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64String = reader.result.split(',')[1] || reader.result;
                console.log(`Base64 encoding complete for ${uploadFile.file.name} (base64 length: ${base64String.length})`);
                resolve(base64String);
              } else {
                reject(new Error('Failed to read file as base64'));
              }
            };
            reader.onerror = (e) => {
              console.error(`FileReader error for ${uploadFile.file.name}:`, e);
              reject(new Error(`File reading failed: ${e.type || 'unknown error'}`));
            };
            reader.readAsDataURL(uploadFile.file);
          });
        } catch (base64Error) {
          console.error(`Base64 encoding failed for ${uploadFile.file.name}:`, base64Error);
          const errorMsg = base64Error instanceof Error ? base64Error.message : 'Failed to encode file';
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "error" as const } : f
            )
          );
          errorCount++;
          toast({
            title: t("upload.uploadFailed"),
            description: `${uploadFile.file.name}: ${errorMsg}`,
            variant: "destructive",
          });
          continue;
        }

        const payload = {
          fileName: uploadFile.file.name,
          mimeType: uploadFile.file.type,
          base64,
          folderId: config.uploadFolderId,
        };

        let responseData: any;
        let errorMessage = t("upload.errorMessage");
        
        try {
          const { data, error } = await supabase.functions.invoke("upload-photo", {
            body: payload,
          });

          // Check for errors - when Edge Function returns non-2xx, error is set but data may contain error details
          if (error) {
            console.error("Upload error for", uploadFile.file.name, ":", error);
            console.error("Error object:", JSON.stringify(error, null, 2));
            console.error("Error data:", data);
            console.error("Error message:", error.message);
            console.error("Error context:", error.context);
            
            // Priority 1: Check if data contains error details (Edge Function returns { success: false, error: "..." })
            // Supabase may still parse the response body into data even when error is set
            if (data && typeof data === 'object') {
              const dataError = (data as any).error || (data as any).message || (data as any).reason;
              if (dataError) {
                errorMessage = typeof dataError === 'string' ? dataError : JSON.stringify(dataError);
                console.log("Extracted error from data:", errorMessage);
              }
            }
            
            // Priority 2: Check error.context (Supabase sometimes puts response body here)
            if (errorMessage === t("upload.errorMessage") && error.context) {
              try {
                const contextError = typeof error.context === 'string' 
                  ? JSON.parse(error.context) 
                  : error.context;
                if (contextError?.error || contextError?.message) {
                  errorMessage = contextError.error || contextError.message;
                  console.log("Extracted error from context:", errorMessage);
                }
              } catch (e) {
                // Context is not JSON, try as string
                if (typeof error.context === 'string' && error.context.length < 500) {
                  errorMessage = error.context;
                  console.log("Using context as error message:", errorMessage);
                }
              }
            }
            
            // Priority 3: Check if error has a message property
            if (errorMessage === t("upload.errorMessage") && error.message) {
              // Only use if it's not the generic "non-2xx" message
              if (!error.message.includes('non-2xx') || data) {
                errorMessage = error.message;
                console.log("Using error.message:", errorMessage);
              }
            } 
            // Priority 4: Check if error is a string
            else if (errorMessage === t("upload.errorMessage") && typeof error === 'string') {
              errorMessage = error;
              console.log("Using error as string:", errorMessage);
            }
            // Priority 5: Try to extract from error object
            else if (errorMessage === t("upload.errorMessage") && typeof error === 'object') {
              const errorStr = JSON.stringify(error);
              // Only use if it's not the generic "non-2xx" message and has useful info
              if (!errorStr.includes('non-2xx') && errorStr.length < 500) {
                errorMessage = errorStr;
                console.log("Using stringified error:", errorMessage);
              }
            }
            
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, status: "error" as const } : f
              )
            );
            errorCount++;
            toast({
              title: t("upload.uploadFailed"),
              description: `${uploadFile.file.name}: ${errorMessage}`,
              variant: "destructive",
            });
            continue;
          }

          responseData = data;
        } catch (invokeError) {
          // Catch any errors from the invoke itself
          console.error("Invoke error for", uploadFile.file.name, ":", invokeError);
          errorMessage = invokeError instanceof Error 
            ? invokeError.message 
            : (typeof invokeError === 'string' ? invokeError : JSON.stringify(invokeError)) || t("upload.errorMessage");
          
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "error" as const } : f
            )
          );
          errorCount++;
          toast({
            title: t("upload.uploadFailed"),
            description: `${uploadFile.file.name}: ${errorMessage}`,
            variant: "destructive",
          });
          continue;
        }

        // Check response data - must have success: true AND an id
        const isSuccess = 
          responseData && 
          typeof responseData === "object" && 
          responseData.success === true && 
          responseData.id;

        if (!isSuccess) {
          const errorMsg = responseData?.error || 
                          (responseData?.success === false ? responseData.error : undefined) ||
                          responseData?.message ||
                          "Upload failed - no file ID returned";
          console.error("Upload failed for", uploadFile.file.name, "- invalid response:", responseData);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "error" as const } : f
            )
          );
          errorCount++;
          toast({
            title: t("upload.uploadFailed"),
            description: `${uploadFile.file.name}: ${errorMsg}`,
            variant: "destructive",
          });
          continue;
        }

        // Only mark as success if we have a valid file ID
        console.log("Upload successful:", responseData.id, responseData.name);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "success" as const } : f
          )
        );
        successCount++;
      } catch (err) {
        console.error("Upload failed for", uploadFile.file.name, ":", err);
        const errorMessage = err instanceof Error 
          ? err.message 
          : (typeof err === 'string' ? err : JSON.stringify(err)) || t("upload.errorMessage");
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "error" as const } : f
          )
        );
        errorCount++;
        toast({
          title: t("upload.error"),
          description: `${uploadFile.file.name}: ${errorMessage}`,
          variant: "destructive",
        });
      }
    }

    // Only show success toast if at least one file was successfully uploaded
    if (successCount > 0) {
      toast({
        title: t("upload.success"),
        description: successCount === 1 
          ? t("upload.photosUploaded", { count: toArabicNumerals(1, isArabic) })
          : t("upload.photosUploadedPlural", { count: toArabicNumerals(successCount, isArabic) }),
      });
    } else if (errorCount > 0) {
      // All uploads failed
      toast({
        title: t("upload.uploadFailed"),
        description: t("upload.errorMessage"),
        variant: "destructive",
      });
    }
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
                accept="image/jpeg,image/jpg,image/png,image/gif,image/heic,image/heif,video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm,.jpg,.jpeg,.png,.gif,.heic,.heif,.mp4,.mov,.MOV,.avi,.webm"
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
                        ? t("upload.photosReady", { count: toArabicNumerals(pendingFiles.length, isArabic) })
                        : t("upload.photosReadyPlural", { count: toArabicNumerals(pendingFiles.length, isArabic) })
                      : uploadedFiles.length === 1
                      ? t("upload.photosUploaded", { count: toArabicNumerals(uploadedFiles.length, isArabic) })
                      : t("upload.photosUploadedPlural", { count: toArabicNumerals(uploadedFiles.length, isArabic) })}
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
                  {files.map((uploadFile) => {
                    const isVideo = isVideoFile(uploadFile.file);
                    
                    return (
                    <div
                      key={uploadFile.id}
                      className="relative aspect-square rounded-lg overflow-hidden group"
                    >
                      {isVideo ? (
                        <video
                          src={uploadFile.preview}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={uploadFile.preview}
                          alt="Upload preview"
                          className="w-full h-full object-cover"
                        />
                      )}

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
                  );
                  })}
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