import { Request, Response } from 'express';
import pool from '../config/db.js';

export const getAllAlerts = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id,
        a.alert_type as type,
        a.severity,
        a.message,
        a.resolved,
        a.created_at as timestamp,
        r.room_number
      FROM alerts a
      JOIN rooms r ON a.room_id = r.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    const alerts = result.rows.map(alert => ({
      id: alert.id.toString(),
      type: alert.type,
      severity: alert.severity,
      roomNumber: alert.room_number,
      message: alert.message,
      timestamp: alert.timestamp,
      resolved: alert.resolved,
    }));

    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First, get the alert and its associated room
    const alertResult = await pool.query(
      `SELECT a.id, a.room_id, r.room_number, r.status as room_status
       FROM alerts a
       JOIN rooms r ON a.room_id = r.id
       WHERE a.id = $1 AND a.resolved = false`,
      [id]
    );

    if (alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found or already resolved' });
    }

    const alert = alertResult.rows[0];
    const roomId = alert.room_id;

    // Check if room still has issues that haven't been addressed
    // 1. Check if room status is still 'alert'
    if (alert.room_status === 'alert') {
      // 2. Check if there are unscanned items
      const unscannedItems = await pool.query(
        `SELECT p.sku, p.name
         FROM room_products rp
         JOIN products p ON rp.product_id = p.id
         WHERE rp.room_id = $1 
           AND rp.scanned_in_at IS NOT NULL 
           AND rp.scanned_out_at IS NULL`,
        [roomId]
      );

      if (unscannedItems.rows.length > 0) {
        const missingItems = unscannedItems.rows.map((item: any) => `${item.sku} - ${item.name}`).join(', ');
        return res.status(400).json({ 
          error: 'Room issue has not been addressed',
          message: `Room ${alert.room_number} still has ${unscannedItems.rows.length} unscanned item(s): ${missingItems}. Please resolve the room issues before resolving this alert.`,
          roomStatus: alert.room_status,
          unscannedItems: unscannedItems.rows
        });
      }

      // If room is in alert status but no unscanned items, still prevent resolution
      // as the room status indicates an issue exists
      return res.status(400).json({ 
        error: 'Room issue has not been addressed',
        message: `Room ${alert.room_number} is still in alert status. Please fix the room status before resolving this alert.`,
        roomStatus: alert.room_status
      });
    }

    // Room is fixed, allow alert resolution
    const result = await pool.query(
      `UPDATE alerts 
       SET resolved = true, resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({ message: 'Alert resolved successfully' });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
};

export const createAlert = async (req: Request, res: Response) => {
  try {
    const { roomId, type, severity, message } = req.body;

    if (!roomId || !type || !severity || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO alerts (room_id, alert_type, severity, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [roomId, type, severity, message]
    );

    res.status(201).json({
      message: 'Alert created',
      alert: result.rows[0],
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
};
