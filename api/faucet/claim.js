const { ethers } = require("ethers");
const { createClient } = require("@supabase/supabase-js");

// ================== KONFIGURASI ==================
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;
const RIALO_TOKEN_ADDRESS = process.env.RIALO_TOKEN_ADDRESS;
const FAUCET_CONTRACT_ADDRESS = process.env.FAUCET_CONTRACT_ADDRESS; // address RialoFaucet.sol yang baru di-deploy
const CLAIM_AMOUNT = "100"; // 100 RIALO per klaim
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 jam

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cloudflare Turnstile (gratis). Daftar di https://dash.cloudflare.com/?to=/:account/turnstile
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

// IPQualityScore (opsional, buat deteksi VPN/proxy/datacenter IP). Kosongkan kalau belum pakai.
const IPQS_API_KEY = process.env.IPQS_API_KEY;

const FAUCET_ABI = [
  "function claim(address to) external",
];

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

async function verifyCaptcha(token, ip) {
  if (!TURNSTILE_SECRET_KEY) return true; // captcha belum dikonfigurasi, lewati
  if (!token) return false;

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
  });
  const data = await resp.json();
  return data.success === true;
}

async function isSuspiciousIp(ip) {
  if (!IPQS_API_KEY || ip === "unknown") return false; // deteksi belum dikonfigurasi

  try {
    const url = `https://ipqualityscore.com/api/json/ip/${IPQS_API_KEY}/${encodeURIComponent(ip)}?strictness=1`;
    const resp = await fetch(url);
    const data = await resp.json();

    // Deteksi utama: proxy/VPN/Tor eksplisit, atau fraud score tinggi
    const flaggedByCore = Boolean(data.proxy || data.vpn || data.tor || (data.fraud_score ?? 0) >= 75);

    // Deteksi tambahan: IP dari Data Center / Hosting jarang sekali dipakai user asli.
    // Banyak VPN pakai IP baru yang belum sempat ditandai vpn=true, tapi connection_type
    // tetap kelihatan sebagai "Data Center" karena memang disewa dari provider hosting.
    const connectionType = (data.connection_type || "").toLowerCase();
    const flaggedByConnectionType = connectionType.includes("data center") || connectionType.includes("hosting");

    return flaggedByCore || flaggedByConnectionType;
  } catch (err) {
    console.error("IPQS check failed:", err);
    return false; // gagal cek jangan sampai memblokir user yang sah
  }
}

module.exports = async (req, res) => {
  // Cuma terima method POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan." });
  }

  try {
    const { address, captchaToken } = req.body || {};

    // 1. Validasi address
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: "Address tidak valid." });
    }
    const normalizedAddress = address.toLowerCase();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ip = getClientIp(req);
    const now = Date.now();

    // 2. Verifikasi captcha (mencegah bot/otomasi)
    const captchaOk = await verifyCaptcha(captchaToken, ip);
    if (!captchaOk) {
      return res.status(400).json({ error: "Verifikasi captcha gagal. Coba lagi." });
    }

    // 3. Deteksi VPN/proxy/datacenter IP (bikin ganti IP jadi lebih sulit dipakai buat bypass)
    if (await isSuspiciousIp(ip)) {
      return res.status(403).json({
        error: "Klaim dari VPN/proxy tidak diizinkan. Matikan VPN dan coba lagi.",
      });
    }

    // 4. Cek record IP yang sudah pernah klaim
    const { data: existingByIp, error: ipSelectError } = await supabase
      .from("faucet_claims")
      .select("claimed_at")
      .eq("ip", ip)
      .maybeSingle();
    if (ipSelectError) throw ipSelectError;

    if (existingByIp) {
      const diff = now - new Date(existingByIp.claimed_at).getTime();
      if (diff < COOLDOWN_MS) {
        const remainingHours = Math.ceil((COOLDOWN_MS - diff) / (60 * 60 * 1000));
        return res.status(429).json({
          error: `Your IP already claimed. Try again in ${remainingHours} hours.`,
        });
      }
    }

    // 5. Cek record wallet address yang sudah pernah klaim (supaya ganti IP/VPN saja tidak cukup)
    const { data: existingByWallet, error: walletSelectError } = await supabase
      .from("faucet_claims_wallet")
      .select("claimed_at")
      .eq("wallet", normalizedAddress)
      .maybeSingle();
    if (walletSelectError) throw walletSelectError;

    if (existingByWallet) {
      const diff = now - new Date(existingByWallet.claimed_at).getTime();
      if (diff < COOLDOWN_MS) {
        const remainingHours = Math.ceil((COOLDOWN_MS - diff) / (60 * 60 * 1000));
        return res.status(429).json({
          error: `This wallet already claimed. Try again in ${remainingHours} hours.`,
        });
      }
    }

    // 6. Setup provider & wallet server, panggil claim() di kontrak faucet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
    const faucet = new ethers.Contract(FAUCET_CONTRACT_ADDRESS, FAUCET_ABI, wallet);

    const tx = await faucet.claim(address);
    await tx.wait();

    // 7. Simpan / update waktu klaim untuk IP dan wallet (setelah tx sukses)
    const nowIso = new Date(now).toISOString();

    const { error: ipUpsertError } = await supabase
      .from("faucet_claims")
      .upsert({ ip, claimed_at: nowIso }, { onConflict: "ip" });
    if (ipUpsertError) throw ipUpsertError;

    const { error: walletUpsertError } = await supabase
      .from("faucet_claims_wallet")
      .upsert({ wallet: normalizedAddress, claimed_at: nowIso }, { onConflict: "wallet" });
    if (walletUpsertError) throw walletUpsertError;

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
