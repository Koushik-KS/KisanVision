import {
  validateWeatherIntelligenceInput,
  validateWeatherIntelligenceOutput,
} from '../schemas/weatherSchema.js';

const CROP_PROFILES = {
  Coffee: {
    scientificName: 'Coffea arabica / Coffea canephora',
    tempOpt: [15, 28],
    tempTol: [11, 33],
    humidityOpt: [60, 85],
    humidityHighRisk: 88,
    humidityLowRisk: 45,
    rain5DayOpt: [5, 65],
    rain5DayExcess: 100,
    windCautionKmh: 30,
    diseaseRiskLabel: 'Coffee Leaf Rust and Black Rot pressure',
    waterNoteOptimal: 'Maintain light mulching and avoid overhead irrigation during active showers.',
    waterNoteDry: 'Apply supplemental drip or basin irrigation during dry spells to prevent blossom/berry drop.',
    waterNoteWet: 'Ensure contour trenches and estate drains are cleared to prevent root stagnation.',
  },
  'Black Pepper': {
    scientificName: 'Piper nigrum',
    tempOpt: [20, 32],
    tempTol: [15, 36],
    humidityOpt: [65, 90],
    humidityHighRisk: 90,
    humidityLowRisk: 50,
    rain5DayOpt: [10, 75],
    rain5DayExcess: 110,
    windCautionKmh: 32,
    diseaseRiskLabel: 'Phytophthora Quick Wilt and Anthracnose',
    waterNoteOptimal: 'Maintain organic mulch around vine basins to keep feeder roots evenly moist.',
    waterNoteDry: 'Irrigate standard basins lightly at 4–5 day intervals while conserving shade moisture.',
    waterNoteWet: 'Prune lower runner shoots touching soil and clear basin drainage to deter Phytophthora foot rot.',
  },
  Ginger: {
    scientificName: 'Zingiber officinale',
    tempOpt: [20, 30],
    tempTol: [16, 35],
    humidityOpt: [65, 85],
    humidityHighRisk: 87,
    humidityLowRisk: 50,
    rain5DayOpt: [5, 55],
    rain5DayExcess: 80,
    windCautionKmh: 35,
    diseaseRiskLabel: 'Soft Rot (Pythium) and Bacterial Wilt in rhizomes',
    waterNoteOptimal: 'Keep raised beds moist without saturation; green-leaf mulch regulates bed moisture well.',
    waterNoteDry: 'Provide light frequent furrow or sprinkler irrigation to avoid rhizome shrinkage.',
    waterNoteWet: 'Prioritize raised-bed side channels immediately; standing water rapidly triggers rhizome soft rot.',
  },
  Cardamom: {
    scientificName: 'Elettaria cardamomum',
    tempOpt: [14, 25],
    tempTol: [10, 30],
    humidityOpt: [70, 90],
    humidityHighRisk: 92,
    humidityLowRisk: 55,
    rain5DayOpt: [10, 75],
    rain5DayExcess: 105,
    windCautionKmh: 25,
    diseaseRiskLabel: 'Azhukal (Capsule Rot) and Clump Rot under saturated shade',
    waterNoteOptimal: 'Filtered shade and light rainfall sustain steady panicle development without irrigation.',
    waterNoteDry: 'Use overhead misting or drip irrigation and verify 50–60% shade canopy to curb heat/dryness.',
    waterNoteWet: 'Trash dried leaves from clump bases and regulate excessive shade to reduce capsule rot humidity.',
  },
  Arecanut: {
    scientificName: 'Areca catechu',
    tempOpt: [18, 34],
    tempTol: [14, 38],
    humidityOpt: [65, 90],
    humidityHighRisk: 90,
    humidityLowRisk: 48,
    rain5DayOpt: [10, 90],
    rain5DayExcess: 125,
    windCautionKmh: 28,
    diseaseRiskLabel: 'Koleroga / Mahali (Fruit Rot) and Bud Rot',
    waterNoteOptimal: 'Retain inter-row cover mulch; basin soil moisture remains supportive under current weather.',
    waterNoteDry: 'Schedule basin drip irrigation (20–30 L/palm equivalent when soil dries) and whitewash young stems if hot.',
    waterNoteWet: 'Inspect crown drainage and field outfall channels; watch bunches closely for Mahali drop.',
  },
};

const isNum = (val) => typeof val === 'number' && Number.isFinite(val);

const avgNums = (arr) => {
  const valid = arr.filter(isNum);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};

const sumNums = (arr) => {
  const valid = arr.filter(isNum);
  if (valid.length === 0) return null;
  return Number(valid.reduce((a, b) => a + b, 0).toFixed(2));
};

const round1 = (val) => (isNum(val) ? Number(val.toFixed(1)) : null);

const scoreRange = (value, optRange, tolRange) => {
  if (!isNum(value)) return null;
  const [optMin, optMax] = optRange;
  const [tolMin, tolMax] = tolRange;

  if (value >= optMin && value <= optMax) {
    return 100;
  }

  if (value < optMin) {
    if (value <= tolMin) {
      const overshoot = tolMin - value;
      return Math.max(10, Math.round(38 - overshoot * 5));
    }
    const ratio = (optMin - value) / Math.max(1, optMin - tolMin);
    return Math.round(95 - ratio * 55);
  }

  if (value >= tolMax) {
    const overshoot = value - tolMax;
    return Math.max(10, Math.round(38 - overshoot * 5));
  }
  const ratio = (value - optMax) / Math.max(1, tolMax - optMax);
  return Math.round(95 - ratio * 55);
};

const getSuitabilityCategory = (score) => {
  if (score >= 80) return 'Highly Suitable';
  if (score >= 62) return 'Suitable';
  if (score >= 42) return 'Moderate';
  return 'Low Suitability';
};

/**
 * Evaluates agronomic suitability for one supported crop using actual weather readings.
 */
const evaluateCropSuitability = (crop, summary) => {
  const profile = CROP_PROFILES[crop];
  const missingMetrics = [];
  const reasons = [];
  const weatherRisks = [];
  const recommendations = [];

  const weightedDimensions = [];

  // 1. Temperature (Weight 0.35)
  const effectiveTemp = summary.avgForecastTempC ?? summary.currentTempC;
  if (isNum(effectiveTemp)) {
    let tempScore = scoreRange(effectiveTemp, profile.tempOpt, profile.tempTol);

    // Penalize harsh forecast temperature extremes
    if (isNum(summary.forecastTempMaxC) && summary.forecastTempMaxC > profile.tempTol[1]) {
      tempScore = Math.max(12, tempScore - Math.round((summary.forecastTempMaxC - profile.tempTol[1]) * 4));
      weatherRisks.push(
        `Forecast peak of ${summary.forecastTempMaxC}°C exceeds ${crop}'s tolerable upper limit (${profile.tempTol[1]}°C), elevating heat stress risk.`
      );
    }
    if (isNum(summary.forecastTempMinC) && summary.forecastTempMinC < profile.tempTol[0]) {
      tempScore = Math.max(12, tempScore - Math.round((profile.tempTol[0] - summary.forecastTempMinC) * 4));
      weatherRisks.push(
        `Forecast night minimum of ${summary.forecastTempMinC}°C dips below ${crop}'s comfortable threshold (${profile.tempTol[0]}°C).`
      );
    }

    weightedDimensions.push({ weight: 0.35, score: tempScore });

    if (effectiveTemp >= profile.tempOpt[0] && effectiveTemp <= profile.tempOpt[1]) {
      reasons.push(
        `Mean temperature (${effectiveTemp}°C${isNum(summary.forecastTempMinC) && isNum(summary.forecastTempMaxC) ? `, 5-day range ${summary.forecastTempMinC}–${summary.forecastTempMaxC}°C` : ''}) lies well inside ${crop}'s optimal ${profile.tempOpt[0]}–${profile.tempOpt[1]}°C band.`
      );
    } else if (effectiveTemp < profile.tempOpt[0]) {
      reasons.push(
        `Cooler temperature (${effectiveTemp}°C) sits below ${crop}'s optimal ${profile.tempOpt[0]}–${profile.tempOpt[1]}°C band, which can slow vegetative vigor.`
      );
    } else {
      reasons.push(
        `Warmer temperature (${effectiveTemp}°C) exceeds ${crop}'s optimal ${profile.tempOpt[0]}–${profile.tempOpt[1]}°C band.`
      );
    }
  } else {
    missingMetrics.push('temperature');
  }

  // 2. Relative Humidity (Weight 0.25)
  const effectiveHumidity = summary.effectiveHumidityPercent;
  if (isNum(effectiveHumidity)) {
    let humScore = scoreRange(
      effectiveHumidity,
      profile.humidityOpt,
      [Math.max(25, profile.humidityLowRisk - 10), 99]
    );

    if (effectiveHumidity >= profile.humidityHighRisk) {
      humScore = Math.min(humScore, 78);
      weatherRisks.push(
        `High humidity (${effectiveHumidity}%) increases ${profile.diseaseRiskLabel}.`
      );
    } else if (effectiveHumidity < profile.humidityLowRisk) {
      weatherRisks.push(
        `Low relative humidity (${effectiveHumidity}%) increases moisture evaporation and leaf-scorch stress for ${crop}.`
      );
    }

    weightedDimensions.push({ weight: 0.25, score: humScore });
    reasons.push(
      `Relative humidity (${effectiveHumidity}%) is ${
        effectiveHumidity >= profile.humidityOpt[0] && effectiveHumidity <= profile.humidityOpt[1]
          ? `well aligned with ${crop}'s preferred ${profile.humidityOpt[0]}–${profile.humidityOpt[1]}% range`
          : effectiveHumidity > profile.humidityOpt[1]
            ? `higher than ${crop}'s ideal ${profile.humidityOpt[0]}–${profile.humidityOpt[1]}% zone`
            : `drier than ${crop}'s preferred ${profile.humidityOpt[0]}–${profile.humidityOpt[1]}% humidity`
      }.`
    );
  } else {
    missingMetrics.push('humidity');
  }

  // 3. 5-Day Rainfall & Rain Probability (Weight 0.25)
  const rain5Day = summary.rainfall5DayMm;
  const maxRainProb = summary.maxRainProbabilityPercent;
  if (isNum(rain5Day)) {
    let rainScore = scoreRange(
      rain5Day,
      profile.rain5DayOpt,
      [0, profile.rain5DayExcess]
    );

    // Light/zero 5-day rain is less penalized if humidity is already supportive
    if (rain5Day < profile.rain5DayOpt[0] && isNum(effectiveHumidity) && effectiveHumidity >= 65) {
      rainScore = Math.max(rainScore, 76);
    }

    if (rain5Day >= profile.rain5DayExcess) {
      weatherRisks.push(
        `Heavy 5-day rainfall forecast (${rain5Day} mm) raises waterlogging and root-rot hazard for ${crop}.`
      );
    } else if (rain5Day === 0 && (maxRainProb === null || maxRainProb < 20)) {
      reasons.push(
        `Dry 5-day outlook (0 mm rainfall${isNum(maxRainProb) ? `, max rain chance ${maxRainProb}%` : ''}) requires active soil moisture management.`
      );
    } else {
      reasons.push(
        `Projected 5-day rainfall (${rain5Day} mm${isNum(maxRainProb) ? `, peak rain probability ${maxRainProb}%` : ''}) ${
          rain5Day <= profile.rain5DayOpt[1]
            ? 'supports active crop hydration without severe flooding'
            : 'delivers substantial moisture requiring reliable drainage'
        }.`
      );
    }

    weightedDimensions.push({ weight: 0.25, score: rainScore });
  } else if (isNum(maxRainProb)) {
    const probScore = maxRainProb >= 85 ? 72 : maxRainProb >= 25 ? 88 : 74;
    weightedDimensions.push({ weight: 0.2, score: probScore });
    reasons.push(`Forecast rain probability peaks at ${maxRainProb}% over the next 5 days.`);
  } else {
    missingMetrics.push('rainfall');
  }

  // 4. Wind Speed (Weight 0.15)
  const effectiveWind = summary.maxWindKmh ?? summary.currentWindKmh;
  if (isNum(effectiveWind)) {
    let windScore = 100;
    if (effectiveWind > profile.windCautionKmh) {
      const excess = effectiveWind - profile.windCautionKmh;
      windScore = Math.max(25, Math.round(85 - excess * 2.2));
      weatherRisks.push(
        `Gusty wind forecasts up to ${effectiveWind} km/h exceed ${profile.windCautionKmh} km/h caution threshold for ${crop}.`
      );
    } else {
      reasons.push(
        `Wind speeds (up to ${effectiveWind} km/h) remain calm enough to avoid canopy or stem damage.`
      );
    }
    weightedDimensions.push({ weight: 0.15, score: windScore });
  } else {
    missingMetrics.push('windSpeed');
  }

  // Compute weighted score cleanly without fabricating values for missing metrics
  let suitabilityScore = 50;
  if (weightedDimensions.length > 0) {
    const totalWeight = weightedDimensions.reduce((sum, d) => sum + d.weight, 0);
    const weightedSum = weightedDimensions.reduce((sum, d) => sum + d.weight * d.score, 0);
    suitabilityScore = Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)));
  }

  // Combined fungal wet-humidity interaction check
  if (
    isNum(effectiveHumidity) &&
    effectiveHumidity >= 85 &&
    isNum(rain5Day) &&
    rain5Day >= 20
  ) {
    weatherRisks.push(
      `Persistent moisture (humidity ${effectiveHumidity}% + ${rain5Day} mm 5-day rain) favors ${profile.diseaseRiskLabel}.`
    );
    recommendations.push(
      'Schedule preventive field sanitation and check underside foliage/drainage immediately after showers pause.'
    );
  }

  if (isNum(summary.forecastTempMaxC) && summary.forecastTempMaxC > profile.tempOpt[1]) {
    recommendations.push(
      `Retain shade canopy or leaf litter mulch to buffer daytime peaks near ${summary.forecastTempMaxC}°C.`
    );
  }

  if (isNum(effectiveWind) && effectiveWind > profile.windCautionKmh) {
    recommendations.push(
      `Check stakes, shade tree branches, and windbreak borders ahead of ${effectiveWind} km/h winds.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      `Conditions are generally balanced for ${crop}; continue routine scouting and organic basin mulching.`
    );
  }

  let irrigationGuidance = profile.waterNoteOptimal;
  if (isNum(rain5Day) && rain5Day >= profile.rain5DayOpt[1]) {
    irrigationGuidance = profile.waterNoteWet;
  } else if (
    (isNum(rain5Day) && rain5Day < profile.rain5DayOpt[0]) ||
    (isNum(effectiveHumidity) && effectiveHumidity < profile.humidityLowRisk)
  ) {
    irrigationGuidance = profile.waterNoteDry;
  }

  if (weatherRisks.length === 0) {
    weatherRisks.push('No acute meteorological stress flagged in the 5-day window.');
  }

  return {
    crop,
    scientificName: profile.scientificName,
    suitabilityScore,
    suitabilityCategory: getSuitabilityCategory(suitabilityScore),
    reasons,
    weatherRisks,
    recommendations,
    irrigationGuidance,
    relevantConditions: {
      temperatureC: summary.currentTempC,
      forecastTempMinC: summary.forecastTempMinC,
      forecastTempMaxC: summary.forecastTempMaxC,
      humidityPercent: effectiveHumidity,
      rainfall5DayMm: rain5Day,
      maxRainProbabilityPercent: maxRainProb,
      windSpeedKmh: effectiveWind,
    },
    missingMetrics,
  };
};

const buildOverallWeatherInsights = (summary) => {
  const riskAlerts = [];

  if (isNum(summary.rainfall5DayMm) && summary.rainfall5DayMm >= 80) {
    riskAlerts.push({
      level: 'high',
      title: 'Heavy 5-Day Rainfall Accumulation',
      detail: `Cumulative 5-day rainfall is projected at ${summary.rainfall5DayMm} mm. Prioritize trench/bed drainage to protect shallow-rooted spice crops (especially Ginger and Cardamom).`,
    });
  } else if (isNum(summary.rainfall5DayMm) && summary.rainfall5DayMm >= 25) {
    riskAlerts.push({
      level: 'moderate',
      title: 'Active Showers Expected',
      detail: `Approximately ${summary.rainfall5DayMm} mm of rain is forecast across the next 5 days (peak rain probability ${summary.maxRainProbabilityPercent ?? 'N/A'}%). Plan foliar sprays around dry gaps.`,
    });
  }

  if (isNum(summary.effectiveHumidityPercent) && summary.effectiveHumidityPercent >= 88) {
    riskAlerts.push({
      level: 'high',
      title: 'High Fungal & Rot Humidity Window',
      detail: `Relative humidity (${summary.effectiveHumidityPercent}%) favors fungal diseases such as Coffee Leaf Rust, Phytophthora Quick Wilt, Soft Rot, and Capsule Rot.`,
    });
  } else if (isNum(summary.effectiveHumidityPercent) && summary.effectiveHumidityPercent < 45) {
    riskAlerts.push({
      level: 'moderate',
      title: 'Dry Air Moisture Deficit',
      detail: `Low humidity (${summary.effectiveHumidityPercent}%) elevates crop transpiration and dry-stress risk for shade-loving Cardamom and Black Pepper.`,
    });
  }

  if (isNum(summary.forecastTempMaxC) && summary.forecastTempMaxC >= 34) {
    riskAlerts.push({
      level: 'high',
      title: 'Elevated Daytime Heat',
      detail: `Daytime temperatures reach ${summary.forecastTempMaxC}°C in the 5-day forecast; cool-climate Cardamom and young Coffee plants may require extra shade and mulch.`,
    });
  }

  if (isNum(summary.maxWindKmh) && summary.maxWindKmh >= 30) {
    riskAlerts.push({
      level: 'moderate',
      title: 'Strong Wind Gusts Expected',
      detail: `Forecast wind speeds reach ${summary.maxWindKmh} km/h. Inspect Arecanut palms, pepper standards, and shade-tree limbs.`,
    });
  }

  if (riskAlerts.length === 0) {
    riskAlerts.push({
      level: 'low',
      title: 'Stable Agronomic Weather Window',
      detail: 'No extreme temperature, wind, or flood alerts detected across the 5-day forecast window.',
    });
  }

  let moistureAndSoilSummary =
    'Weather-derived surface moisture cannot be fully estimated because rainfall and humidity metrics were unavailable from the weather provider.';
  if (isNum(summary.rainfall5DayMm) && isNum(summary.effectiveHumidityPercent)) {
    if (summary.rainfall5DayMm >= 40 && summary.effectiveHumidityPercent >= 80) {
      moistureAndSoilSummary = `Weather-derived estimate indicates high topsoil moisture retention and low evaporation (${summary.rainfall5DayMm} mm 5-day rain, ${summary.effectiveHumidityPercent}% humidity). Avoid over-irrigating and verify drainage flow.`;
    } else if (summary.rainfall5DayMm >= 10 || summary.effectiveHumidityPercent >= 65) {
      moistureAndSoilSummary = `Weather-derived estimate indicates moderate surface moisture availability (${summary.rainfall5DayMm} mm 5-day rain, ${summary.effectiveHumidityPercent}% humidity). Organic mulch helps stabilize moisture evenly.`;
    } else {
      moistureAndSoilSummary = `Weather-derived estimate indicates drying topsoil conditions (${summary.rainfall5DayMm} mm 5-day rain, ${summary.effectiveHumidityPercent}% humidity). Monitor root-zone moisture closely and irrigate gently.`;
    }
  } else if (isNum(summary.effectiveHumidityPercent)) {
    moistureAndSoilSummary = `Weather-derived humidity stands at ${summary.effectiveHumidityPercent}% (rainfall total unavailable). Check field topsoil before scheduling irrigation.`;
  }

  const drainageAndIrrigationOutlook =
    isNum(summary.rainfall5DayMm) && summary.rainfall5DayMm >= 50
      ? `Hold regular irrigation and clear estate/bed drainage channels ahead of ${summary.rainfall5DayMm} mm forecast rain.`
      : isNum(summary.rainfall5DayMm) && summary.rainfall5DayMm >= 10
        ? `Natural rainfall (${summary.rainfall5DayMm} mm over 5 days) should meet most baseline crop water needs on well-mulched plots.`
        : 'Limited rainfall expected over the next 5 days; schedule targeted drip or basin irrigation early in the morning or evening.';

  const pestAndDiseaseWeatherRisk =
    isNum(summary.effectiveHumidityPercent) && summary.effectiveHumidityPercent >= 85
      ? `Elevated fungal pressure (${summary.effectiveHumidityPercent}% humidity${isNum(summary.rainfall5DayMm) ? `, ${summary.rainfall5DayMm} mm 5-day rainfall` : ''}). Inspect lower foliage and fruits for early lesions or rot.`
      : 'Moderate-to-low fungal spread conditions based on retrieved humidity and temperature levels; continue periodic crop scouting.';

  const dryWindows = summary.forecast.filter(
    (d) => (d.rainProbabilityPercent === null || d.rainProbabilityPercent < 40) &&
      (d.rainfallMm === null || d.rainfallMm < 2)
  );
  const fieldworkAdvisory =
    dryWindows.length > 0
      ? `Better dry fieldwork/spraying windows appear around ${dryWindows
          .slice(0, 2)
          .map((d) => d.date)
          .join(' and ')} when rain probability is lower.`
      : 'Frequent rain chances across the 5-day window limit foliar spraying windows; prioritize drainage checks and rain-fast organic practices.';

  const tempPhrase = isNum(summary.currentTempC) ? `${summary.currentTempC}°C currently` : 'temperature unavailable';
  const humPhrase = isNum(summary.effectiveHumidityPercent) ? `${summary.effectiveHumidityPercent}% humidity` : 'humidity unavailable';
  const rainPhrase = isNum(summary.rainfall5DayMm) ? `${summary.rainfall5DayMm} mm 5-day rain forecast` : '5-day rainfall unavailable';

  return {
    summary: `Retrieved conditions show ${tempPhrase}, ${humPhrase}, and ${rainPhrase}. Crop scores below reflect weather suitability over the current 5-day horizon.`,
    moistureAndSoilSummary,
    drainageAndIrrigationOutlook,
    pestAndDiseaseWeatherRisk,
    fieldworkAdvisory,
    riskAlerts,
    suitabilityScopeNotice:
      'Weather suitability scores and moisture insights are derived strictly from live weather and 5-day forecast measurements — not physical soil sensors — and do not replace soil pH, elevation, drainage, or shade-cover assessments.',
  };
};

/**
 * Weather Intelligence Agent:
 * Computes deterministic, transparent crop suitability scores and actionable insights
 * strictly for Coffee, Black Pepper, Ginger, Cardamom, and Arecanut using real weather data.
 */
export const runWeatherIntelligenceAgent = async (payload) => {
  const { current, forecast, location, targetCrops } =
    validateWeatherIntelligenceInput(payload);

  const forecastMins = forecast.map((d) => d.tempMinC).filter(isNum);
  const forecastMaxs = forecast.map((d) => d.tempMaxC).filter(isNum);
  const forecastAvgs = forecast
    .map((d) => (isNum(d.tempMinC) && isNum(d.tempMaxC) ? (d.tempMinC + d.tempMaxC) / 2 : null))
    .filter(isNum);
  const forecastWinds = forecast.map((d) => d.windSpeedMaxKmh).filter(isNum);
  const forecastRainProbs = forecast.map((d) => d.rainProbabilityPercent).filter(isNum);

  const summary = {
    location,
    forecast,
    currentTempC: isNum(current.temperatureC) ? current.temperatureC : null,
    avgForecastTempC: round1(avgNums(forecastAvgs)),
    forecastTempMinC: forecastMins.length > 0 ? Math.min(...forecastMins) : null,
    forecastTempMaxC: forecastMaxs.length > 0 ? Math.max(...forecastMaxs) : null,
    effectiveHumidityPercent: isNum(current.humidityPercent)
      ? current.humidityPercent
      : round1(avgNums(forecast.map((d) => d.humidityAvgPercent))) !== null
        ? Math.round(avgNums(forecast.map((d) => d.humidityAvgPercent)))
        : null,
    rainfall5DayMm: sumNums(forecast.map((d) => d.rainfallMm)),
    maxRainProbabilityPercent:
      forecastRainProbs.length > 0 ? Math.max(...forecastRainProbs) : null,
    currentWindKmh: isNum(current.windSpeedKmh) ? current.windSpeedKmh : null,
    maxWindKmh: forecastWinds.length > 0 ? Math.max(...forecastWinds) : null,
  };

  const cropRecommendations = targetCrops
    .map((crop) => evaluateCropSuitability(crop, summary))
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  const weatherInsights = buildOverallWeatherInsights(summary);

  return validateWeatherIntelligenceOutput({
    agent: 'WEATHER_INTELLIGENCE_AGENT',
    evaluationMode: 'DETERMINISTIC_AGRONOMIC_MODEL',
    generatedAt: new Date().toISOString(),
    cropRecommendations,
    weatherInsights,
  });
};
