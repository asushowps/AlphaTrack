import type { Request, Response } from 'express';

// Fallback serverless handler for Vercel
export default async function handler(req: Request, res: Response) {
  const url = req.url || '';

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health / test
  res.status(200).json({ status: 'ok', service: 'alphatrack-api', time: new Date().toISOString() });
}
