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
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t("hero.bride")} & {t("hero.groom")} | Wedding Invitation</title>
        <meta 
          name="description" 
          content={`You're invited to celebrate the wedding of ${t("hero.bride")} & ${t("hero.groom")}. RSVP and join us for our special day.`} 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
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
        {(weddingConfig.backgroundMusicUrl && 
          (Array.isArray(weddingConfig.backgroundMusicUrl) 
            ? weddingConfig.backgroundMusicUrl.length > 0 
            : weddingConfig.backgroundMusicUrl)) && (
          <BackgroundMusic 
            src={weddingConfig.backgroundMusicUrl} 
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
