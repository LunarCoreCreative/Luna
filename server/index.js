const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const TAVILY_API_KEY = process.env.VITE_TAVILY_API_KEY;

app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;

        if (!TAVILY_API_KEY) {
            return res.status(500).json({ error: 'API Key not configured on server' });
        }

        console.log(`[Proxy] Searching for: ${query}`);

        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: query,
                search_depth: "basic",
                include_answer: true,
                max_results: 5,
                include_images: false,
                include_raw_content: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Tavily API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Proxy Search Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Luna Backend running on http://localhost:${port}`);
    console.log(`Tavily Key Loaded: ${TAVILY_API_KEY ? 'YES' : 'NO'}`);
});
