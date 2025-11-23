import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import { HfInference } from "npm:@huggingface/inference";
import * as kv from "./kv_store.tsx";
import * as db from "./database.tsx";

// Initialize Hugging Face client

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
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to verify user authentication
async function verifyAuth(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// Helper function to ensure user exists in users table
async function ensureUserExists(authUser: any) {
  try {
    // Check if user exists in users table
    const existingUser = await db.userDb.get(authUser.id);
    
    if (!existingUser) {
      console.log('User not found in database, creating record...');
      const userRecord = await db.userDb.create(
        authUser.email || '',
        authUser.user_metadata?.name || 'User',
        authUser.id
      );
      
      if (userRecord) {
        console.log('✓ User record created:', userRecord.user_id);
      } else {
        console.log('⚠️ Warning: Failed to create user record');
      }
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
  }
}

// Health check endpoint
app.get("/make-server-2ba89cfc/health", (c) => {
  const hasSupabaseUrl = !!Deno.env.get('SUPABASE_URL');
  const hasServiceKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  return c.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl,
      hasServiceKey,
      supabaseUrl: hasSupabaseUrl ? 'configured' : 'missing'
    }
  });
});

// Test endpoint to verify backend is working
app.get("/make-server-2ba89cfc/test", (c) => {
  return c.json({ 
    message: "Backend is working!",
    timestamp: new Date().toISOString()
  });
});

// OPTIONS handler for signup (CORS preflight)
app.options("/make-server-2ba89cfc/signup", (c) => {
  return c.text("", 204);
});

// User signup endpoint
app.post("/make-server-2ba89cfc/signup", async (c) => {
  try {
    console.log('Signup endpoint called');
    
    let body;
    try {
      body = await c.req.json();
      console.log('Signup request body:', { email: body.email, name: body.name });
    } catch (parseError) {
      console.log('Failed to parse request body:', parseError);
      return c.json({ error: "Invalid request body" }, 400);
    }

    const { email, password, name } = body;

    if (!email || !password || !name) {
      console.log('Missing required fields');
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    // First, check if user already exists
    console.log('Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (!listError && existingUsers) {
      const existingUser = existingUsers.users.find(u => u.email === email);
      if (existingUser) {
        console.log('User already exists:', existingUser.id);
        
        // Check if the user is confirmed
        if (existingUser.email_confirmed_at) {
          console.log('User is confirmed, suggesting login');
          return c.json({ 
            error: "A user with this email already exists. Please sign in instead.",
            userExists: true,
            needsLogin: true
          }, 400);
        } else {
          console.log('User exists but not confirmed, deleting and recreating...');
          // Delete the unconfirmed user and create a new one
          await supabase.auth.admin.deleteUser(existingUser.id);
        }
      }
    }

    console.log('Creating user with Supabase Auth...');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });

    if (error) {
      console.log('Supabase signup error:', error);
      
      // Provide more helpful error messages
      if (error.message.includes('already registered')) {
        return c.json({ 
          error: "This email is already registered. Please try signing in instead.",
          userExists: true,
          needsLogin: true
        }, 400);
      }
      
      return c.json({ error: error.message }, 400);
    }

    // Ensure user exists in users table
    if (data.user) {
      console.log('Ensuring user exists in database...');
      await ensureUserExists(data.user);
    }

    console.log('User created successfully:', data.user?.id);
    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log('Signup exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Password reset endpoint - allows admin to reset a user's password
app.post("/make-server-2ba89cfc/reset-password", async (c) => {
  try {
    console.log('Password reset endpoint called');
    
    const body = await c.req.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return c.json({ error: "Email and new password are required" }, 400);
    }

    // Find the user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log('Error listing users:', listError);
      return c.json({ error: "Failed to find user" }, 500);
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return c.json({ error: "No user found with this email address" }, 404);
    }

    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      console.log('Password update error:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('Password reset successful for user:', user.id);
    return c.json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    console.log('Password reset exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete user endpoint - allows removing a user account
app.post("/make-server-2ba89cfc/delete-user", async (c) => {
  try {
    console.log('Delete user endpoint called');
    
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    // Find the user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log('Error listing users:', listError);
      return c.json({ error: "Failed to find user" }, 500);
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return c.json({ error: "No user found with this email address" }, 404);
    }

    // Delete the user
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      console.log('User deletion error:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('User deleted successfully:', user.id);
    return c.json({ success: true, message: "User account has been deleted successfully" });
  } catch (error) {
    console.log('Delete user exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create/Update user profile
app.post("/make-server-2ba89cfc/profile", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const profile = {
      userId: user.id,
      email: user.email,
      name: user.user_metadata.name,
      background: body.background,
      currentRole: body.currentRole,
      yearsOfExperience: body.yearsOfExperience,
      knownSkills: body.knownSkills || [],
      targetGoal: body.targetGoal,
      preferredLanguage: body.preferredLanguage,
      learningPace: body.learningPace,
      hoursPerWeek: body.hoursPerWeek,
      learningStyle: body.learningStyle,
      onboardingComplete: body.onboardingComplete || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(`profile:${user.id}`, profile);
    return c.json({ success: true, profile });
  } catch (error) {
    console.log('Profile creation error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get user profile
app.get("/make-server-2ba89cfc/profile", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`profile:${user.id}`);
    if (!profile) {
      return c.json({ 
        profile: {
          userId: user.id,
          email: user.email,
          name: user.user_metadata.name,
          onboardingComplete: false
        }
      });
    }

    return c.json({ profile });
  } catch (error) {
    console.log('Get profile error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Generate personalized roadmap using AI
app.post("/make-server-2ba89cfc/generate-roadmap", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Ensure user exists in database before creating roadmap
    await ensureUserExists(user);

    const profile = await kv.get(`profile:${user.id}`);
    if (!profile) {
      return c.json({ error: "Profile not found. Please complete onboarding first." }, 400);
    }

    // Call Hugging Face API to generate personalized roadmap
    const userPrompt = `You are an expert career counselor and learning path designer. Generate a comprehensive, personalized learning roadmap for a student/professional with the following profile:

Background: ${profile.background}
Current Role: ${profile.currentRole}
Years of Experience: ${profile.yearsOfExperience}
Known Skills: ${profile.knownSkills.join(', ')}
Target Goal: ${profile.targetGoal}
Preferred Programming Language: ${profile.preferredLanguage}
Learning Pace: ${profile.learningPace}
Hours per Week: ${profile.hoursPerWeek}
Learning Style: ${profile.learningStyle}

Create a structured learning roadmap with:
1. Prerequisites (foundational skills needed)
2. Core Concepts (essential skills for the target role)
3. Advanced Topics (specialization areas)
4. Tools & Frameworks (industry-standard tools)
5. Estimated timeline for each module based on ${profile.hoursPerWeek} hours/week

IMPORTANT: Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "phases": [
    {
      "id": "phase-1",
      "title": "Phase Title",
      "description": "Phase description",
      "estimatedWeeks": 4,
      "modules": [
        {
          "id": "module-1-1",
          "title": "Module Title",
          "description": "Module description",
          "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],
          "estimatedHours": 20,
          "difficulty": "beginner",
          "resources": [
            { "type": "video", "title": "Resource title", "url": "" }
          ]
        }
      ]
    }
  ],
  "totalEstimatedWeeks": 24,
  "skillsToMaster": ["Skill 1", "Skill 2", "Skill 3"]
}`;

    let responseText;
    try {
      const response = await hf.chat.completions.create({
        model: HF_MODEL,
        messages: [
          { role: "user", content: userPrompt }
        ],
        stream: false,
      });

      if (response.choices && response.choices.length > 0) {
        responseText = response.choices[0].message.content;
      } else {
        console.log('No response from HF model, using template');
        const templateRoadmap = generateTemplateRoadmap(profile);
        
        // Store in database
        const roadmapDb = await db.roadmapDb.create(
          user.id,
          `${profile.targetGoal} Learning Path`,
          templateRoadmap.content,
          'active'
        );
        
        if (roadmapDb) {
          // Extract and store modules and topics
          await storeModulesAndTopics(roadmapDb.id, templateRoadmap.content);
        }
        
        // Also store in KV for backward compatibility
        await kv.set(`roadmap:${user.id}`, templateRoadmap);
        return c.json({ roadmap: templateRoadmap });
      }
    } catch (hfError) {
      console.log('Hugging Face API error:', hfError);
      const templateRoadmap = generateTemplateRoadmap(profile);
      
      // Store in database
      const roadmapDb = await db.roadmapDb.create(
        user.id,
        `${profile.targetGoal} Learning Path`,
        templateRoadmap.content,
        'active'
      );
      
      if (roadmapDb) {
        await storeModulesAndTopics(roadmapDb.id, templateRoadmap.content);
      }
      
      await kv.set(`roadmap:${user.id}`, templateRoadmap);
      return c.json({ roadmap: templateRoadmap });
    }
    
    // Clean up the response - remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let roadmapContent;
    try {
      roadmapContent = JSON.parse(responseText);
    } catch (parseError) {
      console.log('Failed to parse roadmap JSON:', parseError);
      // Fallback to template
      const templateRoadmap = generateTemplateRoadmap(profile);
      
      // Store in database
      const roadmapDb = await db.roadmapDb.create(
        user.id,
        `${profile.targetGoal} Learning Path`,
        templateRoadmap.content,
        'active'
      );
      
      if (roadmapDb) {
        await storeModulesAndTopics(roadmapDb.id, templateRoadmap.content);
      }
      
      await kv.set(`roadmap:${user.id}`, templateRoadmap);
      return c.json({ roadmap: templateRoadmap });
    }
    
    const roadmap = {
      userId: user.id,
      targetGoal: profile.targetGoal,
      content: roadmapContent,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    // Store in SQL database
    const roadmapDb = await db.roadmapDb.create(
      user.id,
      `${profile.targetGoal} Learning Path`,
      roadmapContent,
      'active'
    );
    
    if (roadmapDb) {
      console.log('✓ Roadmap stored in database:', roadmapDb.id);
      // Extract and store modules and topics from phases
      await storeModulesAndTopics(roadmapDb.id, roadmapContent);
      // Add database ID to roadmap object
      roadmap.roadmapId = roadmapDb.id;
    }

    // Also store in KV for backward compatibility
    await kv.set(`roadmap:${user.id}`, roadmap);
    return c.json({ roadmap });
  } catch (error) {
    console.log('Roadmap generation error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get user's roadmap
app.get("/make-server-2ba89cfc/roadmap", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const roadmap = await kv.get(`roadmap:${user.id}`);
    if (!roadmap) {
      return c.json({ roadmap: null });
    }

    return c.json({ roadmap });
  } catch (error) {
    console.log('Get roadmap error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update progress for a module
app.post("/make-server-2ba89cfc/progress", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { moduleId, status, timeSpent, performanceScore, notes, completedTopics } = body;

    const progressKey = `progress:${user.id}:${moduleId}`;
    const existingProgress = await kv.get(progressKey) || {};

    const progress = {
      ...existingProgress,
      userId: user.id,
      moduleId,
      status: status || existingProgress.status || 'not-started',
      timeSpent: (existingProgress.timeSpent || 0) + (timeSpent || 0),
      performanceScore: performanceScore || existingProgress.performanceScore,
      notes: notes || existingProgress.notes,
      completedTopics: completedTopics || existingProgress.completedTopics || [],
      lastUpdated: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : existingProgress.completedAt
    };

    await kv.set(progressKey, progress);
    return c.json({ success: true, progress });
  } catch (error) {
    console.log('Progress update error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all progress for user
app.get("/make-server-2ba89cfc/progress", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const progressItems = await kv.getByPrefix(`progress:${user.id}:`);
    return c.json({ progress: progressItems });
  } catch (error) {
    console.log('Get progress error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Generate detailed topic content with YouTube videos
app.post("/make-server-2ba89cfc/generate-topic-content", async (c) => {
  try {
    console.log('=== GENERATE TOPIC CONTENT ENDPOINT CALLED ===');
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      console.log('❌ Unauthorized request');
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { moduleId, moduleTitle, topic, difficulty, targetGoal } = body;
    console.log('📝 Request details:', { 
      moduleId, 
      moduleTitle, 
      topic, 
      difficulty, 
      targetGoal, 
      userId: user.id 
    });

    // Check if content already exists
    const contentKey = `topic-content:${user.id}:${moduleId}:${topic}`;
    const existingContent = await kv.get(contentKey);
    
    if (existingContent) {
      console.log('✓ Returning cached content for:', contentKey);
      console.log('Cached content structure:', {
        hasExplanation: !!existingContent.explanation,
        hasKeyPoints: !!existingContent.keyPoints,
        keyPointsCount: existingContent.keyPoints?.length || 0,
        hasYoutubeVideos: !!existingContent.youtubeVideos,
        youtubeVideosCount: existingContent.youtubeVideos?.length || 0
      });
      return c.json({ content: existingContent });
    }

    console.log('🤖 Calling Hugging Face API to generate content...');

    // Generate comprehensive topic content
    const userPrompt = `You are an expert educator creating comprehensive learning materials. Generate comprehensive learning content for the following topic:

Topic: ${topic}
Module: ${moduleTitle}
Difficulty: ${difficulty}
Target Career: ${targetGoal}

Provide:
1. A detailed explanation of the concept (200-300 words)
2. Key learning points (5-7 bullet points)
3. Real-world applications and examples (3-5 items)
4. Common pitfalls to avoid (3-5 items)
5. Practice suggestions (3-5 items)
6. 3-5 specific YouTube video search queries that would help learn this topic (be very specific with technical terms)

IMPORTANT: Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "explanation": "detailed text here",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "applications": ["app 1", "app 2", "app 3"],
  "pitfalls": ["pitfall 1", "pitfall 2", "pitfall 3"],
  "practiceIdeas": ["idea 1", "idea 2", "idea 3"],
  "youtubeSearchQueries": ["specific query 1", "specific query 2", "specific query 3"]
}`;

    let responseText;
    try {
      const response = await hf.chat.completions.create({
        model: HF_MODEL,
        messages: [
          { role: "user", content: userPrompt }
        ],
        stream: false,
      });

      if (response.choices && response.choices.length > 0) {
        responseText = response.choices[0].message.content;
        console.log('✓ Hugging Face response received');
      } else {
        console.log('❌ No response from HF model');
        return c.json({ error: 'No response from AI model' }, 500);
      }
    } catch (hfError) {
      console.log('❌ Hugging Face API error:', hfError);
      return c.json({ error: `Hugging Face API error: ${String(hfError)}` }, 500);
    }

    console.log('📄 Raw AI response (first 500 chars):', responseText.substring(0, 500));
    
    // Clean up the response - remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Also try to remove any text before the first { and after the last }
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      responseText = responseText.substring(firstBrace, lastBrace + 1);
    }
    
    console.log('🧹 Cleaned response (first 500 chars):', responseText.substring(0, 500));
    
    let generatedContent;
    try {
      generatedContent = JSON.parse(responseText);
      console.log('✓ Content parsed successfully');
      console.log('Parsed content keys:', Object.keys(generatedContent));
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError);
      console.log('Full cleaned response:', responseText);
      
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          generatedContent = JSON.parse(jsonMatch[0]);
          console.log('✓ Extracted and parsed JSON successfully');
        } catch (e) {
          console.log('❌ Failed to parse extracted JSON:', e);
          throw new Error('Could not extract valid JSON from response');
        }
      } else {
        throw new Error('Could not find JSON object in response');
      }
    }

    // Validate generated content has required fields
    if (!generatedContent.explanation) {
      console.log('⚠️  Warning: No explanation in generated content');
    }
    if (!generatedContent.keyPoints || generatedContent.keyPoints.length === 0) {
      console.log('⚠️  Warning: No keyPoints in generated content');
      generatedContent.keyPoints = ["Content generation incomplete. Please try again."];
    }
    if (!generatedContent.applications || generatedContent.applications.length === 0) {
      console.log('⚠️  Warning: No applications in generated content');
      generatedContent.applications = ["Applications not generated"];
    }
    if (!generatedContent.pitfalls || generatedContent.pitfalls.length === 0) {
      console.log('⚠️  Warning: No pitfalls in generated content');
      generatedContent.pitfalls = ["Pitfalls not generated"];
    }
    if (!generatedContent.practiceIdeas || generatedContent.practiceIdeas.length === 0) {
      console.log('⚠️  Warning: No practiceIdeas in generated content');
      generatedContent.practiceIdeas = ["Practice ideas not generated"];
    }

    // Create YouTube videos for each search query
    console.log('🎥 Processing YouTube search queries...');
    console.log('YouTube search queries:', generatedContent.youtubeSearchQueries);
    
    const youtubeVideos = [];
    const searchQueries = generatedContent.youtubeSearchQueries || [];
    
    if (searchQueries.length === 0) {
      console.log('⚠️  No YouTube search queries in generated content, creating defaults...');
      // Create default search queries based on the topic
      const defaultQueries = [
        `${topic} tutorial ${difficulty}`,
        `${topic} explained ${moduleTitle}`,
        `${topic} ${targetGoal} guide`
      ];
      searchQueries.push(...defaultQueries);
    }
    
    for (const query of searchQueries) {
      try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        youtubeVideos.push({
          title: query,
          searchUrl: searchUrl,
          embedQuery: query
        });
        console.log('✓ Created YouTube video entry:', { title: query, searchUrl });
      } catch (error) {
        console.log('❌ YouTube search error:', error);
      }
    }

    console.log(`✓ Created ${youtubeVideos.length} YouTube video entries`);

    const content = {
      explanation: generatedContent.explanation || `Detailed content for ${topic} is being generated.`,
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

    console.log('📦 Final content structure:', {
      hasExplanation: !!content.explanation,
      explanationLength: content.explanation?.length || 0,
      keyPointsCount: content.keyPoints?.length || 0,
      applicationsCount: content.applications?.length || 0,
      pitfallsCount: content.pitfalls?.length || 0,
      practiceIdeasCount: content.practiceIdeas?.length || 0,
      youtubeVideosCount: content.youtubeVideos?.length || 0
    });

    // Cache the content
    await kv.set(contentKey, content);
    console.log('✓ Content cached successfully at:', contentKey);
    console.log('=== TOPIC CONTENT GENERATION COMPLETED ===');

    return c.json({ content });
  } catch (error) {
    console.log('=== TOPIC CONTENT GENERATION FAILED ===');
    console.log('❌ Error details:', error);
    console.log('Error type:', typeof error);
    console.log('Error message:', String(error));
    if (error instanceof Error) {
      console.log('Error stack:', error.stack);
    }
    return c.json({ error: `Error generating content: ${String(error)}` }, 500);
  }
});

// Get cached topic content
app.get("/make-server-2ba89cfc/topic-content/:moduleId/:topic", async (c) => {
  try {
    console.log('Get topic content endpoint called');
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      console.log('Unauthorized request');
      return c.json({ error: "Unauthorized" }, 401);
    }

    const moduleId = c.req.param('moduleId');
    const topic = c.req.param('topic');
    const contentKey = `topic-content:${user.id}:${moduleId}:${topic}`;
    console.log('Looking for cached content:', contentKey);
    
    const content = await kv.get(contentKey);
    console.log('Cached content found:', !!content);
    
    return c.json({ content: content || null });
  } catch (error) {
    console.log('Get topic content error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// AI Chat Assistant
app.post("/make-server-2ba89cfc/chat", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { message, conversationHistory } = body;

    // Get user profile and roadmap for context
    const profile = await kv.get(`profile:${user.id}`);
    const roadmap = await kv.get(`roadmap:${user.id}`);

    const fullMessage = `You are an AI learning mentor helping a student achieve their career goal. 

Student Profile:
- Target Goal: ${profile?.targetGoal || 'Not specified'}
- Background: ${profile?.background || 'Not specified'}
- Current Role: ${profile?.currentRole || 'Not specified'}
- Known Skills: ${profile?.knownSkills?.join(', ') || 'None listed'}
- Learning Pace: ${profile?.learningPace || 'Not specified'}

Provide helpful, encouraging guidance. Answer questions about concepts, provide code examples when relevant, suggest resources, and help them stay motivated. Keep responses concise but informative.

User's question: ${message}`;

    let aiResponse;
    try {
      const response = await hf.chat.completions.create({
        model: HF_MODEL,
        messages: [
          { role: "user", content: fullMessage }
        ],
        stream: false,
      });

      if (response.choices && response.choices.length > 0) {
        aiResponse = response.choices[0].message.content;
      } else {
        return c.json({ error: 'No response from AI assistant' }, 500);
      }
    } catch (hfError) {
      console.log('Chat API error:', hfError);
      return c.json({ error: 'Failed to get response from AI assistant' }, 500);
    }

    // Save chat history
    const chatHistory = await kv.get(`chat:${user.id}`) || [];
    chatHistory.push(
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
    );
    
    // Keep only last 50 messages
    if (chatHistory.length > 50) {
      chatHistory.splice(0, chatHistory.length - 50);
    }
    
    await kv.set(`chat:${user.id}`, chatHistory);

    return c.json({ response: aiResponse });
  } catch (error) {
    console.log('Chat error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get chat history
app.get("/make-server-2ba89cfc/chat/history", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const chatHistory = await kv.get(`chat:${user.id}`) || [];
    return c.json({ history: chatHistory });
  } catch (error) {
    console.log('Get chat history error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Save assessment result
app.post("/make-server-2ba89cfc/assessment", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { moduleId, score, results } = body;

    const assessment = {
      userId: user.id,
      moduleId,
      score,
      results,
      completedAt: new Date().toISOString()
    };

    await kv.set(`assessment:${user.id}:${moduleId}:${Date.now()}`, assessment);
    return c.json({ success: true, assessment });
  } catch (error) {
    console.log('Assessment save error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Save challenge completion
app.post("/make-server-2ba89cfc/challenge", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { challengeId, code } = body;

    const challenge = {
      userId: user.id,
      challengeId,
      code,
      completedAt: new Date().toISOString()
    };

    await kv.set(`challenge:${user.id}:${challengeId}`, challenge);
    return c.json({ success: true, challenge });
  } catch (error) {
    console.log('Challenge save error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get user achievements
app.get("/make-server-2ba89cfc/achievements", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const achievements = await kv.get(`achievements:${user.id}`) || {
      unlocked: [],
      xp: 0,
      level: 1,
      streak: 0
    };

    return c.json({ achievements });
  } catch (error) {
    console.log('Get achievements error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update achievement
app.post("/make-server-2ba89cfc/achievements", async (c) => {
  try {
    const user = await verifyAuth(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { achievementId, xp } = body;

    const achievements = await kv.get(`achievements:${user.id}`) || {
      unlocked: [],
      xp: 0,
      level: 1,
      streak: 0
    };

    if (!achievements.unlocked.includes(achievementId)) {
      achievements.unlocked.push(achievementId);
      achievements.xp += xp;
      achievements.level = Math.floor(achievements.xp / 1000) + 1;
    }

    await kv.set(`achievements:${user.id}`, achievements);
    return c.json({ success: true, achievements });
  } catch (error) {
    console.log('Update achievement error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Helper function to generate template roadmap
function generateTemplateRoadmap(profile: any) {
  const goal = profile.targetGoal || 'Full-Stack Developer';
  const language = profile.preferredLanguage || 'JavaScript';
  
  // Template roadmaps for common career goals
  const templates: Record<string, any> = {
    'Data Scientist': {
      phases: [
        {
          id: 'phase-1',
          title: 'Foundations',
          description: 'Build a strong foundation in programming, mathematics, and statistics',
          estimatedWeeks: 8,
          modules: [
            {
              id: 'module-1-1',
              title: 'Python Programming Basics',
              description: 'Master Python syntax, data structures, and basic programming concepts',
              topics: ['Variables & Data Types', 'Control Flow', 'Functions', 'OOP Basics', 'File I/O'],
              estimatedHours: 40,
              difficulty: 'beginner',
              resources: []
            },
            {
              id: 'module-1-2',
              title: 'Statistics & Probability',
              description: 'Understand statistical concepts essential for data science',
              topics: ['Descriptive Statistics', 'Probability Distributions', 'Hypothesis Testing', 'Correlation'],
              estimatedHours: 35,
              difficulty: 'beginner',
              resources: []
            },
            {
              id: 'module-1-3',
              title: 'Linear Algebra & Calculus',
              description: 'Learn mathematical foundations for machine learning',
              topics: ['Vectors & Matrices', 'Matrix Operations', 'Derivatives', 'Gradients'],
              estimatedHours: 30,
              difficulty: 'intermediate',
              resources: []
            }
          ]
        },
        {
          id: 'phase-2',
          title: 'Data Analysis & Visualization',
          description: 'Learn to manipulate, analyze, and visualize data',
          estimatedWeeks: 6,
          modules: [
            {
              id: 'module-2-1',
              title: 'NumPy & Pandas',
              description: 'Master data manipulation with NumPy and Pandas',
              topics: ['NumPy Arrays', 'Pandas DataFrames', 'Data Cleaning', 'Data Transformation'],
              estimatedHours: 30,
              difficulty: 'intermediate',
              resources: []
            },
            {
              id: 'module-2-2',
              title: 'Data Visualization',
              description: 'Create compelling visualizations with Matplotlib and Seaborn',
              topics: ['Matplotlib Basics', 'Seaborn', 'Statistical Plots', 'Interactive Visualizations'],
              estimatedHours: 25,
              difficulty: 'intermediate',
              resources: []
            }
          ]
        },
        {
          id: 'phase-3',
          title: 'Machine Learning',
          description: 'Build and deploy machine learning models',
          estimatedWeeks: 10,
          modules: [
            {
              id: 'module-3-1',
              title: 'Supervised Learning',
              description: 'Learn regression and classification algorithms',
              topics: ['Linear Regression', 'Logistic Regression', 'Decision Trees', 'Random Forests', 'SVM'],
              estimatedHours: 45,
              difficulty: 'advanced',
              resources: []
            },
            {
              id: 'module-3-2',
              title: 'Unsupervised Learning',
              description: 'Explore clustering and dimensionality reduction',
              topics: ['K-Means Clustering', 'Hierarchical Clustering', 'PCA', 't-SNE'],
              estimatedHours: 35,
              difficulty: 'advanced',
              resources: []
            },
            {
              id: 'module-3-3',
              title: 'Model Evaluation & Deployment',
              description: 'Evaluate models and deploy to production',
              topics: ['Cross-Validation', 'Hyperparameter Tuning', 'Model Metrics', 'Flask API', 'Docker'],
              estimatedHours: 30,
              difficulty: 'advanced',
              resources: []
            }
          ]
        }
      ],
      totalEstimatedWeeks: 24,
      skillsToMaster: ['Python', 'Statistics', 'Machine Learning', 'Data Visualization', 'SQL']
    },
    'Full-Stack Developer': {
      phases: [
        {
          id: 'phase-1',
          title: 'Frontend Fundamentals',
          description: 'Master the building blocks of web development',
          estimatedWeeks: 6,
          modules: [
            {
              id: 'module-1-1',
              title: 'HTML & CSS',
              description: 'Learn to structure and style web pages',
              topics: ['HTML5 Semantics', 'CSS Flexbox', 'CSS Grid', 'Responsive Design', 'CSS Animations'],
              estimatedHours: 30,
              difficulty: 'beginner',
              resources: []
            },
            {
              id: 'module-1-2',
              title: 'JavaScript Fundamentals',
              description: 'Master modern JavaScript',
              topics: ['ES6+ Syntax', 'DOM Manipulation', 'Async/Await', 'Promises', 'Fetch API'],
              estimatedHours: 40,
              difficulty: 'beginner',
              resources: []
            }
          ]
        },
        {
          id: 'phase-2',
          title: 'Modern Frontend',
          description: 'Build interactive UIs with React',
          estimatedWeeks: 8,
          modules: [
            {
              id: 'module-2-1',
              title: 'React Fundamentals',
              description: 'Learn component-based development',
              topics: ['Components', 'Props & State', 'Hooks', 'Context API', 'React Router'],
              estimatedHours: 45,
              difficulty: 'intermediate',
              resources: []
            },
            {
              id: 'module-2-2',
              title: 'State Management',
              description: 'Manage complex application state',
              topics: ['Redux', 'Redux Toolkit', 'Context Patterns', 'TanStack Query'],
              estimatedHours: 30,
              difficulty: 'intermediate',
              resources: []
            }
          ]
        },
        {
          id: 'phase-3',
          title: 'Backend Development',
          description: 'Build robust server-side applications',
          estimatedWeeks: 10,
          modules: [
            {
              id: 'module-3-1',
              title: 'Node.js & Express',
              description: 'Create RESTful APIs',
              topics: ['Express Setup', 'Routing', 'Middleware', 'Error Handling', 'Authentication'],
              estimatedHours: 40,
              difficulty: 'intermediate',
              resources: []
            },
            {
              id: 'module-3-2',
              title: 'Databases',
              description: 'Work with SQL and NoSQL databases',
              topics: ['PostgreSQL', 'MongoDB', 'ORMs', 'Database Design', 'Transactions'],
              estimatedHours: 35,
              difficulty: 'advanced',
              resources: []
            },
            {
              id: 'module-3-3',
              title: 'Deployment & DevOps',
              description: 'Deploy applications to production',
              topics: ['Docker', 'CI/CD', 'AWS/Vercel', 'Monitoring', 'Testing'],
              estimatedHours: 30,
              difficulty: 'advanced',
              resources: []
            }
          ]
        }
      ],
      totalEstimatedWeeks: 24,
      skillsToMaster: ['React', 'Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS']
    }
  };

  const templateKey = Object.keys(templates).find(key => goal.includes(key)) || 'Full-Stack Developer';
  const template = templates[templateKey];

  return {
    userId: profile.userId,
    targetGoal: goal,
    content: template,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    isTemplate: true
  };
}

// Helper function to store modules and topics in the database
async function storeModulesAndTopics(roadmapId: string, roadmapContent: any) {
  try {
    console.log('📦 Storing modules and topics for roadmap:', roadmapId);
    const phases = roadmapContent.phases || [];
    
    let moduleOrder = 0;
    
    for (const phase of phases) {
      const modules = phase.modules || [];
      
      for (const module of modules) {
        moduleOrder++;
        const moduleDb = await db.moduleDb.create(
          roadmapId,
          module.title,
          module.description || '',
          moduleOrder,
          {
            id: module.id,
            estimatedHours: module.estimatedHours,
            difficulty: module.difficulty,
            resources: module.resources || [],
            phase: {
              id: phase.id,
              title: phase.title,
              description: phase.description
            }
          }
        );
        
        if (moduleDb) {
          console.log('  ✓ Module stored:', moduleDb.title);
          
          const topics = module.topics || [];
          
          for (const topicTitle of topics) {
            const topicDb = await db.topicDb.create(
              moduleDb.id,
              topicTitle,
              module.difficulty || 'beginner',
              {
                moduleTitle: module.title,
                phaseTitle: phase.title
              }
            );
            
            if (topicDb) {
              console.log('    ✓ Topic stored:', topicDb.title);
            }
          }
        }
      }
    }
    
    console.log('✅ All modules and topics stored successfully');
  } catch (error) {
    console.error('❌ Error storing modules and topics:', error);
  }
}

Deno.serve(app.fetch);
