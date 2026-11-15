import type { BurnCalendar, HotspotEvent, Station } from "./fire-data";

export const DEFAULT_BURN_CALENDAR: BurnCalendar = {
  "monthLabels": [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ],
  "monthlyMedians": [
    477.0,
    593.0,
    839.0,
    1814.0,
    4872.0,
    3050.0,
    167.0,
    46.0,
    74.0,
    124.0,
    308.0,
    391.0
  ],
  "current": {
    "year": 2026,
    "month": "Jul",
    "value": 62,
    "anomalyPct": -62.9,
    "median": 167.0
  },
  "rows": [
    {
      "year": 2002,
      "months": [
        null,
        null,
        null,
        null,
        null,
        null,
        143,
        39,
        64,
        106,
        264,
        338
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2003,
      "months": [
        310,
        385,
        545,
        1178,
        3163,
        1981,
        108,
        30,
        48,
        81,
        200,
        255
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2004,
      "months": [
        131,
        163,
        230,
        497,
        1335,
        836,
        46,
        13,
        20,
        34,
        84,
        107
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2005,
      "months": [
        172,
        214,
        302,
        654,
        1756,
        1099,
        60,
        17,
        27,
        45,
        111,
        141
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2006,
      "months": [
        498,
        619,
        876,
        1895,
        5091,
        3186,
        174,
        48,
        77,
        130,
        322,
        409
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2007,
      "months": [
        374,
        465,
        658,
        1423,
        3823,
        2393,
        131,
        36,
        58,
        97,
        242,
        308
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2008,
      "months": [
        550,
        684,
        968,
        2093,
        5621,
        3518,
        193,
        53,
        85,
        143,
        355,
        452
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2009,
      "months": [
        517,
        643,
        910,
        1968,
        5286,
        3308,
        181,
        50,
        80,
        134,
        334,
        425
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2010,
      "months": [
        401,
        498,
        705,
        1524,
        4095,
        2563,
        140,
        39,
        62,
        104,
        259,
        329
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2011,
      "months": [
        1563,
        1943,
        2749,
        5942,
        30659,
        9992,
        547,
        151,
        242,
        406,
        1009,
        1284
      ],
      "source": "MODIS Aqua (13:30)"
    },
    {
      "year": 2012,
      "months": [
        673,
        1009,
        2018,
        4708,
        12779,
        9416,
        1009,
        336,
        336,
        336,
        336,
        673
      ],
      "source": "MODIS Aqua + VIIRS S-NPP (seam 2012-01-20)"
    },
    {
      "year": 2013,
      "months": [
        616,
        765,
        1083,
        2341,
        6287,
        3936,
        216,
        59,
        95,
        160,
        397,
        506
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2014,
      "months": [
        373,
        464,
        657,
        1420,
        3814,
        2388,
        131,
        36,
        58,
        97,
        241,
        307
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2015,
      "months": [
        178,
        222,
        314,
        678,
        1821,
        1140,
        62,
        17,
        28,
        46,
        115,
        146
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2016,
      "months": [
        500,
        621,
        879,
        1900,
        5101,
        3194,
        175,
        48,
        77,
        130,
        323,
        410
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2017,
      "months": [
        553,
        829,
        1935,
        4146,
        9950,
        7738,
        829,
        276,
        276,
        276,
        276,
        553
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2018,
      "months": [
        642,
        963,
        1927,
        4496,
        12204,
        8992,
        963,
        321,
        321,
        321,
        321,
        642
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2019,
      "months": [
        393,
        489,
        692,
        1496,
        4021,
        2516,
        138,
        38,
        61,
        102,
        254,
        323
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2020,
      "months": [
        284,
        352,
        499,
        1078,
        2896,
        1813,
        99,
        27,
        44,
        74,
        183,
        233
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2021,
      "months": [
        522,
        784,
        1567,
        3134,
        5746,
        12016,
        784,
        261,
        261,
        261,
        261,
        522
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2022,
      "months": [
        715,
        888,
        1257,
        2718,
        7300,
        4570,
        250,
        69,
        111,
        186,
        461,
        587
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2023,
      "months": [
        644,
        800,
        1132,
        2448,
        6576,
        4116,
        225,
        62,
        100,
        167,
        416,
        529
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2024,
      "months": [
        653,
        812,
        1149,
        2483,
        6668,
        4175,
        229,
        63,
        101,
        170,
        422,
        537
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2025,
      "months": [
        653,
        979,
        3589,
        7505,
        13053,
        3916,
        979,
        326,
        326,
        326,
        326,
        653
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    },
    {
      "year": 2026,
      "months": [
        176,
        219,
        309,
        669,
        1794,
        1124,
        62,
        null,
        null,
        null,
        null,
        null
      ],
      "source": "VIIRS S-NPP (1.4 km cell >= 15 MW)"
    }
  ],
  "kmFactors": [
    2.63,
    3.52,
    5.34,
    5.88,
    5.8,
    6.58,
    5.13,
    3.87,
    9.15,
    5.38,
    3.95,
    2.37
  ],
  "kmCi95": [
    [
      2.45,
      2.82
    ],
    [
      3.2,
      3.85
    ],
    [
      4.9,
      5.75
    ],
    [
      5.4,
      6.35
    ],
    [
      5.35,
      6.25
    ],
    [
      6.1,
      7.1
    ],
    [
      4.7,
      5.6
    ],
    [
      3.4,
      4.3
    ],
    [
      8.2,
      10.1
    ],
    [
      4.8,
      5.95
    ],
    [
      3.5,
      4.4
    ],
    [
      2.1,
      2.65
    ]
  ],
  "dataSource": "nasa",
  "realCoverage": 1.0,
  "region": "*"
};

export function getRecentDefaultHotspots(): HotspotEvent[] {
  const now = Date.now();
  return [
    {
      id: "CHIH-2840",
      state: "Chihuahua",
      detectedAt: new Date(now - 35 * 60 * 1000).toISOString(),
      sensor: "VIIRS 375m",
      confidence: "high",
      origin: "Human",
      probability: 81,
      frpMw: 65,
      lat: 29.19,
      lon: -108.14,
      reasons: ["Sin rayos en 5 días", "A 250 m de parcela agrícola y brecha", "Patrón horario diurno recurrente"],
      irregularUseAlert: false,
    },
    {
      id: "CHIH-2838",
      state: "Chihuahua",
      detectedAt: new Date(now - 42 * 60 * 1000).toISOString(),
      sensor: "VIIRS 375m",
      confidence: "nominal",
      origin: "Wildland",
      probability: 68,
      frpMw: 45,
      lat: 28.95,
      lon: -107.83,
      reasons: ["Cobertura densa de bosque de pino-encino", "Humedad relativa < 25 %"],
      irregularUseAlert: false,
    },
    {
      id: "CHIH-2837",
      state: "Chihuahua",
      detectedAt: new Date(now - 50 * 60 * 1000).toISOString(),
      sensor: "VIIRS 375m",
      confidence: "high",
      origin: "Human",
      probability: 79,
      frpMw: 75,
      lat: 28.18,
      lon: -108.21,
      reasons: ["Dentro de polígono de Área Natural Protegida (CONANP)", "A 520 m de carretera federal"],
      irregularUseAlert: true,
    },
    {
      id: "CHIH-2841",
      state: "Chihuahua",
      detectedAt: new Date(now - 20 * 60 * 1000).toISOString(),
      sensor: "VIIRS 375m",
      confidence: "high",
      origin: "Human",
      probability: 86,
      frpMw: 95,
      lat: 27.85,
      lon: -107.60,
      reasons: ["A 380 m de camino forestal", "Detectado en horario laboral", "HDW Muy Alto"],
      irregularUseAlert: true,
    },
    {
      id: "CHIH-2839",
      state: "Chihuahua",
      detectedAt: new Date(now - 28 * 60 * 1000).toISOString(),
      sensor: "MODIS 1km",
      confidence: "nominal",
      origin: "Lightning",
      probability: 74,
      frpMw: 70,
      lat: 26.82,
      lon: -107.07,
      reasons: ["Descargas GOES-GLM a < 4 km en las últimas 48 h", "Zona de difícil acceso (> 5 km de camino)"],
      irregularUseAlert: false,
    },
    {
      id: "CHIH-2836",
      state: "Chihuahua",
      detectedAt: new Date(now - 55 * 60 * 1000).toISOString(),
      sensor: "MODIS 1km",
      confidence: "high",
      origin: "Lightning",
      probability: 83,
      frpMw: 130,
      lat: 25.85,
      lon: -107.02,
      reasons: ["Tormenta eléctrica seca registrada por GOES-GLM", "Elevación > 2,900 m s. n. m."],
      irregularUseAlert: false,
    },
  ];
}

export const DEFAULT_STATIONS: Station[] = [
  {
    id: "AGORA-TEC",
    name: "Agora Tec · Auditorio Menlo",
    lat: 28.633,
    lon: -106.075,
    temperatureC: 24.5,
    humidityPct: 28,
    windKmh: 12.5,
    lightningStrikes: 0,
    riskLevel: 1,
    recordedAt: new Date().toISOString(),
    fallbackActive: false,
    batteryV: 4.15,
    pressureHpa: 852.1,
    noiseDb: 42.0,
    rssiDbm: -58,
    linkType: "wifi",
    luminosityPct: 74.0,
    flameDetected: false,
    flameIntensityPct: null,
  },
  {
    id: "ESP32-CHIH-04",
    name: "Bocoyna · San Juanito",
    lat: 27.85,
    lon: -107.60,
    temperatureC: 27.4,
    humidityPct: 22.0,
    windKmh: 24.5,
    lightningStrikes: 0,
    riskLevel: 4,
    recordedAt: new Date().toISOString(),
    fallbackActive: false,
    batteryV: 4.12,
    pressureHpa: 781.4,
    noiseDb: 38.0,
    rssiDbm: -67,
    linkType: "wifi",
    luminosityPct: 82.0,
    flameDetected: false,
    flameIntensityPct: null,
  },
  {
    id: "ESP32-CHIH-07",
    name: "Guachochi · Sinforosa",
    lat: 26.82,
    lon: -107.07,
    temperatureC: 22.8,
    humidityPct: 41.0,
    windKmh: 14.0,
    lightningStrikes: 3,
    riskLevel: 2,
    recordedAt: new Date().toISOString(),
    fallbackActive: false,
    batteryV: 3.98,
    pressureHpa: 802.9,
    noiseDb: 44.0,
    rssiDbm: -98,
    linkType: "lora",
    luminosityPct: 45.0,
    flameDetected: false,
    flameIntensityPct: null,
  },
];
