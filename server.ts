import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

/**
 * Helper to dynamically get or instantiate the GoogleGenAI client on demand.
 */
function getGeminiClient(): { ai: GoogleGenAI | null; apiKey: string | undefined } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return { ai: null, apiKey: undefined };
  }
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return { ai, apiKey };
}

// API endpoint for AI Research Generation
app.post('/api/research', async (req, res) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Research topic is required.' });
  }

  const cleanTopic = topic.trim();
  const { ai, apiKey } = getGeminiClient();

  // Check if server-side Gemini client is configured
  if (!ai || !apiKey) {
    console.log('[Server] GEMINI_API_KEY not configured or placeholder. Returning demo mode flag.');
    return res.json({
      useDemoMode: true,
      reason: 'No live GEMINI_API_KEY detected in environment variables. Falling back to Demo Intelligence Mode.',
    });
  }

  try {
    console.log(`[Server] Requesting Gemini research generation for: "${cleanTopic}"`);

    const prompt = `You are ATLAS, an elite research intelligence system. Perform an in-depth, objective, multi-layered research analysis on the following question/topic:
"${cleanTopic}"

Construct a complete structured intelligence workspace JSON object with high analytical precision. 

Follow these schema requirements strictly:
1. "summary": Object containing "title" (concise editorial title), "executiveBrief" (2-3 paragraphs high density synthesis), "keyTakeaway" (1 punchy line), "strategicImpact" (impact statement), "confidenceScore" (number 0-100), "lastUpdated" (YYYY-MM-DD).
2. "facts": Array of 5-8 factual bullet statements with "id", "statement", "category", "entityIds" (matching entity IDs), "sourceId" (matching source ID), "date".
3. "entities": Array of 6-10 key entities with "id" (e.g. e_1), "name", "type" (One of: "PEOPLE", "ORGANIZATIONS", "COUNTRIES", "CITIES_REGIONS", "COMPANIES", "TECHNOLOGIES", "EVENTS", "CONCEPTS"), "description", "relevanceScore" (0-100), "relatedEntityIds", "appearancesCount", "sourceIds".
4. "graph": Object containing "nodes" array (id, name, type, val 10-35) and "links" array (source entity id, target entity id, label, strength 0.1-1.0).
5. "timeline": Array of 4-6 chronological milestone events with "id", "date", "title", "description", "entityIds", "sourceId".
6. "tradeOffs": Object containing 4 arrays: "opportunities", "risks", "challenges", "uncertainties". Each item has "id", "title", "description", "evidenceSource", "categoryTag".
7. "relatedTopics": Array of 3-5 adjacent topics with "id", "title", "description", "relevance" ("high" | "medium" | "adjacent").
8. "sources": Array of 3-5 realistic sources with "id" (e.g. s_1), "title", "publisher", "publicationDate", "sourceType" ("academic"|"news"|"government"|"industry"|"analytical"), "url", "relevanceScore", "isVerified" (boolean).
9. "followUpQuestions": Array of 3-4 follow up prompts with "id", "question", "category" ("obstacle"|"impact"|"future"|"history"|"strategic"), "reasoning".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                executiveBrief: { type: Type.STRING },
                keyTakeaway: { type: Type.STRING },
                strategicImpact: { type: Type.STRING },
                confidenceScore: { type: Type.NUMBER },
                lastUpdated: { type: Type.STRING },
              },
              required: ['title', 'executiveBrief', 'keyTakeaway', 'confidenceScore'],
            },
            facts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  statement: { type: Type.STRING },
                  category: { type: Type.STRING },
                  entityIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  sourceId: { type: Type.STRING },
                  date: { type: Type.STRING },
                },
                required: ['id', 'statement', 'category'],
              },
            },
            entities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  relevanceScore: { type: Type.NUMBER },
                  relatedEntityIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  appearancesCount: { type: Type.NUMBER },
                  sourceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['id', 'name', 'type', 'description', 'relevanceScore'],
              },
            },
            graph: {
              type: Type.OBJECT,
              properties: {
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      type: { type: Type.STRING },
                      val: { type: Type.NUMBER },
                    },
                    required: ['id', 'name', 'type', 'val'],
                  },
                },
                links: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      source: { type: Type.STRING },
                      target: { type: Type.STRING },
                      label: { type: Type.STRING },
                      strength: { type: Type.NUMBER },
                    },
                    required: ['source', 'target', 'label'],
                  },
                },
              },
              required: ['nodes', 'links'],
            },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  date: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  entityIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  sourceId: { type: Type.STRING },
                },
                required: ['id', 'date', 'title', 'description'],
              },
            },
            tradeOffs: {
              type: Type.OBJECT,
              properties: {
                opportunities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      evidenceSource: { type: Type.STRING },
                      categoryTag: { type: Type.STRING },
                    },
                  },
                },
                risks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      evidenceSource: { type: Type.STRING },
                      categoryTag: { type: Type.STRING },
                    },
                  },
                },
                challenges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      evidenceSource: { type: Type.STRING },
                      categoryTag: { type: Type.STRING },
                    },
                  },
                },
                uncertainties: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      evidenceSource: { type: Type.STRING },
                      categoryTag: { type: Type.STRING },
                    },
                  },
                },
              },
              required: ['opportunities', 'risks', 'challenges', 'uncertainties'],
            },
            relatedTopics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  relevance: { type: Type.STRING },
                },
                required: ['id', 'title', 'description'],
              },
            },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  publisher: { type: Type.STRING },
                  publicationDate: { type: Type.STRING },
                  sourceType: { type: Type.STRING },
                  url: { type: Type.STRING },
                  relevanceScore: { type: Type.NUMBER },
                  isVerified: { type: Type.BOOLEAN },
                },
                required: ['id', 'title', 'publisher', 'relevanceScore'],
              },
            },
            followUpQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  category: { type: Type.STRING },
                  reasoning: { type: Type.STRING },
                },
                required: ['id', 'question', 'category'],
              },
            },
          },
          required: [
            'summary',
            'facts',
            'entities',
            'graph',
            'timeline',
            'tradeOffs',
            'relatedTopics',
            'sources',
            'followUpQuestions',
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('Gemini returned empty response text.');
    }

    const parsedData = JSON.parse(textOutput);

    // Build workspace structure
    const slug = cleanTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const workspace = {
      id: `live-${Date.now()}-${slug.slice(0, 20)}`,
      topic: cleanTopic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: 'LIVE_AI' as const,
      summary: parsedData.summary,
      facts: parsedData.facts || [],
      entities: parsedData.entities || [],
      graph: parsedData.graph || { nodes: [], links: [] },
      timeline: parsedData.timeline || [],
      tradeOffs: parsedData.tradeOffs || { opportunities: [], risks: [], challenges: [], uncertainties: [] },
      relatedTopics: parsedData.relatedTopics || [],
      sources: parsedData.sources || [],
      followUpQuestions: parsedData.followUpQuestions || [],
    };

    return res.json({ useDemoMode: false, workspace });
  } catch (error: any) {
    console.error('[Server] Gemini API error:', error?.message || error);
    return res.json({
      useDemoMode: true,
      reason: `AI API encountered an error (${error?.message || 'Unknown error'}). Falling back to Demo Intelligence Mode gracefully.`,
    });
  }
});

// API endpoint for Contextual Multi-Turn Chatbot
app.post('/api/chat', async (req, res) => {
  const { messages, workspace } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Chat messages array is required.' });
  }

  const userQuery = messages[messages.length - 1]?.text || '';
  const { ai, apiKey } = getGeminiClient();

  // Check if live AI client exists
  if (!ai || !apiKey) {
    console.log('[Server Chat] GEMINI_API_KEY not configured or placeholder. Replying in Demo Chat Mode.');
    return res.json({
      useDemoMode: true,
      reply: generateDemoChatReply(userQuery, workspace),
    });
  }

  try {
    // Build comprehensive context prompt
    const contextSummary = workspace?.summary?.executiveBrief || 'No executive brief available.';
    const contextFacts = workspace?.facts?.map((f: any) => `- [${f.category}] ${f.statement}`).join('\n') || 'No facts listed.';
    const contextEntities = workspace?.entities?.map((e: any) => `- ${e.name} (${e.type}): ${e.description}`).join('\n') || 'No entities listed.';
    const contextRisks = workspace?.tradeOffs?.risks?.map((r: any) => `- ${r.title}: ${r.description}`).join('\n') || 'No specific risks listed.';
    const contextOpps = workspace?.tradeOffs?.opportunities?.map((o: any) => `- ${o.title}: ${o.description}`).join('\n') || 'No specific opportunities listed.';
    const contextTimeline = workspace?.timeline?.map((t: any) => `- ${t.date}: ${t.title} (${t.description})`).join('\n') || 'No timeline listed.';

    const systemInstruction = `You are ATLAS Senior Intelligence Advisor, an elite, world-class research analyst, geopolitical strategist, and domain expert consultant.
You are assisting the user in analyzing the research topic: "${workspace?.topic || 'Global Strategic Research'}".

Your mission is to provide accurate, authoritative, highly analytical, objective, and contextually grounded answers to the user's questions.

Combine both:
1. The active research workspace data provided below.
2. Your extensive deep knowledge of economics, technology, policy, geopolitics, and industrial strategy relevant to "${workspace?.topic}".

Structure your answers clearly using clean headings, crisp bullet points, or high-density paragraphs. Be direct, factual, and accurate.

ACTIVE WORKSPACE CONTEXT:
=== TITLE & EXECUTIVE BRIEF ===
Title: ${workspace?.summary?.title || 'Research Workspace'}
Key Takeaway: ${workspace?.summary?.keyTakeaway || ''}
Strategic Impact: ${workspace?.summary?.strategicImpact || ''}
Brief:
${contextSummary}

=== VERIFIED FACTS ===
${contextFacts}

=== KEY ENTITIES & INSTITUTIONS ===
${contextEntities}

=== TIMELINE MILESTONES ===
${contextTimeline}

=== STRATEGIC RISKS ===
${contextRisks}

=== STRATEGIC OPPORTUNITIES ===
${contextOpps}`;

    // Format contents array for multi-turn chat
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || 'I analyzed the workspace context but could not generate a textual response.';

    return res.json({
      useDemoMode: false,
      reply: replyText,
    });
  } catch (error: any) {
    console.error('[Server Chat Error]:', error?.message || error);
    return res.json({
      useDemoMode: true,
      reply: generateDemoChatReply(userQuery, workspace),
    });
  }
});

/**
 * Intelligent Demo Chat Reply Generator grounded in workspace context
 */
function generateDemoChatReply(userQuery: string, workspace: any): string {
  const query = userQuery.toLowerCase();
  const topic = workspace?.topic || 'this research topic';

  if (query.includes('risk') || query.includes('vulnerab') || query.includes('threat') || query.includes('downside')) {
    const risks = workspace?.tradeOffs?.risks;
    if (risks && risks.length > 0) {
      return `Based on the active research workspace for **"${topic}"**, the primary identified risk vectors are:\n\n` +
        risks.map((r: any) => `• **${r.title}**: ${r.description} *(Source: ${r.evidenceSource || 'ATLAS Analysis'})*`).join('\n\n') +
        `\n\n*Would you like to explore mitigation strategies or check related entity dependencies?*`;
    }
  }

  if (query.includes('entity') || query.includes('who') || query.includes('company') || query.includes('country') || query.includes('organization') || query.includes('people')) {
    const entities = workspace?.entities;
    if (entities && entities.length > 0) {
      return `Here are the top key entities driving **"${topic}"**:\n\n` +
        entities.slice(0, 5).map((e: any) => `• **${e.name}** (${e.type}, ${e.relevanceScore}% Relevance): ${e.description}`).join('\n\n') +
        `\n\n*Click any entity in the Entities System tab to inspect direct connection degree.*`;
    }
  }

  if (query.includes('summary') || query.includes('overview') || query.includes('brief') || query.includes('takeaway')) {
    if (workspace?.summary) {
      return `### Executive Brief Summary for "${topic}"\n\n` +
        `**Key Takeaway:** ${workspace.summary.keyTakeaway}\n\n` +
        `**Strategic Impact:** ${workspace.summary.strategicImpact}\n\n` +
        `${workspace.summary.executiveBrief}`;
    }
  }

  if (query.includes('fact') || query.includes('stat') || query.includes('data') || query.includes('evidence')) {
    const facts = workspace?.facts;
    if (facts && facts.length > 0) {
      return `Key factual evidence statements recorded for **"${topic}"**:\n\n` +
        facts.slice(0, 4).map((f: any) => `• [${f.category}] ${f.statement}`).join('\n\n');
    }
  }

  if (query.includes('timeline') || query.includes('when') || query.includes('history') || query.includes('date') || query.includes('event')) {
    const timeline = workspace?.timeline;
    if (timeline && timeline.length > 0) {
      return `Chronological milestones for **"${topic}"**:\n\n` +
        timeline.map((t: any) => `• **${t.date}**: ${t.title} — ${t.description}`).join('\n\n');
    }
  }

  // Default intelligent grounded response
  return `Regarding your inquiry on **"${topic}"**:\n\n` +
    `The research workspace highlights that ${workspace?.summary?.keyTakeaway || 'key operational factors are shifting strategic alignment.'}\n\n` +
    `Key takeaway points from the intelligence synthesis:\n` +
    `1. **Strategic Position**: ${workspace?.summary?.strategicImpact || 'High impact across global market corridors.'}\n` +
    `2. **Core Entities Involved**: ${workspace?.entities?.slice(0, 3).map((e: any) => e.name).join(', ') || 'Multiple sovereign and corporate bodies'}.\n` +
    `3. **Key Fact**: ${workspace?.facts?.[0]?.statement || 'Data indicates accelerated investment trends.'}\n\n` +
    `Feel free to ask me to drill down into specific risks, timeline milestones, connected entities, or source citations!`;
}

// Configure Vite middleware in development or serve static files in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = await import('fs').then((fs) =>
        fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
      );
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[Server] ATLAS Intelligence Workspace running on http://localhost:${PORT}`);
});
