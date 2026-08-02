const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

let Anthropic = null;
let client = null;
if (ANTHROPIC_API_KEY) {
  Anthropic = require('@anthropic-ai/sdk');
  client = new Anthropic();
}

const SYSTEM_PROMPT = `You are a neutral wire-service editor. Given headlines and snippets from several news outlets covering the same story, write a strictly factual, non-partisan account of what happened.

Rules:
- State only claims that are corroborated by the provided material; do not add outside knowledge or speculation.
- Avoid loaded, emotional, or partisan language from any side. Prefer neutral verbs and attribute contested claims to their source when the outlets disagree.
- Do not editorialize or draw conclusions about who is right.
- Write a short neutral headline (under 90 characters) and a 3-5 sentence summary.`;

function buildUserPrompt(topic, articles) {
  const lines = articles.map((a, i) => {
    const parts = [`${i + 1}. [${a.sourceName || 'Unknown source'}] "${a.title}"`];
    if (a.description) parts.push(`   ${a.description}`);
    return parts.join('\n');
  });
  return `Story topic: ${topic}\n\nCoverage from ${articles.length} outlet(s):\n${lines.join('\n')}\n\nWrite the neutral headline and summary now.`;
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
            },
            required: ['headline', 'summary'],
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
    return { headline: parsed.headline, summary: parsed.summary, generated: true };
  } catch (err) {
    console.error(`Neutral summary generation failed for "${topic}": ${err.message}`);
    return extractiveFallback(topic, articles);
  }
}

module.exports = { summarizeStory, isLive: () => Boolean(client) };
