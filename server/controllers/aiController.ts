import { Request, Response } from 'express';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function forwardJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${AI_SERVICE_URL}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const errMsg = (data as any)?.detail || (data as any)?.error || 'Upstream AI error';
    throw new Error(`${resp.status} ${errMsg}`);
  }
  return data as T;
}

export const aiHealth = async (_req: Request, res: Response) => {
  try {
    const data = await forwardJson<{ message: string }>(`/`);
    res.json({ ok: true, upstream: data });
  } catch (error: any) {
    res.status(502).json({ error: 'AI service unavailable', detail: error.message });
  }
};

export const assignRoom = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const data = await forwardJson(`/assign_room`, {
      method: 'POST',
      body: JSON.stringify({ item_ids: body.item_ids || [] }),
    });
    res.json(data);
  } catch (error: any) {
    res.status(502).json({ error: 'Failed to assign room', detail: error.message });
  }
};

export const roomsStatus = async (_req: Request, res: Response) => {
  try {
    const data = await forwardJson(`/rooms/status`);
    res.json(data);
  } catch (error: any) {
    res.status(502).json({ error: 'Failed to fetch room status', detail: error.message });
  }
};

export const predictDuration = async (req: Request, res: Response) => {
  try {
    const { item_ids, entry_time } = req.body || {};
    const payload = {
      item_ids: item_ids || [],
      entry_time: entry_time || new Date().toISOString(),
    };
    const data = await forwardJson(`/predict_duration`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    res.json(data);
  } catch (error: any) {
    res.status(502).json({ error: 'Failed to predict duration', detail: error.message });
  }
};

export const detectAnomaly = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const data = await forwardJson(`/detect_anomaly`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    res.json(data);
  } catch (error: any) {
    res.status(502).json({ error: 'Failed to detect anomaly', detail: error.message });
  }
};


