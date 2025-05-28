// server.js - simplified version
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// GHL Access Token from Private Integration
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;

// Endpoint to process discovery call requests
app.post('/api/schedule', async (req, res) => {
  try {
    const { name, email, phone, business_challenge, current_revenue, business_type } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // 1. Create or update contact in GHL first
    try {
      await axios.post(
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
            'Authorization': `Bearer ${GHL_ACCESS_TOKEN}`,
            'Version': '2021-07-28'
          }
        }
      );
    } catch (contactError) {
      console.error('Warning: Contact creation failed, but proceeding:', contactError.message);
      // We'll continue even if contact creation fails, since the booking link will collect info
    }
    
    // 2. Return the booking link directly
    // Using your permanent booking link
    const bookingUrl = '// Enhanced booking URL with tracking parameters
const bookingUrl = 'https://api.biznovaai.com/widget/booking/7iSSynzhdI3On1JqdQn6'
  + '?utm_source=custom_gpt&utm_medium=discovery_assistant&utm_campaign=automation_summit';
';
    
    return res.json({
      success: true,
      message: "Ready to schedule your discovery call",
      booking_url: bookingUrl
    });
    
  } catch (error) {
    console.error('Error processing request:', error.message);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
