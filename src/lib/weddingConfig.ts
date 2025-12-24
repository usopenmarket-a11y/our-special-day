// Wedding Configuration - Edit these values to customize your invitation
export const weddingConfig = {
  // Couple names (display order: Fady & Sandra)
  bride: "Fady",
  groom: "Sandra",
  
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
  
  // ⚠️ SECURITY: Google Drive/Sheets IDs are now stored in Supabase secrets
  // These values are only used as fallbacks for local development
  // In production, IDs are fetched from Supabase Edge Function 'get-config'
  // 
  // To set up secrets in Supabase:
  // 1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
  // 2. Add these secrets:
  //    - GUEST_SHEET_ID: Your Google Sheet ID
  //    - UPLOAD_FOLDER_ID: Your Google Drive upload folder ID
  //    - GALLERY_FOLDER_ID: Your Google Drive gallery folder ID
  //
  // See SECURE_CONFIG_SETUP.md for detailed instructions
  
  // Fallback values for local development (NOT used in production)
  guestSheetId: "", // Empty by default - fetched from API in production
  uploadFolderId: "", // Empty by default - fetched from API in production
  galleryFolderId: "", // Empty by default - fetched from API in production

  // Background music - AUTO-DETECTED from public/music/ folder
  // 
  // 🎵 AUTOMATIC SETUP:
  // 1. Add MP3 files to public/music/ folder
  // 2. Run: npm run generate-music (or it runs automatically on build)
  // 3. All MP3 files will be automatically included!
  //
  // The music list is auto-generated from public/music/ folder
  // No need to manually update this config when adding new songs!
  //
  backgroundMusicUrl: [] as string[] | string, // Will be populated automatically
  
  // Shuffle playlist: true = random order, false = play in order
  backgroundMusicShuffle: true,
  
  // Background music type: "audio" for direct audio files, "anghami" for Anghami (slow!)
  backgroundMusicType: "audio" as "audio" | "anghami",

  // Bible verse
  bibleVerse: {
    text: "So they are no longer two, but one flesh. Therefore what God has joined together, let no one separate.",
    reference: "Matthew 19:6 NIV",
  },
  
  // Messages
  messages: {
    hero: "Together with their families",
    invitation: "Request the pleasure of your company at the celebration of their marriage",
    closing: "We can't wait to celebrate with you!",
  },
};
