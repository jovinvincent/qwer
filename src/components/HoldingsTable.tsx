import { useState } from "react";
import { Search, Edit2, Trash2, Check, X, ShieldAlert, ArrowUpRight, ArrowDownRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { HoldingWithLiveStats, AssetType } from "../types";
import { formatINR } from "./SummaryCards";

interface HoldingsTableProps {
  holdings: HoldingWithLiveStats[];
  onUpdateHolding: (id: string, quantity: number, avgPrice: number) => void;
  onDeleteHolding: (id: string) => void;
}

export default function HoldingsTable({ holdings, onUpdateHolding, onDeleteHolding }: HoldingsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<AssetType | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");
  
  // Sorting options
  const [sortKey, setSortKey] = useState<"none" | "name" | "investedValue" | "currentValue" | "dailyChangePercent" | "totalGainLossPercent">("none");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleToggleSort = (key: typeof sortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("desc");
    } else if (sortDirection === "desc") {
      setSortDirection("asc");
    } else {
      setSortKey("none");
    }
  };

  // Advanced typo correction helper
  const getLevenshteinDistance = (a: string, b: string): number => {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) tmp[i] = [i];
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1,
          tmp[i][j - 1] + 1,
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return tmp[a.length][b.length];
  };

  // Expanded synonym, abbreviations, and expiry month maps for all asset classes
  const SYNONYMS: Record<string, string[]> = {
    "rel": ["reliance", "rel", "relfut"],
    "reliance": ["rel", "reliance", "relfut"],
    "itc": ["itc"],
    "hdfc": ["hdfc", "hdfcbank", "hdfclife"],
    "icici": ["icici", "icicibank", "icicipru"],
    "adani": ["adani", "adanient", "adanigreen"],
    "vbl": ["varun", "beverages", "vbl"],
    "dlf": ["dlf"],
    "lt": ["larsen", "toubro", "l&t", "ltts"],
    "techm": ["tech", "mahindra", "techm"],
    "biocon": ["biocon"],
    "godrej": ["godrej", "properties", "godrejprop"],
    "bajaj": ["bajaj", "finserv"],
    "jsw": ["jsw", "infrastructure", "jswinfra"],
    "sona": ["sona", "blw", "sonacoms"],
    "inox": ["inox", "india", "inoxindia"],
    "hfcl": ["hfcl"],
    "yes": ["yes", "bank", "yesbank"],
    "ongc": ["oil", "natural", "gas", "ongc"],
    "crude": ["crude", "oil", "crudeoil", "crud", "brent", "natgas", "natural gas"],
    "oil": ["crude", "oil", "crudeoil", "crud"],
    "gold": ["gold", "goldbees", "gld", "goldmini", "bees"],
    "silver": ["silver", "silverbees", "slv", "silverm", "silvermini", "silvermicro", "bees"],
    "natgas": ["natural", "gas", "natgas", "crude", "crudeoil"],
    "glod": ["gold"],
    "silvr": ["silver"],
    "crud": ["crude"],
    "fut": ["future", "futures", "fut", "etcd"],
    "future": ["future", "futures", "fut", "etcd"],
    "f&o": ["future", "option", "derivative", "ce", "pe"],
    "opt": ["option", "options", "call", "put", "ce", "pe"],
    "option": ["option", "options", "call", "put", "ce", "pe"],
    "ce": ["call", "ce", "option", "options"],
    "pe": ["put", "pe", "option", "options"],
    "call": ["ce", "call", "option"],
    "put": ["pe", "put", "option"],
    "nifty": ["nifty", "index", "^nsei", "^nsemdcp", "midcap"],
    "midcap": ["midcap", "nifty", "index", "^nsemdcp"],
    "gsec": ["debt", "bond", "sovereign", "g-sec", "gilt", "government"],
    "bond": ["debt", "bond", "sovereign", "g-sec", "gilt", "in10yt", "government"],
    "gilt": ["gilt", "mutual", "fund", "debt", "bond"],
    "government": ["debt", "bond", "sovereign", "g-sec", "gilt", "government", "gsec"],
    "sovereign": ["debt", "bond", "sovereign", "g-sec", "gilt", "government"],
    "bees": ["etf", "bees", "goldbees", "silverbees"],
    "treps": ["repo", "cash", "equivalent", "treps_proxy"],
    "repo": ["treps", "cash", "equivalent", "treps_proxy"],
    "mcx": ["mcx", "silver", "crude", "crudeoil", "gold", "etcd"],
    "usd": ["cash", "equivalent", "money_market", "currency", "inr"],
    "inr": ["cash", "equivalent", "money_market", "currency", "usd"],
    "currency": ["cash", "equivalent", "money_market", "currency"],
    "mf": ["mutual", "fund", "gilt", "growth"],
    "fund": ["mutual", "fund", "gilt", "growth", "bees", "etf"],
    "etf": ["etf", "bees", "goldbees", "silverbees"],
    "jan": ["january", "jan", "01"],
    "feb": ["february", "feb", "02"],
    "mar": ["march", "mar", "03"],
    "apr": ["april", "apr", "04"],
    "may": ["may", "05"],
    "jun": ["june", "jun", "06"],
    "jul": ["july", "jul", "07", "280726", "200726"],
    "aug": ["august", "aug", "08"],
    "sep": ["september", "sep", "09", "040926"],
    "oct": ["october", "oct", "10"],
    "nov": ["november", "nov", "11"],
    "dec": ["december", "dec", "12"]
  };

  // Tokenize packed strings like "RELFUT30SEP2026" or "silverm"
  const tokenizeQuery = (query: string): string[] => {
    let q = query.toLowerCase().trim();
    if (!q) return [];

    // Replace common characters with spaces
    q = q.replace(/[\s\-_.\^]+/g, " ");

    // Normalizations for common terms
    q = q.replace(/\bnatgas\b/g, "natural gas");
    q = q.replace(/\bcrud oil\b/g, "crude oil");
    q = q.replace(/\bglod\b/g, "gold");
    q = q.replace(/\bsilvr\b/g, "silver");
    q = q.replace(/\bcrud\b/g, "crude");
    q = q.replace(/\bsilverm\b/g, "silver mini");

    // Space separation for packed elements
    const hasDigits = /\d/.test(q);
    if (hasDigits) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const keywords = ["fut", "future", "ce", "pe", "opt", "option", "mini", "micro"];

      for (const m of months) {
        q = q.replace(new RegExp(`(${m})`, "gi"), " $1 ");
      }
      for (const kw of keywords) {
        q = q.replace(new RegExp(`(${kw})`, "gi"), " $1 ");
      }
      q = q.replace(/(\d+)/g, " $1 ");
    }

    return q.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  };

  // Advanced Instrument-Aware Fuzzy Match Score
  const advancedFuzzyMatch = (h: HoldingWithLiveStats, queryStr: string): { match: boolean; score: number } => {
    const qTokens = tokenizeQuery(queryStr);
    if (qTokens.length === 0) return { match: true, score: 0 };

    const nameLower = h.name.toLowerCase();
    const symbolLower = h.symbol.toLowerCase();
    const isinLower = h.isin ? h.isin.toLowerCase() : "";
    const typeLower = h.type.toLowerCase();
    const subCategoryLower = h.subCategory ? h.subCategory.toLowerCase() : "";
    const industryLower = h.industry ? h.industry.toLowerCase() : "";

    // 1. Direct exact matches are highest priority
    const cleanQuery = queryStr.toLowerCase().trim().replace(/[\s\-_.\^]+/g, "");
    const cleanName = nameLower.replace(/[\s\-_.\^]+/g, "");
    const cleanSymbol = symbolLower.replace(/[\s\-_.\^]+/g, "");
    const cleanIsin = isinLower.replace(/[\s\-_.\^]+/g, "");

    if (cleanName === cleanQuery || cleanSymbol === cleanQuery || cleanIsin === cleanQuery) {
      return { match: true, score: 2500 };
    }

    if (cleanName.includes(cleanQuery) || cleanSymbol.includes(cleanQuery)) {
      return { match: true, score: 1200 - cleanName.indexOf(cleanQuery) };
    }

    // 2. Tokenization and expansion of asset words
    const hTokens = Array.from(new Set([
      ...nameLower.replace(/[\s\-_.\^]+/g, " ").split(" ").filter(Boolean),
      ...symbolLower.replace(/[\s\-_.\^]+/g, " ").split(" ").filter(Boolean),
      ...subCategoryLower.replace(/[\s\-_.\^]+/g, " ").split(" ").filter(Boolean),
      ...industryLower.replace(/[\s\-_.\^]+/g, " ").split(" ").filter(Boolean),
      isinLower
    ]));

    // Check conflict groups to avoid matching Gold with Silver etc.
    const conflictGroups = [
      ["gold", "goldbees", "gld"],
      ["silver", "silverbees", "slv", "silverm"],
      ["crude", "crudeoil", "oil", "crud"],
      ["itc"],
      ["bajaj", "bajajfinserv"],
      ["godrej", "godrejprop"],
      ["biocon"],
      ["vbl", "varun"],
      ["dlf"],
      ["tata", "tatamotors", "tatasteel"],
      ["lt", "larsen", "ltts", "l&t"],
      ["hdfc", "hdfcbank", "hdfclife"],
      ["icici", "icicibank", "icicipru"],
      ["adani", "adanient", "adanigreen"],
      ["nifty", "index"],
    ];

    let hasConflict = false;
    for (const group of conflictGroups) {
      const qHasGroup = qTokens.some(qt => group.some(g => qt === g || (SYNONYMS[qt] && SYNONYMS[qt].includes(g))));
      if (qHasGroup) {
        const hHasGroup = hTokens.some(ht => group.some(g => ht === g || (SYNONYMS[ht] && SYNONYMS[ht].includes(g))));
        if (!hHasGroup) {
          hasConflict = true;
          break;
        }
      }
    }

    if (hasConflict) {
      return { match: false, score: 0 };
    }

    // Compute matches and scores for each query token
    let matchCount = 0;
    let totalScore = 0;

    for (const qt of qTokens) {
      let bestTokenScore = 0;
      let isTokenMatched = false;

      // Special check: derivative (F&O) indicators
      const isFutKeyword = qt === "fut" || qt === "future" || qt === "futures";
      const isOptKeyword = qt === "opt" || qt === "option" || qt === "options" || qt === "ce" || qt === "pe" || qt === "call" || qt === "put";
      const isDerivativeAsset = typeLower === "derivative" || nameLower.includes("future") || nameLower.includes("short");

      if (isFutKeyword && isDerivativeAsset) {
        bestTokenScore = Math.max(bestTokenScore, 180);
        isTokenMatched = true;
      }
      if (isOptKeyword && isDerivativeAsset) {
        bestTokenScore = Math.max(bestTokenScore, 140);
        isTokenMatched = true;
      }

      // Check against all holding tokens
      for (const ht of hTokens) {
        if (qt === ht) {
          bestTokenScore = Math.max(bestTokenScore, 200);
          isTokenMatched = true;
          continue;
        }

        // Synonym match
        const qSyns = SYNONYMS[qt] || [];
        const hSyns = SYNONYMS[ht] || [];
        if (qSyns.includes(ht) || hSyns.includes(qt) || qSyns.some(s => hSyns.includes(s))) {
          bestTokenScore = Math.max(bestTokenScore, 180);
          isTokenMatched = true;
          continue;
        }

        // Prefix match
        if (qt.length >= 3 && ht.startsWith(qt)) {
          bestTokenScore = Math.max(bestTokenScore, 120);
          isTokenMatched = true;
          continue;
        }

        // Substring match
        if (qt.length >= 3 && ht.includes(qt)) {
          bestTokenScore = Math.max(bestTokenScore, 90);
          isTokenMatched = true;
          continue;
        }

        // Typo check (Levenshtein)
        if (qt.length >= 3 && ht.length >= 3) {
          const dist = getLevenshteinDistance(qt, ht);
          const maxLen = Math.max(qt.length, ht.length);
          if (dist <= 1 || (dist <= 2 && maxLen >= 6)) {
            bestTokenScore = Math.max(bestTokenScore, 150 - dist * 25);
            isTokenMatched = true;
          }
        }
      }

      if (isTokenMatched) {
        matchCount++;
        totalScore += bestTokenScore;
      }
    }

    // Additional checks for specific instrument matches
    // 1. Expiry Month check: If query has month name and holding matches
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const queryMonth = qTokens.find(qt => months.includes(qt));
    if (queryMonth) {
      const matchMonthSyns = SYNONYMS[queryMonth] || [];
      const hHasMonth = hTokens.some(ht => matchMonthSyns.includes(ht) || ht.includes(queryMonth));
      if (hHasMonth) {
        totalScore += 200; // Large boost for matching expiry month!
      }
    }

    // 2. Exchange MCX check
    if (qTokens.includes("mcx")) {
      const isMcxLinked = nameLower.includes("mcx") || symbolLower === "silver" || symbolLower === "crudeoil";
      if (isMcxLinked) {
        totalScore += 150;
      }
    }

    // 3. Variant Check: mini/micro/m
    const hasMiniKeyword = qTokens.some(qt => qt === "mini" || qt === "micro" || qt === "m");
    if (hasMiniKeyword) {
      const isVariantLinked = nameLower.includes("mini") || nameLower.includes("micro") || nameLower.includes("etcd") || symbolLower === "silver" || symbolLower === "crudeoil";
      if (isVariantLinked) {
        totalScore += 150;
      }
    }

    const matchRatio = matchCount / qTokens.length;
    // Word-order independent matching: if we matched at least 1 token and either matched >= 50% or scored high
    const isMatched = matchCount > 0 && (matchRatio >= 0.5 || totalScore >= 200);

    return {
      match: isMatched,
      score: totalScore + (matchRatio * 400),
    };
  };

  // Filter and score holdings
  const scoredHoldings = holdings.map((h) => {
    const matchResult = advancedFuzzyMatch(h, searchTerm);
    
    const matchesCategory =
      searchTerm.trim().length > 0 ||
      activeCategory === "all" ||
      (activeCategory === "equity" && (h.type === "equity" || h.type === "reit")) ||
      h.type === activeCategory;

    return {
      holding: h,
      match: matchResult.match && matchesCategory,
      score: matchResult.score,
    };
  });

  const filteredHoldings = scoredHoldings.filter((x) => x.match).map((x) => x.holding);

  // Sort filtered holdings
  const sortedHoldings = [...scoredHoldings.filter((x) => x.match)].sort((a, b) => {
    // If searchTerm is active, prioritize fuzzy match score
    if (searchTerm.trim().length > 0) {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
    }

    if (sortKey === "none") return 0;

    let aVal: any = a.holding[sortKey];
    let bVal: any = b.holding[sortKey];

    if (sortKey === "name") {
      aVal = a.holding.name.toLowerCase();
      bVal = b.holding.name.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  }).map((x) => x.holding);

  // Start editing a row
  const startEdit = (h: HoldingWithLiveStats) => {
    setEditingId(h.id);
    setEditQty(h.quantity.toString());
    setEditPrice(h.avgPrice.toString());
  };

  // Save changes
  const saveEdit = (id: string) => {
    const qty = parseFloat(editQty);
    const prc = parseFloat(editPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(prc) || prc < 0) {
      alert("Please enter valid positive numbers.");
      return;
    }
    onUpdateHolding(id, qty, prc);
    setEditingId(null);
  };

  // Grouped breakdown
  const counts = {
    all: holdings.length,
    equity: holdings.filter((h) => h.type === "equity" || h.type === "reit").length,
    derivative: holdings.filter((h) => h.type === "derivative").length,
    commodity: holdings.filter((h) => h.type === "commodity").length,
    debt: holdings.filter((h) => h.type === "debt").length,
    money_market: holdings.filter((h) => h.type === "money_market").length,
    others: holdings.filter((h) => h.type === "others").length,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-150 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-sans">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All Positions ({counts.all})
          </button>
          <button
            onClick={() => setActiveCategory("equity")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "equity"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Equities ({counts.equity})
          </button>
          <button
            onClick={() => setActiveCategory("derivative")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "derivative"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Hedging Shorts ({counts.derivative})
          </button>
          <button
            onClick={() => setActiveCategory("commodity")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "commodity"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Commodities ({counts.commodity})
          </button>
          <button
            onClick={() => setActiveCategory("debt")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "debt"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Debt & Bonds ({counts.debt})
          </button>
          <button
            onClick={() => setActiveCategory("money_market")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "money_market"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Money Market ({counts.money_market})
          </button>
          <button
            onClick={() => setActiveCategory("others")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeCategory === "others"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            ETFs & Cash ({counts.others})
          </button>
        </div>

        {/* Search & Sort controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Sort By:</span>
            <select
              value={`${sortKey}-${sortDirection}`}
              onChange={(e) => {
                const [key, dir] = e.target.value.split("-");
                setSortKey(key as any);
                setSortDirection(dir as any);
              }}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="none-desc">Default Order</option>
              <option value="dailyChangePercent-desc">Today's % Change (High to Low)</option>
              <option value="dailyChangePercent-asc">Today's % Change (Low to High)</option>
              <option value="totalGainLossPercent-desc">Total Return % (High to Low)</option>
              <option value="totalGainLossPercent-asc">Total Return % (Low to High)</option>
              <option value="currentValue-desc">Current Value (High to Low)</option>
              <option value="investedValue-desc">Invested Value (High to Low)</option>
              <option value="name-asc">Name (A-Z)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search ticker or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-sans"
            />
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="overflow-x-auto">
        {filteredHoldings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <ShieldAlert className="w-10 h-10 text-slate-300 animate-bounce" />
            <p className="mt-2 text-sm font-semibold text-slate-600 font-sans">
              No holdings found
            </p>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Try adjusting your filters or search criteria.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans border-b border-slate-150 select-none">
                <th className="py-3.5 px-5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("name")}>
                  <div className="flex items-center gap-1">
                    <span>Asset Details</span>
                    {sortKey === "name" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Avg Cost / Qty</th>
                <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("investedValue")}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Invested Value</span>
                    {sortKey === "investedValue" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Live Price / NAV</th>
                <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("currentValue")}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Current Value</span>
                    {sortKey === "currentValue" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("dailyChangePercent")}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Today's Change</span>
                    {sortKey === "dailyChangePercent" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleToggleSort("totalGainLossPercent")}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Return</span>
                    {sortKey === "totalGainLossPercent" ? (sortDirection === "desc" ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <ArrowUp className="w-3 h-3 text-emerald-500" />) : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
                <th className="py-3.5 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedHoldings.map((h) => {
                const isEditing = editingId === h.id;
                const dayIsUp = h.dailyChangeAmount >= 0;
                const totalIsUp = h.totalGainLossAmount >= 0;

                return (
                  <tr
                    key={h.id}
                    className="hover:bg-slate-50/50 transition-colors text-xs font-sans group border-b border-slate-100"
                  >
                    {/* Column 1: Asset Details */}
                    <td className="py-4 px-5 max-w-[240px]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 leading-tight">
                            {h.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                            {h.symbol}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                              h.type === "equity"
                                ? "bg-indigo-50 text-indigo-600"
                                : h.type === "reit"
                                ? "bg-sky-50 text-sky-600"
                                : h.type === "derivative"
                                ? "bg-rose-50 text-rose-600"
                                : h.type === "commodity"
                                ? "bg-orange-50 text-orange-600"
                                : h.type === "debt"
                                ? "bg-amber-50 text-amber-600"
                                : h.type === "money_market"
                                ? "bg-slate-150 text-slate-700"
                                : "bg-teal-50 text-teal-600"
                            }`}
                          >
                            {h.type === "equity"
                              ? "Equity"
                              : h.type === "reit"
                              ? "REIT"
                              : h.type === "derivative"
                              ? "Derivative Short"
                              : h.type === "commodity"
                              ? "Commodity Fut"
                              : h.type === "debt"
                              ? "Sovereign Debt"
                              : h.type === "money_market"
                              ? "Money Market"
                              : "ETF / Cash"}
                          </span>

                          {/* Position (Long/Short) badge */}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                              h.position === "long"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {h.position}
                          </span>

                          {h.subCategory && (
                            <span className="text-slate-400 font-medium">
                              {h.subCategory}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Avg Cost / Qty */}
                    <td className="py-4 px-4 text-right font-mono">
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5 items-end justify-end">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">P:</span>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-20 px-1 py-0.5 text-xs bg-white border border-slate-300 rounded text-right focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Q:</span>
                            <input
                              type="number"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              className="w-20 px-1 py-0.5 text-xs bg-white border border-slate-300 rounded text-right focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-slate-900 font-medium">
                            ₹{h.avgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {h.quantity.toLocaleString("en-IN", { maximumFractionDigits: 3 })} Units
                          </div>
                        </>
                      )}
                    </td>

                    {/* Column 3: Invested Value */}
                    <td className="py-4 px-4 text-right font-mono text-slate-900 font-medium">
                      {formatINR(h.investedValue)}
                    </td>

                    {/* Column 4: Live Price / NAV */}
                    <td className="py-4 px-4 text-right font-mono">
                      <div className="text-slate-900 font-bold">
                        ₹{h.currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {h.isEstimate && (
                          <span
                            className="text-[8px] bg-sky-50 text-sky-600 px-1 rounded font-sans uppercase font-bold"
                            title="Market is open. NAV estimated live using Nifty 50 movement index proxy."
                          >
                            Estimated Proxy
                          </span>
                        )}
                        {!h.isEstimate && h.type === "others" && (
                          <span className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded font-sans uppercase">
                            Official AMFI
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400">
                          {h.lastUpdated}
                        </span>
                      </div>
                    </td>

                    {/* Column 5: Current Value */}
                    <td className="py-4 px-4 text-right font-mono text-slate-900 font-bold">
                      {formatINR(h.currentValue)}
                    </td>

                    {/* Column 6: Today's Change */}
                    <td
                      className={`py-4 px-4 text-right font-mono font-bold ${
                        dayIsUp ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        {dayIsUp ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {dayIsUp ? "+" : ""}
                          {h.dailyChangePercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {dayIsUp ? "+" : ""}
                        {formatINR(h.dailyChangeAmount)}
                      </div>
                    </td>

                    {/* Column 7: Total Return */}
                    <td
                      className={`py-4 px-4 text-right font-mono font-bold ${
                        totalIsUp ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      <div>
                        {totalIsUp ? "+" : ""}
                        {h.totalGainLossPercent.toFixed(2)}%
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {totalIsUp ? "+" : ""}
                        {formatINR(h.totalGainLossAmount)}
                      </div>
                    </td>

                    {/* Column 8: Actions */}
                    <td className="py-4 px-5 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => saveEdit(h.id)}
                            className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded cursor-pointer transition-colors"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded cursor-pointer transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(h)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded cursor-pointer transition-colors"
                            title="Edit Holding"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${h.name} from your portfolio?`)) {
                                onDeleteHolding(h.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded cursor-pointer transition-colors"
                            title="Delete Holding"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
