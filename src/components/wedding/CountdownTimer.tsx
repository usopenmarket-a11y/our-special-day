import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/lib/arabicNumbers";

interface CountdownTimerProps {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = ({ targetDate }: CountdownTimerProps) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const timeUnits = [
    { label: t("hero.countdown.days"), value: timeLeft.days, key: "days" },
    { label: t("hero.countdown.hours"), value: timeLeft.hours, key: "hours" },
    { label: t("hero.countdown.minutes"), value: timeLeft.minutes, key: "minutes" },
    { label: t("hero.countdown.seconds"), value: timeLeft.seconds, key: "seconds" },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8">
      {timeUnits.map((unit, index) => (
        <motion.div
          key={unit.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 + 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-24 md:h-24 rounded-lg bg-card shadow-soft border border-border/50 flex items-center justify-center">
              <span className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-semibold text-foreground">
                {formatNumber(unit.value, isArabic, { minDigits: 2 })}
              </span>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 sm:w-14 md:w-16 h-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          </div>
          <span className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base font-body text-muted-foreground uppercase tracking-wider sm:tracking-widest">
            {unit.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

export default CountdownTimer;
