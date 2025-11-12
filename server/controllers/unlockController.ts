import { Request, Response } from 'express';
import pool from '../config/db.js';

export const createUnlockRequest = async (req: Request, res: Response) => {
  try {
    const { roomId, reason } = req.body;
    const userId = req.user!.id;

    if (!roomId || !reason) {
      return res.status(400).json({ error: 'Room ID and reason required' });
    }

    const result = await pool.query(
      `INSERT INTO unlock_requests (room_id, requested_by, reason, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [roomId, userId, reason]
    );

    // Get room number
    const roomResult = await pool.query('SELECT room_number FROM rooms WHERE id = $1', [roomId]);

    res.status(201).json({
      message: 'Unlock request created',
      request: {
        id: result.rows[0].id.toString(),
        roomNumber: roomResult.rows[0].room_number,
        requestedBy: req.user!.username,
        requestTime: result.rows[0].requested_at,
        reason: result.rows[0].reason,
        status: result.rows[0].status,
      },
    });
  } catch (error) {
    console.error('Create unlock request error:', error);
    res.status(500).json({ error: 'Failed to create unlock request' });
  }
};

export const getUnlockRequests = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        ur.id,
        ur.status,
        ur.reason,
        ur.requested_at,
        ur.resolved_at,
        r.room_number,
        u.username as requested_by
      FROM unlock_requests ur
      JOIN rooms r ON ur.room_id = r.id
      JOIN users u ON ur.requested_by = u.id
      ORDER BY ur.requested_at DESC
      LIMIT 50
    `);

    const requests = result.rows.map(req => ({
      id: req.id.toString(),
      roomNumber: req.room_number,
      requestedBy: req.requested_by,
      requestTime: req.requested_at,
      reason: req.reason,
      status: req.status,
    }));

    res.json(requests);
  } catch (error) {
    console.error('Get unlock requests error:', error);
    res.status(500).json({ error: 'Failed to fetch unlock requests' });
  }
};

export const approveUnlockRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const managerId = req.user!.id;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update request status
      const requestResult = await client.query(
        `UPDATE unlock_requests 
         SET status = 'approved', approved_by = $1, resolved_at = NOW()
         WHERE id = $2 AND status = 'pending'
         RETURNING room_id`,
        [managerId, id]
      );

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Request not found or already processed' });
      }

      const roomId = requestResult.rows[0].room_id;

      // Unlock the room
      await client.query(
        `UPDATE rooms 
         SET status = 'available', customer_rfid = NULL, entry_time = NULL
         WHERE id = $1`,
        [roomId]
      );

      // Clear room products
      await client.query('DELETE FROM room_products WHERE room_id = $1', [roomId]);

      await client.query('COMMIT');

      res.json({ message: 'Unlock request approved and room unlocked' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Approve unlock error:', error);
    res.status(500).json({ error: 'Failed to approve unlock request' });
  }
};

export const rejectUnlockRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const managerId = req.user!.id;

    const result = await pool.query(
      `UPDATE unlock_requests 
       SET status = 'rejected', approved_by = $1, resolved_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [managerId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    res.json({ message: 'Unlock request rejected' });
  } catch (error) {
    console.error('Reject unlock error:', error);
    res.status(500).json({ error: 'Failed to reject unlock request' });
  }
};

// Direct unlock for managers (no request needed)
export const directUnlockRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;
    const managerId = req.user!.id;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID required' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if room exists
      const roomResult = await client.query(
        'SELECT id, room_number, status FROM rooms WHERE id = $1',
        [roomId]
      );

      if (roomResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Room not found' });
      }

      const room = roomResult.rows[0];

      // Unlock the room
      await client.query(
        `UPDATE rooms 
         SET status = 'available', customer_rfid = NULL, entry_time = NULL, updated_at = NOW()
         WHERE id = $1`,
        [roomId]
      );

      // Clear room products
      await client.query('DELETE FROM room_products WHERE room_id = $1', [roomId]);

      // Reject any pending unlock requests for this room (they're no longer needed)
      await client.query(
        `UPDATE unlock_requests 
         SET status = 'rejected', approved_by = $1, resolved_at = NOW()
         WHERE room_id = $2 AND status = 'pending'`,
        [managerId, roomId]
      );

      await client.query('COMMIT');

      res.json({ 
        message: 'Room unlocked successfully',
        room: {
          id: room.id.toString(),
          number: room.room_number,
          status: 'available'
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Direct unlock error:', error);
    res.status(500).json({ error: 'Failed to unlock room' });
  }
};
