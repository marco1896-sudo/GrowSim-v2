'use strict';

(function attachPlayerFacingStatus(globalScope) {
  function clampPercent(value) {
    const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
    return Math.max(0, Math.min(100, numeric));
  }

  function deriveRiskLevel(riskValue) {
    const safeRisk = clampPercent(riskValue);
    if (safeRisk >= 75) return 'high';
    if (safeRisk >= 50) return 'elevated';
    if (safeRisk >= 25) return 'medium';
    return 'low';
  }

  function derivePlayerFacingStatus(state) {
    const safeState = state && typeof state === 'object' ? state : {};
    const status = safeState.status && typeof safeState.status === 'object' ? safeState.status : {};
    const rawCare = safeState.care && typeof safeState.care === 'object' ? safeState.care : {};
    const careApi = globalScope.GrowSimCareModel;
    const normalizedCare = careApi && typeof careApi.normalizeCareState === 'function'
      ? careApi.normalizeCareState(rawCare, safeState)
      : rawCare;
    const careSummary = careApi && typeof careApi.deriveCareSummary === 'function'
      ? careApi.deriveCareSummary(normalizedCare, safeState)
      : (normalizedCare.summary || {});
    const careWater = normalizedCare && normalizedCare.water && typeof normalizedCare.water === 'object'
      ? normalizedCare.water
      : {};
    const displayMoisture = careSummary && Number.isFinite(Number(careSummary.displayMoisture))
      ? Number(careSummary.displayMoisture)
      : (careSummary && Number.isFinite(Number(careSummary.substrateMoisture))
        ? Number(careSummary.substrateMoisture)
        : (Number.isFinite(Number(careWater.substrateMoisture))
          ? Number(careWater.substrateMoisture)
          : Number(status.water || 0)));
    const riskScore = careSummary && Number.isFinite(Number(careSummary.riskScore))
      ? Number(careSummary.riskScore)
      : Number(status.risk || 0);
    const riskLevel = careSummary && typeof careSummary.riskLevel === 'string' && careSummary.riskLevel.trim()
      ? careSummary.riskLevel.trim()
      : deriveRiskLevel(riskScore);

    return Object.freeze({
      water: clampPercent(displayMoisture),
      nutrition: clampPercent(status.nutrition),
      stress: clampPercent(status.stress),
      risk: clampPercent(riskScore),
      riskLevel,
      displayMoisture: clampPercent(displayMoisture),
      riskScore: clampPercent(riskScore),
      surfaceMoisture: clampPercent(
        careSummary && Number.isFinite(Number(careSummary.surfaceMoisture))
          ? Number(careSummary.surfaceMoisture)
          : Number(careWater.surfaceMoisture || 0)
      ),
      rootZoneMoisture: clampPercent(
        careSummary && Number.isFinite(Number(careSummary.rootZoneMoisture))
          ? Number(careSummary.rootZoneMoisture)
          : Number(careWater.rootZoneMoisture || 0)
      ),
      drybackRatePerHour: Math.max(0, Number(careWater.drybackRatePerHour || 0) || 0),
      rootZoneRiskScore: clampPercent(
        careSummary && careSummary.rootZoneRiskScore != null
          ? Number(careSummary.rootZoneRiskScore)
          : Number(careWater.overwateringPressure || 0)
      ),
      dryStressPressure: clampPercent(Number(careWater.dryStressPressure || 0))
    });
  }

  globalScope.GrowSimPlayerFacingStatus = Object.freeze({
    derivePlayerFacingStatus
  });
})(window);
