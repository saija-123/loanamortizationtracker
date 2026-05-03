import { useState, useMemo, useRef, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const COLORS = {
  bg: "#0f1117",
  surface: "#181b23",
  surfaceAlt: "#1e2230",
  border: "#2a2e3a",
  borderLight: "#363b4a",
  gold: "#c8a24e",
  goldLight: "#e0c068",
  goldDim: "#8a7034",
  text: "#e8e6e1",
  textMuted: "#9b9a97",
  textDim: "#6b6a68",
  accent: "#4a9c7e",
  accentAlt: "#5a7cbf",
  red: "#c45c5c",
  chartPrincipal: "#4a9c7e",
  chartInterest: "#c8a24e",
  chartBalance: "#5a7cbf",
};

function formatCurrency(val) {
  if (val >= 1e6) return "$" + (val / 1e6).toFixed(2) + "M";
  if (val >= 1e3) return "$" + (val / 1e3).toFixed(1) + "K";
  return "$" + val.toFixed(2);
}

function formatFull(val) {
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calculateAmortization(principal, annualRate, months) {
  if (!principal || !annualRate || !months) return { schedule: [], emi: 0, totalInterest: 0, totalPayment: 0 };
  const r = annualRate / 100 / 12;
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  let balance = principal;
  const schedule = [];
  let totalInterest = 0;

  for (let i = 1; i <= months; i++) {
    const interestPayment = balance * r;
    const principalPayment = emi - interestPayment;
    balance = Math.max(0, balance - principalPayment);
    totalInterest += interestPayment;
    schedule.push({
      month: i,
      emi: emi,
      principal: principalPayment,
      interest: interestPayment,
      balance: balance,
      totalPrincipal: principal - balance,
      totalInterest: totalInterest,
    });
  }

  return { schedule, emi, totalInterest, totalPayment: emi * months };
}

function SliderInput({ label, value, onChange, min, max, step, unit, prefix }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.textMuted }}>
          {label}
        </label>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: COLORS.gold }}>
          {prefix}{typeof value === "number" ? value.toLocaleString() : value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%",
          height: 4,
          appearance: "none",
          background: `linear-gradient(to right, ${COLORS.gold} 0%, ${COLORS.gold} ${((value - min) / (max - min)) * 100}%, ${COLORS.border} ${((value - min) / (max - min)) * 100}%, ${COLORS.border} 100%)`,
          borderRadius: 2,
          outline: "none",
          cursor: "pointer",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, color: COLORS.textDim }}>{prefix}{min.toLocaleString()}{unit}</span>
        <span style={{ fontSize: 10, color: COLORS.textDim }}>{prefix}{max.toLocaleString()}{unit}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div style={{
      background: COLORS.surfaceAlt,
      border: `1px solid ${accent ? COLORS.goldDim : COLORS.border}`,
      borderRadius: 8,
      padding: "20px 18px",
      flex: 1,
      minWidth: 160,
    }}>
      <div style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.textDim, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: accent ? COLORS.gold : COLORS.text, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, type }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 6,
      padding: "10px 14px",
      fontSize: 12,
      fontFamily: "'DM Sans', sans-serif",
      color: COLORS.text,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: COLORS.textMuted }}>Month {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span style={{ color: COLORS.textMuted }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{formatFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const TABS = ["Overview", "Amortization Schedule", "Balance Analysis"];

export default function LoanAmortizationTracker() {
  const [principal, setPrincipal] = useState(50000);
  const [rate, setRate] = useState(7.5);
  const [tenure, setTenure] = useState(36);
  const [activeTab, setActiveTab] = useState(0);
  const [animatedIn, setAnimatedIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimatedIn(true), 100);
  }, []);

  const { schedule, emi, totalInterest, totalPayment } = useMemo(
    () => calculateAmortization(principal, rate, tenure),
    [principal, rate, tenure]
  );

  const pieData = [
    { name: "Principal", value: principal },
    { name: "Interest", value: totalInterest },
  ];

  const yearlyData = useMemo(() => {
    const years = [];
    for (let y = 0; y < Math.ceil(tenure / 12); y++) {
      const start = y * 12;
      const end = Math.min(start + 12, tenure);
      let yearPrincipal = 0;
      let yearInterest = 0;
      for (let m = start; m < end; m++) {
        if (schedule[m]) {
          yearPrincipal += schedule[m].principal;
          yearInterest += schedule[m].interest;
        }
      }
      years.push({ year: `Y${y + 1}`, principal: yearPrincipal, interest: yearInterest });
    }
    return years;
  }, [schedule, tenure]);

  const balanceData = useMemo(() => {
    return schedule.filter((_, i) => i % Math.max(1, Math.floor(tenure / 40)) === 0 || i === schedule.length - 1).map((s) => ({
      month: s.month,
      balance: s.balance,
      paidPrincipal: s.totalPrincipal,
      paidInterest: s.totalInterest,
    }));
  }, [schedule, tenure]);

  const interestRatio = totalPayment > 0 ? ((totalInterest / totalPayment) * 100).toFixed(1) : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: ${COLORS.gold};
          border: 2px solid ${COLORS.bg};
          cursor: pointer;
          box-shadow: 0 0 8px rgba(200,162,78,0.4);
        }
        input[type=range]::-moz-range-thumb {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: ${COLORS.gold};
          border: 2px solid ${COLORS.bg};
          cursor: pointer;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "20px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        opacity: animatedIn ? 1 : 0,
        transform: animatedIn ? "translateY(0)" : "translateY(-12px)",
        transition: "all 0.6s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 32, height: 32,
            border: `2px solid ${COLORS.gold}`,
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Instrument Serif', serif",
            fontSize: 18, color: COLORS.gold,
          }}>A</div>
          <div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, letterSpacing: "-0.02em" }}>
              Amortize
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.textDim }}>
              Loan Analytics Engine
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Personal Finance Tool -- v1.0
        </div>
      </header>

      <div style={{
        display: "flex",
        minHeight: "calc(100vh - 73px)",
        opacity: animatedIn ? 1 : 0,
        transition: "opacity 0.8s ease 0.2s",
      }}>
        {/* Left Panel - Controls */}
        <div style={{
          width: 340,
          minWidth: 340,
          borderRight: `1px solid ${COLORS.border}`,
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.goldDim, marginBottom: 28 }}>
            Loan Parameters
          </div>

          <SliderInput label="Loan Amount" value={principal} onChange={setPrincipal} min={1000} max={500000} step={1000} unit="" prefix="$" />
          <SliderInput label="Interest Rate (Annual)" value={rate} onChange={setRate} min={1} max={30} step={0.1} unit="%" prefix="" />
          <SliderInput label="Loan Tenure" value={tenure} onChange={setTenure} min={6} max={360} step={1} unit=" mo" prefix="" />

          <div style={{ marginTop: "auto", paddingTop: 32 }}>
            <div style={{
              background: `linear-gradient(135deg, ${COLORS.surfaceAlt}, ${COLORS.surface})`,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "20px 18px",
            }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.textDim, marginBottom: 12 }}>
                Monthly EMI
              </div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 38, color: COLORS.gold, lineHeight: 1 }}>
                {formatFull(emi)}
              </div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8 }}>
                for {tenure} months at {rate}% p.a.
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Dashboard */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
          {/* Stats Row */}
          <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
            <StatCard label="Total Payment" value={formatCurrency(totalPayment)} sub={formatFull(totalPayment)} accent />
            <StatCard label="Total Interest" value={formatCurrency(totalInterest)} sub={`${interestRatio}% of total`} />
            <StatCard label="Principal" value={formatCurrency(principal)} sub="Original loan amount" />
            <StatCard label="Tenure" value={`${tenure} mo`} sub={`${(tenure / 12).toFixed(1)} years`} />
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 28 }}>
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "10px 20px",
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.04em",
                  color: activeTab === i ? COLORS.gold : COLORS.textDim,
                  borderBottom: activeTab === i ? `2px solid ${COLORS.gold}` : "2px solid transparent",
                  transition: "all 0.25s ease",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ animation: "fadeUp 0.4s ease" }} key={activeTab}>
            {activeTab === 0 && (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {/* Pie Chart */}
                <div style={{
                  background: COLORS.surfaceAlt,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 24,
                  flex: "1 1 300px",
                  minHeight: 320,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.textDim, marginBottom: 16 }}>
                    Payment Breakdown
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        dataKey="value"
                        stroke={COLORS.bg}
                        strokeWidth={3}
                      >
                        <Cell fill={COLORS.chartPrincipal} />
                        <Cell fill={COLORS.chartInterest} />
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div style={{
                              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                              borderRadius: 6, padding: "8px 12px", fontSize: 12,
                              fontFamily: "'DM Sans', sans-serif", color: COLORS.text,
                              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                            }}>
                              <div style={{ color: COLORS.textMuted, marginBottom: 2 }}>{payload[0].name}</div>
                              <div style={{ fontWeight: 600 }}>{formatFull(payload[0].value)}</div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8 }}>
                    {[{ name: "Principal", color: COLORS.chartPrincipal }, { name: "Interest", color: COLORS.chartInterest }].map((l) => (
                      <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                        <span style={{ fontSize: 11, color: COLORS.textMuted }}>{l.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Yearly Breakdown Bar Chart */}
                <div style={{
                  background: COLORS.surfaceAlt,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 24,
                  flex: "1 1 380px",
                  minHeight: 320,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.textDim, marginBottom: 16 }}>
                    Yearly Principal vs Interest
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={yearlyData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: COLORS.textDim }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: COLORS.textDim }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="principal" name="Principal" fill={COLORS.chartPrincipal} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="interest" name="Interest" fill={COLORS.chartInterest} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div style={{
                background: COLORS.surfaceAlt,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                overflow: "hidden",
              }}>
                <div style={{ overflowX: "auto", maxHeight: 520 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ position: "sticky", top: 0, background: COLORS.surface, zIndex: 2 }}>
                        {["Month", "EMI", "Principal", "Interest", "Balance"].map((h) => (
                          <th key={h} style={{
                            padding: "14px 16px",
                            textAlign: "right",
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: COLORS.textDim,
                            borderBottom: `1px solid ${COLORS.border}`,
                            fontWeight: 500,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row, i) => (
                        <tr
                          key={row.month}
                          style={{
                            background: i % 2 === 0 ? "transparent" : COLORS.surface,
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = COLORS.borderLight + "40"}
                          onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : COLORS.surface}
                        >
                          <td style={{ padding: "10px 16px", textAlign: "right", color: COLORS.textMuted, fontVariantNumeric: "tabular-nums" }}>{row.month}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatFull(row.emi)}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: COLORS.accent, fontVariantNumeric: "tabular-nums" }}>{formatFull(row.principal)}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: COLORS.gold, fontVariantNumeric: "tabular-nums" }}>{formatFull(row.interest)}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{formatFull(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Balance Over Time */}
                <div style={{
                  background: COLORS.surfaceAlt,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 24,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.textDim, marginBottom: 16 }}>
                    Outstanding Balance Over Time
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={balanceData}>
                      <defs>
                        <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.chartBalance} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.chartBalance} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: COLORS.textDim }} axisLine={{ stroke: COLORS.border }} tickLine={false} label={{ value: "Month", position: "insideBottom", offset: -2, fill: COLORS.textDim, fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10, fill: COLORS.textDim }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="balance" name="Balance" stroke={COLORS.chartBalance} fill="url(#balGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Cumulative Principal vs Interest */}
                <div style={{
                  background: COLORS.surfaceAlt,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 24,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.textDim, marginBottom: 16 }}>
                    Cumulative Principal vs Interest Paid
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={balanceData}>
                      <defs>
                        <linearGradient id="prinGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.chartPrincipal} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={COLORS.chartPrincipal} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.chartInterest} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={COLORS.chartInterest} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: COLORS.textDim }} axisLine={{ stroke: COLORS.border }} tickLine={false} label={{ value: "Month", position: "insideBottom", offset: -2, fill: COLORS.textDim, fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10, fill: COLORS.textDim }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" align="right" iconType="square" iconSize={10}
                        formatter={(val) => <span style={{ fontSize: 11, color: COLORS.textMuted }}>{val}</span>} />
                      <Area type="monotone" dataKey="paidPrincipal" name="Principal Paid" stroke={COLORS.chartPrincipal} fill="url(#prinGrad)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="paidInterest" name="Interest Paid" stroke={COLORS.chartInterest} fill="url(#intGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em" }}>
              Built for CMSC 435 -- Software Engineering
            </span>
            <span style={{ fontSize: 10, color: COLORS.textDim }}>
              Standard amortization formula -- for educational purposes only
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
