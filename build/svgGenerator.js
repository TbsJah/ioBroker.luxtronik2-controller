"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var svgGenerator_exports = {};
__export(svgGenerator_exports, {
  generateHeatCurveSVG: () => generateHeatCurveSVG
});
module.exports = __toCommonJS(svgGenerator_exports);
function generateHeatCurveSVG(fusspunkt, endpunkt) {
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 50, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const getX = (tAussen) => padding.left + (tAussen + 20) / 40 * innerWidth;
  const getY = (tSoll) => height - padding.bottom - (tSoll - 15) / 30 * innerHeight;
  const calcRlSoll = (tAussen) => fusspunkt + (endpunkt - fusspunkt) / 40 * (20 - tAussen);
  let grid = "";
  grid += `<rect width="100%" height="100%" fill="#ffffff" rx="8" />`;
  for (let t = -20; t <= 20; t += 5) {
    const x = getX(t);
    const isMain = t % 10 === 0;
    grid += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="${isMain ? "#ccc" : "#eaeaea"}" stroke-width="${isMain ? 1.5 : 1}" />`;
    if (isMain) {
      grid += `<text x="${x}" y="${height - padding.bottom + 25}" font-family="Arial, sans-serif" font-size="14" fill="#666" text-anchor="middle">${t}&#176;C</text>`;
    }
  }
  grid += `<text x="${width / 2}" y="${height - 10}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#333" text-anchor="middle">Au&#223;entemperatur (&#176;C)</text>`;
  for (let t = 15; t <= 45; t += 5) {
    const y = getY(t);
    grid += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#ccc" stroke-width="1" />`;
    grid += `<text x="${padding.left - 15}" y="${y + 5}" font-family="Arial, sans-serif" font-size="14" fill="#666" text-anchor="end">${t}</text>`;
  }
  grid += `<text x="20" y="${height / 2}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#333" text-anchor="middle" transform="rotate(-90, 20, ${height / 2})">R&#252;cklauf Soll (&#176;C)</text>`;
  const leftX = getX(-20);
  const leftY = getY(endpunkt);
  const rightX = getX(20);
  const rightY = getY(fusspunkt);
  const curve = `<line x1="${leftX}" y1="${leftY}" x2="${rightX}" y2="${rightY}" stroke="#d32f2f" stroke-width="3" stroke-linecap="round" />`;
  let dataPoints = "";
  for (let t = -20; t <= 20; t += 1) {
    const rl = calcRlSoll(t);
    const cx = getX(t);
    const cy = getY(rl);
    const tooltip = `Au&#223;en: ${t}&#176;C | RL-Soll: ${rl.toFixed(2).replace(".", ",")}&#176;C`;
    dataPoints += `
        <circle cx="${cx}" cy="${cy}" r="3.5" fill="#d32f2f" style="cursor: crosshair;">
            <title>${tooltip}</title>
        </circle>`;
  }
  const labels = `
        <text x="${leftX + 10}" y="${leftY - 15}" font-family="Arial, sans-serif" font-size="14" fill="#1976d2" font-weight="bold" text-anchor="start">Endpunkt: ${endpunkt}&#176;C</text>
        <text x="${rightX - 10}" y="${rightY - 15}" font-family="Arial, sans-serif" font-size="14" fill="#1976d2" text-anchor="end" font-weight="bold">Fu&#223;punkt: ${fusspunkt}&#176;C</text>
    `;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="border: 1px solid #e0e0e0; border-radius: 8px;">
        ${grid}
        ${curve}
        ${dataPoints}
        ${labels}
    </svg>`;
  return svg;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateHeatCurveSVG
});
//# sourceMappingURL=svgGenerator.js.map
