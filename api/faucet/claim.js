const { ethers } = require("ethers");
const { createClient } = require("@supabase/supabase-js");

// ================== KONFIGURASI ==================
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;
const RIALO_TOKEN_ADDRESS = process.env.RIALO_TOKEN_ADDRESS;
const CLAIM_AMOUNT = "100"; // 100 RIALO per klaim
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 jam

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

module.exports = async (req, res) => {
  // Cuma terima method POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  try {
    const { address } = req.body || {};

    // 1. Validasi address
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: "Address tidak valid." });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ip = getClientIp(req);
    const now = Date.now();

    // 2. Cek record IP yang sudah pernah klaim
    const { data: existing, error: selectError } = await supabase
      .from("faucet_claims")
      .select("claimed_at")
      .eq("ip", ip)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      const lastClaimMs = new Date(existing.claimed_at).getTime();
      const diff = now - lastClaimMs;

      if (diff < COOLDOWN_MS) {
        const remainingHours = Math.ceil((COOLDOWN_MS - diff) / (60 * 60 * 1000));
        return res.status(429).json({
          error: `Your IP already claimed. Try again in ${remainingHours} hours.`,
        });
      }
    }

    // 3. Setup provider & wallet server, kirim token
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
    const token = new ethers.Contract(RIALO_TOKEN_ADDRESS, ERC20_ABI, wallet);

    const decimals = await token.decimals();
    const amount = ethers.parseUnits(CLAIM_AMOUNT, decimals);
    const tx = await token.transfer(address, amount);
    await tx.wait();

    // 4. Simpan / update waktu klaim untuk IP ini (setelah tx sukses)
    const { error: upsertError } = await supabase
      .from("faucet_claims")
      .upsert({ ip, claimed_at: new Date(now).toISOString() }, { onConflict: "ip" });

    if (upsertError) throw upsertError;

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      amount: CLAIM_AMOUNT,
    });
  } catch (err) {
    console.error("Faucet claim error:", err);
    return res.status(500).json({ error: "Gagal mengirim token. Coba lagi nanti." });
  }
};
