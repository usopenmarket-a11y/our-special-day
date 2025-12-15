import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { weddingConfig } from "@/lib/weddingConfig";

interface GalleryImage {
  id: string;
  name: string;
  url: string;
  fullUrl: string;
  alt: string;
}

const GallerySection = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('get-gallery', {
          body: { folderId: weddingConfig.galleryFolderId }
        });

        if (error) {
          console.error('Error fetching gallery:', error);
          setError('Unable to load gallery');
          return;
        }

        if (data?.images) {
          setImages(data.images);
        }
      } catch (err) {
        console.error('Failed to fetch gallery:', err);
        setError('Unable to load gallery');
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, []);

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
    <section id="gallery" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-body text-gold uppercase tracking-[0.3em] mb-4">
            Our Moments
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-semibold text-foreground mb-4">
            Gallery
          </h2>
          <p className="text-lg font-body text-muted-foreground max-w-md mx-auto">
            A glimpse into our journey together
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && images.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No photos yet. Check back soon!</p>
          </div>
        )}

        {/* Gallery Grid */}
        {!loading && images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative overflow-hidden rounded-lg cursor-pointer group ${
                  index === 0 ? "md:col-span-2 md:row-span-2" : ""
                }`}
                onClick={() => setSelectedImage(index)}
              >
                <div className={`aspect-square ${index === 0 ? "md:aspect-auto md:h-full" : ""}`}>
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-card/90 flex items-center justify-center">
                    <span className="text-gold text-xl">+</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {selectedImage !== null && images[selectedImage] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(null);
                }}
                className="absolute top-4 right-4 w-12 h-12 rounded-full bg-card/20 flex items-center justify-center text-card hover:bg-card/30 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                className="absolute left-4 w-12 h-12 rounded-full bg-card/20 flex items-center justify-center text-card hover:bg-card/30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 w-12 h-12 rounded-full bg-card/20 flex items-center justify-center text-card hover:bg-card/30 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <motion.img
                key={selectedImage}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                src={images[selectedImage].fullUrl}
                alt={images[selectedImage].alt}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default GallerySection;