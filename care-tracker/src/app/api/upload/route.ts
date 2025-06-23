import { NextRequest, NextResponse } from 'next/server';

// Types matching your existing frontend interfaces
interface TaskData {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  actionType: string;
  category: string;
  scheduledTime: string;
  estimatedDuration: number;
  instructions: string[];
  reminders: any[];
  dependencies: any[];
  metadata: {
    source: string;
    confidence: number;
    originalText: string;
    pageNumber: string;
  };
}

// PDF text extraction function using Claude
async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  try {
    // Check if buffer is valid PDF
    const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
    if (pdfHeader !== '%PDF') {
      throw new Error('Invalid PDF format');
    }
    
    // Check if buffer is too small (likely just a header)
    if (pdfBuffer.length < 100) {
      throw new Error('PDF buffer too small - likely incomplete PDF');
    }
    
    console.log('Attempting to parse PDF with Claude API...');
    console.log('Buffer size:', pdfBuffer.length);
    
    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    
    // Convert PDF buffer to base64 for Claude API
    const base64Pdf = pdfBuffer.toString('base64');
    
    // Call Claude API to extract text from PDF
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please extract all text content from this PDF document. Focus on medical instructions, medication details, appointment information, and care instructions. Return only the extracted text without any additional commentary.'
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf
              }
            }
          ]
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    const extractedText = result.content[0]?.text || '';
    
    console.log('PDF parsing successful with Claude, extracted text length:', extractedText.length);
    console.log('First 100 chars of extracted text:', extractedText.substring(0, 100));
    
    return extractedText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Build structured prompt for Claude to parse medical instructions
function buildStructuredPrompt(pdfText: string, procTime: string = "2025-06-21T08:00:00Z"): string {
  const prompt = `You are a helpful assistant extracting structured tasks and medications from medical discharge instructions.

IMPORTANT: Return ONLY valid JSON with no explanatory text, comments, or markdown formatting.

Please read the following text and extract two types of objects:
1. "tasks" activity restrictions or instructions
2. "medications" prescribed medications

Use the following enums:
// Enums
export enum TaskType {
  MEDICATION = 'medication',
  APPOINTMENT = 'appointment',
  EXERCISE = 'exercise',
  WOUND_CARE = 'wound_care',
  DIET = 'diet',
  ACTIVITY_RESTRICTION = 'activity_restriction',
  MONITORING = 'monitoring',
  EDUCATION = 'education',
  OTHER = 'other'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  OVERDUE = 'overdue'
}

export enum TaskActionType {
  DO = 'do',        // Green - things patient should do
  DO_NOT = 'do_not' // Red - things patient should not do
}

export enum TaskCategory {
  IMMEDIATE = 'immediate', // 0-24 hours
  SHORT_TERM = 'short_term', // 1-7 days
  MEDIUM_TERM = 'medium_term', // 1-4 weeks
  LONG_TERM = 'long_term' // 1+ months
}

Each task should follow this format:

{
  "id": "auto-generated-uuid",
  "title": "Short summary (e.g. No Driving Restriction)",
  "description": "Full sentence describing the action (e.g. Do not drive for 24 hours)",
  "type": "TaskType",
  "status": "PENDING",
  "actionType": "TaskActionType",
  "category": "TaskCategory",
  "scheduledTime": "2025-06-21T08:00:00Z",
  "estimatedDuration": estimated time in hours,
  "instructions": ["List of explicit actions or warnings stated in the pdf"],
  "reminders": [],
  "dependencies": [],
  "metadata": {
    "source": "discharge_instructions",
    "confidence": 0.95,
    "originalText": "Original text snippet",
    "pageNumber": "1"
  }
}

The time of the procedure is: ${procTime}
Here is the PDF text:
\`\`\`${pdfText.substring(0, 8000)}\`\`\`

Return ONLY the JSON object in this exact format with no additional text:
{
  "tasks": [...],
  "medications": []
}`;

  return prompt;
}

// Call Claude API with structured prompt
async function callClaudeForStructuredParsing(prompt: string): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Extract JSON from Claude response
function extractJsonFromClaude(claudeResponseText: string): any {
  let text = claudeResponseText.trim();
  
  // Handle code blocks first
  if (text.startsWith("```json")) {
    text = text.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (text.startsWith("```")) {
    text = text.replace(/^```/, '').replace(/```$/, '').trim();
  }
  
  // Look for JSON object starting with { and ending with }
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    text = text.substring(jsonStart, jsonEnd + 1);
  }
  
  // Remove any JavaScript-style comments that might break JSON parsing
  text = text.replace(/\/\/.*$/gm, ''); // Remove single-line comments
  text = text.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
  
  // Clean up any trailing commas before closing brackets/braces
  text = text.replace(/,(\s*[}\]])/g, '$1');
  
  return JSON.parse(text);
}

// Main API handler
export async function POST(request: NextRequest) {
  console.log('Received PDF upload request');
  
  try {
    const data = await request.json();
    
    // Step 1: Unpack incoming data
    const metadata = data.uploadMetadata;
    const fileData = data.fileData;
    const uploadId = metadata?.uploadId || 'unknown';
    
    console.log(`Processing upload ${uploadId} for file ${metadata?.fileName || 'unknown'}`);
    
    if (!fileData?.base64Content) {
      return NextResponse.json({
        status: 'failed',
        message: 'No PDF content provided'
      }, { status: 400 });
    }
    
    // Step 2: Decode base64 PDF
    const base64Content = fileData.base64Content;
    const pdfBuffer = Buffer.from(base64Content, 'base64');
    
    console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);
    console.log(`PDF header: ${pdfBuffer.toString('ascii', 0, Math.min(10, pdfBuffer.length))}`);
    
    // Step 3: Extract PDF text
    let pdfText = '';
    let extractionSuccess = false;
    let extractionError = '';
    
    try {
      pdfText = await extractPdfText(pdfBuffer);
      console.log(`Extracted ${pdfText.length} characters from PDF`);
      extractionSuccess = true;
    } catch (error) {
      console.log('PDF extraction failed:', error);
      extractionError = error instanceof Error ? error.message : 'Unknown error';
      throw error; // Don't continue with mock data, fail properly
    }
    
    // Step 4: Generate structured prompt for Claude
    const procTime = new Date().toISOString();
    const prompt = buildStructuredPrompt(pdfText, procTime);
    
    // Step 5: Call Claude for structured parsing
    console.log('Calling Claude for structured parsing...');
    const claudeResponse = await callClaudeForStructuredParsing(prompt);
    
    // Step 6: Parse Claude response
    const rawText = claudeResponse.content[0]?.text || '';
    console.log('Claude response received, parsing JSON...');
    console.log('Raw response preview:', rawText.substring(0, 200));
    
    let parsedData;
    try {
      parsedData = extractJsonFromClaude(rawText);
    } catch (parseError) {
      console.error('Failed to parse Claude JSON response:', parseError);
      console.log('Raw Claude response:', rawText);
      throw new Error(`Failed to parse structured response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    // Step 7: Return structured response matching Python app format
    console.log(`Successfully processed PDF with structured parsing, returning ${parsedData.tasks?.length || 0} tasks`);
    
    return NextResponse.json(parsedData, { status: 200 });
    
  } catch (error) {
    console.error('PDF processing error:', error);
    
    return NextResponse.json({
      uploadId: 'unknown',
      status: 'failed',
      message: 'Failed to process upload.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Force this to run in Node.js runtime instead of Edge
export const runtime = 'nodejs';