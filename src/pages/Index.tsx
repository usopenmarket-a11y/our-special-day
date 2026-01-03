import { Helmet } from "react-helmet-async";
import Navigation from "@/components/wedding/Navigation";
import HeroSection from "@/components/wedding/HeroSection";
import DetailsSection from "@/components/wedding/DetailsSection";
import GallerySection from "@/components/wedding/GallerySection";
import RSVPSection from "@/components/wedding/RSVPSection";
import PhotoUploadSection from "@/components/wedding/PhotoUploadSection";
import Footer from "@/components/wedding/Footer";
import BackgroundMusic from "@/components/wedding/BackgroundMusic";
import { weddingConfig } from "@/lib/weddingConfig";
import musicFiles from "@/lib/musicList";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t, ready } = useTranslation();
  
  // Use fallback values if i18n is not ready
  // Display order: Fady & Sandra (bride first, then groom)
  const brideName = ready ? t("hero.bride") : "Fady";
  const groomName = ready ? t("hero.groom") : "Sandra";
  
  return (
    <>
      <Helmet>
        <title>{brideName} & {groomName} | Wedding Invitation</title>
        <meta 
          name="description" 
          content={`You're invited to celebrate the wedding of ${brideName} & ${groomName}. RSVP and join us for our special day.`} 
        />
      </Helmet>

      <div className="min-h-screen">
        <Navigation />
        
        <main>
          <div id="home">
            <HeroSection />
          </div>
          <RSVPSection />
          <DetailsSection />
          <GallerySection />
          <PhotoUploadSection />
        </main>

        <Footer />
        
        {/* Background Music */}
        {/* Auto-detect music from public/music/ folder - automatically includes all MP3 files */}
        {(musicFiles.length > 0 || 
          (weddingConfig.backgroundMusicUrl && 
            (Array.isArray(weddingConfig.backgroundMusicUrl) 
              ? weddingConfig.backgroundMusicUrl.length > 0 
              : weddingConfig.backgroundMusicUrl))) && (
          <BackgroundMusic 
            src={musicFiles.length > 0 ? musicFiles : 
              (Array.isArray(weddingConfig.backgroundMusicUrl) 
                ? weddingConfig.backgroundMusicUrl 
                : [weddingConfig.backgroundMusicUrl])} 
            volume={0.3}
            shuffle={weddingConfig.backgroundMusicShuffle}
            type={weddingConfig.backgroundMusicType}
          />
        )}
      </div>
    </>
  );
};

export default Index;
