import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { weddingConfig } from "@/lib/weddingConfig";
import { MapPin, Clock, Calendar, Heart } from "lucide-react";

const DetailsSection = () => {
  const weddingDate = new Date(weddingConfig.weddingDate);
  const formattedDate = weddingDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = weddingDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <section id="details" className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-body text-gold uppercase tracking-[0.3em] mb-4">
            Join Us
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-semibold text-foreground mb-4">
            Wedding Details
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Date Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-8 text-center shadow-soft border-gold/10 h-full">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <Calendar className="w-7 h-7 text-gold" />
              </div>
              <h3 className="text-xl font-display font-medium text-foreground mb-2">
                The Date
              </h3>
              <p className="font-body text-muted-foreground">{formattedDate}</p>
            </Card>
          </motion.div>

          {/* Time Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-8 text-center shadow-soft border-gold/10 h-full">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <Clock className="w-7 h-7 text-gold" />
              </div>
              <h3 className="text-xl font-display font-medium text-foreground mb-2">
                The Time
              </h3>
              <p className="font-body text-muted-foreground">{formattedTime}</p>
            </Card>
          </motion.div>

          {/* Venue Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-8 text-center shadow-soft border-gold/10 h-full">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-gold" />
              </div>
              <h3 className="text-xl font-display font-medium text-foreground mb-2">
                The Venue
              </h3>
              <p className="font-body text-muted-foreground">
                {weddingConfig.venue.name}
              </p>
              <p className="font-body text-muted-foreground text-sm mt-1">
                {weddingConfig.venue.address}
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-8 md:p-12 shadow-soft border-gold/10">
            <h3 className="text-2xl font-display font-medium text-foreground text-center mb-8">
              Schedule of Events
            </h3>
            <div className="max-w-2xl mx-auto">
              {weddingConfig.schedule.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-6 py-4 border-b border-border/50 last:border-0"
                >
                  <div className="flex-shrink-0 w-24 text-right">
                    <span className="font-display font-medium text-gold">
                      {item.time}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-gold/30 border-2 border-gold" />
                  </div>
                  <div className="flex-grow">
                    <span className="font-body text-lg text-foreground">
                      {item.event}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default DetailsSection;
