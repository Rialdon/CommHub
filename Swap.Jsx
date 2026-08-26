import { useState } from "react";
import { ArrowDownUp, ChevronDown, TrendingUp, Lock } from "lucide-react";

// Dummy price table — ganti dengan data live feed kamu kalau sudah ada
const ASSETS = {
  BTC: { name: "Bitcoin", price: 79398, color: "#F7931A" },
  ETH: { name: "Ethereum", price: 2483.99, color: "#3C3C3D" },
  BNB: { name: "BNB", price: 700.18, color: "#F0B90B" },
  RIALO: { name: "Rialo", price: 0.42, color: "#EDE3CE" },
};

const c = {
  bg: "#FFFFFF",
  panel: "#FFFFFF",
  field: "#F5F6F8",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.08)",
  borderSoft: "rgba(0,0,0,0.06)",
  textDim: "rgba(0,0,0,0.35)",
  textFaint: "rgba(0,0,0,0.3)",
  textMuted: "rgba(0,0,0,0.55)",
  text: "#111318",
  mint: "#2563EB",
  mintBorder: "rgba(37,99,235,0.25)",
  mintBg: "rgba(37,99,235,0.08)",
};

function CoinIcon({ symbol, size = 20 }) {
  const asset = ASSETS[symbol];
  const wrap = {
    width: size,
    height: size,
    borderRadius: "50%",
    backgroundColor: asset.color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  };

  if (symbol === "BTC") {
    return (
      <div style={wrap}>
        <span style={{ color: "#fff", fontSize: size * 0.6, fontWeight: 800, lineHeight: 1 }}>₿</span>
      </div>
    );
  }
  if (symbol === "ETH") {
    return (
      <div style={wrap}>
        <svg width={size * 0.45} height={size * 0.72} viewBox="0 0 32 52" fill="none">
          <path d="M16 0L15.5 1.6V35.3L16 35.8L31 27.1L16 0Z" fill="#C6C6C6" />
          <path d="M16 0L1 27.1L16 35.8V19.1V0Z" fill="#fff" />
          <path d="M16 38.6L15.7 39V51L16 51.9L31 30L16 38.6Z" fill="#C6C6C6" />
          <path d="M16 51.9V38.6L1 30L16 51.9Z" fill="#fff" />
          <path d="M16 35.8L31 27.1L16 19.1V35.8Z" fill="#8C8C8C" />
          <path d="M1 27.1L16 35.8V19.1L1 27.1Z" fill="#C6C6C6" />
        </svg>
      </div>
    );
  }
  if (symbol === "BNB") {
    return (
      <div style={wrap}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 32 32" fill="none">
          <rect x="10.5" y="0.5" width="11" height="11" transform="rotate(45 16 6)" fill="#fff" />
          <rect x="1" y="10" width="11" height="11" transform="rotate(45 6.5 15.5)" fill="#fff" />
          <rect x="20" y="10" width="11" height="11" transform="rotate(45 25.5 15.5)" fill="#fff" />
          <rect x="10.5" y="19.5" width="11" height="11" transform="rotate(45 16 25)" fill="#fff" />
          <rect x="12.5" y="12.5" width="7" height="7" transform="rotate(45 16 16)" fill="#fff" />
        </svg>
      </div>
    );
  }
  // RIALO — belum ada logo resmi, tampilkan lingkaran krem polos
  return <div style={wrap} />;
}

function TokenPicker({ open, onClose, onSelect, exclude }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: "100%",
        marginTop: 8,
        width: 176,
        borderRadius: 16,
        backgroundColor: c.card,
        border: `1px solid ${c.border}`,
        boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
        zIndex: 20,
        overflow: "hidden",
      }}
    >
      {Object.entries(ASSETS)
        .filter(([sym]) => sym !== exclude)
        .map(([sym, a]) => (
          <button
            key={sym}
            onClick={() => {
              onSelect(sym);
              onClose();
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <CoinIcon symbol={sym} size={20} />
            <span style={{ fontSize: 14, color: "rgba(0,0,0,0.85)", fontWeight: 600 }}>{sym}</span>
            <span style={{ fontSize: 12, color: c.textDim, marginLeft: "auto" }}>{a.name}</span>
          </button>
        ))}
    </div>
  );
}

function TokenField({ label, symbol, amount, onAmountChange, onSymbol, exclude, readOnly }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const asset = ASSETS[symbol];

  return (
    <div
      style={{
        borderRadius: 16,
        backgroundColor: c.field,
        border: `1px solid ${c.borderSoft}`,
        padding: "12px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: c.textFaint }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: c.textFaint }}>
          $
          {(Number(amount || 0) * asset.price).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          readOnly={readOnly}
          onChange={(e) => onAmountChange(e.target.value)}
          style={{
            background: "transparent",
            outline: "none",
            border: "none",
            fontSize: 24,
            fontWeight: 600,
            color: c.text,
            width: "100%",
          }}
        />
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(0,0,0,0.045)",
              border: "none",
              borderRadius: 999,
              padding: "6px 10px 6px 6px",
              cursor: "pointer",
            }}
          >
            <CoinIcon symbol={symbol} size={20} />
            <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{symbol}</span>
            <ChevronDown size={14} color="rgba(0,0,0,0.45)" />
          </button>
          <TokenPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={onSymbol}
            exclude={exclude}
          />
        </div>
      </div>
    </div>
  );
}

export default function SwapDemo() {
  const [expanded, setExpanded] = useState(false);
  const [fromSym, setFromSym] = useState("BTC");
  const [toSym, setToSym] = useState("RIALO");
  const [fromAmt, setFromAmt] = useState("0.01");

  const rate = ASSETS[fromSym].price / ASSETS[toSym].price;
  const toAmt = fromAmt ? (Number(fromAmt) * rate).toFixed(6) : "";

  function flip() {
    setFromSym(toSym);
    setToSym(fromSym);
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Trigger — ini yang menggantikan tombol "Trading (Soon)" lama */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 16,
          border: `1px solid ${c.mintBorder}`,
          backgroundColor: c.mintBg,
          color: c.mint,
          fontWeight: 600,
          padding: "16px",
          cursor: "pointer",
        }}
      >
        <TrendingUp size={18} />
        {expanded ? "Close Trading" : "Trading"}
      </button>

      {/* Panel swap — muncul di tempat yang sama, tanpa pindah halaman */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
          marginTop: expanded ? 12 : 0,
          transition: "all 300ms ease-out",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              borderRadius: 24,
              border: `1px solid ${c.border}`,
              backgroundColor: c.panel,
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 4px" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: c.textMuted }}>Swap</span>
            </div>

            <TokenField
              label="From"
              symbol={fromSym}
              amount={fromAmt}
              onAmountChange={setFromAmt}
              onSymbol={setFromSym}
              exclude={toSym}
            />

            <div style={{ display: "flex", justifyContent: "center", margin: "-4px 0", position: "relative", zIndex: 10 }}>
              <button
                onClick={flip}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: c.card,
                  border: `1px solid ${c.border}`,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ArrowDownUp size={15} color={c.mint} />
              </button>
            </div>

            <TokenField
              label="To (estimated)"
              symbol={toSym}
              amount={toAmt}
              onAmountChange={() => {}}
              onSymbol={setToSym}
              exclude={fromSym}
              readOnly
            />

            <div style={{ fontSize: 11, color: c.textFaint, padding: "4px 4px 0" }}>
              1 {fromSym} ≈ {rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toSym}
            </div>

            <button
              disabled
              title="Trading not yet active"
              style={{
                width: "100%",
                marginTop: 8,
                borderRadius: 16,
                padding: "14px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "rgba(0,0,0,0.045)",
                color: "rgba(0,0,0,0.35)",
                border: "none",
                cursor: "not-allowed",
              }}
            >
              <Lock size={16} /> Locked
            </button>

            <p style={{ fontSize: 10, color: c.textFaint, textAlign: "center", padding: "4px 8px 0" }}>
              Preview only. Swap is not functional yet — no real transactions or wallet/blockchain connection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
