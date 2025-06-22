import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';

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

interface UploadResponse {
  tasks: TaskData[];
  medications: any[];
}

// PDF text extraction function
async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdf(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Build prompt for Claude API
function buildPrompt(pdfText: string, procTime: string = "2025-06-21T08:00:00Z"): string {
  return `You are a helpful assistant extracting structured tasks and medications from medical discharge instructions.
    
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

\`\`\`json
{
  "id": "auto-generated-uuid",
  "title": "Short summary (e.g. No Driving Restriction)",
  "description": "Full sentence describing the action (e.g. Do not drive for 24 hours)",
  "type": "TaskType",
  "status": "pending",
  "actionType": "TaskActionType",
  "category": "IMMEDIATE",
  "scheduledTime": "${procTime}",
  "estimatedDuration": 1,
  "instructions": ["List of explicit actions or warnings stated in the pdf"],
  "reminders": [],
  "dependencies": [],
  "metadata": {
    "source": "discharge_instructions",
    "confidence": 0.95,
    "originalText": "Original text snippet",
    "pageNumber": "1"
  }
}\`\`\`

The time of the procedure is: ${procTime}
Here is the PDF text:
\`\`\`${pdfText.substring(0, 8000)}\`\`\`
Do not modify any of the message text.
Only process the text above, and give a clean JSON result with "tasks" and "medications" arrays.`;
}

// Call Claude API
async function callClaude(prompt: string): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Anthropic API Key');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 8000,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Extract JSON from Claude response
function extractJsonFromClaude(claudeResponseText: string): any {
  let text = claudeResponseText.trim();
  
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }
  
  return JSON.parse(text);
}

// Main API handler
export async function POST(request: NextRequest) {
  console.log('Received PDF upload request to Vercel function');
  
  try {
    const data = await request.json();
    
    // Step 1: Unpack incoming data
    const metadata = data.uploadMetadata;
    const fileData = data.fileData;
    const uploadId = metadata.uploadId;
    
    console.log(`Processing upload ${uploadId} for file ${metadata.fileName}`);
    
    // Step 2: Decode base64 PDF
    const base64Content = fileData.base64Content;
    const pdfBuffer = Buffer.from(base64Content, 'base64');
    
    // Step 3: Extract PDF text
    const pdfText = await extractPdfText(pdfBuffer);
    console.log(`Extracted ${pdfText.length} characters from PDF`);
    
    // Step 4: Generate prompt for Claude
    const prompt = buildPrompt(pdfText);
    
    // Step 5: Call Claude API
    const claudeResponse = await callClaude(prompt);
    
    // Step 6: Parse Claude response
    const rawText = claudeResponse.content[0].text;
    const parsedData = extractJsonFromClaude(rawText);
    
    console.log(`Successfully processed PDF, extracted ${parsedData.tasks?.length || 0} tasks`);
    
    // Step 7: Return structured response
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