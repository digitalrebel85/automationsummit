// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// GHL Authentication details
const GHL_CLIENT_ID = process.env.GHL_CLIENT_ID;
const GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET;
const GHL_REFRESH_TOKEN = process.env.GHL_REFRESH_TOKEN;
let GHL_ACCESS_TOKEN = '';
let tokenExpiry = 0;

// Function to get/refresh access token
async function getAccessToken() {
  const now = Date.now();
  if (now >= tokenExpiry) {
    try {
      const response = await axios.post('https://services.leadconnectorhq.com/oauth/token', {
        client_id: GHL_CLIENT_ID,
        client_secret: GHL_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: GHL_REFRESH_TOKEN
      });
      
      GHL_ACCESS_TOKEN = response.data.access_token;
      // Set token to expire 1 hour from now (3600 seconds)
      tokenExpiry = now + (response.data.expires_in * 1000);
      return GHL_ACCESS_TOKEN;
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Authentication failed');
    }
  }
  return GHL_ACCESS_TOKEN;
}

// Endpoint to schedule a discovery call
app.post('/api/schedule', async (req, res) => {
  try {
    const { name, email, phone, business_challenge, current_revenue, business_type } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // Get fresh access token
    const accessToken = await getAccessToken();
    
    // 1. First create or update contact in GHL
    const contactResponse = await axios.post(
      'https://services.leadconnectorhq.com/contacts', 
      {
        email,
        firstName: name.split(' ')[0],
        lastName: name.includes(' ') ? name.split(' ').slice(1).join(' ') : '',
        phone: phone || '',
        customField: {
          business_challenge: business_challenge || '',
          current_revenue: current_revenue || '',
          business_type: business_type || '',
          source: 'Automation Summit GPT'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28'
        }
      }
    );
    
    const contactId = contactResponse.data.contact.id;
    
    // 2. Get available calendar slots (next 7 days)
    const calendarId = process.env.GHL_CALENDAR_ID; // Your calendar ID from GHL
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    
    const slotsResponse = await axios.get(
      `https://services.leadconnectorhq.com/calendars/${calendarId}/slots`,
      {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28'
        }
      }
    );
    
    // 3. Return available slots and a booking URL
    const bookingUrl = `https://yourcompany.gohighlevel.com/appointment/${calendarId}?contact_id=${contactId}`;
    
    // Return first 5 available slots and booking URL
    return res.json({
      success: true,
      available_slots: slotsResponse.data.slots.slice(0, 5),
      booking_url: bookingUrl,
      contact_id: contactId
    });
    
  } catch (error) {
    console.error('Error scheduling appointment:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to schedule appointment' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
