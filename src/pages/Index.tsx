import { Helmet } from "react-helmet-async";
import Navigation from "@/components/wedding/Navigation";
import HeroSection from "@/components/wedding/HeroSection";
import DetailsSection from "@/components/wedding/DetailsSection";
import GallerySection from "@/components/wedding/GallerySection";
import RSVPSection from "@/components/wedding/RSVPSection";
import PhotoUploadSection from "@/components/wedding/PhotoUploadSection";
import Footer from "@/components/wedding/Footer";
import { weddingConfig } from "@/lib/weddingConfig";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>{weddingConfig.bride} & {weddingConfig.groom} | Wedding Invitation</title>
        <meta 
          name="description" 
          content={`You're invited to celebrate the wedding of ${weddingConfig.bride} & ${weddingConfig.groom}. RSVP and join us for our special day.`} 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main>
          <div id="home">
            <HeroSection />
          </div>
          <DetailsSection />
          <GallerySection />
          <RSVPSection />
          <PhotoUploadSection />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Index;
