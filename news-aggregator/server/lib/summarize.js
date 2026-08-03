const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

let Anthropic = null;
let client = null;
if (ANTHROPIC_API_KEY) {
  Anthropic = require('@anthropic-ai/sdk');
  client = new Anthropic();
}

const LEAN_LABELS = ['Left', 'Lean Left', 'Center', 'Lean Right', 'Right'];

const SYSTEM_PROMPT = `You are a neutral wire-service editor. Given headlines and snippets from several news outlets covering the same story, write a strictly factual, non-partisan account of what happened, plus a short media-literacy analysis of each outlet's own presentation.

Rules:
- State only claims that are corroborated by the provided material; do not add outside knowledge or speculation.
- Avoid loaded, emotional, or partisan language from any side in the headline/summary. Prefer neutral verbs and attribute contested claims to their source when the outlets disagree.
- Do not editorialize or draw conclusions about who is right.
- Write a short neutral headline (under 90 characters) and a 3-5 sentence summary.
- For each numbered outlet, write a 1-2 sentence commentary on how THAT outlet's specific headline/snippet framed the story: word choice, emphasis, what it foregrounds or omits versus the neutral facts. Base this on the text given, not on the outlet's general reputation.
- For each outlet, classify the framing of that specific piece as one of: Left, Lean Left, Center, Lean Right, Right. This describes the presentation of this article only, not the outlet as a whole.`;

function buildUserPrompt(topic, articles) {
  const lines = articles.map((a, i) => {
    const parts = [`${i + 1}. [${a.sourceName || 'Unknown source'}] "${a.title}"`];
    if (a.description) parts.push(`   ${a.description}`);
    return parts.join('\n');
  });
  return `Story topic: ${topic}\n\nCoverage from ${articles.length} outlet(s):\n${lines.join('\n')}\n\nWrite the neutral headline and summary, then the per-outlet framing analysis, now. Use 0-based "index" values matching the numbered list above minus 1.`;
}

function extractiveFallback(topic, articles) {
  const headline = articles[0].title;
  const descriptions = articles
    .map((a) => a.description)
    .filter(Boolean)
    .slice(0, 3);
  const summary = descriptions.length
    ? descriptions.join(' ')
    : articles.map((a) => a.title).join(' — ');
  return {
    headline,
    summary: summary || `Coverage of "${topic}" from ${articles.length} outlet(s). Add an ANTHROPIC_API_KEY to generate a synthesized neutral summary.`,
    generated: false,
    sourceAnalyses: [],
  };
}

async function summarizeStory(topic, articles) {
  if (!client) {
    return extractiveFallback(topic, articles);
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 600,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              headline: { type: 'string' },
              summary: { type: 'string' },
              sourceAnalyses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'integer' },
                    lean: { type: 'string', enum: LEAN_LABELS },
                    commentary: { type: 'string' },
                  },
                  required: ['index', 'lean', 'commentary'],
                  additionalProperties: false,
                },
              },
            },
            required: ['headline', 'summary', 'sourceAnalyses'],
            additionalProperties: false,
          },
        },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(topic, articles) }],
    });

    if (response.stop_reason === 'refusal') {
      return extractiveFallback(topic, articles);
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) return extractiveFallback(topic, articles);

    const parsed = JSON.parse(textBlock.text);
    return {
      headline: parsed.headline,
      summary: parsed.summary,
      generated: true,
      sourceAnalyses: Array.isArray(parsed.sourceAnalyses) ? parsed.sourceAnalyses : [],
    };
  } catch (err) {
    console.error(`Neutral summary generation failed for "${topic}": ${err.message}`);
    return extractiveFallback(topic, articles);
  }
}

module.exports = { summarizeStory, isLive: () => Boolean(client) };
