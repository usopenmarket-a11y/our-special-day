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
import { toArabicNumerals } from "@/lib/arabicNumbers";

interface GuestInfo {
  englishName: string;
  arabicName?: string;
  rowIndex: number;
  familyGroup?: string;
  tableNumber?: string;
}

// Rate limiting: 5 searches per day
const MAX_SEARCHES_PER_DAY = 5;
const SEARCH_LIMIT_KEY = 'rsvp_search_count';
const SEARCH_LIMIT_DATE_KEY = 'rsvp_search_date';

const getSearchCount = (): { count: number; date: string } => {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem(SEARCH_LIMIT_DATE_KEY);
  const storedCount = localStorage.getItem(SEARCH_LIMIT_KEY);

  if (storedDate === today && storedCount) {
    return { count: parseInt(storedCount, 10), date: today };
  }
  return { count: 0, date: today };
};

const incrementSearchCount = (): number => {
  const today = new Date().toDateString();
  const { count } = getSearchCount();
  const newCount = count + 1;
  localStorage.setItem(SEARCH_LIMIT_KEY, newCount.toString());
  localStorage.setItem(SEARCH_LIMIT_DATE_KEY, today);
  return newCount;
};

const canSearch = (): boolean => {
  const { count } = getSearchCount();
  return count < MAX_SEARCHES_PER_DAY;
};

const getRemainingSearches = (): number => {
  const { count } = getSearchCount();
  return Math.max(0, MAX_SEARCHES_PER_DAY - count);
};

const RSVPSection = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [selectedGuests, setSelectedGuests] = useState<GuestInfo[]>([]);
  const [attendance, setAttendance] = useState<"attending" | "not-attending" | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [guests, setGuests] = useState<GuestInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAttendance, setSubmittedAttendance] = useState<"attending" | "not-attending" | "">("");
  const [submittedTableNumbers, setSubmittedTableNumbers] = useState<string[]>([]);
  const [submittedGuestsWithTables, setSubmittedGuestsWithTables] = useState<Array<{ name: string; tableNumber: string }>>([]);
  const [searchCount, setSearchCount] = useState(getSearchCount().count);
  const [searchLanguage, setSearchLanguage] = useState<'en' | 'ar'>('en');
  const { toast } = useToast();

  // Fetch guests function (called on button click)
  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      toast({
        title: t("rsvp.searchMinLength"),
        description: t("rsvp.searchMinLengthMessage"),
        variant: "destructive",
      });
      return;
    }

    // Check rate limit
    if (!canSearch()) {
      toast({
        title: t("rsvp.searchLimitReached"),
        description: t("rsvp.searchLimitMessage"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-guests', {
        body: { searchQuery }
      });

      if (error) {
        console.error("Error fetching guests:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        });
        setGuests([]);
        
        // Check if it's a rate limit error from backend
        if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
          toast({
            title: t("rsvp.searchLimitReached"),
            description: t("rsvp.searchLimitMessage"),
            variant: "destructive",
          });
        } else if (error.message?.includes('503') || error.message?.includes('BOOT_ERROR') || error.message?.includes('failed to start')) {
          toast({
            title: t("rsvp.error"),
            description: "The search service is temporarily unavailable. Please try again in a moment.",
            variant: "destructive",
          });
        } else {
          toast({
            title: t("rsvp.error"),
            description: t("rsvp.searchError"),
            variant: "destructive",
          });
        }
        return;
      }

      // Check backend rate limit response
      if (data?.rateLimited) {
        toast({
          title: t("rsvp.searchLimitReached"),
          description: t("rsvp.searchLimitMessage"),
          variant: "destructive",
        });
        return;
      }

      let fetchedGuests = data?.guests || [];
      
      // Handle both old and new API formats for backward compatibility
      // Old format: { name, rowIndex, familyGroup }
      // New format: { englishName, arabicName, rowIndex, familyGroup, tableNumber }
      fetchedGuests = fetchedGuests.map((g: any) => {
        // If old format (has 'name' but no 'englishName'), convert it
        if (g.name && !g.englishName) {
          console.warn('Converting old API format to new format for guest:', g.name);
          return {
            englishName: g.name,
            arabicName: g.arabicName || undefined,
            rowIndex: g.rowIndex,
            familyGroup: g.familyGroup || undefined,
            tableNumber: g.tableNumber || undefined
          };
        }
        // Already in new format or missing required fields
        return {
          englishName: g.englishName || g.name || 'Unknown',
          arabicName: g.arabicName || undefined,
          rowIndex: g.rowIndex,
          familyGroup: g.familyGroup || undefined,
          tableNumber: g.tableNumber || undefined
        };
      });
      
      // Detect language from search query - check if it contains Arabic characters
      const hasArabicChars = /[\u0600-\u06FF]/.test(searchQuery);
      const detectedLanguage = data?.searchLanguage || (hasArabicChars ? 'ar' : 'en');
      
      console.log(`Fetched ${fetchedGuests.length} guests for query "${searchQuery}" (language: ${detectedLanguage}, hasArabicChars: ${hasArabicChars})`);
      fetchedGuests.forEach((g: GuestInfo, i: number) => {
        console.log(`  ${i + 1}. English: "${g.englishName}", Arabic: "${g.arabicName || 'N/A'}", Family: "${g.familyGroup || 'None'}", Table: "${g.tableNumber || 'None'}", rowIndex: ${g.rowIndex}`);
      });
      
      // Validate that we have the correct data structure
      const invalidGuests = fetchedGuests.filter((g: GuestInfo) => !g.englishName);
      if (invalidGuests.length > 0) {
        console.warn(`Warning: Found ${invalidGuests.length} guests without englishName`);
      }
      
      setGuests(fetchedGuests);
      setSearchLanguage(detectedLanguage);
      
      // Clear selected guests when performing a new search to avoid confusion
      setSelectedGuests([]);
      
      // Increment search count
      const newCount = incrementSearchCount();
      setSearchCount(newCount);
      
    } catch (err) {
      console.error("Failed to fetch guests:", err);
      toast({
        title: t("rsvp.error"),
        description: t("rsvp.searchError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGuestSelection = (guest: GuestInfo) => {
    setSelectedGuests(prev => {
      const isSelected = prev.some(g => g.englishName === guest.englishName && g.rowIndex === guest.rowIndex);
      if (isSelected) {
        return prev.filter(g => !(g.englishName === guest.englishName && g.rowIndex === guest.rowIndex));
      } else {
        return [...prev, guest];
      }
    });
  };

  const selectAllInFamily = (familyGroup: string) => {
    const familyMembers = guests.filter(g => g.familyGroup === familyGroup);
    setSelectedGuests(prev => {
      const existingKeys = new Set(prev.map(g => `${g.englishName}-${g.rowIndex}`));
      const newMembers = familyMembers.filter(g => !existingKeys.has(`${g.englishName}-${g.rowIndex}`));
      return [...prev, ...newMembers];
    });
  };

  const deselectAllInFamily = (familyGroup: string) => {
    setSelectedGuests(prev => prev.filter(g => g.familyGroup !== familyGroup));
  };

  const isGuestSelected = (guest: GuestInfo) => {
    return selectedGuests.some(g => g.englishName === guest.englishName && g.rowIndex === guest.rowIndex);
  };
  
  // Get display name based on search language
  // Rules:
  // - If searching in Arabic (searchLanguage === 'ar') AND Arabic name exists → show Arabic name
  // - Otherwise → always show English name
  // - Family group names always stay in English (handled separately)
  const getDisplayName = (guest: GuestInfo): string => {
    // Always default to English name if available
    if (!guest.englishName) {
      console.warn('Guest missing englishName:', guest);
      return guest.arabicName || 'Unknown';
    }
    
    // If searching in Arabic AND Arabic name exists and is not empty, show Arabic name
    // Otherwise, always show English name
    const shouldShowArabic = searchLanguage === 'ar' && 
                             guest.arabicName && 
                             guest.arabicName.trim().length > 0;
    
    const displayName = shouldShowArabic ? guest.arabicName : guest.englishName;
    
    // Debug log for troubleshooting
    if (guest.englishName?.toLowerCase().includes('sarah') || guest.englishName?.toLowerCase().includes('hossni')) {
      console.log(`getDisplayName: englishName="${guest.englishName}", arabicName="${guest.arabicName || 'N/A'}", searchLanguage=${searchLanguage}, shouldShowArabic=${shouldShowArabic}, returning="${displayName}"`);
    }
    
    return displayName;
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
      console.log(`Submitting RSVP for ${selectedGuests.length} guest(s):`, selectedGuests);
      console.log(`Attendance: ${attendance}`);
      
      // Save RSVP to Google Sheet for all selected guests
      const { data, error } = await supabase.functions.invoke('save-rsvp', {
        body: {
          guests: selectedGuests.map(g => ({ englishName: g.englishName, rowIndex: g.rowIndex })),
          attending: attendance === "attending",
        },
      });
      
      console.log('RSVP response:', { data, error });

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

      // Collect table numbers for attending guests
      // Important: Make sure we're getting table numbers from the original guest data
      // Find the full guest info from the guests list to ensure we have table numbers
      const guestsWithTableNumbers = selectedGuests.map(selectedGuest => {
        // Find the full guest info from the guests list
        const fullGuest = guests.find(g => 
          g.englishName === selectedGuest.englishName && 
          g.rowIndex === selectedGuest.rowIndex
        );
        return fullGuest || selectedGuest;
      });
      
      console.log('Selected guests for RSVP:', guestsWithTableNumbers.map(g => ({
        englishName: g.englishName,
        tableNumber: g.tableNumber,
        rowIndex: g.rowIndex
      })));
      
      const tableNumbers = attendance === "attending" 
        ? guestsWithTableNumbers
            .map(g => g.tableNumber)
            .filter((table): table is string => !!table && table.trim().length > 0)
        : [];
      
      // Store guests with their table numbers for display
      // Use the current search language to determine which name to show
      const guestsWithTables = attendance === "attending"
        ? guestsWithTableNumbers
            .filter(g => g.tableNumber && g.tableNumber.trim().length > 0)
            .map(g => {
              // Determine display name based on search language
              const displayName = (searchLanguage === 'ar' && g.arabicName && g.arabicName.trim().length > 0)
                ? g.arabicName
                : (g.englishName || g.arabicName || 'Unknown');
              return {
                name: displayName,
                tableNumber: g.tableNumber!
              };
            })
        : [];
      
      console.log('Table numbers collected:', tableNumbers);
      console.log('Guests with tables:', guestsWithTables);
      console.log('Attendance:', attendance);
      console.log('All selected guests have table numbers:', guestsWithTableNumbers.every(g => g.tableNumber));
      
      setIsSubmitted(true);
      setSubmittedAttendance(attendance);
      setSubmittedTableNumbers(tableNumbers);
      setSubmittedGuestsWithTables(guestsWithTables);
      toast({
        title: t("rsvp.success"),
        description: attendance === "attending" 
          ? t("rsvp.attendingMessage")
          : t("rsvp.notAttendingMessage"),
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
      <section id="rsvp" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 relative overflow-hidden">
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
            {submittedAttendance === "attending" 
              ? t("rsvp.attendingMessage")
              : t("rsvp.notAttendingMessage")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-xl md:text-2xl font-body text-gold font-semibold mt-6 md:mt-8"
          >
            {t("rsvp.thankYouMessage")}
          </motion.p>
          {submittedAttendance === "attending" && submittedGuestsWithTables.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-lg md:text-xl font-body text-foreground mt-4 md:mt-6 space-y-2"
            >
              {submittedGuestsWithTables.map((guest, idx) => (
                <p key={idx} className="text-lg md:text-xl font-body text-foreground">
                  <span className="font-semibold">{guest.name}</span> {t("rsvp.tableNumberIs")}: <span className="font-semibold text-gold">{toArabicNumerals(guest.tableNumber, isArabic)}</span>
                </p>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="rsvp" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-secondary/30 relative overflow-hidden">
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
          className="text-center mb-8 md:mb-16"
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm md:text-base font-body text-gold font-semibold uppercase tracking-[0.3em] mb-3 md:mb-4"
          >
            {t("rsvp.subtitle")}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl md:text-5xl lg:text-6xl font-display font-semibold text-foreground mb-4"
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
          <Card className="p-4 sm:p-6 md:p-8 lg:p-10 shadow-soft border-gold/10 bg-card/80 backdrop-blur-sm min-h-[200px]">
            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
              {/* Guest Search */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label className="text-sm md:text-base font-display">{t("rsvp.selectName")}</Label>
                  {searchCount > 0 && (
                    <span className="text-xs text-muted-foreground font-body">
                      {(() => {
                        const remaining = getRemainingSearches();
                        const translated = t("rsvp.searchesRemaining", { count: remaining });
                        return isArabic ? translated.replace(/\d+/g, (num) => toArabicNumerals(parseInt(num, 10), true)) : translated;
                      })()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder={t("rsvp.searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      className="font-body h-11 md:h-12 text-base px-3 sm:px-4"
                      disabled={!canSearch()}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={isLoading || !canSearch() || searchQuery.length < 2}
                    className="h-11 md:h-12 px-6 bg-gold hover:bg-gold/90 text-primary-foreground text-base font-medium"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                        <span className="hidden sm:inline">{t("rsvp.searching")}</span>
                        <span className="sm:hidden">{t("rsvp.searching")}</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        {t("rsvp.search")}
                      </>
                    )}
                  </Button>
                </div>
                {!canSearch() && (
                  <p className="text-sm text-rose font-body">
                    {t("rsvp.searchLimitReached")}
                  </p>
                )}

                {searchQuery.length >= 2 && guests.length > 0 && (
                  <div className="space-y-3 max-h-64 md:max-h-80 overflow-y-auto p-3 sm:p-4 md:p-4 border rounded-lg bg-card">
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
                            <div className="flex items-center justify-between px-2 py-1">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 md:w-5 md:h-5 text-gold" />
                                <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                  {familyGroup}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => allSelected ? deselectAllInFamily(familyGroup) : selectAllInFamily(familyGroup)}
                                className="text-sm md:text-base text-gold hover:text-gold/90 font-semibold px-3 py-1.5 touch-manipulation active:scale-95"
                              >
                                {allSelected ? t("rsvp.deselectAll") : t("rsvp.selectAll")}
                              </button>
                            </div>
                            <div className="space-y-1 pl-6">
                              {familyMembers.map((guest, index) => {
                                const isSelected = isGuestSelected(guest);
                                return (
                                  <label
                                    key={`${guest.englishName}-${index}`}
                                    className={`flex items-center gap-3 p-3 md:p-2 rounded-md cursor-pointer transition-colors touch-manipulation active:scale-[0.98] min-h-[44px] ${
                                      isSelected
                                        ? "bg-gold/10 border border-gold/30"
                                        : "hover:bg-muted/50 active:bg-muted/70"
                                    }`}
                                  >
                                    <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleGuestSelection(guest)}
                                        className="w-6 h-6 md:w-5 md:h-5"
                                      />
                                    </div>
                                    <span className="font-body text-sm md:text-base text-foreground flex-1">{getDisplayName(guest)}</span>
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
                            key={`${guest.englishName}-${index}`}
                            className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors min-h-[44px] ${
                              isSelected
                                ? "bg-gold/10 border border-gold/30"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleGuestSelection(guest)}
                                className="w-6 h-6"
                              />
                            </div>
                            <span className="font-body text-foreground flex-1">{getDisplayName(guest)}</span>
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
                  <div className="space-y-2 p-3 md:p-4 bg-gold/10 rounded-lg border border-gold/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 md:w-5 md:h-5 text-gold" />
                      <span className="font-body text-sm md:text-base font-semibold text-foreground">
                        {t("rsvp.selectedGuests")} ({toArabicNumerals(selectedGuests.length, isArabic)})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedGuests.map((guest, index) => (
                        <div
                          key={`${guest.englishName}-${index}`}
                          className="flex items-center gap-1 px-3 py-1.5 md:px-3 md:py-2 bg-gold/20 rounded-md text-sm md:text-base touch-manipulation"
                        >
                          <span className="font-body text-foreground">{getDisplayName(guest)}</span>
                          <button
                            type="button"
                            onClick={() => toggleGuestSelection(guest)}
                            className="text-muted-foreground hover:text-foreground ml-1 p-1 -mr-1 touch-manipulation"
                            aria-label={`Remove ${getDisplayName(guest)}`}
                          >
                            <X className="w-4 h-4 md:w-4 md:h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Attendance Selection */}
              <div className="space-y-3 md:space-y-4">
                <Label className="text-sm md:text-base font-display">{t("rsvp.confirmAttendance")}</Label>
                <RadioGroup
                  value={attendance}
                  onValueChange={(value) => setAttendance(value as "attending" | "not-attending")}
                  className="grid grid-cols-2 gap-3 md:gap-4"
                >
                  <Label
                    htmlFor="attending"
                    className={`flex flex-col items-center justify-center gap-3 md:gap-4 p-4 md:p-6 min-h-[120px] md:min-h-[140px] border-2 rounded-lg cursor-pointer transition-all touch-manipulation active:scale-95 ${
                      attendance === "attending"
                        ? "border-gold bg-gold/10 shadow-md"
                        : "border-border hover:border-gold/50 active:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="attending" id="attending" className="sr-only" />
                    <Check className={`w-10 h-10 md:w-12 md:h-12 ${attendance === "attending" ? "text-gold" : "text-muted-foreground"}`} />
                    <span className="font-display font-medium text-sm md:text-base text-center">{t("rsvp.attending")}</span>
                  </Label>
                  <Label
                    htmlFor="not-attending"
                    className={`flex flex-col items-center justify-center gap-3 md:gap-4 p-4 md:p-6 min-h-[120px] md:min-h-[140px] border-2 rounded-lg cursor-pointer transition-all touch-manipulation active:scale-95 ${
                      attendance === "not-attending"
                        ? "border-rose bg-rose/10 shadow-md"
                        : "border-border hover:border-rose/50 active:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="not-attending" id="not-attending" className="sr-only" />
                    <X className={`w-10 h-10 md:w-12 md:h-12 ${attendance === "not-attending" ? "text-rose" : "text-muted-foreground"}`} />
                    <span className="font-display font-medium text-sm md:text-base text-center">{t("rsvp.notAttending")}</span>
                  </Label>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || selectedGuests.length === 0 || !attendance}
                className="w-full h-12 md:h-14 py-4 md:py-6 text-base md:text-lg font-display bg-gold hover:bg-gold/90 text-primary-foreground touch-manipulation active:scale-95 transition-transform"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 mr-2 animate-spin inline-block" />
                    {t("rsvp.submitting")}
                  </>
                ) : (
                  t("rsvp.submit")
                )}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default RSVPSection;