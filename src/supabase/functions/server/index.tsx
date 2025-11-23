import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import { HfInference } from "npm:@huggingface/inference";
import * as kv from "./kv_store.tsx";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Hugging Face client
const HF_TOKEN = Deno.env.get('HF_API_TOKEN') || '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';
const HF_MODEL = 'mlfoundations-dev/oh-dcft-v3.1-claude-3-5-sonnet-20241022:featherless-ai';
const hf = new HfInference(HF_TOKEN);

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Helper function to verify user authentication
async function verifyAuth(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// Helper function to get user ID from header or auth
function getUserId(c: any): string | null {
  // Try X-User-Id header first
  const headerUserId = c.req.header('X-User-Id');
  if (headerUserId) return headerUserId;
  
  // Then try auth
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return null;
  
  // Extract user from token (this is async, but for now return null)
  return null;
}

// Helper function to ensure user exists in users table
async function ensureUserExists(authUser: any) {
  try {
    // Check if user exists
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();
    
    if (!existingUser && !error) {
      console.log('Creating user in database...');
      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          user_id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || 'User'
        })
        .select()
        .single();
      
      if (data) {
        console.log('✓ User created:', data.user_id);
      } else {
        console.log('⚠️ Failed to create user:', insertError);
      }
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
  }
}

// Health check endpoint
app.get("/make-server-2ba89cfc/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasHFToken: !!HF_TOKEN
    }
  });
});

// Generate topic content endpoint - FIXED to use database
app.post("/make-server-2ba89cfc/generate-topic-content", async (c) => {
  try {
    console.log('=== GENERATE TOPIC CONTENT (DB VERSION) ===');
    
    const user = await verifyAuth(c.req.header('Authorization'));
    const userId = user?.id || getUserId(c);
    
    if (!userId) {
      console.log('❌ No user ID available');
      return c.json({ error: "User ID required" }, 401);
    }

    const body = await c.req.json();
    const { moduleId, moduleTitle, topic, difficulty, targetGoal } = body;

    console.log('📝 Request:', { userId, moduleId, moduleTitle, topic, difficulty });

    // Check if topic exists in database
    const { data: existingTopics, error: topicError } = await supabase
      .from('topics')
      .select('*')
      .eq('module_id', moduleId)
      .eq('title', topic)
      .maybeSingle();

    if (existingTopics && existingTopics.content) {
      console.log('✓ Returning cached topic from database');
      return c.json({ content: existingTopics.content });
    }

    // Generate new content with AI
    console.log('🤖 Generating new content with AI...');
    
    const userPrompt = `Generate comprehensive learning content for:
Topic: ${topic}
Module: ${moduleTitle}
Difficulty: ${difficulty}
Target: ${targetGoal}

Provide JSON with:
{
  "explanation": "detailed 200-300 word explanation",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "applications": ["real-world use 1", "real-world use 2", "real-world use 3"],
  "pitfalls": ["common mistake 1", "common mistake 2", "common mistake 3"],
  "practiceIdeas": ["exercise 1", "exercise 2", "exercise 3"],
  "youtubeSearchQueries": ["specific search 1", "specific search 2", "specific search 3"]
}`;

    let responseText;
    try {
      const response = await hf.chat.completions.create({
        model: HF_MODEL,
        messages: [{ role: "user", content: userPrompt }],
        stream: false,
      });

      if (response.choices && response.choices.length > 0) {
        responseText = response.choices[0].message.content;
      } else {
        throw new Error('No response from AI');
      }
    } catch (hfError) {
      console.log('❌ HF API error:', hfError);
      return c.json({ error: `AI generation failed: ${String(hfError)}` }, 500);
    }

    // Clean and parse response
    responseText = responseText.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      responseText = responseText.substring(firstBrace, lastBrace + 1);
    }

    let generatedContent;
    try {
      generatedContent = JSON.parse(responseText);
    } catch (parseError) {
      console.log('❌ JSON parse error:', parseError);
      return c.json({ error: 'Failed to parse AI response' }, 500);
    }

    // Create YouTube video links
    const youtubeVideos = (generatedContent.youtubeSearchQueries || []).map((query: string) => ({
      title: query,
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      embedQuery: query
    }));

    const topicContent = {
      explanation: generatedContent.explanation || '',
      keyPoints: generatedContent.keyPoints || [],
      applications: generatedContent.applications || [],
      pitfalls: generatedContent.pitfalls || [],
      practiceIdeas: generatedContent.practiceIdeas || [],
      youtubeVideos,
      topic,
      moduleId,
      moduleTitle,
      difficulty,
      generatedAt: new Date().toISOString()
    };

    // Store in database
    if (existingTopics) {
      // Update existing topic
      const { error: updateError } = await supabase
        .from('topics')
        .update({ content: topicContent })
        .eq('id', existingTopics.id);
      
      if (updateError) {
        console.log('⚠️ Failed to update topic:', updateError);
      } else {
        console.log('✓ Topic updated in database');
      }
    } else {
      // Create new topic
      const { error: insertError } = await supabase
        .from('topics')
        .insert({
          module_id: moduleId,
          title: topic,
          difficulty: difficulty || 'beginner',
          content: topicContent
        });
      
      if (insertError) {
        console.log('⚠️ Failed to insert topic:', insertError);
      } else {
        console.log('✓ Topic saved to database');
      }
    }

    console.log('=== TOPIC CONTENT GENERATION COMPLETED ===');
    return c.json({ content: topicContent });

  } catch (error) {
    console.log('=== TOPIC CONTENT GENERATION FAILED ===');
    console.log('❌ Error:', error);
    return c.json({ error: `Error: ${String(error)}` }, 500);
  }
});

// Get topic content from database
app.get("/make-server-2ba89cfc/topic-content/:moduleId/:topic", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    const userId = user?.id || getUserId(c);
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const moduleId = c.req.param('moduleId');
    const topic = decodeURIComponent(c.req.param('topic'));

    console.log('🔍 Looking for topic:', { moduleId, topic });

    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('module_id', moduleId)
      .eq('title', topic)
      .maybeSingle();

    if (error) {
      console.log('❌ Database error:', error);
      return c.json({ content: null });
    }

    console.log('✓ Topic found:', !!data);
    return c.json({ content: data?.content || null });

  } catch (error) {
    console.log('❌ Get topic error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get roadmap with modules and topics from database
app.get("/make-server-2ba89cfc/roadmap", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    const userId = user?.id || getUserId(c);
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user's roadmaps
    const { data: roadmaps, error: roadmapError } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!roadmaps) {
      // Fallback to KV store
      const kvRoadmap = await kv.get(`roadmap:${userId}`);
      return c.json({ roadmap: kvRoadmap || null });
    }

    // Get modules for this roadmap
    const { data: modules, error: moduleError } = await supabase
      .from('modules')
      .select('*')
      .eq('roadmap_id', roadmaps.id)
      .order('order', { ascending: true });

    // Get topics for each module
    const modulesWithTopics = await Promise.all(
      (modules || []).map(async (module) => {
        const { data: topics } = await supabase
          .from('topics')
          .select('*')
          .eq('module_id', module.id);
        
        return {
          ...module,
          topics: topics || []
        };
      })
    );

    const roadmap = {
      ...roadmaps,
      modules: modulesWithTopics
    };

    return c.json({ roadmap });

  } catch (error) {
    console.log('❌ Get roadmap error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Keep existing endpoints (signup, profile, progress, chat, etc.)
// ... (rest of your existing endpoints from index.tsx)

Deno.serve(app.fetch);
