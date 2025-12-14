import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { weddingConfig } from "@/lib/weddingConfig";
import { MapPin, Clock, Calendar, Church } from "lucide-react";

const DetailsSection = () => {
  const weddingDate = new Date(weddingConfig.weddingDate);
  const formattedDate = weddingDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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

          {/* Church Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-8 text-center shadow-soft border-gold/10 h-full">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <Church className="w-7 h-7 text-gold" />
              </div>
              <h3 className="text-xl font-display font-medium text-foreground mb-2">
                Church Ceremony
              </h3>
              <p className="font-body text-gold font-medium">{weddingConfig.church.time}</p>
              <p className="font-body text-muted-foreground text-sm mt-1">
                {weddingConfig.church.name}
              </p>
              <a
                href={weddingConfig.church.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-sm text-gold hover:underline font-body"
              >
                <MapPin className="w-3 h-3" /> View Map
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
            <Card className="p-8 text-center shadow-soft border-gold/10 h-full">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <Clock className="w-7 h-7 text-gold" />
              </div>
              <h3 className="text-xl font-display font-medium text-foreground mb-2">
                Reception
              </h3>
              <p className="font-body text-gold font-medium">{weddingConfig.venue.time}</p>
              <p className="font-body text-muted-foreground text-sm mt-1">
                {weddingConfig.venue.name}
              </p>
              <a
                href={weddingConfig.venue.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-sm text-gold hover:underline font-body"
              >
                <MapPin className="w-3 h-3" /> View Map
              </a>
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
                  className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 py-4 border-b border-border/50 last:border-0"
                >
                  <div className="flex-shrink-0 md:w-24 md:text-right">
                    <span className="font-display font-medium text-gold">
                      {item.time}
                    </span>
                  </div>
                  <div className="flex-shrink-0 hidden md:block">
                    <div className="w-3 h-3 rounded-full bg-gold/30 border-2 border-gold" />
                  </div>
                  <div className="flex-grow">
                    <span className="font-body text-lg text-foreground">
                      {item.event}
                    </span>
                    {'location' in item && (
                      <p className="font-body text-sm text-muted-foreground">{item.location}</p>
                    )}
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
