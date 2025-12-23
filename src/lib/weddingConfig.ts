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
  
  // Google Sheet ID for guest list
  guestSheetId: "13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs",
  
  // Google Drive folder for guest uploads
  uploadFolderId: "1uTizlj_-8c6KqODuWcIr8N4VscIwYJJL",

  // Google Drive folder for gallery images
  galleryFolderId: "1l4IlQOJ5z7tA-Nn3_T3zsJHVAzPRrE2D",

  // Background music - RECOMMENDED: Use direct audio file URLs for best performance
  // 
  // OPTION 1: Single song (string)
  //   backgroundMusicUrl: "https://example.com/music.mp3",
  //
  // OPTION 2: Playlist (array of URLs) - Recommended! 
  //   Songs will play in sequence or shuffled randomly
  //   backgroundMusicUrl: [
  //     "https://example.com/song1.mp3",
  //     "https://example.com/song2.mp3",
  //     "https://example.com/song3.mp3",
  //   ],
  //
  // BEST HOSTING OPTIONS (faster than Anghami):
  // 1. Google Drive: Upload MP3, right-click > Share > Anyone with link > Copy link
  //    Then convert: https://drive.google.com/uc?export=download&id=FILE_ID
  // 2. Dropbox: Upload MP3, share link, change ?dl=0 to ?dl=1 at the end
  // 3. Cloudflare R2 / AWS S3: Direct links (fastest)
  // 4. GitHub Releases: Upload MP3 to a release, use raw.githubusercontent.com link
  // 5. Your own server: Place MP3 files in public folder
  //
  // Example Google Drive link format:
  //   If share link is: https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing
  //   Use: https://drive.google.com/uc?export=download&id=1ABC123xyz
  //
  backgroundMusicUrl: [] as string[] | string, // Add your music URL(s) here
  
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
