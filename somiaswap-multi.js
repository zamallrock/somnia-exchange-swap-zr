import { ethers } from "ethers";
import fs from "fs";
import fetch from "node-fetch";

console.log("\n✪ ZAMALLROCK | SOMNIA EXCHANGE AUTO BOT ✪\n");

const config = JSON.parse(fs.readFileSync("config.json"));
const RPC_URL = config.rpc;
const USDTG_ADDRESS = config.usdtg;
const NIA_ADDRESS = config.nia;
const WSTT_ADDRESS = config.wstt;
const ROUTER_ADDRESS = "0xb98c15a0dC1e271132e341250703c7e94c059e8D";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[])",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[])",
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] memory)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallets = JSON.parse(fs.readFileSync("wallets.json"));

function log(msg, type = "info") {
  const now = new Date().toLocaleTimeString();
  let prefix = "";
  if (type === "success") prefix = "\x1b[32m[SUCCESS]\x1b[0m";
  else if (type === "error") prefix = "\x1b[31m[ERROR]\x1b[0m";
  else if (type === "warn") prefix = "\x1b[33m[WARN]\x1b[0m";
  else prefix = "\x1b[36m[INFO]\x1b[0m";
  console.log(`${prefix} [${now}] ${msg}`);
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function getRandom(min, max, fixed = 3) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(fixed));
}

async function approveIfNeeded(wallet, tokenAddr, amount) {
  try {
    const contract = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
    const allowance = await contract.allowance(wallet.address, ROUTER_ADDRESS);
    const decimals = await contract.decimals();
    const amountParsed = ethers.parseUnits(amount.toString(), decimals);
    if (allowance >= amountParsed) return;
    const tx = await contract.approve(ROUTER_ADDRESS, ethers.MaxUint256);
    await tx.wait();
    log(`Approved ${tokenAddr.slice(0,6)}... for ${wallet.address.slice(0,6)}...`, "success");
  } catch (e) {
    log(`Approval failed: ${e.message}`, "error");
  }
}

async function getAmountOut(amountIn, path) {
  try {
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);
    const result = await router.getAmountsOut(amountIn, path);
    return result[result.length - 1];
  } catch {
    return BigInt(0);
  }
}

async function reportTx(addr) {
  try {
    const res = await fetch("https://api.somnia.exchange/api/completeTask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: addr, taskId: "make-swap" })
    });

    if (!res.ok) {
      log(`Report failed: HTTP ${res.status}`, "warn");
      return;
    }

    const data = await res.json();
    if (data.success) {
      const awarded = data.data.task.actualPointsAwarded;
      log(`Reported: +${awarded} points`, "success");
    }
  } catch (e) {
    log(`Report failed: ${e.message}`, "warn");
  }
}

async function swapSttTo(wallet, targetToken, path) {
  try {
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    const amount = getRandom(0.01, 0.05);
    const amountIn = ethers.parseEther(amount.toString());

    const nativeBalance = await provider.getBalance(wallet.address);
    if (nativeBalance < amountIn) {
      log(`Insufficient STT balance on ${wallet.address.slice(0, 6)}...`, "warn");
      return;
    }

    const amountOutMin = await getAmountOut(amountIn, path);
    const minOut = amountOutMin * 95n / 100n;
    if (minOut <= 0n) {
      log(`Estimation failed: ${targetToken}`, "warn");
      return;
    }

    const deadline = Math.floor(Date.now() / 1000) + 600;
    log(`Swapping ${amount} STT ➜ ${targetToken} for ${wallet.address.slice(0,6)}...`, "info");

    const tx = await router.swapExactETHForTokens(minOut, path, wallet.address, deadline, { value: amountIn });
    await tx.wait();
    log(`Swap STT ➜ ${targetToken} success!`, "success");
    await reportTx(wallet.address);
  } catch (e) {
    log(`Swap STT ➜ ${targetToken} failed: ${e.message}`, "error");
  }
}

async function swapToStt(wallet, tokenAddr, path, rangeMin, rangeMax, symbol) {
  try {
    const contract = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
    const decimals = await contract.decimals();
    const balanceRaw = await contract.balanceOf(wallet.address);
    const amount = getRandom(rangeMin, rangeMax);
    const amountIn = ethers.parseUnits(amount.toString(), decimals);

    if (balanceRaw < amountIn) {
      log(`Insufficient ${symbol} balance on ${wallet.address.slice(0, 6)}...`, "warn");
      return;
    }

    await approveIfNeeded(wallet, tokenAddr, amount);

    const amountOutMin = await getAmountOut(amountIn, path);
    const minOut = amountOutMin * 95n / 100n;
    if (minOut <= 0n) {
      log(`Estimation failed: ${symbol} ➜ STT`, "warn");
      return;
    }

    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    const deadline = Math.floor(Date.now() / 1000) + 600;
    log(`Swapping ${amount} ${symbol} ➜ STT for ${wallet.address.slice(0,6)}...`, "info");

    const tx = await router.swapExactTokensForETH(amountIn, minOut, path, wallet.address, deadline);
    await tx.wait();
    log(`Swap ${symbol} ➜ STT success!`, "success");
    await reportTx(wallet.address);
  } catch (e) {
    log(`Swap ${symbol} ➜ STT failed: ${e.message}`, "error");
  }
}

async function run() {
  while (true) {
    for (const entry of wallets) {
      const wallet = new ethers.Wallet(entry.privateKey, provider);
      log(`\n>>> Wallet: ${entry.name} (${wallet.address})`, "info");

      await swapSttTo(wallet, "USDTg", [WSTT_ADDRESS, USDTG_ADDRESS]);
      await delay(getRandom(30000, 60000));
      await swapToStt(wallet, USDTG_ADDRESS, [USDTG_ADDRESS, WSTT_ADDRESS], 0.04, 0.21, "USDTg");
      await delay(getRandom(30000, 60000));

      await swapSttTo(wallet, "NIA", [WSTT_ADDRESS, NIA_ADDRESS]);
      await delay(getRandom(30000, 60000));
      await swapToStt(wallet, NIA_ADDRESS, [NIA_ADDRESS, WSTT_ADDRESS], 2, 10, "NIA");
      await delay(getRandom(30000, 60000));
    }
  }
}

run();
