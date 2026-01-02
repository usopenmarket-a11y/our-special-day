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
import imageCompression from "browser-image-compression";

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

        const originalSizeMB = (uploadFile.file.size / 1024 / 1024).toFixed(2);
        console.log(`Processing: ${uploadFile.file.name} (${originalSizeMB}MB, type: ${uploadFile.file.type}, ${isVideo ? 'video' : 'image'})`);

        // Optimize images: compress and resize (skip for videos)
        let fileToUpload: File = uploadFile.file;
        if (!isVideo) {
          try {
            console.log(`Compressing image: ${uploadFile.file.name}...`);
            const compressionOptions = {
              maxSizeMB: 20, // Maximum file size in MB (will compress to fit)
              maxWidthOrHeight: 4000, // Resize to max 4000px width/height (maintains aspect ratio)
              useWebWorker: true, // Use web worker for better performance
              fileType: uploadFile.file.type, // Preserve original file type
              initialQuality: 0.95, // 95% quality (maximum quality, virtually no visible loss)
            };

            const compressedFile = await imageCompression(uploadFile.file, compressionOptions);
            const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
            const compressionRatio = ((1 - compressedFile.size / uploadFile.file.size) * 100).toFixed(1);
            
            console.log(`Image compressed: ${uploadFile.file.name} - ${originalSizeMB}MB → ${compressedSizeMB}MB (${compressionRatio}% reduction)`);
            fileToUpload = compressedFile;
          } catch (compressionError) {
            console.warn(`Image compression failed for ${uploadFile.file.name}, using original:`, compressionError);
            // Continue with original file if compression fails
            fileToUpload = uploadFile.file;
          }
        }

        const finalSizeMB = (fileToUpload.size / 1024 / 1024).toFixed(2);
        console.log(`Uploading: ${uploadFile.file.name} (${finalSizeMB}MB${!isVideo && fileToUpload !== uploadFile.file ? ' - compressed' : ''})`);

        // Use FormData for direct binary upload (much faster than base64)
        const formData = new FormData();
        formData.append('file', fileToUpload);
        if (config.uploadFolderId) {
          formData.append('folderId', config.uploadFolderId);
        }

        let responseData: any;
        let errorMessage = t("upload.errorMessage");
        
        try {
          // Use fetch directly with FormData for multipart upload (faster than base64)
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;

          if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing. Please check environment variables.');
          }

          if (!accessToken) {
            throw new Error('Authentication required. Please refresh the page.');
          }

          const response = await fetch(`${supabaseUrl}/functions/v1/upload-photo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': supabaseKey,
            },
            body: formData,
          });

          const data = await response.json();
          
          if (!response.ok || !data.success) {
            const error = data?.error || data?.message || `Upload failed with status ${response.status}`;
            throw new Error(error);
          }

          responseData = data;

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
            throw new Error(errorMsg);
          }

          // Only mark as success if we have a valid file ID
          console.log("Upload successful:", responseData.id, responseData.name);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "success" as const } : f
            )
          );
          successCount++;
        } catch (uploadError) {
          // Catch any errors from the upload
          console.error("Upload error for", uploadFile.file.name, ":", uploadError);
          errorMessage = uploadError instanceof Error 
            ? uploadError.message 
            : (typeof uploadError === 'string' ? uploadError : JSON.stringify(uploadError)) || t("upload.errorMessage");
          
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
      }

    // Only show success toast if at least one file was successfully uploaded
    if (successCount > 0) {
      toast({
        title: t("upload.success"),
        description: successCount === 1 
          ? t("upload.photosUploaded", { count: 1 })
          : t("upload.photosUploadedPlural", { count: successCount }),
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
                        ? toArabicNumerals(t("upload.photosReady", { count: pendingFiles.length }), isArabic)
                        : toArabicNumerals(t("upload.photosReadyPlural", { count: pendingFiles.length }), isArabic)
                      : uploadedFiles.length === 1
                      ? toArabicNumerals(t("upload.photosUploaded", { count: uploadedFiles.length }), isArabic)
                      : toArabicNumerals(t("upload.photosUploadedPlural", { count: uploadedFiles.length }), isArabic)}
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