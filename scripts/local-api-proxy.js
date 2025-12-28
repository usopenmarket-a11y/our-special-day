/**
 * Local API proxy to test the fixed get-guests function
 * This intercepts calls to Supabase and uses the fixed logic
 */

import http from 'http';
import { URL } from 'url';

const SHEET_ID = "13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs";

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (i + 1 < line.length && line[i + 1] === '"' && inQuotes) {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  while (result.length < 2) {
    result.push('');
  }
  
  return result;
}

async function handleGetGuests(searchQuery) {
  console.log(`\n[PROXY] Handling get-guests with query: "${searchQuery}"`);
  
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
  const response = await fetch(csvUrl);
  const csvText = await response.text();
  
  const normalizedCsv = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedCsv.split('\n').filter(line => line.trim().length > 0);
  const guests = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.trim()) {
      const columns = parseCSVLine(line);
      const name = columns[0]?.replace(/^"+|"+$/g, '').trim();
      const familyGroup = (columns[1]?.replace(/^"+|"+$/g, '').trim() || '').replace(/\s+$/, '');
      
      if (name && name.length > 0) {
        guests.push({
          name,
          rowIndex: i - 1,
          familyGroup: familyGroup && familyGroup.length > 0 ? familyGroup : undefined
        });
      }
    }
  }
  
  console.log(`[PROXY] Parsed ${guests.length} guests`);
  
  let filteredGuests = guests;
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    const matchingGuests = guests.filter(guest => 
      guest.name.toLowerCase().includes(query)
    );
    
    const familyGroups = new Set();
    matchingGuests.forEach(guest => {
      if (guest.familyGroup && guest.familyGroup.trim().length > 0) {
        familyGroups.add(guest.familyGroup.trim());
      }
    });
    
    const relatedGuests = guests.filter(guest => 
      guest.familyGroup && 
      guest.familyGroup.trim().length > 0 &&
      familyGroups.has(guest.familyGroup.trim())
    );
    
    const allRelatedGuests = new Map();
    matchingGuests.forEach(guest => {
      allRelatedGuests.set(guest.rowIndex, guest);
    });
    relatedGuests.forEach(guest => {
      allRelatedGuests.set(guest.rowIndex, guest);
    });
    
    filteredGuests = Array.from(allRelatedGuests.values());
    
    console.log(`[PROXY] Search "${searchQuery}": ${matchingGuests.length} matching, ${filteredGuests.length} total (with family)`);
    filteredGuests.forEach(g => {
      console.log(`  - ${g.name} (Family: "${g.familyGroup || 'None'}")`);
    });
  }
  
  return { guests: filteredGuests };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname.includes('get-guests') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { searchQuery } = JSON.parse(body);
        const result = await handleGetGuests(searchQuery);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message, guests: [] }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 9999;
server.listen(PORT, () => {
  console.log(`🚀 Local API Proxy running on http://localhost:${PORT}`);
  console.log(`   This proxies get-guests calls with FIXED logic`);
  console.log(`   Update your Supabase URL temporarily to test`);
});

