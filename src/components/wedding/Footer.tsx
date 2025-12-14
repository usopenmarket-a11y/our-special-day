import { motion } from "framer-motion";
import { weddingConfig } from "@/lib/weddingConfig";
import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-16 px-4 border-t border-border/50">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative element */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-gold/50" />
            <Heart className="w-5 h-5 text-gold fill-gold/30" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-gold/50" />
          </div>

          <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground mb-4">
            {weddingConfig.bride} & {weddingConfig.groom}
          </h2>

          <p className="text-lg font-body text-muted-foreground mb-8 italic">
            {weddingConfig.messages.closing}
          </p>

          <p className="text-sm font-body text-muted-foreground">
            Made with love for our special day
          </p>

          <p className="text-xs font-body text-muted-foreground/60 mt-4">
            FSinvitation © {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
