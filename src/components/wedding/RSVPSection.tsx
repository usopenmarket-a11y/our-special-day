import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Check, Heart, X } from "lucide-react";

// Demo guest list - this will be replaced with Google Sheets data
const demoGuests = [
  "Ahmed Hassan",
  "Fatima Al-Rashid",
  "Omar Khalil",
  "Layla Ibrahim",
  "Youssef Mansour",
  "Nour El-Din",
  "Salma Farouk",
  "Karim Abdallah",
];

const RSVPSection = () => {
  const [selectedGuest, setSelectedGuest] = useState("");
  const [attendance, setAttendance] = useState<"attending" | "not-attending" | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const filteredGuests = demoGuests.filter((guest) =>
    guest.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGuest || !attendance) {
      toast({
        title: "Please complete the form",
        description: "Select your name and confirm your attendance.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call - will be replaced with actual Google Sheets integration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);

    toast({
      title: attendance === "attending" ? "See you there! 🎉" : "We'll miss you!",
      description: `Thank you for your response, ${selectedGuest}.`,
    });
  };

  if (isSubmitted) {
    return (
      <section id="rsvp" className="py-20 px-4 bg-secondary/30">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/20 flex items-center justify-center">
              <Check className="w-10 h-10 text-gold" />
            </div>
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground mb-4">
            Thank You, {selectedGuest}!
          </h2>
          <p className="text-lg font-body text-muted-foreground">
            {attendance === "attending"
              ? "We're so excited to celebrate with you!"
              : "We understand and will miss you on our special day."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="rsvp" className="py-20 px-4 bg-secondary/30">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-body text-gold uppercase tracking-[0.3em] mb-4">
            Kindly Respond
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-semibold text-foreground mb-4">
            RSVP
          </h2>
          <p className="text-lg font-body text-muted-foreground max-w-md mx-auto">
            Please let us know if you'll be joining us on our special day
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="p-8 shadow-soft border-gold/10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Guest Search */}
              <div className="space-y-4">
                <Label className="text-base font-display">Find Your Name</Label>
                <Input
                  type="text"
                  placeholder="Search for your name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="font-body"
                />

                {searchQuery && filteredGuests.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-card">
                    {filteredGuests.map((guest) => (
                      <button
                        key={guest}
                        type="button"
                        onClick={() => {
                          setSelectedGuest(guest);
                          setSearchQuery("");
                        }}
                        className={`p-3 text-left rounded-md font-body transition-colors ${
                          selectedGuest === guest
                            ? "bg-gold/20 text-foreground border border-gold/30"
                            : "hover:bg-muted"
                        }`}
                      >
                        {guest}
                      </button>
                    ))}
                  </div>
                )}

                {selectedGuest && (
                  <div className="flex items-center gap-2 p-3 bg-gold/10 rounded-lg border border-gold/20">
                    <Heart className="w-4 h-4 text-gold" />
                    <span className="font-body text-foreground">{selectedGuest}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedGuest("")}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Attendance Selection */}
              <div className="space-y-4">
                <Label className="text-base font-display">Will You Attend?</Label>
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
                    <span className="font-display font-medium">Joyfully Accept</span>
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
                    <span className="font-display font-medium">Regretfully Decline</span>
                  </Label>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !selectedGuest || !attendance}
                className="w-full py-6 text-lg font-display bg-gold hover:bg-gold/90 text-primary-foreground"
              >
                {isSubmitting ? "Sending..." : "Send Response"}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default RSVPSection;
