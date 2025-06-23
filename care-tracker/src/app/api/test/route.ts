import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Test API route working' });
}

export async function POST() {
  return NextResponse.json({ message: 'Test POST working' });
}