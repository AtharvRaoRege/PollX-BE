const { GoogleGenerativeAI } = require("@google/generative-ai");
const Poll = require('../models/Poll');
const SystemState = require('../models/SystemState');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Calculate collective mood from recent polls
// @access  Internal
const calculateMood = async () => {
    try {
        console.log('🔮 Starting Collective Mood Analysis...');

        // 1. Fetch recent polls (last 4 hours)
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
        const recentPolls = await Poll.find({
            createdAt: { $gte: fourHoursAgo },
            status: 'approved'
        }).select('question category');

        if (recentPolls.length < 3) {
            console.log('⚠️ Not enough data for mood analysis. Using fallback.');
            // Update timestamp to keep it "fresh" but don't change value
            await SystemState.findOneAndUpdate(
                { key: 'collective_mood' },
                { $set: { lastUpdated: new Date() } },
                { upsert: true }
            );
            return;
        }

        // 2. Prepare prompt
        const pollTexts = recentPolls.map(p => `"${p.question}"`).join("\n");
        const prompt = `
        Analyze the collective mood of these poll questions.
        Respond with ONLY a valid JSON object. Do not use Markdown.
        Format:
        {
          "percentage": <number 0-100, where 0 is deeply anxious/pessimistic and 100 is highly hopeful/optimistic>,
          "sentiment": "<one word: Anxious, Hopeful, Neutral, Chaotic, Stable, etc.>",
          "summary": "<one short simple sentence describing the vibe. Max 15 words.>"
        }

        Polls:
        ${pollTexts}
        `;

        // 3. Call Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 4. Parse & Save
        console.log("Gemini Raw Response:", text);
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const moodData = JSON.parse(cleanJson);

        await SystemState.findOneAndUpdate(
            { key: 'collective_mood' },
            {
                key: 'collective_mood',
                value: moodData,
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );

        console.log('✅ Mood Updated:', moodData);
        return moodData;

    } catch (error) {
        console.error('❌ Mood Analysis Failed:', error);
    }
};

// @desc    Get current collective mood
// @route   GET /api/system/mood
// @access  Public
const getMood = async (req, res) => {
    try {
        let state = await SystemState.findOne({ key: 'collective_mood' });

        if (!state) {
            // Default initial state
            state = {
                value: {
                    percentage: 50,
                    sentiment: "Neutral",
                    summary: "Waiting for enough data to form a consensus."
                }
            };
        }

        res.json(state.value);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { calculateMood, getMood };
