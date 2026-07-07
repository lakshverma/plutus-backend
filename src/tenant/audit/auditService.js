const dal = require('./auditDAL');
const logger = require('../../common/util/logger');

const toMap = (lookup, idKeyHints = [], nameKeyHints = []) => {
  if (!lookup) return new Map();
  if (lookup instanceof Map) return lookup;

  const map = new Map();

  // If it's a plain object like { "2": "Negotiation" }
  if (typeof lookup === 'object' && !Array.isArray(lookup)) {
    for (const [k, v] of Object.entries(lookup)) {
      map.set(String(k), v);
    }
    return map;
  }

  // If it's an array of rows
  if (Array.isArray(lookup)) {
    for (const row of lookup) {
      if (row && typeof row === 'object') {
        const idKey = Object.keys(row).find((k) => idKeyHints.includes(k));
        const nameKey = Object.keys(row).find((k) => nameKeyHints.includes(k));
        if (idKey && nameKey && row[idKey] != null) {
          map.set(String(row[idKey]), row[nameKey]);
        }
      }
    }
  }

  return map;
};

const getFromMap = (map, id) => {
  if (id == null) return null;
  const sKey = String(id);
  if (map.has(sKey)) return map.get(sKey);
  const nKey = Number(id);
  if (!Number.isNaN(nKey) && map.has(nKey)) return map.get(nKey);
  return null;
};

// Helper: derive the "to" ID for a field based on diff_data and new_data
const getToId = (record, key) => {
  const diffData = record.diff_data || {};
  const val = diffData[key];

  // If diff_data carries the new value (e.g., activity_change), use it
  if (val !== true && val !== false && val != null) return val;

  // Otherwise, fall back to new_data for property_change where diff_data is a boolean flag
  const newData = record.new_data || {};
  if (Object.prototype.hasOwnProperty.call(newData, key)) return newData[key];

  return null;
};

const getContactAuditTrailService = async (contactId) => {
  try {
    const auditTrail = await dal.getContactAuditTrail(contactId);

    // Collect only IDs actually required by diff_data
    const cityIds = new Set();
    const dealStageIds = new Set();

    for (const record of auditTrail) {
      const diffData = record.diff_data || {};

      if (Object.prototype.hasOwnProperty.call(diffData, 'birth_place_city_id')) {
        const toId = getToId(record, 'birth_place_city_id');
        if (toId != null) cityIds.add(toId);
      }

      if (Object.prototype.hasOwnProperty.call(diffData, 'deal_stage_deal_stage_id')) {
        const toId = getToId(record, 'deal_stage_deal_stage_id');
        if (toId != null) dealStageIds.add(toId);
      }
    }

    // Fetch names and normalize to Maps
    const [rawCityNames, rawDealStageNames] = await Promise.all([
      dal.getCityNamesByIds(Array.from(cityIds)),
      dal.getDealStageNamesByIds(Array.from(dealStageIds)),
    ]);

    const cityNamesMap = toMap(rawCityNames, ['city_id', 'id'], ['city_name', 'name', 'label']);
    const dealStageNamesMap = toMap(
      rawDealStageNames,
      ['deal_stage_deal_stage_id', 'deal_stage_id', 'id'],
      ['deal_stage', 'deal_stage_name', 'stage_name', 'name', 'label'],
    );

    // Enrich only diff_data; output single values (no from/to)
    for (const record of auditTrail) {
      if (record && record.diff_data) {
        const enrichedDiff = {};
        const keys = Object.keys(record.diff_data);

        for (const key of keys) {
          if (key === 'birth_place_city_id') {
            const toId = getToId(record, key);
            const label = getFromMap(cityNamesMap, toId);
            enrichedDiff.birth_place_city = label != null ? label : toId;
          } else if (key === 'deal_stage_deal_stage_id') {
            const toId = getToId(record, key);
            const label = getFromMap(dealStageNamesMap, toId);
            enrichedDiff.deal_stage = label != null ? label : toId;
          } else {
            // Leave other fields as-is, using the value present in diff_data
            enrichedDiff[key] = record.diff_data[key];
          }
        }

        record.diff_data = enrichedDiff;
      }
    }

    return auditTrail;
  } catch (error) {
    logger.error(`Service error fetching audit trail for contact ${contactId}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getContactAuditTrailService,
};
