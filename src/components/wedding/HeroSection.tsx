import { motion } from "framer-motion";
import CountdownTimer from "./CountdownTimer";
import { weddingConfig } from "@/lib/weddingConfig";
import { Heart } from "lucide-react";

const HeroSection = () => {
  const weddingDate = new Date(weddingConfig.weddingDate);
  const formattedDate = weddingDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden gradient-hero">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-rose/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-sage/20 rounded-full blur-2xl animate-float" style={{ animationDelay: "4s" }} />
      </div>

      {/* Ornamental border */}
      <div className="absolute inset-4 md:inset-10 border border-gold/20 rounded-lg pointer-events-none" />
      <div className="absolute inset-6 md:inset-12 border border-gold/10 rounded-lg pointer-events-none" />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-sm md:text-base font-body text-muted-foreground uppercase tracking-[0.3em] mb-8"
        >
          {weddingConfig.messages.hero}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-semibold text-foreground leading-tight">
            {weddingConfig.bride}
            <span className="inline-flex items-center mx-4 md:mx-6">
              <Heart className="w-8 h-8 md:w-12 md:h-12 text-gold fill-gold/30" />
            </span>
            {weddingConfig.groom}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="w-16 md:w-24 h-px bg-gradient-to-r from-transparent to-gold/50" />
          <span className="text-gold text-lg">✦</span>
          <div className="w-16 md:w-24 h-px bg-gradient-to-l from-transparent to-gold/50" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-lg md:text-xl font-body text-muted-foreground mb-4 max-w-2xl mx-auto italic"
        >
          {weddingConfig.messages.invitation}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-2xl md:text-3xl font-display font-medium text-foreground mb-8"
        >
          {formattedDate}
        </motion.p>

        {/* Bible Verse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-12 max-w-2xl mx-auto"
        >
          <blockquote className="text-base md:text-lg font-body text-muted-foreground italic border-l-2 border-gold/50 pl-4">
            "{weddingConfig.bibleVerse.text}"
          </blockquote>
          <p className="text-sm font-body text-gold mt-2">— {weddingConfig.bibleVerse.reference}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <p className="text-sm font-body text-muted-foreground uppercase tracking-widest mb-6">
            Counting down to our special day
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
