// Wedding Configuration - Edit these values to customize your invitation
export const weddingConfig = {
  // Couple names
  bride: "Sandra",
  groom: "Fady",
  
  // Wedding date and time (ISO format)
  weddingDate: "2026-02-14T16:00:00",
  
  // Church ceremony
  church: {
    name: "Saint Mary & Saint Athanasius Church",
    time: "1:00 PM",
    mapUrl: "https://maps.app.goo.gl/wWpfGCFeS8y4GNjM7",
  },
  
  // Reception venue
  venue: {
    name: "Pyramids Park Resort Hotel",
    time: "6:00 PM",
    mapUrl: "https://maps.app.goo.gl/7To8pJm5SGV2ey7t7",
  },
  
  // Schedule
  schedule: [
    { time: "1:00 PM", event: "Church Ceremony", location: "Saint Mary & Saint Athanasius Church" },
    { time: "6:00 PM", event: "Reception & Dinner", location: "Pyramids Park Resort Hotel" },
    { time: "9:00 PM", event: "Dancing & Celebration", location: "Pyramids Park Resort Hotel" },
  ],
  
  // Google Sheet ID for guest list
  guestSheetId: "13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs",
  
  // Google Drive folder for guest uploads
  uploadFolderId: "1dW9zf5S9z4nWJSm8IOKwe64sfvwzkQz1",
  
  // Messages
  messages: {
    hero: "Together with their families",
    invitation: "Request the pleasure of your company at the celebration of their marriage",
    closing: "We can't wait to celebrate with you!",
  },
};
