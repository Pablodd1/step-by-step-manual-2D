export type UnitSystem = "metric" | "imperial";

export function formatCm(cm: number, system: UnitSystem, decimals = 0): string {
  if (system === "metric") {
    return `${decimals > 0 ? cm.toFixed(decimals) : Math.round(cm)} cm`;
  }
  const totalInches = cm / 2.54;
  if (totalInches >= 36) {
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - feet * 12);
    if (inches === 12) return `${feet + 1}' 0"`;
    return `${feet}' ${inches}"`;
  }
  return `${totalInches.toFixed(1)}"`;
}

export function formatMm(mm: number, system: UnitSystem): string {
  if (system === "metric") {
    return `${mm} mm`;
  }
  const inches = mm / 25.4;
  if (Math.abs(inches - 0.98) < 0.08) return `1" (${mm} mm)`;
  if (Math.abs(inches - 0.12) < 0.03) return `1/8" (${mm} mm)`;
  return `${inches.toFixed(2)}"`;
}

export function formatAreaSqM(sqM: number, system: UnitSystem): string {
  if (system === "metric") {
    return `${sqM.toFixed(2)} m²`;
  }
  const sqFt = sqM * 10.7639;
  return `${sqFt.toFixed(1)} sq ft`;
}

export function formatMeters(meters: number, system: UnitSystem): string {
  if (system === "metric") {
    return `${meters.toFixed(1)} m`;
  }
  const feet = meters * 3.28084;
  return `${feet.toFixed(1)} ft`;
}
