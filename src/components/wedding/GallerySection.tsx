import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/lib/ConfigContext";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { config, loading: configLoading } = useAppConfig();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
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
        setError(t("gallery.error"));
        setLoading(false);
      }
      return;
    }

    const fetchGallery = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('get-gallery', {
          body: { folderId: config.galleryFolderId }
        });

        if (error) {
          console.error('Error fetching gallery:', error);
          setError(t("gallery.error"));
          return;
        }

        if (data?.images) {
          setImages(data.images);
        }
      } catch (err) {
        console.error('Failed to fetch gallery:', err);
        setError(t("gallery.error"));
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [config, configLoading, t]);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handlePrevious = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1);
    }
  };

  const handleNext = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === images.length - 1 ? 0 : selectedImage + 1);
    }
  };

  return (
    <section id="gallery" className="py-24 px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-rose/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
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
            className="text-sm font-body text-gold uppercase tracking-[0.3em] mb-4"
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
          >
            <p className="text-muted-foreground font-body">{error}</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && images.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <p className="text-muted-foreground font-body">{t("gallery.noPhotos")}</p>
          </motion.div>
        )}

        {/* Gallery Carousel */}
        {!loading && images.length > 0 && (
          <div className="relative">
            <Carousel
              setApi={setApi}
              opts={{
                align: "center",
                loop: true,
              }}
              plugins={[autoplay.current]}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {images.map((image, index) => (
                  <CarouselItem key={image.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="relative group cursor-pointer"
                      onClick={() => setSelectedImage(index)}
                    >
                      <div className="relative overflow-hidden rounded-xl shadow-soft border border-gold/10 aspect-square md:aspect-[4/5]">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-14 h-14 rounded-full bg-card/95 backdrop-blur-sm flex items-center justify-center shadow-glow border border-gold/20">
                            <span className="text-gold text-2xl">+</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-12 lg:-left-16 h-12 w-12 border-gold/20 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-gold/40 text-gold" />
              <CarouselNext className="hidden md:flex -right-12 lg:-right-16 h-12 w-12 border-gold/20 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-gold/40 text-gold" />
            </Carousel>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {images.slice(0, Math.min(images.length, 10)).map((_, index) => (
                <button
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    Math.abs(current - index) <= 1
                      ? "w-8 bg-gold"
                      : "w-1.5 bg-gold/30 hover:bg-gold/50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
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

        {/* Lightbox */}
        <AnimatePresence>
          {selectedImage !== null && images[selectedImage] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/98 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(null);
                }}
                className="absolute top-6 right-6 w-12 h-12 rounded-full bg-card/30 backdrop-blur-sm flex items-center justify-center text-card hover:bg-card/50 transition-all duration-300 shadow-lg z-10"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/30 backdrop-blur-sm flex items-center justify-center text-card hover:bg-card/50 transition-all duration-300 shadow-lg z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/30 backdrop-blur-sm flex items-center justify-center text-card hover:bg-card/50 transition-all duration-300 shadow-lg z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <motion.img
                key={selectedImage}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                src={images[selectedImage].fullUrl}
                alt={images[selectedImage].alt}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Image counter in lightbox */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/30 backdrop-blur-sm px-4 py-2 rounded-full">
                <p className="text-sm font-body text-card">
                  {selectedImage + 1} / {images.length}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default GallerySection;