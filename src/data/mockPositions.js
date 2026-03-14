/**
 * Mock positions — derived from the Schwab CSV screenshot.
 * Real data will replace this once the user uploads their CSV.
 * Format mirrors the my_positions Sheets schema.
 *
 * Tickers seen in screenshot:
 * AMGN, NVDA, MSFT, VST, MOH, GOOGL, AMZN, LULU,
 * GLAD, SCHW, QYLD, ABBV, ABT, AAPL, ON, AXON,
 * QCOM, MU, DIS, UBFO, IAU
 */

export const MOCK_POSITIONS = {
  NVDA:  { ticker: 'NVDA',  quantity: 0.12,  avg_cost: 175.00, mkt_value: 168.00  },
  MSFT:  { ticker: 'MSFT',  quantity: 0.05,  avg_cost: 392.69, mkt_value: 380.00  },
  GOOGL: { ticker: 'GOOGL', quantity: 0.07,  avg_cost: 303.16, mkt_value: 295.00  },
  AMZN:  { ticker: 'AMZN',  quantity: 0.10,  avg_cost: 204.25, mkt_value: 210.00  },
  AAPL:  { ticker: 'AAPL',  quantity: 0.0001,avg_cost: 270.36, mkt_value: 268.00  },
  AMGN:  { ticker: 'AMGN',  quantity: 0.50,  avg_cost: 280.00, mkt_value: 275.00  },
  ABBV:  { ticker: 'ABBV',  quantity: 0.50,  avg_cost: 200.00, mkt_value: 195.00  },
  ABT:   { ticker: 'ABT',   quantity: 0.40,  avg_cost: 120.00, mkt_value: 118.00  },
  AXON:  { ticker: 'AXON',  quantity: 0.02,  avg_cost: 481.50, mkt_value: 490.00  },
  QCOM:  { ticker: 'QCOM',  quantity: 0.07,  avg_cost: 150.97, mkt_value: 148.00  },
  MU:    { ticker: 'MU',    quantity: 0.02,  avg_cost: 412.13, mkt_value: 400.00  },
  MOH:   { ticker: 'MOH',   quantity: 0.14,  avg_cost: 149.81, mkt_value: 145.00  },
  VST:   { ticker: 'VST',   quantity: 0.13,  avg_cost: 170.38, mkt_value: 180.00  },
  LULU:  { ticker: 'LULU',  quantity: 0.12,  avg_cost: 179.20, mkt_value: 172.00  },
  ON:    { ticker: 'ON',    quantity: 0.17,  avg_cost: 59.89,  mkt_value: 58.00   },
  GLAD:  { ticker: 'GLAD',  quantity: 0.02,  avg_cost: 18.40,  mkt_value: 18.00   },
  SCHW:  { ticker: 'SCHW',  quantity: 0.02,  avg_cost: 95.64,  mkt_value: 97.00   },
  QYLD:  { ticker: 'QYLD',  quantity: 0.04,  avg_cost: 17.64,  mkt_value: 17.00   },
  DIS:   { ticker: 'DIS',   quantity: 0.003, avg_cost: 112.66, mkt_value: 110.00  },
  UBFO:  { ticker: 'UBFO',  quantity: 0.05,  avg_cost: 10.04,  mkt_value: 10.00   },
  IAU:   { ticker: 'IAU',   quantity: 2.00,  avg_cost: 83.25,  mkt_value: 90.00   },
}

export const MOCK_LAST_UPDATE = '2026-03-07'
export const MOCK_ACCOUNT     = 'Joint Tenant XXX805'
