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
  const { config, loading: configLoading } = useAppConfig();
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

    // Check if config is loaded and has uploadFolderId before starting uploads
    if (!config?.uploadFolderId) {
      toast({
        title: t("upload.uploadUnavailable"),
        description: t("upload.uploadFolderNotConfigured"),
        variant: "destructive",
      });
      // Mark all pending files as error
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "pending" ? { ...f, status: "error" as const } : f
        )
      );
      return;
    }

    // Update all pending files to uploading status
    setFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" as const } : f))
    );

    let successCount = 0;
    let errorCount = 0;

    // WhatsApp-like parallel uploads: Process multiple files simultaneously for faster uploads
    // Limit concurrent uploads to 3 to avoid overwhelming the server/network
    const MAX_CONCURRENT_UPLOADS = 3;
    
    // Define uploadSingleFile function inside uploadFiles to have access to config
    const uploadSingleFile = async (uploadFile: UploadedFile): Promise<boolean> => {
      try {
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
          return false;
        }

        const originalSizeMB = (uploadFile.file.size / 1024 / 1024).toFixed(2);
        console.log(`Processing: ${uploadFile.file.name} (${originalSizeMB}MB, type: ${uploadFile.file.type}, ${isVideo ? 'video' : 'image'})`);

        // WhatsApp-like optimization: Smart compression with quality preservation
        // Strategy: Resize to reasonable dimensions (like WhatsApp HD ~1600px) while maintaining quality
        let fileToUpload: File = uploadFile.file;
        if (!isVideo) {
          // Determine optimal compression based on file size and dimensions
          const fileSizeKB = uploadFile.file.size / 1024;
          
          // For images, always optimize (even small ones) for consistency and speed
          if (fileSizeKB > 50) { // Only compress files larger than 50KB
            try {
              console.log(`Optimizing image: ${uploadFile.file.name}...`);
              
              // WhatsApp-like strategy: Smart dimension limits based on file size
              // - Small files (< 1MB): Keep original dimensions, just optimize quality
              // - Medium files (1-5MB): Resize to max 1920px (HD quality)
              // - Large files (> 5MB): Resize to max 1600px (WhatsApp HD standard)
              let maxDimension: number;
              let targetQuality: number;
              let maxSizeMB: number;
              
              if (fileSizeKB < 1024) {
                // Small files: Keep original size, optimize quality only
                maxDimension = 4000; // Very high limit, won't resize
                targetQuality = 0.92; // High quality
                maxSizeMB = 5; // Target size
              } else if (fileSizeKB < 5120) {
                // Medium files: HD quality (1920px)
                maxDimension = 1920;
                targetQuality = 0.90; // High quality
                maxSizeMB = 3; // Target size
              } else {
                // Large files: WhatsApp HD standard (1600px)
                maxDimension = 1600;
                targetQuality = 0.88; // Very good quality
                maxSizeMB = 2; // Target size
              }
              
              const compressionOptions = {
                maxSizeMB, // Target file size
                maxWidthOrHeight: maxDimension, // Smart dimension limit
                useWebWorker: true, // Use web worker for non-blocking compression
                fileType: uploadFile.file.type, // Preserve original format
                initialQuality: targetQuality, // Adaptive quality based on file size
                alwaysKeepResolution: false, // Allow resizing for better compression
              };

              const compressedFile = await imageCompression(uploadFile.file, compressionOptions);
              const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
              const compressionRatio = ((1 - compressedFile.size / uploadFile.file.size) * 100).toFixed(1);
              
              // Only use compressed version if it's significantly smaller (at least 10% reduction)
              if (compressedFile.size < uploadFile.file.size * 0.9) {
                console.log(`✅ Optimized: ${uploadFile.file.name} - ${originalSizeMB}MB → ${compressedSizeMB}MB (${compressionRatio}% reduction, ${maxDimension}px max)`);
                fileToUpload = compressedFile;
              } else {
                console.log(`ℹ️ Compression didn't help much, using original: ${uploadFile.file.name}`);
                fileToUpload = uploadFile.file;
              }
            } catch (compressionError) {
              // Handle different error types - compression library may throw Event objects
              let errorMsg = 'Unknown compression error';
              if (compressionError instanceof Error) {
                errorMsg = compressionError.message;
              } else if (compressionError && typeof compressionError === 'object' && 'type' in compressionError) {
                // Handle Event objects
                errorMsg = `Compression error: ${(compressionError as any).type || 'compression failed'}`;
              } else {
                errorMsg = String(compressionError);
              }
              console.warn(`Image optimization failed for ${uploadFile.file.name}, using original:`, errorMsg);
              // Continue with original file if compression fails
              fileToUpload = uploadFile.file;
            }
          } else {
            console.log(`Skipping optimization for very small file: ${uploadFile.file.name} (${(fileSizeKB).toFixed(2)}KB)`);
          }
        }

        const finalSizeMB = (fileToUpload.size / 1024 / 1024).toFixed(2);
        console.log(`Uploading: ${uploadFile.file.name} (${finalSizeMB}MB${!isVideo && fileToUpload !== uploadFile.file ? ' - compressed' : ''})`);

        // Use FormData for direct binary upload (much faster than base64)
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('folderId', config.uploadFolderId);

        let responseData: any;
        let errorMessage = t("upload.errorMessage");
        
        try {
          // Use fetch directly with FormData for multipart upload (faster than base64)
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          
          console.log('Checking Supabase configuration...');
          console.log('Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
          console.log('Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');
          
          if (!supabaseUrl || !supabaseKey) {
            const missing = [];
            if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
            if (!supabaseKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
            throw new Error(`Supabase configuration missing. Missing: ${missing.join(', ')}. Please check environment variables.`);
          }

          console.log('Getting authentication session...');
          let session;
          let accessToken;
          try {
            // Try to get existing session first
            const sessionResult = await supabase.auth.getSession();
            session = sessionResult?.data?.session;
            accessToken = session?.access_token;
            
            // If no session, try to sign in anonymously (for public uploads)
            if (!accessToken) {
              console.log('No session found, attempting anonymous sign-in...');
              try {
                const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
                if (anonError) {
                  console.warn('Anonymous sign-in failed:', anonError.message);
                  // Continue anyway - Edge Function doesn't require JWT verification
                } else {
                  accessToken = anonData?.session?.access_token;
                  console.log('Anonymous sign-in:', accessToken ? '✅ Success' : '❌ Failed');
                }
              } catch (anonSignInError) {
                console.warn('Anonymous sign-in error:', anonSignInError);
                // Continue anyway - Edge Function doesn't require JWT verification
              }
            }
            
            console.log('Session check:', session ? '✅ Session found' : '⚠️ No session (using anon key)');
            console.log('Access token:', accessToken ? '✅ Token found' : '⚠️ No token (will use anon key)');
          } catch (sessionError) {
            console.error('Error getting session:', sessionError);
            // Don't throw - Edge Function doesn't require JWT verification
            console.warn('Continuing without session - Edge Function accepts requests without JWT');
          }

          // Use access token if available, otherwise the anon key will be used in headers
          // Edge Function has verify_jwt = false, so it doesn't require authentication
          if (!accessToken) {
            console.log('⚠️ No access token - will use anon key. Edge Function accepts unauthenticated requests.');
          }

          console.log(`Sending upload request for ${uploadFile.file.name}...`);
          console.log(`File size: ${fileToUpload.size} bytes, Type: ${fileToUpload.type}`);
          console.log(`Upload URL: ${supabaseUrl}/functions/v1/upload-photo`);
          
          // Create an AbortController for timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for large files
          
          let response: Response;
          try {
            // Build headers - include Authorization only if we have an access token
            const headers: Record<string, string> = {
              'apikey': supabaseKey,
              // Don't set Content-Type - browser will set it automatically with boundary for FormData
            };
            
            // Add Authorization header only if we have an access token
            // Edge Function has verify_jwt = false, so it's optional
            if (accessToken) {
              headers['Authorization'] = `Bearer ${accessToken}`;
              console.log('Using access token for authentication');
            } else {
              console.log('Using anon key only (no access token)');
            }
            
            response = await fetch(`${supabaseUrl}/functions/v1/upload-photo`, {
              method: 'POST',
              headers,
              body: formData,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              throw new Error('Upload timeout: The upload took too long. Please try again with a smaller file or check your internet connection.');
            }
            // Re-throw network errors
            if (fetchError instanceof Error) {
              throw new Error(`Network error: ${fetchError.message}. Please check your internet connection and try again.`);
            }
            throw new Error(`Upload failed: ${String(fetchError)}`);
          }

          console.log(`Response received: Status ${response.status}, OK: ${response.ok}`);

          // Get response text first
          const responseText = await response.text();
          console.log(`Response text length: ${responseText.length}`);
          console.log(`Response text (first 500 chars): ${responseText.substring(0, 500)}`);
          
          // Try to parse as JSON
          let data: any;
          try {
            if (!responseText || responseText.trim() === '') {
              throw new Error(`Empty response from server (status: ${response.status})`);
            }
            data = JSON.parse(responseText);
            console.log('Parsed response data:', data);
          } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            // If response is not OK and we can't parse JSON, use the raw text as error
            if (!response.ok) {
              const errorMsg = responseText || `Server returned status ${response.status} with non-JSON response`;
              throw new Error(errorMsg);
            }
            // If response is OK but not JSON, that's unexpected
            const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
            throw new Error(`Failed to parse server response (status: ${response.status}): ${errorMsg}. Response: ${responseText.substring(0, 200)}`);
          }
          
          // Check if response status indicates an error
          if (!response.ok) {
            const error = data?.error || data?.message || data?.errorMessage || `Upload failed with status ${response.status}`;
            console.error('Upload error response:', data);
            throw new Error(error);
          }

          // Check if the response indicates failure
          if (data && data.success === false) {
            const error = data?.error || data?.message || data?.errorMessage || 'Upload failed - server returned success: false';
            console.error('Upload failed:', data);
            throw new Error(error);
          }
          
          console.log('Upload successful! File ID:', data.id);

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
          return true; // Success
        } catch (uploadError) {
          // Catch any errors from the upload
          console.error("Upload error for", uploadFile.file.name, ":", uploadError);
          
          // Extract detailed error message - handle all error types
          let errorMessage = t("upload.errorMessage");
          if (uploadError instanceof Error) {
            errorMessage = uploadError.message;
            console.error("Error stack:", uploadError.stack);
          } else if (typeof uploadError === 'string') {
            errorMessage = uploadError;
          } else if (uploadError && typeof uploadError === 'object') {
            // Try to extract message from error object
            errorMessage = (uploadError as any).message || (uploadError as any).error || uploadError.toString() || JSON.stringify(uploadError);
          } else {
            try {
              errorMessage = JSON.stringify(uploadError);
            } catch {
              errorMessage = String(uploadError) || t("upload.errorMessage");
            }
          }
          
          // Log full error for debugging with better serialization
          const errorDetails: any = {
            name: uploadFile.file.name,
            size: fileToUpload.size,
            type: fileToUpload.type,
            error: errorMessage,
            errorType: uploadError?.constructor?.name || typeof uploadError,
            errorString: String(uploadError),
          };
          
          // Add error properties if it's an object
          if (uploadError && typeof uploadError === 'object') {
            try {
              errorDetails.errorProperties = Object.keys(uploadError).reduce((acc: Record<string, string>, key) => {
                try {
                  acc[key] = String((uploadError as any)[key]);
                } catch {
                  acc[key] = '[Cannot serialize]';
                }
                return acc;
              }, {});
            } catch {
              // Ignore serialization errors
            }
          }
          
          console.error("Full upload error details:", errorDetails);
          
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "error" as const } : f
            )
          );
          toast({
            title: t("upload.uploadFailed"),
            description: `${uploadFile.file.name}: ${errorMessage}`,
            variant: "destructive",
          });
          return false; // Failure
        }
      } catch (error) {
        // Catch any unexpected errors
        console.error("Unexpected error uploading", uploadFile.file.name, ":", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "error" as const } : f
          )
        );
        return false; // Failure
      }
    };
    
    // Process files in batches for parallel upload
    for (let i = 0; i < pending.length; i += MAX_CONCURRENT_UPLOADS) {
      const batch = pending.slice(i, i + MAX_CONCURRENT_UPLOADS);
      
      // Upload batch in parallel
      const uploadPromises = batch.map(uploadFile => uploadSingleFile(uploadFile));
      const results = await Promise.allSettled(uploadPromises);
      
      // Count successes and errors
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value === true) {
          successCount++;
        } else {
          errorCount++;
        }
      });
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
      // All uploads failed - show a more helpful error message
      const errorMessage = !config?.uploadFolderId 
        ? t("upload.uploadFolderNotConfigured") || "Upload folder not configured. Please check your configuration."
        : t("upload.errorMessage") || "We couldn't upload your photos. Please try again.";
      
      toast({
        title: t("upload.uploadFailed"),
        description: errorMessage,
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
                      disabled={configLoading || !config?.uploadFolderId}
                      className="bg-gold hover:bg-gold/90 text-primary-foreground h-10 sm:h-auto px-4 sm:px-6 text-sm sm:text-base touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {configLoading ? t("upload.loading") || "Loading..." : t("upload.uploadAll")}
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