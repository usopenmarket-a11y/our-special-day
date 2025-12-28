import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Check, Heart, X, Loader2, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface GuestInfo {
  name: string;
  rowIndex: number;
  familyGroup?: string;
}

const RSVPSection = () => {
  const { t } = useTranslation();
  const [selectedGuests, setSelectedGuests] = useState<GuestInfo[]>([]);
  const [attendance, setAttendance] = useState<"attending" | "not-attending" | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [guests, setGuests] = useState<GuestInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Fetch guests from Google Sheets when search query changes
  useEffect(() => {
    const fetchGuests = async () => {
      if (searchQuery.length < 2) {
        setGuests([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-guests', {
          body: { searchQuery }
        });

        if (error) {
          console.error("Error fetching guests:", error);
          return;
        }

        setGuests(data.guests || []);
      } catch (err) {
        console.error("Failed to fetch guests:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchGuests, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const toggleGuestSelection = (guest: GuestInfo) => {
    setSelectedGuests(prev => {
      const isSelected = prev.some(g => g.name === guest.name && g.rowIndex === guest.rowIndex);
      if (isSelected) {
        return prev.filter(g => !(g.name === guest.name && g.rowIndex === guest.rowIndex));
      } else {
        return [...prev, guest];
      }
    });
  };

  const selectAllInFamily = (familyGroup: string) => {
    const familyMembers = guests.filter(g => g.familyGroup === familyGroup);
    setSelectedGuests(prev => {
      const existingNames = new Set(prev.map(g => `${g.name}-${g.rowIndex}`));
      const newMembers = familyMembers.filter(g => !existingNames.has(`${g.name}-${g.rowIndex}`));
      return [...prev, ...newMembers];
    });
  };

  const deselectAllInFamily = (familyGroup: string) => {
    setSelectedGuests(prev => prev.filter(g => g.familyGroup !== familyGroup));
  };

  const isGuestSelected = (guest: GuestInfo) => {
    return selectedGuests.some(g => g.name === guest.name && g.rowIndex === guest.rowIndex);
  };

  const areAllFamilySelected = (familyGroup: string) => {
    const familyMembers = guests.filter(g => g.familyGroup === familyGroup);
    return familyMembers.length > 0 && familyMembers.every(member => isGuestSelected(member));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedGuests.length === 0 || !attendance) {
      toast({
        title: t("rsvp.formIncomplete"),
        description: t("rsvp.formIncompleteMessage"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save RSVP to Google Sheet for all selected guests
      const { data, error } = await supabase.functions.invoke('save-rsvp', {
        body: {
          guests: selectedGuests,
          attending: attendance === "attending",
        },
      });

      if (error || data?.success === false) {
        // Extract error message, prioritizing note (detailed error) if available
        let description = "We couldn't save your RSVP. Please try again.";
        if (data) {
          if (data.note) {
            // Show detailed error from Google Sheets API if available
            description = data.note.length > 200 
              ? `${data.note.substring(0, 200)}...` 
              : data.note;
          } else if (data.error) {
            description = data.error;
          }
        } else if (error?.message) {
          description = error.message;
        }

        toast({
          title: t("rsvp.error"),
          description,
          variant: "destructive",
        });
        return;
      }

      setIsSubmitted(true);
      toast({
        title: t("rsvp.success"),
        description: t("rsvp.successMessage"),
      });
    } catch (err) {
      console.error('Failed to save RSVP:', err);
      toast({
        title: t("rsvp.error"),
        description: t("rsvp.errorMessage"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section id="rsvp" className="py-24 px-4 bg-secondary/30 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-rose/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gold/20 flex items-center justify-center shadow-glow">
              <Check className="w-12 h-12 text-gold" />
            </div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold text-foreground mb-6"
          >
            {t("rsvp.success")}!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg font-body text-muted-foreground"
          >
            {t("rsvp.successMessage")}
          </motion.p>
        </div>
      </section>
    );
  }

  return (
    <section id="rsvp" className="py-24 px-4 bg-secondary/30 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-rose/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
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
            className="text-sm font-body text-gold uppercase tracking-[0.3em] mb-4"
          >
            {t("rsvp.subtitle")}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-foreground mb-4"
          >
            {t("rsvp.title")}
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="p-8 lg:p-10 shadow-soft border-gold/10 bg-card/80 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Guest Search */}
              <div className="space-y-4">
                <Label className="text-base font-display">{t("rsvp.selectName")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("rsvp.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="font-body pl-10"
                  />
                  {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold animate-spin" />
                  )}
                </div>

                {searchQuery.length >= 2 && guests.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto p-3 border rounded-lg bg-card">
                    {(() => {
                      // Group guests by family
                      const groupedGuests = new Map<string, GuestInfo[]>();
                      const ungroupedGuests: GuestInfo[] = [];
                      
                      guests.forEach(guest => {
                        if (guest.familyGroup) {
                          if (!groupedGuests.has(guest.familyGroup)) {
                            groupedGuests.set(guest.familyGroup, []);
                          }
                          groupedGuests.get(guest.familyGroup)!.push(guest);
                        } else {
                          ungroupedGuests.push(guest);
                        }
                      });
                      
                      const result: JSX.Element[] = [];
                      
                      // Render grouped families
                      groupedGuests.forEach((familyMembers, familyGroup) => {
                        const allSelected = areAllFamilySelected(familyGroup);
                        result.push(
                          <div key={familyGroup} className="space-y-2 pb-3 border-b border-border/50 last:border-b-0">
                            <div className="flex items-center justify-between px-2">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gold" />
                                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                  {familyGroup}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => allSelected ? deselectAllInFamily(familyGroup) : selectAllInFamily(familyGroup)}
                                className="text-xs text-gold hover:text-gold/80 font-medium"
                              >
                                {allSelected ? t("rsvp.deselectAll") : t("rsvp.selectAll")}
                              </button>
                            </div>
                            <div className="space-y-1 pl-6">
                              {familyMembers.map((guest, index) => {
                                const isSelected = isGuestSelected(guest);
                                return (
                                  <label
                                    key={`${guest.name}-${index}`}
                                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                      isSelected
                                        ? "bg-gold/10 border border-gold/30"
                                        : "hover:bg-muted/50"
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleGuestSelection(guest)}
                                    />
                                    <span className="font-body text-foreground flex-1">{guest.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                      
                      // Render ungrouped guests
                      ungroupedGuests.forEach((guest, index) => {
                        const isSelected = isGuestSelected(guest);
                        result.push(
                          <label
                            key={`${guest.name}-${index}`}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-gold/10 border border-gold/30"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleGuestSelection(guest)}
                            />
                            <span className="font-body text-foreground flex-1">{guest.name}</span>
                          </label>
                        );
                      });
                      
                      return result;
                    })()}
                  </div>
                )}

                {searchQuery.length >= 2 && !isLoading && guests.length === 0 && (
                  <p className="text-sm text-muted-foreground font-body p-3 text-center border rounded-lg">
                    {t("rsvp.noGuestsFound")}
                  </p>
                )}

                {selectedGuests.length > 0 && (
                  <div className="space-y-2 p-3 bg-gold/10 rounded-lg border border-gold/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-gold" />
                      <span className="font-body text-sm font-semibold text-foreground">
                        {t("rsvp.selectedGuests")} ({selectedGuests.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedGuests.map((guest, index) => (
                        <div
                          key={`${guest.name}-${index}`}
                          className="flex items-center gap-1 px-2 py-1 bg-gold/20 rounded-md text-sm"
                        >
                          <span className="font-body text-foreground">{guest.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleGuestSelection(guest)}
                            className="text-muted-foreground hover:text-foreground ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Attendance Selection */}
              <div className="space-y-4">
                <Label className="text-base font-display">{t("rsvp.confirmAttendance")}</Label>
                <RadioGroup
                  value={attendance}
                  onValueChange={(value) => setAttendance(value as "attending" | "not-attending")}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="attending"
                    className={`flex flex-col items-center gap-2 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      attendance === "attending"
                        ? "border-gold bg-gold/10"
                        : "border-border hover:border-gold/50"
                    }`}
                  >
                    <RadioGroupItem value="attending" id="attending" className="sr-only" />
                    <Check className={`w-8 h-8 ${attendance === "attending" ? "text-gold" : "text-muted-foreground"}`} />
                    <span className="font-display font-medium">{t("rsvp.attending")}</span>
                  </Label>
                  <Label
                    htmlFor="not-attending"
                    className={`flex flex-col items-center gap-2 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      attendance === "not-attending"
                        ? "border-rose bg-rose/10"
                        : "border-border hover:border-rose/50"
                    }`}
                  >
                    <RadioGroupItem value="not-attending" id="not-attending" className="sr-only" />
                    <X className={`w-8 h-8 ${attendance === "not-attending" ? "text-rose" : "text-muted-foreground"}`} />
                    <span className="font-display font-medium">{t("rsvp.notAttending")}</span>
                  </Label>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || selectedGuests.length === 0 || !attendance}
                className="w-full py-6 text-lg font-display bg-gold hover:bg-gold/90 text-primary-foreground"
              >
                {isSubmitting ? t("rsvp.submitting") : t("rsvp.submit")}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default RSVPSection;