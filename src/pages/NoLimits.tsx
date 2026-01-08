import { Helmet } from "react-helmet-async";
import Navigation from "@/components/wedding/Navigation";
import RSVPSection from "@/components/wedding/RSVPSection";
import Footer from "@/components/wedding/Footer";
import { useTranslation } from "react-i18next";

const NoLimits = () => {
  const { t, ready } = useTranslation();
  
  // Use fallback values if i18n is not ready
  const brideName = ready ? t("hero.bride") : "Fady";
  const groomName = ready ? t("hero.groom") : "Sandra";
  
  return (
    <>
      <Helmet>
        <title>Admin RSVP - {brideName} & {groomName} | Unlimited Reservations</title>
        <meta 
          name="description" 
          content={`Admin RSVP page for ${brideName} & ${groomName} wedding. Unlimited reservations mode.`} 
        />
      </Helmet>

      <div className="min-h-screen">
        <Navigation />
        
        <main>
          <div className="pt-20">
            <RSVPSection noLimits={true} />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default NoLimits;

