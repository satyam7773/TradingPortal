import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Briefcase, Eye } from "lucide-react";
import toast from "react-hot-toast";
import userManagementService from "../../services/userManagementService";
import marketWatchService from "../../services/marketWatchService";
import FilterLayout from "../../components/FilterLayout";
import { useOrderModal } from "../../hooks/useOrderModal";
import OrderModal from "../../components/modals/OrderModal";
import ConfigManager from "../../utils/configManager";
import { orderUpdateService } from "../../services";
import SearchableSelect from "../../components/ui/SearchableSelect";

interface PositionData {
  positionId: number;
  positionDate: number | null;
  positionDays: number;
  username: string;
  parentUsername: string;
  exchange: string;
  tradeSymbol: string;
  position: "BUY" | "SELL";
  quantity: number;
  averagePrice: number;
  ltp: number | null;
  pnl: number;
  pnlPercentage: number;
  totalPnl: number;
  token?: number;
  userId?: number;
  netQuantity?: any;
}

interface PositionResponse {
  balance: number;
  totalBuy: number;
  totalSell: number;
  other: number;
  brokerage: number;
  positions: PositionData[];
}

const Positions: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [selectedExchange, setSelectedExchange] =
    useState<string>("All Exchanges");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(
    new Set(),
  );

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [positionData, setPositionData] = useState<PositionResponse | null>(
    null,
  );
  const [filteredPositions, setFilteredPositions] = useState<PositionData[]>(
    [],
  );
  const [users, setUsers] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [symbols, setSymbols] = useState<any[]>([]);

  const feedUnsubscribeRef = useRef<(() => void) | null>(null);
  const subscriptionRef = useRef({
    subscribed: false,
    userId: null as string | null,
  });
  const lastUpdateRef = useRef<number>(0);
  const instrumentConfigRef = useRef<Record<number, any>>({});

  const userDataStr = localStorage.getItem("userData");
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const loggedInUserId = userData?.userId || 31;
  const isAdminUser =
    userData?.roleId === 1 || userData?.roleId === 2 || userData?.roleId === 3;
  const orderModal = useOrderModal(isAdminUser);

  const [liveTicks, setLiveTicks] = useState<Record<number, any>>({});

  // Memoized user options for the SearchableSelect
  const userOptions = useMemo(
    () => users.map((u) => ({
      id: u.userId, name: u.
        userName
    })),
    [users],
  );

  const maxAvailableQuantityRef = useRef<number>(999999);

  const handleDragSetup = (e: React.MouseEvent, type: "BUY" | "SELL") => {
    e.preventDefault();
    const targetModalElement = (e.currentTarget as HTMLElement)
      .parentElement as HTMLElement;
    const rect = targetModalElement.getBoundingClientRect();

    orderModal.setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    if (type === "BUY") orderModal.setIsDraggingBuy(true);
    else orderModal.setIsDraggingSell(true);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (orderModal.isDraggingBuy) {
        orderModal.setBuyModalPosition({
          x: e.clientX - orderModal.dragOffset.x,
          y: e.clientY - orderModal.dragOffset.y,
        });
      }
      if (orderModal.isDraggingSell) {
        orderModal.setSellModalPosition({
          x: e.clientX - orderModal.dragOffset.x,
          y: e.clientY - orderModal.dragOffset.y,
        });
      }
    };

    const handleGlobalMouseUp = () => {
      orderModal.setIsDraggingBuy(false);
      orderModal.setIsDraggingSell(false);
    };

    if (orderModal.isDraggingBuy || orderModal.isDraggingSell) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [
    orderModal.isDraggingBuy,
    orderModal.isDraggingSell,
    orderModal.dragOffset,
  ]);

  useEffect(() => {
    if (
      orderModal.showBuyOrderModal &&
      orderModal.selectedOrderInstrument &&
      orderModal.buyOrderType === "MARKET"
    ) {
      const liveData = liveTicks[orderModal.selectedOrderInstrument.token];
      if (liveData?.ask) {
        orderModal.setBuyOrderPrice(liveData.ask.toFixed(2));
      }
    }
  }, [
    liveTicks,
    orderModal.buyOrderType,
    orderModal.showBuyOrderModal,
    orderModal.selectedOrderInstrument,
  ]);

  useEffect(() => {
    if (
      orderModal.showSellOrderModal &&
      orderModal.selectedOrderInstrument &&
      orderModal.sellOrderType === "MARKET"
    ) {
      const liveData = liveTicks[orderModal.selectedOrderInstrument.token];
      if (liveData?.bid) {
        orderModal.setSellOrderPrice(liveData.bid.toFixed(2));
      }
    }
  }, [
    liveTicks,
    orderModal.sellOrderType,
    orderModal.showSellOrderModal,
    orderModal.selectedOrderInstrument,
  ]);

  const stats = useMemo(
    () => ({
      total: filteredPositions.length,
      buy: filteredPositions.filter((p) => p.position === "BUY").length,
      sell: filteredPositions.filter((p) => p.position === "SELL").length,
      totalPnL: filteredPositions.reduce((sum, p) => sum + (p.pnl || 0), 0),
    }),
    [filteredPositions],
  );

  const unsubscribeCurrentFeed = useCallback(() => {
    marketWatchService.stopPositionsPollingLoop();
    if (feedUnsubscribeRef.current) {
      feedUnsubscribeRef.current();
      feedUnsubscribeRef.current = null;
    }
    if (subscriptionRef.current.subscribed && subscriptionRef.current.userId) {
      const uid = subscriptionRef.current.userId;
      marketWatchService.unsubscribeFromInstruments(uid);
      subscriptionRef.current = { subscribed: false, userId: null };
    }
  }, []);

  const establishStompSubscription = useCallback(
    (userId: string, tokens: string[]) => {
      unsubscribeCurrentFeed();
      marketWatchService.subscribeToInstruments(userId);
      subscriptionRef.current = { subscribed: true, userId };
      marketWatchService.startPositionsPollingLoop(userId, tokens);

      feedUnsubscribeRef.current = marketWatchService.onFeedData((data) => {
        if (!data) return;
        const incomingFeedArray = Array.isArray(data) ? data : [data];
        setLiveTicks((prev) => {
          const nextTicks = { ...prev };
          incomingFeedArray.forEach((item) => {
            nextTicks[Number(item.insToken)] = item;
          });
          return nextTicks;
        });

        const now = Date.now();
        if (now - lastUpdateRef.current < 100) return;
        lastUpdateRef.current = now;

        const feedMap = new Map(
          incomingFeedArray.map((item) => [Number(item.insToken), item]),
        );
        setFilteredPositions((prevPositions) => {
          return prevPositions.map((pos) => {
            const currentToken = Number(pos.token);
            if (!currentToken || !feedMap.has(currentToken)) return pos;
            const tick = feedMap.get(currentToken)!;
            const price = pos.position === "BUY" ? tick.bid : tick.ask;
            const priceChange =
              pos.position === "BUY"
                ? price - pos.averagePrice
                : pos.averagePrice - price;
            const unrealisedPnl =
              priceChange * Math.abs(pos.netQuantity || pos.quantity);
            const amount =
              pos.averagePrice * Math.abs(pos.netQuantity || pos.quantity);
            const unrealisedPnlPercentage =
              amount !== 0 ? (unrealisedPnl * 100) / amount : 0;
            return {
              ...pos,
              ltp: price,
              pnl: unrealisedPnl,
              pnlPercentage: unrealisedPnlPercentage,
            };
          });
        });
      });
    },
    [unsubscribeCurrentFeed],
  );

  const setupLivePositionFeed = useCallback(
    async (positionsList: PositionData[]) => {
      if (!userData) return;
      const userIdStr = userData.userId.toString();
      const tokens = positionsList
        .filter((p) => p.token)
        .map((p) => p.token!.toString());
      if (tokens.length === 0) return;
      if (!marketWatchService.isConnected()) {
        await marketWatchService.connect(() =>
          establishStompSubscription(userIdStr, tokens),
        );
      } else {
        establishStompSubscription(userIdStr, tokens);
      }
    },
    [establishStompSubscription, userData],
  );

  // 1. Updated handleView to prioritize passed arguments over state
  const handleView = async (
    targetExchange?: string,
    targetUserIds?: number[],
  ) => {
    const exchange = targetExchange || selectedExchange;
    if (!exchange) return;
    setLoading(true);
    unsubscribeCurrentFeed();
    setSelectedPositions(new Set());

    try {
      let uids: number[] = [];

      // PRIORITY: If explicit IDs were passed (like during loadInitialData), use them
      if (targetUserIds && targetUserIds.length > 0) {
        uids = targetUserIds;
      }
      // FALLBACK: Use state-based filters
      // else if (selectedUserId !== 0) {
      //   uids = [selectedUserId];
      // } else {
      //   uids = users.filter((u) => u.id !== 0).map((u) => u.id);
      //   if (uids.length === 0) uids = [loggedInUserId];
      // }

      const response =
        await userManagementService.fetchUserPositionsForExchange(
          exchange,
          selectedToken || 0,
          selectedUserId,
        );

      if (response?.responseCode === "0" && response.data) {
        setPositionData(response.data);
        let positions = response.data.positions || [];
        if (selectedSymbol)
          positions = positions.filter(
            (p: PositionData) => p.tradeSymbol === selectedSymbol,
          );
        setFilteredPositions(positions);
        if (positions.length > 0) setupLivePositionFeed(positions);
      } else {
        setFilteredPositions([]);
      }
    } catch (error) {
      setFilteredPositions([]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Updated useEffect to pass IDs explicitly
  useEffect(() => {
    const loadInitialData = async () => {
      unsubscribeCurrentFeed();
      try {
        setInitialLoading(true);
        const userData = localStorage.getItem("userData");
        const user = userData ? JSON.parse(userData) : null;
        const loggedInUserId = user?.userId;
        const usersResponse =
          await userManagementService.fetchOwnUsers(loggedInUserId);
        // const usersResponse = await userManagementService.fetchUserClientsForTrade()
        const exchangesResponse = await userManagementService.fetchExchanges();

        let initialUserIds = [loggedInUserId];

        if (
          usersResponse?.responseCode === "0" &&
          Array.isArray(usersResponse.data)
        ) {
          setUsers(usersResponse.data);
          // CRITICAL: Extract IDs here in the local scope so they aren't empty
          initialUserIds = usersResponse.data.map((u: any) => u.id);
        }

        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse);
          setSelectedExchange(exchangesResponse[0].name);
        }

        const fullConfig = ConfigManager.getFullConfig();
        if (fullConfig && fullConfig.instruments) {
          Object.entries(fullConfig.instruments).forEach(
            ([_, instrumentsList]: [string, any]) => {
              if (Array.isArray(instrumentsList)) {
                instrumentsList.forEach((instrument: any) => {
                  if (instrument.instrumentToken)
                    instrumentConfigRef.current[instrument.instrumentToken] =
                      instrument;
                });
              }
            },
          );
        }

        // Pass IDs explicitly to avoid race condition with the 'users' state
        await handleView(
          exchangesResponse?.[0]?.name || "All Exchanges",
          initialUserIds,
        );
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitialData();
    return () => unsubscribeCurrentFeed();
  }, []); // Empty array ensures this runs only once on mount

  const handleCloseSelectedPositions = async () => {
    if (selectedPositions.size === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to close the ${selectedPositions.size} selected position(s)?`,
      )
    )
      return;

    try {
      setLoading(true);
      const payload = {
        userId: loggedInUserId,
        requestTimestamp: new Date().getTime().toString(),
        deviceId: "WEB",
        tradeOrderMethod: "WEB",
        data: Array.from(selectedPositions),
      };

      const response = await fetch(
        "https://api-staging.rivoplus.live/oms/closeMultiplePositions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();
      if (result?.responseCode === "0" || result?.status === "success") {
        toast.success("Selected positions closed successfully");
        setSelectedPositions(new Set());
        handleView();
      } else {
        toast.error(result?.message || "Failed to close positions");
      }
    } catch (err) {
      toast.error("Error closing positions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = orderUpdateService.onOrderUpdate((order) => {
      if (order.status === "FILLED") handleView();
    });
    return () => unsubscribe();
  }, [handleView]);

  const fetchSymbolsForExchange = async (exchangeName: string) => {
    if (!exchangeName || exchangeName === "All Exchanges") {
      setSymbols([]);
      return;
    }
    try {
      const response = await userManagementService.fetchSymbols(exchangeName);
      if (response?.responseCode === "0" && Array.isArray(response.data))
        setSymbols(response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0)
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20";
    if (pnl < 0)
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
    return "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30";
  };

  const getCMPColor = (ltp: number | null, avg: number) => {
    if (!ltp) return "text-blue-600 dark:text-blue-400";
    return ltp >= avg
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  };

  const handleOpenModifyModal = (
    p: PositionData,
    targetType: "BUY" | "SELL",
  ) => {
    const matchedProfile = users.find((u) => u.username === p.username);
    const targetClientId = p.userId || matchedProfile?.id || loggedInUserId;
    orderModal.setSelectedClient({
      userId: targetClientId,
      name: matchedProfile?.name || p.username,
      username: p.username,
    });
    orderModal.setClientSearchTerm(
      `${matchedProfile?.name || p.username} (${p.username})`,
    );
    maxAvailableQuantityRef.current =
      p.exchange === "CALLPUT" ? Math.abs(p.quantity) : 999999;
    const cachedConfig = p.token ? instrumentConfigRef.current[p.token] : null;
    const mergedConfig = {
      exchange: p.exchange,
      tradeSymbol: p.tradeSymbol,
      instrumentName: p.tradeSymbol,
      script: p.tradeSymbol,
      lotSize: cachedConfig?.lotSize || 100,
    };
    if (targetType === "BUY") {
      orderModal.setBuyOrderQuantity(p.quantity.toString());
      orderModal.setBuyOrderPrice(p.averagePrice.toString());
      orderModal.setBuyOrderType("LIMIT");
      orderModal.openBuyModal({ token: p.token || 0, config: mergedConfig });
    } else {
      orderModal.setSellOrderQuantity(p.quantity.toString());
      orderModal.setSellOrderPrice(p.averagePrice.toString());
      orderModal.setSellOrderType("LIMIT");
      orderModal.openSellModal({ token: p.token || 0, config: mergedConfig });
    }
  };

  const handleValidatedQuantityChange = (
    val: string,
    methodType: "BUY" | "SELL",
  ) => {
    const requestedQty = parseInt(val) || 0;
    if (
      methodType === "SELL" &&
      orderModal.selectedOrderInstrument?.config?.exchange === "CALLPUT"
    ) {
      if (requestedQty > maxAvailableQuantityRef.current) {
        toast.error(
          `Sells cannot exceed your current open holding of ${maxAvailableQuantityRef.current} lots for CALLPUT positions.`,
        );
        orderModal.setSellOrderQuantity(
          maxAvailableQuantityRef.current.toString(),
        );
        return;
      }
    }
    if (methodType === "BUY") orderModal.setBuyOrderQuantity(val);
    else orderModal.setSellOrderQuantity(val);
  };

  const handleBuySubmitAction = async () => {
    const currentTick = orderModal.selectedOrderInstrument?.token
      ? liveTicks[orderModal.selectedOrderInstrument.token]
      : null;
    const isSuccess = await orderModal.submitBuyOrder(currentTick);
    if (isSuccess) orderModal.closeBuyModal();
  };

  const handleSellSubmitAction = async () => {
    const currentTick = orderModal.selectedOrderInstrument?.token
      ? liveTicks[orderModal.selectedOrderInstrument.token]
      : null;
    const isSuccess = await orderModal.submitSellOrder(currentTick);
    if (isSuccess) orderModal.closeSellModal();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="positions:showFilters"
          filterWidthClass="lg:w-[22%]"
          filters={
            <div className="space-y-4 p-4">
              <SearchableSelect
                label="Username :"
                items={userOptions}
                selectedId={selectedUserId}
                onSelect={(id) => setSelectedUserId(Number(id))}
                placeholder="Search user..."
              />
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Exchange :
                </label>
                <select
                  value={selectedExchange}
                  onChange={(e) => {
                    setSelectedExchange(e.target.value);
                    fetchSymbolsForExchange(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none"
                >
                  {exchanges.map((ex) => (
                    <option key={ex.name} value={ex.name}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Symbol :
                </label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => {
                    setSelectedSymbol(e.target.value);
                    const found = symbols.find(
                      (s) => s.tradeSymbol === e.target.value,
                    );
                    setSelectedToken(found?.token || null);
                  }}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none"
                >
                  <option value="">All Scripts</option>
                  {symbols.map((s) => (
                    <option key={s.token} value={s.tradeSymbol}>
                      {s.tradeSymbol}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleView()}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition shadow-md"
                >
                  View
                </button>
                <button
                  onClick={() => {
                    setSelectedSymbol("");
                    handleView();
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded font-semibold text-sm transition"
                >
                  Clear
                </button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-8 h-8 text-blue-500" /> Positions
                </h1>
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats.total}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Total
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.buy}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Buy
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.sell}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Sell
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold ${stats.totalPnL >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      ₹
                      {stats.totalPnL.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Net P&L
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedPositions.size > 0 && (
              <div className="flex-shrink-0 px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/50 flex items-center justify-between">
                <span className="text-sm font-bold text-red-700 dark:text-red-300">
                  {selectedPositions.size} positions selected
                </span>
                <button
                  onClick={handleCloseSelectedPositions}
                  disabled={loading}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded shadow-sm"
                >
                  Close Selected Positions
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto scrollbar-thin">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <table className="w-full border-collapse min-w-max">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b-2 border-blue-100 dark:border-blue-900">
                    <tr>
                      <th className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredPositions.length > 0 &&
                            selectedPositions.size === filteredPositions.length
                          }
                          onChange={() =>
                            setSelectedPositions(
                              selectedPositions.size ===
                                filteredPositions.length
                                ? new Set()
                                : new Set(
                                  filteredPositions.map((p) => p.positionId),
                                ),
                            )
                          }
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">
                        View
                      </th>
                      <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">
                        Buy
                      </th>
                      <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-red-600">
                        Sell
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                        Exchange
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
                        Avg Rate
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
                        CMP
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">
                        P&L
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredPositions.map((p) => (
                      <tr
                        key={p.positionId}
                        className={`hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors ${selectedPositions.has(p.positionId) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                      >
                        <td className="px-3 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedPositions.has(p.positionId)}
                            onChange={() => {
                              const next = new Set(selectedPositions);
                              next.has(p.positionId)
                                ? next.delete(p.positionId)
                                : next.add(p.positionId);
                              setSelectedPositions(next);
                            }}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg">
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleOpenModifyModal(p, "BUY")}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow hover:scale-105"
                          >
                            B
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleOpenModifyModal(p, "SELL")}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow hover:scale-105"
                          >
                            S
                          </button>
                        </td>
                        <td className="px-6 py-4 text-left text-sm font-semibold text-blue-600">
                          {p.username}
                        </td>
                        <td className="px-6 py-4 text-left">
                          <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-200 uppercase">
                            {p.exchange}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <span
                            className={`text-xs font-bold uppercase px-2 py-1 rounded border ${p.position === "BUY" ? "text-blue-600 border-blue-200 bg-blue-50" : "text-red-600 border-red-200 bg-red-50"}`}
                          >
                            {p.position}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 text-left font-bold ${p.position === "BUY" ? "text-blue-600" : "text-red-600"}`}
                        >
                          {p.tradeSymbol}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-sm">
                          {p.quantity}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm">
                          {p.averagePrice.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-mono text-sm font-bold ${getCMPColor(p.ltp, p.averagePrice)}`}
                        >
                          {p.ltp?.toFixed(2) || "0.00"}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-mono text-sm font-bold rounded-lg ${getPnLColor(p.pnl)}`}
                        >
                          {p.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </FilterLayout>
      </div>

      <OrderModal
        isOpen={orderModal.showBuyOrderModal}
        onClose={orderModal.closeBuyModal}
        orderType="BUY"
        selectedInstrument={orderModal.selectedOrderInstrument}
        liveData={
          orderModal.selectedOrderInstrument?.token
            ? liveTicks[orderModal.selectedOrderInstrument.token]
            : null
        }
        orderQuantity={orderModal.buyOrderQuantity}
        onOrderQuantityChange={(val) =>
          handleValidatedQuantityChange(val, "BUY")
        }
        orderPrice={orderModal.buyOrderPrice}
        onOrderPriceChange={orderModal.setBuyOrderPrice}
        orderMethod={orderModal.buyOrderType}
        onOrderMethodChange={orderModal.setBuyOrderType}
        orderRemark={orderModal.buyOrderRemark}
        onOrderRemarkChange={orderModal.setBuyOrderRemark}
        isAdminUser={isAdminUser}
        clientSearchTerm={orderModal.clientSearchTerm}
        onClientSearchChange={orderModal.setClientSearchTerm}
        isSubmitting={orderModal.isBuyOrderSubmitting}
        onSubmit={handleBuySubmitAction}
        onCancel={() => orderModal.resetBuyForm(isAdminUser)}
        modalPosition={orderModal.buyModalPosition}
        onDragStart={(e) => handleDragSetup(e, "BUY")}
        isDragging={orderModal.isDraggingBuy}
      />

      <OrderModal
        isOpen={orderModal.showSellOrderModal}
        onClose={orderModal.closeSellModal}
        orderType="SELL"
        selectedInstrument={orderModal.selectedOrderInstrument}
        liveData={
          orderModal.selectedOrderInstrument?.token
            ? liveTicks[orderModal.selectedOrderInstrument.token]
            : null
        }
        orderQuantity={orderModal.sellOrderQuantity}
        onOrderQuantityChange={(val) =>
          handleValidatedQuantityChange(val, "SELL")
        }
        orderPrice={orderModal.sellOrderPrice}
        onOrderPriceChange={orderModal.setSellOrderPrice}
        orderMethod={orderModal.sellOrderType}
        onOrderMethodChange={orderModal.setSellOrderType}
        orderRemark={orderModal.sellOrderRemark}
        onOrderRemarkChange={orderModal.setSellOrderRemark}
        isAdminUser={isAdminUser}
        clientSearchTerm={orderModal.clientSearchTerm}
        onClientSearchChange={orderModal.setClientSearchTerm}
        isSubmitting={orderModal.isSellOrderSubmitting}
        onSubmit={handleSellSubmitAction}
        onCancel={() => orderModal.resetSellForm(isAdminUser)}
        modalPosition={orderModal.sellModalPosition}
        onDragStart={(e) => handleDragSetup(e, "SELL")}
        isDragging={orderModal.isDraggingSell}
      />
    </div>
  );
};

export default Positions;
