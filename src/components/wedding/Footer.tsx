import { motion } from "framer-motion";
import { weddingConfig } from "@/lib/weddingConfig";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toArabicNumerals } from "@/lib/arabicNumbers";

const Footer = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  return (
    <footer className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-t border-border/50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/3 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10 px-2 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative element */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-20 h-px bg-gradient-to-r from-transparent to-gold/50" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Heart className="w-6 h-6 text-gold fill-gold/30" />
            </motion.div>
            <div className="w-20 h-px bg-gradient-to-l from-transparent to-gold/50" />
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-semibold text-foreground mb-4 sm:mb-6 px-4">
            {t("hero.bride")} & {t("hero.groom")}
          </h2>

          <p className="text-base sm:text-lg font-body text-muted-foreground mb-6 sm:mb-8 md:mb-10 italic max-w-2xl mx-auto px-4">
            {t("footer.closing")}
          </p>

          <p className="text-sm font-body text-muted-foreground mb-4">
            {t("footer.madeWithLove")}
          </p>

          <p className="text-xs font-body text-muted-foreground/60 mt-6">
            FSinvitation © {toArabicNumerals(new Date().getFullYear(), isArabic)}
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
