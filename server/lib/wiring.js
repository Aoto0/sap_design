// Wiring and electrical allocation calculator
import { SOCKET_RULES, LIGHT_POINT_RULE } from './constants/wiring.js';

/**
 * Determine socket outlets required for a room
 * @param {string} roomName - Room type/name (e.g., 'kitchen', 'bedroom')
 * @param {number} areaM2 - Room floor area in m²
 * @returns {number} Number of socket outlets
 */
export function socketsForRoom(roomName, areaM2) {
  // Normalize room name to lowercase for matching
  const normalizedName = roomName.toLowerCase();
  
  // Find matching rule
  let rule = SOCKET_RULES.default;
  for (const [key, value] of Object.entries(SOCKET_RULES)) {
    if (normalizedName.includes(key.toLowerCase())) {
      rule = value;
      break;
    }
  }
  
  // Calculate sockets based on area
  const areaBasedSockets = Math.ceil(areaM2 * rule.socketsPerM2);
  
  // Take maximum of minimum requirement and area-based calculation
  return Math.max(rule.minSockets, areaBasedSockets);
}

/**
 * Determine light points required for a room
 * @param {number} areaM2 - Room floor area in m²
 * @returns {number} Number of light points
 */
export function lightPointsForRoom(areaM2) {
  const calculated = Math.ceil(areaM2 * LIGHT_POINT_RULE.perM2);
  
  // Ensure at least minimum and cap at maximum
  return Math.max(
    LIGHT_POINT_RULE.minPerRoom,
    Math.min(calculated, LIGHT_POINT_RULE.maxPerRoom)
  );
}

/**
 * Generate wiring list for all rooms
 * @param {Array} rooms - Array of {name, area} objects
 * @returns {Array} Array of {room, sockets, lightPoints}
 */
export function generateWiringList(rooms) {
  return rooms.map(room => ({
    room: room.name,
    areaM2: room.area,
    sockets: socketsForRoom(room.name, room.area),
    lightPoints: lightPointsForRoom(room.area)
  }));
}
