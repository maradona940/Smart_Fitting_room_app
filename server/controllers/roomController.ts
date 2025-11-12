import { Request, Response } from 'express';
import pool from '../config/db.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function aiForwardJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${AI_SERVICE_URL}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const errMsg = (data as any)?.detail || (data as any)?.error || 'AI error';
    throw new Error(`${resp.status} ${errMsg}`);
  }
  return data as T;
}

export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.room_number,
        r.status,
        r.customer_rfid,
        r.entry_time,
        COUNT(rp.id) as item_count,
        CASE 
          WHEN r.entry_time IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - r.entry_time))/60 
          ELSE 0 
        END as duration_minutes
      FROM rooms r
      LEFT JOIN room_products rp ON r.id = rp.room_id AND rp.scanned_out_at IS NULL
      GROUP BY r.id, r.room_number, r.status, r.customer_rfid, r.entry_time
      ORDER BY r.room_number
    `);

    // Get pending unlock requests to check which rooms have unlock requests
    const unlockRequestsResult = await pool.query(`
      SELECT room_id 
      FROM unlock_requests 
      WHERE status = 'pending'
    `);
    
    // Create a set of room IDs that have pending unlock requests
    // Convert to string for consistent comparison
    const roomsWithRequests = new Set(
      unlockRequestsResult.rows.map((req: any) => String(req.room_id))
    );

    const rooms = result.rows.map(room => ({
      id: room.id.toString(),
      number: room.room_number,
      status: room.status,
      itemCount: parseInt(room.item_count) || 0,
      duration: room.entry_time ? Math.round(room.duration_minutes) : 0,
      customerCard: room.customer_rfid,
      entryTime: room.entry_time || undefined,
      alert: room.status === 'alert' ? 'Item count mismatch detected' : undefined,
      unlockRequested: roomsWithRequests.has(room.id.toString()),
    }));

    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

export const getRoomDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First get the room details
    const roomResult = await pool.query(`
      SELECT 
        r.id,
        r.room_number,
        r.status,
        r.customer_rfid,
        r.entry_time,
        COUNT(rp.id) as item_count,
        CASE 
          WHEN r.entry_time IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - r.entry_time))/60 
          ELSE 0 
        END as duration_minutes
      FROM rooms r
      LEFT JOIN room_products rp ON r.id = rp.room_id AND rp.scanned_out_at IS NULL
      WHERE r.id = $1
      GROUP BY r.id, r.room_number, r.status, r.customer_rfid, r.entry_time
    `, [id]);

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomResult.rows[0];

    // Get products in this room
    const productsResult = await pool.query(`
      SELECT 
        p.id,
        p.sku as code,
        p.name,
        p.size,
        p.color,
        rp.scanned_in_at IS NOT NULL as scanned_in,
        rp.scanned_out_at IS NOT NULL as scanned_out,
        rp.is_missing
      FROM room_products rp
      JOIN products p ON rp.product_id = p.id
      WHERE rp.room_id = $1
      ORDER BY rp.scanned_in_at DESC NULLS LAST
    `, [id]);

    const details: any = {
      id: room.id.toString(),
      number: room.room_number,
      status: room.status,
      itemCount: parseInt(room.item_count) || 0,
      duration: room.entry_time ? Math.round(parseFloat(room.duration_minutes)) : 0,
      customerCard: room.customer_rfid || undefined,
      entryTime: room.entry_time || undefined,
      products: productsResult.rows.map(p => ({
        id: p.id.toString(),
        code: p.code,
        name: p.name,
        size: p.size,
        color: p.color,
        scannedIn: p.scanned_in || false,
        scannedOut: p.scanned_out || false,
        isMissing: p.is_missing || false,
      })),
    };

    // Try to get predicted duration from sessions table if room has customer and entry time
    // Note: sessions table uses session_id, but rooms table doesn't have session_id column
    // So we'll try to find session by room_id and customer_rfid
    try {
      if (room.customer_rfid && room.entry_time) {
        const sessionResult = await pool.query(
          `SELECT predicted_duration_minutes 
           FROM sessions 
           WHERE room_id = $1 
             AND customer_rfid = $2 
             AND entry_time >= $3 - INTERVAL '1 minute'
             AND entry_time <= $3 + INTERVAL '1 minute'
           ORDER BY entry_time DESC
           LIMIT 1`,
          [id, room.customer_rfid, room.entry_time]
        );
        
        if (sessionResult.rows.length > 0 && sessionResult.rows[0].predicted_duration_minutes !== null) {
          details.ai = {
            predictedDurationMinutes: parseFloat(sessionResult.rows[0].predicted_duration_minutes),
          };
        }
      }
      
      // Fallback: if no session or session doesn't have prediction, try to predict for occupied rooms
      if (!details.ai && details.status === 'occupied' && details.entryTime) {
        const itemIds = (details.products as any[])
          .filter(p => p.scannedIn && !p.scannedOut)
          .map(p => p.code as string);
        
        if (itemIds.length > 0) {
          const aiResp = await aiForwardJson<{ predicted_duration_minutes: number }>(
            '/predict_duration',
            {
              method: 'POST',
              body: JSON.stringify({ item_ids: itemIds, entry_time: details.entryTime }),
            }
          );
          details.ai = {
            predictedDurationMinutes: aiResp.predicted_duration_minutes,
          };
        }
      }
    } catch (e) {
      // Non-fatal: if AI fails, we return the base details
      console.error('Error fetching predicted duration:', e);
    }

    res.json(details);
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ error: 'Failed to fetch room details' });
  }
};

export const updateRoomStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['available', 'occupied', 'alert'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Fetch previous state to detect transitions
    const prevResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
    const prev = prevResult.rows[0];

    // CRITICAL: Prevent customer from leaving if items are not scanned out
    // When trying to change from occupied to available, check for unscanned items
    if (prev && prev.status === 'occupied' && status === 'available') {
      // Check if all items in room have been scanned out
      const unscannedItems = await pool.query(
        `SELECT p.sku, p.name, rp.scanned_in_at IS NOT NULL as scanned_in, rp.scanned_out_at IS NOT NULL as scanned_out
         FROM room_products rp
         JOIN products p ON rp.product_id = p.id
         WHERE rp.room_id = $1 
           AND rp.scanned_in_at IS NOT NULL 
           AND rp.scanned_out_at IS NULL`,
        [id]
      );

      if (unscannedItems.rows.length > 0) {
        // Items are missing - prevent exit and lock the room
        const missingItems = unscannedItems.rows.map((item: any) => `${item.sku} - ${item.name}`).join(', ');
        const missingCount = unscannedItems.rows.length;
        
        // Force status to 'alert' instead of 'available'
        const result = await pool.query(
          `UPDATE rooms SET status = 'alert', updated_at = NOW() WHERE id = $1 RETURNING *`,
          [id]
        );

        const updated = result.rows[0];

        // Create alert explaining the door is locked
        await pool.query(
          `INSERT INTO alerts (room_id, alert_type, severity, message)
           VALUES ($1, $2, $3, $4)`,
          [
            id,
            'missing-item',
            'high',
            `Room ${updated.room_number} locked: Customer cannot exit - ${missingCount} item(s) not scanned out (${missingItems}). System preventing exit until all items are scanned. Staff intervention required.`
          ]
        );

        return res.status(403).json({ 
          error: 'Cannot exit room: Items not scanned out',
          message: `${missingCount} item(s) must be scanned out before customer can exit`,
          missingItems: unscannedItems.rows.map((item: any) => ({ sku: item.sku, name: item.name })),
          room: updated
        });
      }
    }

    const result = await pool.query(
      'UPDATE rooms SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const updated = result.rows[0];
    res.json({ message: 'Room status updated', room: updated });

    // Fire-and-forget anomaly detection when a session ends (occupied -> available)
    // Only runs if status change was successful (all items scanned out)
    if (prev && prev.status === 'occupied' && status === 'available') {
      (async () => {
        try {
          // Load products snapshot
          const productsResult = await pool.query(
            `SELECT p.sku as code, rp.scanned_in_at IS NOT NULL as scanned_in, rp.scanned_out_at IS NOT NULL as scanned_out
             FROM room_products rp
             JOIN products p ON rp.product_id = p.id
             WHERE rp.room_id = $1`,
            [id]
          );

          const entryTime: string = prev.entry_time ?? new Date().toISOString();
          const now = new Date();
          const actualMinutes = Math.max(0, (now.getTime() - new Date(entryTime).getTime()) / 60000);
          const entryScans: string[] = productsResult.rows.filter((r: any) => r.scanned_in).map((r: any) => r.code);
          const exitScans: string[] = productsResult.rows.filter((r: any) => r.scanned_out).map((r: any) => r.code);
          const itemIds: string[] = entryScans;

          // Try to find session by room_id and customer_rfid
          let sessionId: string | null = null;
          if (prev.customer_rfid) {
            const sessionLookup = await pool.query(
              `SELECT session_id FROM sessions 
               WHERE room_id = $1 
                 AND customer_rfid = $2 
                 AND status IN ('active', 'completed')
               ORDER BY entry_time DESC
               LIMIT 1`,
              [id, prev.customer_rfid]
            );
            if (sessionLookup.rows.length > 0) {
              sessionId = sessionLookup.rows[0].session_id;
            }
          }
          
          // If no session found, generate one
          if (!sessionId) {
            sessionId = crypto.randomUUID?.() || `${Date.now()}-${id}`;
          }

          // Get predicted duration from session if available, otherwise predict
          let predictedDuration: number;
          if (sessionId && sessionId !== `${Date.now()}-${id}`) {
            const sessionResult = await pool.query(
              'SELECT predicted_duration_minutes FROM sessions WHERE session_id = $1',
              [sessionId]
            );
            if (sessionResult.rows.length > 0 && sessionResult.rows[0].predicted_duration_minutes) {
              predictedDuration = parseFloat(sessionResult.rows[0].predicted_duration_minutes);
            } else {
              // Fallback to prediction if session not found
              const pred = await aiForwardJson<{ predicted_duration_minutes: number }>(
                '/predict_duration',
                {
                  method: 'POST',
                  body: JSON.stringify({ item_ids: itemIds, entry_time: entryTime }),
                }
              );
              predictedDuration = pred.predicted_duration_minutes;
            }
          } else {
            // Predict duration if no session
            const pred = await aiForwardJson<{ predicted_duration_minutes: number }>(
              '/predict_duration',
              {
                method: 'POST',
                body: JSON.stringify({ item_ids: itemIds, entry_time: entryTime }),
              }
            );
            predictedDuration = pred.predicted_duration_minutes;
          }

          // Detect anomaly
          const detect = await aiForwardJson<{ is_anomaly: boolean; anomaly_score: number; risk_level: string; session_id?: string }>(
            '/detect_anomaly',
            {
              method: 'POST',
              body: JSON.stringify({
                session_id: sessionId,
                room_id: String(id),
                actual_duration: actualMinutes,
                predicted_duration: predictedDuration,
                entry_scans: entryScans,
                exit_scans: exitScans,
                entry_time: entryTime,
              }),
            }
          );

          // Update session with anomaly results if session exists in database
          if (sessionId && sessionId !== `${Date.now()}-${id}`) {
            await pool.query(
              `UPDATE sessions 
               SET exit_time = $1, 
                   duration_minutes = $2,
                   is_anomaly = $3,
                   anomaly_score = $4,
                   risk_level = $5,
                   status = 'completed',
                   updated_at = NOW()
               WHERE session_id = $6`,
              [now, actualMinutes, detect.is_anomaly, detect.anomaly_score, detect.risk_level, sessionId]
            );
          }

          if (detect.is_anomaly) {
            // Mark room as alert and create alert record
            // Note: Room is already locked if items are missing (handled above)
            // This is for other types of anomalies (duration, behavior patterns)
            await pool.query('UPDATE rooms SET status = $1, updated_at = NOW() WHERE id = $2', ['alert', id]);
            
            // Check if there are missing items to provide better alert message
            const missingItems = entryScans.filter(sku => !exitScans.includes(sku));
            let alertMessage = `AI flagged anomaly (score=${detect.anomaly_score.toFixed(2)}) for room ${updated.room_number}`;
            
            if (missingItems.length > 0) {
              alertMessage = `Room ${updated.room_number} locked: Customer cannot exit - ${missingItems.length} item(s) not scanned out. System preventing exit until all items are scanned. Staff intervention required.`;
            }
            
            await pool.query(
              `INSERT INTO alerts (room_id, alert_type, severity, message)
               VALUES ($1, $2, $3, $4)`,
              [
                id,
                missingItems.length > 0 ? 'missing-item' : 'anomaly',
                detect.risk_level?.toLowerCase() === 'high' ? 'high' : detect.risk_level?.toLowerCase() || 'medium',
                alertMessage,
              ]
            );
          }
        } catch (e) {
          // Swallow errors to avoid impacting the main request
          console.error('Post-status AI analysis failed:', e);
        }
      })();
    }
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
};

// Assign customer to room with products (new unified endpoint)
export const assignRoomWithProducts = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const { customerCardId, productIds } = req.body;

    if (!customerCardId) {
      return res.status(400).json({ error: 'Customer card ID required' });
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Product IDs array required' });
    }

    await client.query('BEGIN');

    // 1. Use AI to assign room and predict duration
    let aiAssignment;
    let predictedDuration: number;
    
    try {
      // Call AI service to assign room and predict duration
      const aiResponse = await aiForwardJson<{
        assigned_room_id: string;
        session_id: string;
        predicted_duration_minutes: number;
        status: string;
        message: string;
      }>('/assign_room', {
        method: 'POST',
        body: JSON.stringify({ item_ids: productIds }),
      });

      aiAssignment = aiResponse;
      predictedDuration = aiResponse.predicted_duration_minutes;

      // Extract room number from assigned_room_id (format: "room_1", "room 1", "1", etc. -> 1)
      let assignedRoomNumber: number;
      const roomIdStr = aiResponse.assigned_room_id;
      const roomNumberMatch = roomIdStr.match(/room[_\s]?(\d+)/i);
      if (roomNumberMatch) {
        assignedRoomNumber = parseInt(roomNumberMatch[1]);
      } else {
        // Try to parse as direct number
        const directNumber = parseInt(roomIdStr);
        if (isNaN(directNumber)) {
          throw new Error(`Invalid room ID format: ${roomIdStr}`);
        }
        assignedRoomNumber = directNumber;
      }

      // Get room ID from room number
      const roomResult = await client.query(
        'SELECT id FROM rooms WHERE room_number = $1',
        [assignedRoomNumber]
      );

      if (roomResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Room ${assignedRoomNumber} not found` });
      }

      const roomId = roomResult.rows[0].id;

      // Check if room is available
      const roomStatusResult = await client.query(
        'SELECT status FROM rooms WHERE id = $1',
        [roomId]
      );

      if (roomStatusResult.rows[0].status !== 'available') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Room is not available',
          message: `Room ${assignedRoomNumber} is currently ${roomStatusResult.rows[0].status}`
        });
      }

      const sessionId = aiResponse.session_id;
      const entryTime = new Date();

      // 2. Create session in database
      await client.query(
        `INSERT INTO sessions (session_id, room_id, customer_rfid, entry_time, predicted_duration_minutes, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         ON CONFLICT (session_id) DO UPDATE SET
           room_id = EXCLUDED.room_id,
           customer_rfid = EXCLUDED.customer_rfid,
           entry_time = EXCLUDED.entry_time,
           predicted_duration_minutes = EXCLUDED.predicted_duration_minutes,
           status = 'active',
           updated_at = NOW()`,
        [sessionId, roomId, customerCardId, entryTime, predictedDuration]
      );

      // 3. Update room with customer and entry time
      // Note: session_id is not stored in rooms table, it's in sessions table
      await client.query(
        `UPDATE rooms 
         SET status = 'occupied', 
             customer_rfid = $1, 
             entry_time = $2, 
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [customerCardId, entryTime, roomId]
      );

      // 4. Add products to room_products with scanned_in_at set
      for (const productSku of productIds) {
        // Get product ID by SKU
        const productResult = await client.query(
          'SELECT id FROM products WHERE sku = $1',
          [productSku]
        );

        if (productResult.rows.length === 0) {
          console.warn(`Product with SKU ${productSku} not found, skipping`);
          continue;
        }

        const productId = productResult.rows[0].id;

        // Insert or update room_products
        // Check if record exists first
        const existingCheck = await client.query(
          `SELECT id FROM room_products 
           WHERE room_id = $1 AND product_id = $2 AND session_id = $3`,
          [roomId, productId, sessionId]
        );

        if (existingCheck.rows.length > 0) {
          // Update existing record
          await client.query(
            `UPDATE room_products 
             SET scanned_in_at = $1, in_entry_scan = TRUE, in_exit_scan = FALSE
             WHERE room_id = $2 AND product_id = $3 AND session_id = $4`,
            [entryTime, roomId, productId, sessionId]
          );
        } else {
          // Insert new record
          await client.query(
            `INSERT INTO room_products (room_id, product_id, session_id, scanned_in_at, in_entry_scan, in_exit_scan)
             VALUES ($1, $2, $3, $4, TRUE, FALSE)`,
            [roomId, productId, sessionId, entryTime]
          );
        }
      }

      await client.query('COMMIT');

      // Get updated room details
      const updatedRoomResult = await client.query(
        `SELECT r.id, r.room_number, r.status, r.customer_rfid, r.entry_time, r.session_id
         FROM rooms r WHERE r.id = $1`,
        [roomId]
      );

      res.status(201).json({
        message: `Customer assigned to Room ${assignedRoomNumber}`,
        room: {
          id: updatedRoomResult.rows[0].id.toString(),
          number: updatedRoomResult.rows[0].room_number,
          status: updatedRoomResult.rows[0].status,
          customerCard: updatedRoomResult.rows[0].customer_rfid,
          entryTime: updatedRoomResult.rows[0].entry_time,
        },
        session: {
          sessionId,
          predictedDurationMinutes: predictedDuration,
        },
        ai: {
          assignedRoomId: aiResponse.assigned_room_id,
          predictedDurationMinutes: predictedDuration,
          status: aiResponse.status,
          message: aiResponse.message,
        }
      });
    } catch (aiError: any) {
      await client.query('ROLLBACK');
      console.error('AI assignment error:', aiError);
      return res.status(502).json({ 
        error: 'Failed to assign room via AI service',
        detail: aiError.message 
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assign room with products error:', error);
    res.status(500).json({ error: 'Failed to assign room with products' });
  } finally {
    client.release();
  }
};

// Assign customer to room (entry) - kept for backward compatibility
export const assignCustomerToRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerRfid } = req.body;

    if (!customerRfid) {
      return res.status(400).json({ error: 'Customer RFID required' });
    }

    // Check if room is available
    const roomCheck = await pool.query('SELECT status FROM rooms WHERE id = $1', [id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (roomCheck.rows[0].status !== 'available') {
      return res.status(400).json({ error: 'Room is not available' });
    }

    // Update room with customer and entry time
    const result = await pool.query(
      `UPDATE rooms 
       SET status = 'occupied', customer_rfid = $1, entry_time = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [customerRfid, id]
    );

    res.json({ message: 'Customer assigned to room', room: result.rows[0] });
  } catch (error) {
    console.error('Assign customer error:', error);
    res.status(500).json({ error: 'Failed to assign customer to room' });
  }
};

// Scan product in
export const scanProductIn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // room id
    const { productSku } = req.body;

    if (!productSku) {
      return res.status(400).json({ error: 'Product SKU required' });
    }

    // Get product by SKU
    const productResult = await pool.query('SELECT id FROM products WHERE sku = $1', [productSku]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productId = productResult.rows[0].id;

    // Check if room exists
    const roomCheck = await pool.query('SELECT id FROM rooms WHERE id = $1', [id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if product is already in room (not scanned out)
    const existingResult = await pool.query(
      `SELECT id FROM room_products 
       WHERE room_id = $1 AND product_id = $2 AND scanned_out_at IS NULL`,
      [id, productId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Product already scanned in' });
    }

    // Insert or update room_products
    // First try to update existing record
    const updateResult = await pool.query(
      `UPDATE room_products 
       SET scanned_in_at = NOW(), scanned_out_at = NULL, is_missing = FALSE, in_entry_scan = TRUE, in_exit_scan = FALSE
       WHERE room_id = $1 AND product_id = $2
       RETURNING *`,
      [id, productId]
    );

    // If no existing record, insert new one
    if (updateResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO room_products (room_id, product_id, scanned_in_at, in_entry_scan, in_exit_scan)
         VALUES ($1, $2, NOW(), TRUE, FALSE)`,
        [id, productId]
      );
    }

    // Get product details
    const productDetails = await pool.query(
      `SELECT p.id, p.sku, p.name, p.size, p.color 
       FROM products p WHERE p.id = $1`,
      [productId]
    );

    // AI: Predict duration when items are scanned in (fire-and-forget)
    (async () => {
      try {
        // Get all scanned-in items for this room
        const itemsResult = await pool.query(
          `SELECT p.sku as code
           FROM room_products rp
           JOIN products p ON rp.product_id = p.id
           WHERE rp.room_id = $1 AND rp.scanned_in_at IS NOT NULL`,
          [id]
        );

        const itemIds = itemsResult.rows.map((r: any) => r.code);
        
        // Get entry time
        const roomResult = await pool.query(
          'SELECT entry_time FROM rooms WHERE id = $1',
          [id]
        );
        
        if (itemIds.length > 0 && roomResult.rows[0]?.entry_time) {
          const entryTime = roomResult.rows[0].entry_time;
          
          // Predict duration
          const pred = await aiForwardJson<{ predicted_duration_minutes: number }>(
            '/predict_duration',
            {
              method: 'POST',
              body: JSON.stringify({ item_ids: itemIds, entry_time: entryTime }),
            }
          );

          // Store prediction in sessions table or update room with predicted duration
          // For now, we'll just log it - the prediction will be shown in room details
          console.log(`[AI] Predicted duration for room ${id}: ${pred.predicted_duration_minutes} minutes`);
        }
      } catch (e) {
        // Non-fatal: if AI fails, continue normally
        console.error('AI duration prediction failed during scan-in:', e);
      }
    })();

    res.json({ 
      message: 'Product scanned in', 
      product: productDetails.rows[0] 
    });
  } catch (error) {
    console.error('Scan product in error:', error);
    res.status(500).json({ error: 'Failed to scan product in' });
  }
};

// Scan product out
export const scanProductOut = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // room id
    const { productSku, customerCardId } = req.body;

    if (!productSku) {
      return res.status(400).json({ error: 'Product SKU required' });
    }

    // Get room information including assigned customer
    const roomResult = await pool.query(
      'SELECT customer_rfid, entry_time, status FROM rooms WHERE id = $1',
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomResult.rows[0];

    // SECURITY: Verify customer card ID matches the room's assigned customer
    if (customerCardId) {
      if (!room.customer_rfid) {
        return res.status(400).json({ 
          error: 'No customer assigned to this room',
          message: 'Room must have an assigned customer before scanning out items'
        });
      }

      if (room.customer_rfid !== customerCardId) {
        return res.status(403).json({ 
          error: 'Customer card ID mismatch',
          message: 'The customer card ID does not match the customer assigned to this room. Only the assigned customer can scan out items.',
          expectedCardId: room.customer_rfid,
          providedCardId: customerCardId
        });
      }
    } else if (room.customer_rfid) {
      // If customer is assigned but no card ID provided, warn but allow (for backward compatibility)
      console.warn(`[Security] Scan-out for room ${id} without customer card ID verification. Room has assigned customer: ${room.customer_rfid}`);
    }

    // Get product by SKU
    const productResult = await pool.query('SELECT id FROM products WHERE sku = $1', [productSku]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productId = productResult.rows[0].id;

    // Check if product is in room and scanned in
    // Get the session_id from room_products if it exists, otherwise match by room and customer
    const roomProductResult = await pool.query(
      `SELECT rp.id, rp.session_id
       FROM room_products rp
       WHERE rp.room_id = $1 
         AND rp.product_id = $2 
         AND rp.scanned_in_at IS NOT NULL 
         AND rp.scanned_out_at IS NULL
       LIMIT 1`,
      [id, productId]
    );

    if (roomProductResult.rows.length === 0) {
      // Check if product exists but already scanned out
      const allProductsCheck = await pool.query(
        `SELECT rp.scanned_out_at, p.sku, p.name
         FROM room_products rp
         JOIN products p ON rp.product_id = p.id
         WHERE rp.room_id = $1 AND rp.product_id = $2`,
        [id, productId]
      );

      if (allProductsCheck.rows.length > 0) {
        const product = allProductsCheck.rows[0];
        if (product.scanned_out_at) {
          return res.status(400).json({ error: 'Product already scanned out' });
        }
      }

      return res.status(400).json({ error: 'Product not found in room or already scanned out' });
    }
    
    // Get session_id from the room_product if available
    const sessionIdFromProduct = roomProductResult.rows[0].session_id;

    // Update scanned_out_at
    await pool.query(
      `UPDATE room_products 
       SET scanned_out_at = NOW(), is_missing = FALSE, in_exit_scan = TRUE
       WHERE room_id = $1 AND product_id = $2`,
      [id, productId]
    );

    // Get product details
    const productDetails = await pool.query(
      `SELECT p.id, p.sku, p.name, p.size, p.color 
       FROM products p WHERE p.id = $1`,
      [productId]
    );

    // Room info already retrieved above

    // REAL-TIME CHECK: After scanning out, check if any items are still missing
    // This provides immediate feedback if customer tries to leave with missing items
    const unscannedItems = await pool.query(
      `SELECT p.sku, p.name
       FROM room_products rp
       JOIN products p ON rp.product_id = p.id
       WHERE rp.room_id = $1 
         AND rp.scanned_in_at IS NOT NULL 
         AND rp.scanned_out_at IS NULL`,
      [id]
    );

    // If items are still missing, ensure room is in alert status
    if (unscannedItems.rows.length > 0) {
      if (room.status !== 'alert') {
        await pool.query('UPDATE rooms SET status = $1, updated_at = NOW() WHERE id = $2', ['alert', id]);
        
        // Create or update alert (check if alert already exists)
        const existingAlert = await pool.query(
          `SELECT id FROM alerts WHERE room_id = $1 AND alert_type = 'missing-item' AND resolved = FALSE`,
          [id]
        );
        
        const missingItems = unscannedItems.rows.map((item: any) => `${item.sku} - ${item.name}`).join(', ');
        
        if (existingAlert.rows.length === 0) {
          // Create new alert
          await pool.query(
            `INSERT INTO alerts (room_id, alert_type, severity, message)
             VALUES ($1, $2, $3, $4)`,
            [
              id,
              'missing-item',
              'high',
              `Room locked: Customer cannot exit - ${unscannedItems.rows.length} item(s) not scanned out (${missingItems}). System preventing exit until all items are scanned.`
            ]
          );
        } else {
          // Update existing alert
          await pool.query(
            `UPDATE alerts SET message = $1, updated_at = NOW() WHERE room_id = $2 AND alert_type = 'missing-item' AND resolved = FALSE`,
            [
              `Room locked: Customer cannot exit - ${unscannedItems.rows.length} item(s) not scanned out (${missingItems}). System preventing exit until all items are scanned.`,
              id
            ]
          );
        }
      }

      return res.json({ 
        message: 'Product scanned out', 
        product: productDetails.rows[0],
        itemsRemaining: unscannedItems.rows.length,
        canExit: false,
        roomAvailable: false
      });
    }

    // All items scanned out - run anomaly detection and set room to available if no anomalies
    if (unscannedItems.rows.length === 0 && room.status === 'occupied') {
      // Get all products for anomaly detection
      const productsResult = await pool.query(
        `SELECT p.sku as code, rp.scanned_in_at IS NOT NULL as scanned_in, rp.scanned_out_at IS NOT NULL as scanned_out
         FROM room_products rp
         JOIN products p ON rp.product_id = p.id
         WHERE rp.room_id = $1`,
        [id]
      );

      const entryTime = room.entry_time || new Date().toISOString();
      const now = new Date();
      const actualMinutes = Math.max(0, (now.getTime() - new Date(entryTime).getTime()) / 60000);
      const entryScans: string[] = productsResult.rows.filter((r: any) => r.scanned_in).map((r: any) => r.code);
      const exitScans: string[] = productsResult.rows.filter((r: any) => r.scanned_out).map((r: any) => r.code);
      const itemIds: string[] = entryScans;

      // Try to find session by room_id and customer_rfid, or use session_id from product if available
      let sessionId: string | null = sessionIdFromProduct || null;
      
      // If no session_id from product, try to find session by room_id and customer
      if (!sessionId && room.customer_rfid) {
        const sessionLookup = await pool.query(
          `SELECT session_id FROM sessions 
           WHERE room_id = $1 
             AND customer_rfid = $2 
             AND status = 'active'
           ORDER BY entry_time DESC
           LIMIT 1`,
          [id, room.customer_rfid]
        );
        if (sessionLookup.rows.length > 0) {
          sessionId = sessionLookup.rows[0].session_id;
        }
      }
      
      // If still no session, generate one
      if (!sessionId) {
        sessionId = crypto.randomUUID?.() || `${Date.now()}-${id}`;
      }

      // Get predicted duration from session if available, otherwise predict
      let predictedDuration: number;
      if (sessionId && sessionId !== `${Date.now()}-${id}`) {
        const sessionResult = await pool.query(
          'SELECT predicted_duration_minutes FROM sessions WHERE session_id = $1',
          [sessionId]
        );
        if (sessionResult.rows.length > 0 && sessionResult.rows[0].predicted_duration_minutes) {
          predictedDuration = parseFloat(sessionResult.rows[0].predicted_duration_minutes);
        } else {
          // Fallback to prediction if session not found
          try {
            const pred = await aiForwardJson<{ predicted_duration_minutes: number }>(
              '/predict_duration',
              {
                method: 'POST',
                body: JSON.stringify({ item_ids: itemIds, entry_time: entryTime }),
              }
            );
            predictedDuration = pred.predicted_duration_minutes;
          } catch (e) {
            // If AI fails, use a default
            predictedDuration = 15.0;
          }
        }
      } else {
        // Predict duration if no session
        try {
          const pred = await aiForwardJson<{ predicted_duration_minutes: number }>(
            '/predict_duration',
            {
              method: 'POST',
              body: JSON.stringify({ item_ids: itemIds, entry_time: entryTime }),
            }
          );
          predictedDuration = pred.predicted_duration_minutes;
        } catch (e) {
          predictedDuration = 15.0;
        }
      }

      // Run anomaly detection (fire-and-forget)
      (async () => {
        try {
          const detect = await aiForwardJson<{ is_anomaly: boolean; anomaly_score: number; risk_level: string }>(
            '/detect_anomaly',
            {
              method: 'POST',
              body: JSON.stringify({
                session_id: sessionId,
                room_id: String(id),
                actual_duration: actualMinutes,
                predicted_duration: predictedDuration,
                entry_scans: entryScans,
                exit_scans: exitScans,
                entry_time: entryTime,
              }),
            }
          );

          // Update session with anomaly results if session exists in database
          if (sessionId && sessionId !== `${Date.now()}-${id}`) {
            await pool.query(
              `UPDATE sessions 
               SET exit_time = $1, 
                   duration_minutes = $2,
                   is_anomaly = $3,
                   anomaly_score = $4,
                   risk_level = $5,
                   status = 'completed',
                   updated_at = NOW()
               WHERE session_id = $6`,
              [now, actualMinutes, detect.is_anomaly, detect.anomaly_score, detect.risk_level, sessionId]
            );
          }

          // If anomaly detected, keep room in alert status
          if (detect.is_anomaly) {
            await pool.query('UPDATE rooms SET status = $1, updated_at = NOW() WHERE id = $2', ['alert', id]);
            
            const alertMessage = `AI detected anomaly (score=${detect.anomaly_score.toFixed(2)}) for room. Review session for suspicious behavior.`;
            
            await pool.query(
              `INSERT INTO alerts (room_id, alert_type, severity, message)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING`,
              [
                id,
                'anomaly',
                detect.risk_level?.toLowerCase() === 'high' ? 'high' : detect.risk_level?.toLowerCase() || 'medium',
                alertMessage,
              ]
            );
          } else {
            // No anomaly - set room to available
            await pool.query(
              `UPDATE rooms 
               SET status = 'available', 
                   customer_rfid = NULL, 
                   entry_time = NULL, 
                   updated_at = NOW() 
               WHERE id = $1`,
              [id]
            );
          }
        } catch (e) {
          // If AI fails, still allow room to be available (don't block customer)
          console.error('Anomaly detection failed during scan-out:', e);
          await pool.query(
            `UPDATE rooms 
             SET status = 'available', 
                 customer_rfid = NULL, 
                 entry_time = NULL, 
                 updated_at = NOW() 
             WHERE id = $1`,
            [id]
          );
        }
      })();

      // Update session status to completed (if exists in database)
      if (sessionId && sessionId !== `${Date.now()}-${id}`) {
        await pool.query(
          `UPDATE sessions 
           SET exit_time = NOW(), 
               duration_minutes = $1,
               status = 'completed',
               updated_at = NOW()
           WHERE session_id = $2`,
          [actualMinutes, sessionId]
        );
      }

      return res.json({ 
        message: 'Product scanned out. All items scanned - running final checks and room will be available shortly', 
        product: productDetails.rows[0],
        itemsRemaining: 0,
        canExit: true,
        roomAvailable: true
      });
    }

    res.json({ 
      message: 'Product scanned out', 
      product: productDetails.rows[0],
      itemsRemaining: unscannedItems.rows.length,
      canExit: unscannedItems.rows.length === 0
    });
  } catch (error) {
    console.error('Scan product out error:', error);
    res.status(500).json({ error: 'Failed to scan product out' });
  }
};

// Add product to room (without scanning)
export const addProductToRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // room id
    const { productSku } = req.body;

    if (!productSku) {
      return res.status(400).json({ error: 'Product SKU required' });
    }

    // Get product by SKU
    const productResult = await pool.query('SELECT id FROM products WHERE sku = $1', [productSku]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productId = productResult.rows[0].id;

    // Check if room exists
    const roomCheck = await pool.query('SELECT id FROM rooms WHERE id = $1', [id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if product already in room
    const existingCheck = await pool.query(
      'SELECT id FROM room_products WHERE room_id = $1 AND product_id = $2',
      [id, productId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Product already in room' });
    }

    // Insert room_products record (without scanning)
    await pool.query(
      `INSERT INTO room_products (room_id, product_id)
       VALUES ($1, $2)`,
      [id, productId]
    );

    // Get product details
    const productDetails = await pool.query(
      `SELECT p.id, p.sku, p.name, p.size, p.color 
       FROM products p WHERE p.id = $1`,
      [productId]
    );

    res.json({ 
      message: 'Product added to room', 
      product: productDetails.rows[0] 
    });
  } catch (error) {
    console.error('Add product to room error:', error);
    res.status(500).json({ error: 'Failed to add product to room' });
  }
};

// Get items pending scan-out for a customer (by card ID or room)
export const getPendingScanOutItems = async (req: Request, res: Response) => {
  try {
    const { customerCardId, roomId } = req.query;

    if (!customerCardId && !roomId) {
      return res.status(400).json({ error: 'Either customerCardId or roomId is required' });
    }

    let query = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.size,
        p.color,
        r.room_number,
        r.customer_rfid,
        rp.scanned_in_at,
        rp.session_id
      FROM room_products rp
      JOIN products p ON rp.product_id = p.id
      JOIN rooms r ON rp.room_id = r.id
      WHERE rp.scanned_in_at IS NOT NULL 
        AND rp.scanned_out_at IS NULL
    `;

    const params: any[] = [];
    
    if (customerCardId) {
      query += ` AND r.customer_rfid = $1`;
      params.push(customerCardId);
    } else if (roomId) {
      query += ` AND r.id = $1`;
      params.push(roomId);
    }

    query += ` ORDER BY r.room_number, p.sku`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.json({
        message: 'No items pending scan-out',
        items: [],
        customerCardId: customerCardId || null,
        roomId: roomId || null
      });
    }

    // Group by room if multiple rooms
    const itemsByRoom = result.rows.reduce((acc: any, row: any) => {
      const roomNum = row.room_number;
      if (!acc[roomNum]) {
        acc[roomNum] = {
          roomNumber: roomNum,
          customerCardId: row.customer_rfid,
          items: []
        };
      }
      acc[roomNum].items.push({
        id: row.id.toString(),
        sku: row.sku,
        name: row.name,
        size: row.size,
        color: row.color,
        scannedInAt: row.scanned_in_at,
        sessionId: row.session_id
      });
      return acc;
    }, {});

    res.json({
      message: `Found ${result.rows.length} item(s) pending scan-out`,
      itemsByRoom: Object.values(itemsByRoom),
      totalItems: result.rows.length
    });
  } catch (error) {
    console.error('Get pending scan-out items error:', error);
    res.status(500).json({ error: 'Failed to get pending scan-out items' });
  }
};

// Search products
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q, limit = 50 } = req.query;

    let query = 'SELECT id, sku, name, size, color FROM products';
    const params: any[] = [];
    
    if (q && typeof q === 'string') {
      query += ' WHERE sku ILIKE $1 OR name ILIKE $1';
      params.push(`%${q}%`);
    }

    query += ' ORDER BY name, sku LIMIT $' + (params.length + 1);
    params.push(parseInt(limit as string));

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
};
