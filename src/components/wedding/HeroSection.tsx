import { motion } from "framer-motion";
import CountdownTimer from "./CountdownTimer";
import { weddingConfig } from "@/lib/weddingConfig";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const HeroSection = () => {
  const { t, i18n } = useTranslation();
  const weddingDate = new Date(weddingConfig.weddingDate);
  const formattedDate = weddingDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-20 md:py-24 overflow-hidden">
      {/* Language Switcher - Mobile Only (visible on home page) */}
      <div className="fixed top-20 right-4 z-50 md:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-background/80 backdrop-blur-sm border border-gold/20 rounded-full shadow-lg p-1"
        >
          <LanguageSwitcher />
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-rose/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-sage/20 rounded-full blur-2xl animate-float" style={{ animationDelay: "4s" }} />
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-blush/15 rounded-full blur-2xl animate-float" style={{ animationDelay: "1s" }} />
      </div>

      {/* Ornamental border */}
      <div className="absolute inset-4 md:inset-10 border border-gold/20 rounded-lg pointer-events-none" />
      <div className="absolute inset-6 md:inset-12 border border-gold/10 rounded-lg pointer-events-none" />
      
      {/* Subtle gradient overlay - removed to show body background */}

      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6">
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-xs sm:text-sm md:text-base font-body text-muted-foreground uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-6 sm:mb-8"
        >
          {t("hero.togetherWithFamilies")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-4 sm:mb-6"
        >
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-display font-semibold text-foreground leading-tight px-2">
            {t("hero.bride")}
            <span className="inline-flex items-center mx-2 sm:mx-3 md:mx-4 lg:mx-6">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-gold fill-gold/30" />
            </span>
            {t("hero.groom")}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          <div className="w-12 sm:w-16 md:w-24 h-px bg-gradient-to-r from-transparent to-gold/50" />
          <span className="text-gold text-base sm:text-lg">✦</span>
          <div className="w-12 sm:w-16 md:w-24 h-px bg-gradient-to-l from-transparent to-gold/50" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-base sm:text-lg md:text-xl font-body text-muted-foreground mb-3 sm:mb-4 max-w-2xl mx-auto italic px-4"
        >
          {t("hero.invitation")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-xl sm:text-2xl md:text-3xl font-display font-medium text-foreground mb-6 sm:mb-8 px-4"
        >
          {formattedDate}
        </motion.p>

        {/* Bible Verse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-8 sm:mb-12 max-w-2xl mx-auto px-4"
        >
          <blockquote className="text-sm sm:text-base md:text-lg font-body text-muted-foreground italic border-l-2 border-gold/50 pl-3 sm:pl-4 rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-3 sm:rtl:pr-4">
            "{t("hero.bibleVerse.text")}"
          </blockquote>
          <p className="text-sm sm:text-base font-body text-gold font-medium mt-2">— {t("hero.bibleVerse.reference")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <p className="text-sm font-body text-muted-foreground uppercase tracking-widest mb-6">
            {t("hero.countingDown")}
          </p>
          <CountdownTimer targetDate={weddingConfig.weddingDate} />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-gold/30 rounded-full flex justify-center">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-gold rounded-full mt-2"
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
