import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  NetWorthData,
  NetWorthInvestment,
  NetWorthOtherAsset,
  getNetWorthData,
  saveNetWorthData,
  getValuations,
  exportNetWorthExcel,
  formatCurrency,
  calculateTotalNetWorth,
} from "../api/networth";

interface NetWorthPanelProps {
  // ollamaReady prop kept for consistency with other panels
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ollamaReady?: boolean;
}

export default function NetWorthPanel({ ollamaReady: _ }: NetWorthPanelProps) {
  const [data, setData] = useState<NetWorthData>({
    bank_balance: 0,
    investments: [],
    other_assets: [],
    last_updated: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [newInvestment, setNewInvestment] = useState<Partial<NetWorthInvestment>>({
    ticker: "",
    quantity: undefined,
    notes: "",
  });

  const [newAsset, setNewAsset] = useState<Partial<NetWorthOtherAsset>>({
    name: "",
    amount: undefined,
    type: "FD",
    notes: "",
  });

  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedData = await getNetWorthData();
      setData(loadedData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Failed to load net worth data: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveData = async () => {
    try {
      setError(null);
      setSuccess(null);
      await saveNetWorthData(data);
      setSuccess("Net worth data saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Failed to save: ${msg}`);
    }
  };

  const handleAddInvestment = async () => {
    if (!newInvestment.ticker || newInvestment.quantity === undefined) {
      setError("Please enter ticker and quantity");
      return;
    }

    try {
      const valuations = await getValuations([newInvestment.ticker]);
      const valData = valuations[newInvestment.ticker.toUpperCase()];

      const investment: NetWorthInvestment = {
        id: `inv-${Date.now()}`,
        ticker: newInvestment.ticker.toUpperCase(),
        quantity: newInvestment.quantity,
        current_price: valData?.price || 0,
        purchase_date: new Date().toISOString().split("T")[0],
        notes: newInvestment.notes || "",
      };

      setData({
        ...data,
        investments: [...data.investments, investment],
      });
      setNewInvestment({ ticker: "", quantity: undefined, notes: "" });
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Failed to add investment: ${msg}`);
    }
  };

  const handleUpdateInvestment = async (id: string, updates: Partial<NetWorthInvestment>) => {
    try {
      let updated = { ...updates };
      if (updates.ticker && updates.ticker !== data.investments.find(i => i.id === id)?.ticker) {
        const valuations = await getValuations([updates.ticker]);
        const valData = valuations[updates.ticker.toUpperCase()];
        updated.current_price = valData?.price || 0;
      }

      setData({
        ...data,
        investments: data.investments.map(inv =>
          inv.id === id ? { ...inv, ...updated } : inv
        ),
      });
      setEditingInvId(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Failed to update investment: ${msg}`);
    }
  };

  const handleDeleteInvestment = (id: string) => {
    setData({
      ...data,
      investments: data.investments.filter(inv => inv.id !== id),
    });
  };

  const handleAddAsset = () => {
    if (!newAsset.name || newAsset.amount === undefined) {
      setError("Please enter asset name and amount");
      return;
    }

    const asset: NetWorthOtherAsset = {
      id: `asset-${Date.now()}`,
      name: newAsset.name,
      amount: newAsset.amount,
      type: newAsset.type || "FD",
      purchase_date: new Date().toISOString().split("T")[0],
      notes: newAsset.notes || "",
    };

    setData({
      ...data,
      other_assets: [...data.other_assets, asset],
    });
    setNewAsset({ name: "", amount: undefined, type: "FD", notes: "" });
    setError(null);
  };

  const handleDeleteAsset = (id: string) => {
    setData({
      ...data,
      other_assets: data.other_assets.filter(asset => asset.id !== id),
    });
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      await handleSaveData(); // Save first
      const result = await exportNetWorthExcel();
      setSuccess(`Excel exported successfully! Total Net Worth: ${formatCurrency(result.total_networth)}`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Failed to export: ${msg}`);
    } finally {
      setExporting(false);
    }
  };

  const totalInvestmentsValue = data.investments.reduce(
    (sum, inv) => sum + (inv.quantity * (inv.current_price || 0)),
    0
  );
  const totalAssetsValue = data.other_assets.reduce(
    (sum, asset) => sum + asset.amount,
    0
  );
  const totalNetWorth = calculateTotalNetWorth(data);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Net Worth Tracker</h1>
          {data.last_updated && (
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
              Last updated: {new Date(data.last_updated).toLocaleString()}
            </p>
          )}
        </div>
        <motion.button
          onClick={handleExport}
          disabled={exporting}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: "8px 16px",
            background: "var(--gold)",
            color: "#241623",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: exporting ? "not-allowed" : "pointer",
            opacity: exporting ? 0.6 : 1,
          }}
        >
          {exporting ? "Exporting..." : "Export Excel"}
        </motion.button>
      </div>

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            margin: "10px 20px 0",
            padding: "10px 16px",
            background: "var(--red-dim)",
            border: "1px solid var(--red-border)",
            color: "var(--red)",
            borderRadius: "6px",
            fontSize: "13px",
          }}
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            margin: "10px 20px 0",
            padding: "10px 16px",
            background: "var(--green-dim)",
            border: "1px solid var(--green-border)",
            color: "var(--green)",
            borderRadius: "6px",
            fontSize: "13px",
          }}
        >
          {success}
        </motion.div>
      )}

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "20px",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "2px solid var(--cyan-dim)",
                borderTopColor: "var(--cyan)",
              }}
            />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px", marginBottom: "30px" }}>
              <SummaryCard
                label="Bank Balance"
                value={formatCurrency(data.bank_balance)}
                color="var(--cyan)"
              />
              <SummaryCard
                label="Investments Value"
                value={formatCurrency(totalInvestmentsValue)}
                color="var(--gold)"
              />
              <SummaryCard
                label="Other Assets"
                value={formatCurrency(totalAssetsValue)}
                color="var(--green)"
              />
              <SummaryCard
                label="Total Net Worth"
                value={formatCurrency(totalNetWorth)}
                color="var(--amber)"
                highlight
              />
            </div>

            {/* Bank Balance Input */}
            <Section title="Bank Balance">
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="number"
                  placeholder="Enter bank balance"
                  value={data.bank_balance || ""}
                  onChange={(e) =>
                    setData({ ...data, bank_balance: parseFloat(e.target.value) || 0 })
                  }
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "14px",
                  }}
                />
                <motion.button
                  onClick={handleSaveData}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "8px 16px",
                    background: "var(--green)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Update
                </motion.button>
              </div>
            </Section>

            {/* Investments Section */}
            <Section title="Investments (Stocks, ETFs, etc.)">
              {/* Add new investment */}
              <div style={{ background: "var(--accent)", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Add New Investment
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: "10px", alignItems: "flex-end" }}>
                  <input
                    type="text"
                    placeholder="Ticker (e.g., INFY)"
                    value={newInvestment.ticker || ""}
                    onChange={(e) => setNewInvestment({ ...newInvestment, ticker: e.target.value })}
                    style={{
                      padding: "8px 12px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      color: "var(--text)",
                      fontSize: "14px",
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={newInvestment.quantity || ""}
                    onChange={(e) => setNewInvestment({ ...newInvestment, quantity: parseFloat(e.target.value) })}
                    style={{
                      padding: "8px 12px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      color: "var(--text)",
                      fontSize: "14px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={newInvestment.notes || ""}
                    onChange={(e) => setNewInvestment({ ...newInvestment, notes: e.target.value })}
                    style={{
                      padding: "8px 12px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      color: "var(--text)",
                      fontSize: "14px",
                    }}
                  />
                  <motion.button
                    onClick={handleAddInvestment}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "8px 16px",
                      background: "var(--gold)",
                      color: "#241623",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </motion.button>
                </div>
              </div>

              {/* Investment list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data.investments.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                    No investments added yet
                  </p>
                ) : (
                  data.investments.map((inv) => (
                    <InvestmentRow
                      key={inv.id}
                      investment={inv}
                      onUpdate={(updates) => handleUpdateInvestment(inv.id, updates)}
                      onDelete={() => handleDeleteInvestment(inv.id)}
                      isEditing={editingInvId === inv.id}
                      onEditChange={(isEditing) => setEditingInvId(isEditing ? inv.id : null)}
                    />
                  ))
                )}
              </div>
            </Section>

            {/* Other Assets Section */}
            <Section title="Other Assets (RD, FD, Gold, Crypto, etc.)">
              {/* Add new asset */}
              <div style={{ background: "var(--accent)", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Add New Asset
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr auto", gap: "10px", alignItems: "flex-end" }}>
                  <input
                    type="text"
                    placeholder="Asset Name"
                    value={newAsset.name || ""}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    style={{
                      padding: "8px 12px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      color: "var(--text)",
                      fontSize: "14px",
                    }}
                  />
                  <select
                    value={newAsset.type || "FD"}
                    onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                    style={{
                      padding: "8px 12px",
                      background: "var(--accent)",
                      border: "1.5px solid var(--gold)",
                      borderRadius: "6px",
                      color: "var(--text)",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    <option value="FD">FD (Fixed Deposit)</option>
                    <option value="RD">RD (Recurring Deposit)</option>
                    <option value="Gold">Gold</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newAsset.amount || ""}
                    onChange={(e) => setNewAsset({ ...newAsset, amount: parseFloat(e.target.value) })}
                    style={{
                      padding: "8px 12px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      color: "var(--text)",
                      fontSize: "14px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={newAsset.notes || ""}
                    onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                    style={{
                      padding: "8px 12px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      color: "var(--text)",
                      fontSize: "14px",
                    }}
                  />
                  <motion.button
                    onClick={handleAddAsset}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "8px 16px",
                      background: "var(--gold)",
                      color: "#241623",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </motion.button>
                </div>
              </div>

              {/* Asset list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data.other_assets.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                    No other assets added yet
                  </p>
                ) : (
                  data.other_assets.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      onUpdate={(updates) =>
                        setData({
                          ...data,
                          other_assets: data.other_assets.map(a =>
                            a.id === asset.id ? { ...a, ...updates } : a
                          ),
                        })
                      }
                      onDelete={() => handleDeleteAsset(asset.id)}
                      isEditing={editingAssetId === asset.id}
                      onEditChange={(isEditing) => setEditingAssetId(isEditing ? asset.id : null)}
                    />
                  ))
                )}
              </div>
            </Section>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        padding: "16px",
        background: highlight ? `${color}15` : "var(--accent)",
        border: `1px solid ${highlight ? color : "var(--border)"}`,
        borderRadius: "8px",
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: color }}>
        {value}
      </p>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "30px" }}>
      <h3 style={{ margin: "0 0 15px", fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InvestmentRow({
  investment,
  onUpdate,
  onDelete,
  isEditing,
  onEditChange,
}: {
  investment: NetWorthInvestment;
  onUpdate: (updates: Partial<NetWorthInvestment>) => void;
  onDelete: () => void;
  isEditing: boolean;
  onEditChange: (isEditing: boolean) => void;
}) {
  const value = investment.quantity * (investment.current_price || 0);

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        style={{
          padding: "12px",
          background: "var(--accent)",
          border: "1px solid var(--gold)",
          borderRadius: "6px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={investment.ticker}
          onChange={(e) => onUpdate({ ticker: e.target.value })}
          style={{
            padding: "8px 12px",
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text)",
            fontSize: "14px",
          }}
        />
        <input
          type="number"
          value={investment.quantity}
          onChange={(e) => onUpdate({ quantity: parseFloat(e.target.value) })}
          style={{
            padding: "8px 12px",
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text)",
            fontSize: "14px",
          }}
        />
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--gold)" }}>
          {formatCurrency(investment.current_price || 0)}
        </div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green)" }}>
          {formatCurrency(value)}
        </div>
        <motion.button
          onClick={() => onEditChange(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            padding: "6px 12px",
            background: "var(--green)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Done
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ x: 2 }}
      style={{
        padding: "12px",
        background: "var(--accent)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr auto auto",
        gap: "10px",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
        {investment.ticker}
      </div>
      <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        Qty: {investment.quantity}
      </div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--gold)" }}>
        {formatCurrency(investment.current_price || 0)}
      </div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green)" }}>
        {formatCurrency(value)}
      </div>
      <motion.button
        onClick={() => onEditChange(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          padding: "6px 12px",
          background: "var(--cyan-dim)",
          border: "1px solid var(--cyan-border)",
          borderRadius: "4px",
          color: "var(--cyan)",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Edit
      </motion.button>
      <motion.button
        onClick={onDelete}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          padding: "6px 12px",
          background: "var(--red-dim)",
          border: "1px solid var(--red-border)",
          borderRadius: "4px",
          color: "var(--red)",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Delete
      </motion.button>
    </motion.div>
  );
}

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "var(--input-bg)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--text)",
          fontSize: "14px",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {value}
        <span style={{ fontSize: "12px", marginLeft: "8px" }}>▼</span>
      </motion.button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            marginTop: "4px",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {options.map((option) => (
            <motion.button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              whileHover={{ backgroundColor: "var(--accent)" }}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "transparent",
                border: "none",
                color: "var(--text)",
                fontSize: "14px",
                cursor: "pointer",
                textAlign: "left",
                borderBottom: option !== options[options.length - 1] ? "1px solid var(--border)" : "none",
              }}
            >
              {option}
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function AssetRow({
  asset,
  onUpdate,
  onDelete,
  isEditing,
  onEditChange,
}: {
  asset: NetWorthOtherAsset;
  onUpdate: (updates: Partial<NetWorthOtherAsset>) => void;
  onDelete: () => void;
  isEditing: boolean;
  onEditChange: (isEditing: boolean) => void;
}) {
  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        style={{
          padding: "12px",
          background: "var(--accent)",
          border: "1px solid var(--gold)",
          borderRadius: "6px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 2fr auto",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={asset.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          style={{
            padding: "8px 12px",
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text)",
            fontSize: "14px",
          }}
        />
        <CustomSelect
          value={asset.type}
          onChange={(value) => onUpdate({ type: value })}
          options={["FD", "RD", "Gold", "Crypto", "Other"]}
        />
        <input
          type="number"
          value={asset.amount}
          onChange={(e) => onUpdate({ amount: parseFloat(e.target.value) })}
          style={{
            padding: "8px 12px",
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text)",
            fontSize: "14px",
          }}
        />
        <input
          type="text"
          value={asset.notes || ""}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          style={{
            padding: "8px 12px",
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text)",
            fontSize: "14px",
          }}
        />
        <motion.button
          onClick={() => onEditChange(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            padding: "6px 12px",
            background: "var(--green)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Done
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ x: 2 }}
      style={{
        padding: "12px",
        background: "var(--accent)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 2fr auto auto",
        gap: "10px",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
        {asset.name}
      </div>
      <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        {asset.type}
      </div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--green)" }}>
        {formatCurrency(asset.amount)}
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {asset.notes || "—"}
      </div>
      <motion.button
        onClick={() => onEditChange(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          padding: "6px 12px",
          background: "var(--cyan-dim)",
          border: "1px solid var(--cyan-border)",
          borderRadius: "4px",
          color: "var(--cyan)",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Edit
      </motion.button>
      <motion.button
        onClick={onDelete}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          padding: "6px 12px",
          background: "var(--red-dim)",
          border: "1px solid var(--red-border)",
          borderRadius: "4px",
          color: "var(--red)",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Delete
      </motion.button>
    </motion.div>
  );
}
