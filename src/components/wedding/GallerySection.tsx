import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/lib/ConfigContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface GalleryImage {
  id: string;
  name: string;
  url: string;
  fullUrl: string;
  alt: string;
}

const GallerySection = () => {
  const { t, i18n } = useTranslation();
  const { config, loading: configLoading } = useAppConfig();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<'config' | 'api' | 'fetch' | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  const isRTL = i18n.language === 'ar';

  // Get translated error message based on error type - recompute when language changes
  const error = errorType === 'config' 
    ? t("gallery.error")
    : errorType === 'api' || errorType === 'fetch'
    ? t("gallery.errorMessage")
    : null;

  // Force re-render when language changes to update error message
  useEffect(() => {
    // This effect ensures error message updates when language changes
    // The error constant above will be recomputed automatically
  }, [i18n.language, errorType, t]);
  
  const autoplay = useRef(
    Autoplay({ 
      delay: 4000, 
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      stopOnFocusIn: false,
    })
  );

  useEffect(() => {
    // Wait for config to load before fetching gallery
    if (configLoading || !config?.galleryFolderId) {
      if (!configLoading && !config?.galleryFolderId) {
        // Check if config error exists (function not deployed or secrets not set)
        setErrorType('config');
        setLoading(false);
        console.warn('Gallery not configured: GALLERY_FOLDER_ID is missing. Please set it in Supabase secrets.');
      }
      return;
    }

    const fetchGallery = async () => {
      try {
        setLoading(true);
        setErrorType(null);
        setImagesLoaded(new Set()); // Reset loaded images when fetching new data
        const { data, error } = await supabase.functions.invoke('get-gallery', {
          body: { folderId: config.galleryFolderId }
        });

        if (error) {
          console.error('Error fetching gallery:', error);
          setErrorType('fetch');
          return;
        }

        if (data?.error) {
          console.error('Gallery API error:', data.error);
          setErrorType('api');
          return;
        }

        if (data?.images) {
          setImages(data.images);
          setErrorType(null); // Clear any previous errors
        } else {
          // If no images and no error, it might be empty
          setImages([]);
          setErrorType(null);
        }
      } catch (err) {
        console.error('Failed to fetch gallery:', err);
        setErrorType('fetch');
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [config, configLoading]); // Removed i18n.language dependency - don't refetch on language change

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Reset images loaded state when language changes to force reload
  useEffect(() => {
    setImagesLoaded(new Set());
  }, [isRTL]);

  // Reinitialize carousel when RTL changes to ensure proper rendering
  useEffect(() => {
    if (api && images.length > 0) {
      // Longer delay to ensure DOM is fully updated with new direction and images are rendered
      const timer = setTimeout(() => {
        try {
          api.reInit();
          // Force carousel to update after reinit
          api.scrollTo(0, true); // Jump to first slide without animation
          // Trigger a small scroll to ensure images in viewport start loading
          setTimeout(() => {
            api.scrollTo(0, false);
          }, 100);
        } catch (error) {
          console.error('Error reinitializing carousel:', error);
        }
      }, 800); // Increased delay to allow DOM and images to fully render
      return () => clearTimeout(timer);
    }
  }, [isRTL, api, images.length]);

  // Handle image load events
  const handleImageLoad = (imageId: string) => {
    setImagesLoaded(prev => new Set(prev).add(imageId));
  };

  const handleImageError = (imageId: string, imageUrl: string) => {
    console.error(`Failed to load image ${imageId}:`, imageUrl);
    // Optionally, you could remove the failed image from the list
    // or show a placeholder
  };



  return (
    <section id="gallery" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-rose/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 px-2 sm:px-4">
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
            {t("gallery.ourMoments")}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-foreground mb-4"
          >
            {t("gallery.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg font-body text-muted-foreground max-w-md mx-auto"
          >
            {t("gallery.subtitle")}
          </motion.p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </motion.div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
            data-testid="gallery-error"
          >
            <p className="text-muted-foreground font-body" data-gallery-error="true">{error}</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && images.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
            data-testid="gallery-empty"
          >
            <p className="text-muted-foreground font-body" data-gallery-empty="true">{t("gallery.noPhotos")}</p>
          </motion.div>
        )}

        {/* Gallery Carousel */}
        {!loading && images.length > 0 && (
          <div className="relative w-full" dir={isRTL ? 'rtl' : 'ltr'}>
            <Carousel
              key={`carousel-${isRTL ? 'rtl' : 'ltr'}-${images.length}-${imagesLoaded.size}`}
              setApi={setApi}
              opts={{
                align: "center",
                loop: true,
                direction: isRTL ? 'rtl' : 'ltr',
              }}
              plugins={[autoplay.current]}
              className="w-full"
            >
              <CarouselContent className={isRTL ? "-mr-2 md:-mr-4" : "-ml-2 md:-ml-4"}>
                {images.map((image, index) => (
                  <CarouselItem key={`${image.id}-${isRTL ? 'rtl' : 'ltr'}`} className={isRTL ? "pr-2 md:pr-4 md:basis-1/2 lg:basis-1/3" : "pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3"}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: false }} // Changed to false to re-animate on language change
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="relative group"
                    >
                      <div className="relative overflow-hidden rounded-xl shadow-soft border border-gold/10 aspect-square md:aspect-[4/5]">
                        <img
                          key={`${image.id}-${isRTL ? 'rtl' : 'ltr'}`} // Force remount on language change
                          src={image.url}
                          alt={image.alt || `Gallery image ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading={index < 3 ? "eager" : "lazy"} // Load first 3 images eagerly
                          onLoad={() => handleImageLoad(image.id)}
                          onError={() => handleImageError(image.id, image.url)}
                          decoding="async"
                        />
                        {!imagesLoaded.has(image.id) && (
                          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-gold/50 animate-spin" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className={cn(
                "hidden md:flex h-12 w-12 border-gold/20 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-gold/40 text-gold",
                isRTL ? "-right-12 lg:-right-16" : "-left-12 lg:-left-16"
              )} />
              <CarouselNext className={cn(
                "hidden md:flex h-12 w-12 border-gold/20 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-gold/40 text-gold",
                isRTL ? "-left-12 lg:-left-16" : "-right-12 lg:-right-16"
              )} />
            </Carousel>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-6 sm:mt-8">
              {images.slice(0, Math.min(images.length, 10)).map((_, index) => (
                <button
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-all duration-300 touch-manipulation ${
                    Math.abs(current - index) <= 1
                      ? "w-8 sm:w-8 bg-gold"
                      : "w-2 sm:w-1.5 bg-gold/30 hover:bg-gold/50 active:bg-gold/70"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                >
                  <span className={`rounded-full transition-all duration-300 ${
                    Math.abs(current - index) <= 1
                      ? "w-8 h-2 sm:h-1.5 bg-gold"
                      : "w-2 h-2 sm:h-1.5 bg-gold/30"
                  }`} />
                </button>
              ))}
            </div>

            {/* Image Counter */}
            {images.length > 0 && (
              <div className="text-center mt-6">
                <p className="text-sm font-body text-muted-foreground">
                  {current + 1} / {images.length}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};

export default GallerySection;