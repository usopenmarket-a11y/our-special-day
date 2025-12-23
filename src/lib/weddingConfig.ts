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
  // Your Google Drive folder: https://drive.google.com/drive/u/1/folders/1oNv7irFHp1N-F2WnexkXZIhPzbBktsez
  //
  // TO GET FILE URLs FROM YOUR DRIVE FOLDER:
  // 1. Right-click each MP3 file > Share > Copy link
  // 2. Extract FILE_ID from: https://drive.google.com/file/d/FILE_ID/view
  // 3. Convert to: https://drive.google.com/uc?export=download&id=FILE_ID
  // 4. Add to the array below
  //
  // OPTION 1: Single song (string)
  //   backgroundMusicUrl: "https://drive.google.com/uc?export=download&id=FILE_ID",
  //
  // OPTION 2: Playlist (array of URLs) - Recommended! 
  //   Songs will play in sequence or shuffled randomly
  //   Add all your MP3 files from the Drive folder here:
  //
  backgroundMusicUrl: [
    // Your Google Drive MP3 files
    // IMPORTANT: Make sure files are set to "Anyone with the link can view" in Google Drive
    // Try format 1 (standard):
    "https://drive.google.com/uc?export=download&id=1oLEntHRZOpVdKtG1-jY48BApgHNO7cHB",
    "https://drive.google.com/uc?export=download&id=1SwK1l8AoVfRS3iy6oQBQDvuZ4s9WyAt7",
    
    // If format 1 doesn't work, try format 2 (alternative):
    // "https://drive.google.com/uc?id=1oLEntHRZOpVdKtG1-jY48BApgHNO7cHB&export=download",
    // "https://drive.google.com/uc?id=1SwK1l8AoVfRS3iy6oQBQDvuZ4s9WyAt7&export=download",
    
    // Or format 3 (with confirm parameter to bypass virus scan):
    // "https://drive.google.com/uc?export=download&id=1oLEntHRZOpVdKtG1-jY48BApgHNO7cHB&confirm=t",
    // "https://drive.google.com/uc?export=download&id=1SwK1l8AoVfRS3iy6oQBQDvuZ4s9WyAt7&confirm=t",
    
    // Add more files here as needed
  ] as string[] | string,
  
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
