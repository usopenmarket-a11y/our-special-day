import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { weddingConfig } from "@/lib/weddingConfig";
import { MapPin, Clock, Calendar, Church } from "lucide-react";
import { useTranslation } from "react-i18next";

const DetailsSection = () => {
  const { t, i18n } = useTranslation();
  const weddingDate = new Date(weddingConfig.weddingDate);
  const formattedDate = weddingDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section id="details" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose/3 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 px-2 sm:px-4">
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
            {t("details.joinUs")}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-foreground mb-4"
          >
            {t("details.title")}
          </motion.h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
          {/* Date Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6 sm:p-8 lg:p-10 text-center shadow-soft border-gold/10 h-full bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300 group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
                className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors duration-300"
              >
                <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-gold" />
              </motion.div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-display font-medium text-foreground mb-2 sm:mb-3">
                {t("details.theDate")}
              </h3>
              <p className="font-body text-muted-foreground text-sm sm:text-base">{formattedDate}</p>
            </Card>
          </motion.div>

          {/* Church Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6 sm:p-8 lg:p-10 text-center shadow-soft border-gold/10 h-full bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300 group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
                className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors duration-300"
              >
                <Church className="w-7 h-7 sm:w-8 sm:h-8 text-gold" />
              </motion.div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-display font-medium text-foreground mb-2 sm:mb-3">
                {t("details.churchCeremony")}
              </h3>
              <p className="font-body text-gold font-semibold text-base sm:text-lg md:text-xl">{weddingConfig.church.time}</p>
              <p className="font-body text-muted-foreground text-xs sm:text-sm mt-2">
                {t("details.churchName")}
              </p>
              <a
                href={weddingConfig.church.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 sm:mt-4 px-4 py-3 min-h-[44px] text-sm sm:text-base text-gold hover:text-gold/90 font-body font-medium transition-colors group-hover:underline touch-manipulation rounded-md hover:bg-gold/5 active:bg-gold/10"
              >
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" /> {t("details.viewMap")}
              </a>
            </Card>
          </motion.div>

          {/* Venue Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6 sm:p-8 lg:p-10 text-center shadow-soft border-gold/10 h-full bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300 group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
                className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors duration-300"
              >
                <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-gold" />
              </motion.div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-display font-medium text-foreground mb-2 sm:mb-3">
                {t("details.reception")}
              </h3>
              <p className="font-body text-gold font-semibold text-base sm:text-lg md:text-xl">{weddingConfig.venue.time}</p>
              <p className="font-body text-muted-foreground text-xs sm:text-sm mt-2">
                {t("details.venueName")}
              </p>
              <a
                href={weddingConfig.venue.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 sm:mt-4 px-4 py-3 min-h-[44px] text-sm sm:text-base text-gold hover:text-gold/90 font-body font-medium transition-colors group-hover:underline touch-manipulation rounded-md hover:bg-gold/5 active:bg-gold/10"
              >
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" /> {t("details.viewMap")}
              </a>
            </Card>
          </motion.div>
        </div>

        {/* Children Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12 sm:mt-16 max-w-3xl mx-auto px-4"
        >
          <div className="px-6 md:px-8 py-4 md:py-6 border-2 border-gold/50 bg-gold/10 rounded-lg shadow-lg">
            <p className="text-lg sm:text-xl md:text-2xl font-body text-foreground font-semibold leading-relaxed">
              {t("footer.goodNightForChildren")}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DetailsSection;
