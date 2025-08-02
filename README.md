# 🤖 Somnia exchange Auto Swap Bot (Multi Wallet, Infinite Loop)

An automated bot for farming points on Somnia Testnet by continuously swapping between `STT ⇄ USDTg` and `STT ⇄ NIA`.
Supports multiple wallets and runs in an infinite loop without manual input.

---

## 🔧 Features

* 🔁 Auto bidirectional swapping:

  * STT → USDTg → STT
  * STT → NIA → STT
* 👛 Multi-wallet support (from `wallets.json`)
* 🔂 Infinite loop per wallet
* 🕒 Random delay between swaps (30–60 seconds)
* ✅ Automatic token approval
* ✨ Slippage protection (5%)


---

## 📁 Project Structure

```
somnia-exchange-zr/
├── somiaswap-multi.js       # Main bot script
├── .env                     # RPC & token config
├── wallets.json             # Wallet list
├── package.json             # Dependencies + ESM mode
```

---

## 📦 Installation

1. Enter your project folder:

   ```bash
   git clone https://github.com/zamallrock/somnia-exchange-swap-zr.git
   cd somnia-exchange-swap-zr
   ```

2. Install dependencies:

   ```bash
   npm install
   ```


   
4. Fill your `wallets.json` with private keys:

   ```json
   [
     { "name": "wallet1", "privateKey": "0x..." },
     { "name": "wallet2", "privateKey": "0x..." }
   ]
   ```

## 🚀 Running the Bot

```bash
node somiaswap-multi.js
```

The bot will:

* Run each wallet in sequence
* Swap: STT → USDTg → STT → NIA → STT (looped)
* Wait 30–60s between each swap
* Report transactions to Somnia automatically

---



---

## 🙏 Credits

Created by \[zamallrock] with assistance from ChatGPT

---

## ⚠️ Disclaimer

This script is provided for educational and testnet farming purposes only. Use at your own risk.
