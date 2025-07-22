import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Enhanced in-memory session store with status tracking
const sessions = {};

// Middleware
app.use(cors());
app.use(express.json());

// Session status endpoint
app.get('/api/session-status/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const sessionData = sessions[sessionId];
    
    if (!sessionData) {
      return res.json({ status: 'not_found' });
    }

    const response = {
      status: sessionData.status,
      timestamp: sessionData.timestamp
    };

    // Include report if analysis is complete
    if (sessionData.status === 'analysis_complete' && sessionData.report) {
      response.report = sessionData.report;
    }

    res.json(response);

  } catch (error) {
    console.error('Session status check error:', error);
    res.status(500).json({ error: 'Failed to check session status' });
  }
});

// Analyze compatibility endpoint
app.post('/api/analyze-compatibility', async (req, res) => {
  try {
    const { sessionId, founderType, answers } = req.body;

    console.log(`[${new Date().toISOString()}] Analysis request - Session: ${sessionId}, Founder: ${founderType}`);

    if (!sessionId || !founderType || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ 
        error: 'Invalid request: sessionId, founderType, and answers array are required' 
      });
    }

    if (founderType === 'A') {
      // Store Founder A's answers
      sessions[sessionId] = {
        founderA: answers,
        founderB: null,
        status: 'A_submitted',
        timestamp: new Date(),
        report: null
      };

      console.log(`[${sessionId}] Founder A responses stored successfully`);

      const shareUrl = `?code=${sessionId}`;
      return res.json({ 
        success: true, 
        shareUrl,
        message: 'Founder A responses stored successfully' 
      });

    } else if (founderType === 'B') {
      // Retrieve Founder A's answers and perform analysis
      const sessionData = sessions[sessionId];
      
      if (!sessionData || !sessionData.founderA) {
        return res.status(404).json({ 
          error: 'Session not found or Founder A has not completed the assessment yet' 
        });
      }

      // Check for OpenAI API key early
      if (!process.env.AZURE_AI_TOKEN) {
        console.error(`[${sessionId}] Azure AI token not configured`);
        return res.status(500).json({ error: 'Azure AI token not configured' });
      }

      if (!process.env.AZURE_AI_ENDPOINT) {
        console.error(`[${sessionId}] Azure AI endpoint not configured`);
        return res.status(500).json({ error: 'Azure AI endpoint not configured' });
      }

      if (!process.env.AZURE_AI_MODEL_NAME) {
        console.error(`[${sessionId}] Azure AI model name not configured`);
        return res.status(500).json({ error: 'Azure AI model name not configured' });
      }

      // Store Founder B's answers and update status
      sessionData.founderB = answers;
      sessionData.status = 'B_submitted_analyzing';
      sessionData.timestamp = new Date();

      console.log(`[${sessionId}] Founder B responses stored, starting Azure AI analysis...`);

      // Build the prompt for the LLM
      const prompt = `You are an expert startup advisor and psychologist specializing in co-founder compatibility analysis.

Analyze the following responses from two potential co-founders and generate a comprehensive compatibility report. Compare their responses to identify alignment, potential friction points, complementary strengths, and areas of concern.

FOUNDER A RESPONSES:
${sessionData.founderA.map((answer, index) => 
  `${index + 1}. ${answer.question}\nCategory: ${answer.category}\nResponse: ${answer.response}\n`
).join('\n')}

FOUNDER B RESPONSES:
${answers.map((answer, index) => 
  `${index + 1}. ${answer.question}\nCategory: ${answer.category}\nResponse: ${answer.response}\n`
).join('\n')}

Please provide a detailed compatibility analysis in the following JSON format:
{
  "overallScore": [number between 0-100 representing overall compatibility],
  "redFlags": [array of 2-4 specific compatibility concerns or potential conflicts],
  "strengths": [array of 2-4 key compatibility strengths and complementary attributes],
  "actionableAdvice": [array of 3-5 specific, actionable recommendations for the partnership],
  "detailedAnalysis": [
    {
      "questionId": [question ID],
      "theme": "[Category] Compatibility",
      "alignmentScore": [score 1-10 for alignment on this topic],
      "insight": "[detailed analysis of how their responses align or conflict, and implications for the partnership]",
      "founderAAnswer": "[Founder A's actual response]",
      "founderBAnswer": "[Founder B's actual response]"
    }
  ]
}

Focus on:
1. Leadership style compatibility and decision-making alignment
2. Risk tolerance and financial commitment alignment
3. Communication style compatibility and conflict resolution approach
4. Vision alignment and long-term goal compatibility
5. Work-life balance expectations and stress management styles
6. Values alignment and ethical considerations
7. Role definition clarity and potential overlaps/gaps
8. Equity and ownership philosophy alignment

Provide specific insights about how well these founders would work together, where they complement each other, and where they might face challenges. Be honest about potential red flags while also highlighting genuine strengths in their compatibility.`;

      try {
        // Call Azure AI API with timeout
        console.log(`[${sessionId}] Calling Azure AI API...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        // Construct Azure AI URL
        const azureUrl = `${process.env.AZURE_AI_ENDPOINT}/chat/completions?api-version=2024-02-15-preview`;
        
        const response = await fetch(azureUrl, {
          method: 'POST',
          headers: {
            'api-key': process.env.AZURE_AI_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.AZURE_AI_MODEL_NAME,
            messages: [
              {
                role: 'system',
                content: 'You are an expert startup advisor and psychologist specializing in co-founder compatibility. Provide detailed, professional analysis in valid JSON format only. Focus on practical insights about partnership dynamics, complementary strengths, potential conflicts, and actionable advice for building a successful co-founder relationship.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 4000
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`[${sessionId}] Azure AI API error:`, errorData);
          throw new Error(errorData.error?.message || `Azure AI API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const analysisContent = data.choices[0]?.message?.content;
        
        if (!analysisContent) {
          console.error(`[${sessionId}] No analysis content received from Azure AI`);
          throw new Error('No analysis content received from Azure AI API');
        }

        console.log(`[${sessionId}] Azure AI response received, parsing JSON...`);

        // Parse the JSON response with error handling
        let analysisResult;
        try {
          // Remove markdown code block delimiters if present
          let cleanContent = analysisContent.trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          analysisResult = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error(`[${sessionId}] JSON parsing error:`, parseError);
          console.error(`[${sessionId}] Raw content:`, analysisContent);
          console.error(`[${sessionId}] Cleaned content:`, cleanContent);
          throw new Error('Failed to parse AI response as JSON. The AI may have returned malformed data.');
        }
        
        // Validate the response structure
        if (!analysisResult.overallScore || !analysisResult.redFlags || !analysisResult.strengths || !analysisResult.actionableAdvice || !analysisResult.detailedAnalysis) {
          console.error(`[${sessionId}] Invalid response structure:`, analysisResult);
          throw new Error('Invalid response format from Azure AI API - missing required fields');
        }

        // Additional validation
        if (typeof analysisResult.overallScore !== 'number' || analysisResult.overallScore < 0 || analysisResult.overallScore > 100) {
          console.error(`[${sessionId}] Invalid overall score:`, analysisResult.overallScore);
          throw new Error('Invalid overall score from AI analysis');
        }

        console.log(`[${sessionId}] Analysis completed successfully, score: ${analysisResult.overallScore}`);

        // Store the analysis result and update status
        sessionData.report = analysisResult;
        sessionData.status = 'analysis_complete';
        sessionData.timestamp = new Date();

        // Save the report to Supabase database
        try {
          const { data, error: dbError } = await supabase
            .from('reports')
            .insert({
              session_id: sessionId,
              report_data: analysisResult,
              // user_id will be null for now since we don't have authentication yet
              // When authentication is implemented, you can add: user_id: authenticatedUserId
            });

          if (dbError) {
            console.error(`[${sessionId}] Error saving report to Supabase:`, dbError);
            // Log the error but don't fail the request - the report is still generated
          } else {
            console.log(`[${sessionId}] Report saved to Supabase successfully`);
          }
        } catch (saveError) {
          console.error(`[${sessionId}] Unexpected error during Supabase save:`, saveError);
          // Log the error but don't fail the request
        }

        res.json(analysisResult);

      } catch (aiError) {
        console.error(`[${sessionId}] AI Analysis error:`, aiError);
        
        // Update session status to indicate AI error
        sessionData.status = 'ai_error';
        sessionData.error = aiError.message;
        
        if (aiError.name === 'AbortError') {
          throw new Error('AI analysis timed out. Please try again.');
        } else if (aiError.message.includes('api-key') || aiError.message.includes('token')) {
          throw new Error('Invalid Azure AI token. Please check your configuration.');
        } else if (aiError.message.includes('quota')) {
          throw new Error('Azure AI quota exceeded. Please try again later.');
        } else {
          throw aiError;
        }
      }

    } else {
      return res.status(400).json({ error: 'Invalid founderType. Must be "A" or "B"' });
    }

  } catch (error) {
    console.error(`Analysis API Error [${req.body.sessionId || 'unknown'}]:`, error);
    
    // Update session status to indicate error if session exists
    if (req.body.sessionId && sessions[req.body.sessionId]) {
      sessions[req.body.sessionId].status = 'error';
      sessions[req.body.sessionId].error = error.message;
      sessions[req.body.sessionId].timestamp = new Date();
    }
    
    if (error instanceof SyntaxError) {
      res.status(500).json({ error: 'Failed to parse AI response. Please try again.' });
    } else if (error.message.includes('API key')) {
      res.status(401).json({ error: 'Invalid API key configuration' });
    } else if (error.message.includes('token')) {
      res.status(401).json({ error: 'Invalid Azure AI token configuration' });
    } else if (error.message.includes('timeout') || error.name === 'AbortError') {
      res.status(408).json({ error: 'Request timeout. Please try again.' });
    } else {
      res.status(500).json({ 
        error: error.message || 'Analysis failed. Please try again.' 
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeSessions: Object.keys(sessions).length,
    sessionStatuses: Object.keys(sessions).reduce((acc, sessionId) => {
      acc[sessionId] = sessions[sessionId].status;
      return acc;
    }, {})
  });
});

// Session cleanup (remove sessions older than 24 hours)
setInterval(() => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  Object.keys(sessions).forEach(sessionId => {
    if (sessions[sessionId].timestamp < oneDayAgo) {
      delete sessions[sessionId];
      console.log(`Cleaned up expired session: ${sessionId}`);
    }
  });
}, 60 * 60 * 1000); // Run cleanup every hour

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});