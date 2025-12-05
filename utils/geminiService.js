const { GoogleGenAI, Type } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const evaluateCandidate = async (
    username,
    manifesto,
    background,
    reasonForContesting,
    experience
) => {
    if (!process.env.API_KEY) {
        console.warn("No API Key found. Returning mock profile.");
        return {
            personalitySummary: "Mock Profile: API Key Missing. A determined individual with hidden potential.",
            strengths: ["Resilience", "Ambition", "Technological Adaptability"],
            weaknesses: ["Transparency", "Experience"],
            leadershipStyle: "Strategic",
            agendaScore: 75
        };
    }

    const prompt = `
        Evaluate this candidate for an online election.
        Candidate: ${username}
        Manifesto: "${manifesto}"
        Background: "${background}"
        Reason for Contesting: "${reasonForContesting}"
        Experience: "${experience}"

        Analyze their leadership potential.
        Return JSON with:
        - personalitySummary: 2 sentences describing their political persona.
        - strengths: 3 key leadership strengths.
        - weaknesses: 2 potential pitfalls.
        - leadershipStyle: One of ['Visionary', 'Strategic', 'Aggressive', 'Diplomatic', 'Servant'].
        - agendaScore: A number 0-100 representing how well their manifesto aligns with modern digital society values.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        personalitySummary: { type: Type.STRING },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        leadershipStyle: { type: Type.STRING, enum: ['Visionary', 'Strategic', 'Aggressive', 'Diplomatic', 'Servant'] },
                        agendaScore: { type: Type.NUMBER }
                    },
                    required: ["personalitySummary", "strengths", "weaknesses", "leadershipStyle", "agendaScore"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("No text in response");
    } catch (e) {
        console.error("Evaluation Error", e);
        return {
            personalitySummary: "Evaluation unavailable due to neural network congestion.",
            strengths: ["Unknown"],
            weaknesses: ["Unknown"],
            leadershipStyle: "Diplomatic",
            agendaScore: 50
        };
    }
};

module.exports = { evaluateCandidate };
