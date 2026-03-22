const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Analyze a user's daily check-in answers and return scoring data.
 * @param {Object} answers - The user's answers
 * @param {number} answers.sleep - Sleep quality 1-10
 * @param {number} answers.mood - Energy/mood 1-10
 * @param {boolean} answers.productive - Did something productive
 * @param {string} answers.productiveDescription - Description of productive activity
 * @param {number} answers.money - Money spent/made (positive or negative)
 * @param {string} answers.win - Today's one win
 * @returns {Promise<{score: number, insight: string}>}
 */
async function analyzeCheckin(answers) {
  const prompt = `You are an AI life coach analyzing someone's daily check-in. Score their day and give a brief insight.

Daily check-in answers:
- Sleep quality last night: ${answers.sleep}/10
- Energy/mood today: ${answers.mood}/10
- Productive today: ${answers.productive ? 'Yes' : 'No'}${answers.productive && answers.productiveDescription ? ` — "${answers.productiveDescription}"` : ''}
- Money today: ${answers.money >= 0 ? `+$${answers.money}` : `-$${Math.abs(answers.money)}`}
- One win today: "${answers.win}"

Respond with a JSON object (no markdown, no code blocks, just raw JSON):
{
  "score": <integer 0-100, reflecting overall day quality>,
  "insight": "<1-2 sentences of personalized, encouraging insight about their day>"
}

Scoring guide:
- Sleep (weight: 20%): scale from 0 to 20 pts
- Mood (weight: 25%): scale from 0 to 25 pts  
- Productivity (weight: 25%): Yes = 15-25 pts based on description quality, No = 0-5 pts
- Money (weight: 15%): positive = 10-15 pts, neutral = 7 pts, negative = 0-5 pts
- Win (weight: 15%): meaningful win = 10-15 pts, trivial = 5 pts

Be honest but encouraging. The insight should be specific to their answers.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  // Strip markdown code fences if Claude wraps the JSON in ```json ... ```
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in Claude response');
  }
  const parsed = JSON.parse(jsonMatch[0]);

  if (typeof parsed.score !== 'number' || typeof parsed.insight !== 'string') {
    throw new Error('Unexpected response format from Claude');
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(parsed.score))),
    insight: parsed.insight,
  };
}

module.exports = { analyzeCheckin };
