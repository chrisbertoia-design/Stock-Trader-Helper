/**
 * Real positions from Schwab PDF — Joint Tenant ...805
 * Updated: 03/14/2026 3:24 PM ET
 *
 * Account summary:
 *   Total market value:  $2,330.18
 *   Total cost basis:    $2,165.94
 *   Total gain/loss:     +$164.24 (+7.58%)
 *   Cash & equivalents:  $335.06
 *   Account total:       $2,665.24
 *
 * avg_cost computed as: cost_basis / qty
 */

export const MOCK_POSITIONS = {
  // ── Equities — sorted by gain/loss desc (as shown in PDF) ─────────────────

  TER:  { ticker:'TER',  qty:0.1597,  price:286.42, mkt_val:45.74,   cost_basis:15.48,  avg_cost:96.93,   gl_pct:195.48 },
  GM:   { ticker:'GM',   qty:0.7957,  price:72.39,  mkt_val:57.60,   cost_basis:40.31,  avg_cost:50.66,   gl_pct:42.89  },
  AMGN: { ticker:'AMGN', qty:0.0596,  price:366.21, mkt_val:21.83,   cost_basis:15.69,  avg_cost:263.26,  gl_pct:39.13  },
  NOC:  { ticker:'NOC',  qty:0.1667,  price:733.71, mkt_val:122.31,  cost_basis:91.83,  avg_cost:550.87,  gl_pct:33.19  },
  SCHW: { ticker:'SCHW', qty:5.0829,  price:93.06,  mkt_val:473.01,  cost_basis:367.70, avg_cost:72.35,   gl_pct:28.64  },
  ABBV: { ticker:'ABBV', qty:0.345,   price:219.68, mkt_val:75.79,   cost_basis:62.66,  avg_cost:181.62,  gl_pct:20.95  },
  WBD:  { ticker:'WBD',  qty:0.3333,  price:27.14,  mkt_val:9.05,    cost_basis:7.50,   avg_cost:22.50,   gl_pct:20.67  },
  LYV:  { ticker:'LYV',  qty:0.1155,  price:153.97, mkt_val:17.78,   cost_basis:15.00,  avg_cost:129.87,  gl_pct:18.53  },
  AAPL: { ticker:'AAPL', qty:0.1487,  price:250.12, mkt_val:37.19,   cost_basis:32.60,  avg_cost:219.24,  gl_pct:14.08  },
  GRMN: { ticker:'GRMN', qty:0.0735,  price:233.52, mkt_val:17.16,   cost_basis:15.24,  avg_cost:207.35,  gl_pct:12.60  },
  JOBY: { ticker:'JOBY', qty:17,      price:9.70,   mkt_val:164.90,  cost_basis:148.24, avg_cost:8.72,    gl_pct:11.24  },
  TSLA: { ticker:'TSLA', qty:0.0626,  price:391.20, mkt_val:24.49,   cost_basis:22.88,  avg_cost:365.66,  gl_pct:7.04   },
  UBFO: { ticker:'UBFO', qty:4.2678,  price:10.14,  mkt_val:43.28,   cost_basis:41.15,  avg_cost:9.64,    gl_pct:5.18   },
  MU:   { ticker:'MU',   qty:0.0242,  price:426.13, mkt_val:10.31,   cost_basis:9.97,   avg_cost:411.98,  gl_pct:3.41   },
  NVDA: { ticker:'NVDA', qty:0.2481,  price:180.25, mkt_val:44.72,   cost_basis:44.33,  avg_cost:178.68,  gl_pct:0.88   },
  LDOS: { ticker:'LDOS', qty:0.1798,  price:173.43, mkt_val:31.18,   cost_basis:31.25,  avg_cost:173.81,  gl_pct:-0.22  },
  GOOGL:{ ticker:'GOOGL',qty:0.0706,  price:302.28, mkt_val:21.34,   cost_basis:21.40,  avg_cost:303.12,  gl_pct:-0.28  },
  MOH:  { ticker:'MOH',  qty:0.143,   price:149.20, mkt_val:21.34,   cost_basis:21.42,  avg_cost:149.79,  gl_pct:-0.37  },
  HII:  { ticker:'HII',  qty:0.0748,  price:415.71, mkt_val:31.10,   cost_basis:31.23,  avg_cost:417.51,  gl_pct:-0.42  },
  IBM:  { ticker:'IBM',  qty:0.1258,  price:246.28, mkt_val:30.98,   cost_basis:31.23,  avg_cost:248.25,  gl_pct:-0.80  },
  GD:   { ticker:'GD',   qty:0.0881,  price:351.52, mkt_val:30.97,   cost_basis:31.25,  avg_cost:354.71,  gl_pct:-0.90  },
  LMT:  { ticker:'LMT',  qty:0.0478,  price:646.00, mkt_val:30.88,   cost_basis:31.20,  avg_cost:652.72,  gl_pct:-1.03  },
  RTX:  { ticker:'RTX',  qty:0.1505,  price:204.52, mkt_val:30.78,   cost_basis:31.24,  avg_cost:207.62,  gl_pct:-1.47  },
  LHX:  { ticker:'LHX',  qty:0.0854,  price:358.96, mkt_val:30.66,   cost_basis:31.23,  avg_cost:365.69,  gl_pct:-1.83  },
  TXT:  { ticker:'TXT',  qty:0.3367,  price:91.05,  mkt_val:30.66,   cost_basis:31.25,  avg_cost:92.82,   gl_pct:-1.89  },
  HON:  { ticker:'HON',  qty:0.1302,  price:234.50, mkt_val:30.53,   cost_basis:31.23,  avg_cost:239.86,  gl_pct:-2.24  },
  ON:   { ticker:'ON',   qty:0.1669,  price:58.55,  mkt_val:9.77,    cost_basis:10.00,  avg_cost:59.92,   gl_pct:-2.30  },
  AXON: { ticker:'AXON', qty:0.081,   price:496.18, mkt_val:40.19,   cost_basis:41.20,  avg_cost:508.64,  gl_pct:-2.45  },
  BA:   { ticker:'BA',   qty:0.145,   price:209.89, mkt_val:30.43,   cost_basis:31.23,  avg_cost:215.38,  gl_pct:-2.56  },
  AMZN: { ticker:'AMZN', qty:0.287,   price:207.67, mkt_val:59.60,   cost_basis:61.39,  avg_cost:213.91,  gl_pct:-2.92  },
  TDG:  { ticker:'TDG',  qty:0.0249,  price:1214.66,mkt_val:30.25,   cost_basis:31.16,  avg_cost:1251.41, gl_pct:-2.92  },
  PLTR: { ticker:'PLTR', qty:0.3445,  price:150.95, mkt_val:52.00,   cost_basis:54.15,  avg_cost:157.18,  gl_pct:-3.97  },
  HWM:  { ticker:'HWM',  qty:0.1237,  price:236.75, mkt_val:29.29,   cost_basis:31.23,  avg_cost:252.46,  gl_pct:-6.21  },
  VST:  { ticker:'VST',  qty:0.1257,  price:158.95, mkt_val:19.98,   cost_basis:21.42,  avg_cost:170.41,  gl_pct:-6.72  },
  GE:   { ticker:'GE',   qty:0.0965,  price:299.69, mkt_val:28.92,   cost_basis:31.25,  avg_cost:323.83,  gl_pct:-7.46  },
  MSFT: { ticker:'MSFT', qty:0.0852,  price:395.55, mkt_val:33.70,   cost_basis:36.92,  avg_cost:433.33,  gl_pct:-8.72  },
  META: { ticker:'META', qty:0.0593,  price:613.18, mkt_val:36.36,   cost_basis:39.87,  avg_cost:672.34,  gl_pct:-8.80  },
  ABT:  { ticker:'ABT',  qty:0.6766,  price:108.03, mkt_val:73.09,   cost_basis:82.05,  avg_cost:121.27,  gl_pct:-10.92 },
  LULU: { ticker:'LULU', qty:0.1196,  price:157.78, mkt_val:18.85,   cost_basis:21.41,  avg_cost:179.01,  gl_pct:-11.96 },
  QCOM: { ticker:'QCOM', qty:0.0662,  price:129.82, mkt_val:8.59,    cost_basis:9.99,   avg_cost:150.91,  gl_pct:-14.01 },
  DIS:  { ticker:'DIS',  qty:0.4081,  price:99.29,  mkt_val:40.52,   cost_basis:47.85,  avg_cost:117.25,  gl_pct:-15.32 },
  NFLX: { ticker:'NFLX', qty:0.353,   price:95.31,  mkt_val:33.64,   cost_basis:39.84,  avg_cost:112.86,  gl_pct:-15.56 },
  GLAD: { ticker:'GLAD', qty:0.2486,  price:17.51,  mkt_val:4.35,    cost_basis:7.30,   avg_cost:29.37,   gl_pct:-40.41 },
  NOW:  { ticker:'NOW',  qty:0.016,   price:113.62, mkt_val:1.82,    cost_basis:1.82,   avg_cost:113.75,  gl_pct:0      },
  WDAY: { ticker:'WDAY', qty:0.0659,  price:133.09, mkt_val:8.77,    cost_basis:15.41,  avg_cost:233.84,  gl_pct:-43.09 },

  // ── ETFs & Closed End Funds ────────────────────────────────────────────────
  IAU:  { ticker:'IAU',  qty:2,       price:94.38,  mkt_val:188.76,  cost_basis:166.50, avg_cost:83.25,   gl_pct:13.37  },
  QYLD: { ticker:'QYLD', qty:4.0762,  price:17.45,  mkt_val:71.13,   cost_basis:72.08,  avg_cost:17.68,   gl_pct:-1.32  },
}

// Positions excluded (zero/near-zero value):
// OPITQ (Office Properties REIT) — $0.17 mkt val, -99.44% — effectively zero
// FISKER (33813J108) — bankrupt, $0.00

export const ACCOUNT_SUMMARY = {
  account:          'Joint Tenant ...805',
  last_update:      '2026-03-14',
  update_time:      '3:24 PM ET',
  total_mkt_value:  2330.18,
  total_cost_basis: 2165.94,
  total_gain_loss:  164.24,
  total_gl_pct:     7.58,
  cash:             335.06,
  account_total:    2665.24,
  equity_value:     2045.87,
  etf_value:        259.89,
}

// Legacy alias for components that import the old shape
export const MOCK_LAST_UPDATE = '2026-03-14'
export const MOCK_ACCOUNT     = 'Joint Tenant ...805'
