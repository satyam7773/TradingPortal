import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Briefcase, Eye, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import userManagementService from "../../services/userManagementService";
import marketWatchService from "../../services/marketWatchService";
import { useModalDepth } from "../../contexts/ModalContext";
import FilterLayout from "../../components/FilterLayout";
import PositionDetailModal from "../../components/PositionDetailModal";
import OwnUserPositionModal from "../../components/OwnUserPositionModal";
import { useOrderModal } from "../../hooks/useOrderModal";
import OrderModal from "../../components/modals/OrderModal";
import PositionDetailsModal from "../../components/PositionDetailsModal";
import ConfirmAlert from "../../components/modals/ConfirmAlert";
import ConfigManager from "../../utils/configManager";
import { orderUpdateService } from "../../services";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useSorting } from "../../hooks/useSorting";
import { BUY_SELL_DISABLED_MESSAGE } from "../../utils/permissionUtils";
import { useAppSelector } from "../../hooks/reduxHooks";
import { selectMarketTradeRight } from "../../store/selectors/authSelectors";
import { API_ENDPOINTS } from "../../config/apiConfig";
import { Trades as TradesPage } from "./Trades";

interface PositionData {
  positionId: number;
  positionIds?: number[]; // ✅ Array of positionIds from users array
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
  // Extract userData first, before using in state initialization
  const userDataStr = localStorage.getItem("userData");
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const loggedInUserId = userData?.userId;
  const isAdminUser =
    userData?.roleId === 1 || userData?.roleId === 2 || userData?.roleId === 3;
  const hasMarketTradeRights = useAppSelector(selectMarketTradeRight);
  const orderModal = useOrderModal(isAdminUser);
  
  // Get dynamic z-index based on modal nesting depth
  const { getNextZIndex } = useModalDepth();
  const modalZIndex = getNextZIndex();
  const childModalZIndex = modalZIndex + 1000;

  const [selectedUserId, setSelectedUserId] = useState<number>(loggedInUserId);
  const [selectedExchange, setSelectedExchange] =
    useState<string>("All Exchanges");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(
    new Set(),
  );
  const [selectedOwnPosition, setSelectedOwnPosition] = useState<PositionData | null>(null);
  const [ownPositionModalData, setOwnPositionModalData] = useState<any>(null);
  const [loadingOwnPosition, setLoadingOwnPosition] = useState(false);

  const [selectedViewPosition, setSelectedViewPosition] = useState<PositionData | null>(null);
  const [viewPositionData, setViewPositionData] = useState<PositionData | null>(null);
  const [loadingViewPosition, setLoadingViewPosition] = useState(false);
  const [viewModalExchange, setViewModalExchange] = useState<string>("All Exchanges");
  const [viewModalSymbol, setViewModalSymbol] = useState<string>("");

  const [showOwnPositionDetailModal, setShowOwnPositionDetailModal] = useState(false);
  const [ownDetailModalData, setOwnDetailModalData] = useState<any[]>([]);
  const [ownDetailModalExchange, setOwnDetailModalExchange] = useState<string>("All Exchanges");
  const [ownDetailModalSymbol, setOwnDetailModalSymbol] = useState<string>("");

  // Row click modal state
  const [showRowClickModal, setShowRowClickModal] = useState(false);
  const [rowClickModalData, setRowClickModalData] = useState<any>(null);
  const [loadingRowClickModal, setLoadingRowClickModal] = useState(false);

  // Trades modal state
  const [showTradesModal, setShowTradesModal] = useState(false);
  const [tradesModalSymbol, setTradesModalSymbol] = useState<string>("");
  const [tradesModalToken, setTradesModalToken] = useState<number | null>(null);
  const [tradesModalExchange, setTradesModalExchange] = useState<string>("");

  // Alert states
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string | string[];
    confirmText: string;
    onConfirm: () => void | Promise<void>;
  }>({
    title: "",
    message: "",
    confirmText: "Confirm",
    onConfirm: () => {},
  });

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
  const [availableClients, setAvailableClients] = useState<Array<{ userId: number; username: string; name: string }>>([]);

  const feedUnsubscribeRef = useRef<(() => void) | null>(null);
  const subscriptionRef = useRef({
    subscribed: false,
    userId: null as string | null,
  });
  const lastUpdateRef = useRef<number>(0);
  const instrumentConfigRef = useRef<Record<number, any>>({});

  const [liveTicks, setLiveTicks] = useState<Record<number, any>>({});

  // Memoized user options for the SearchableSelect
  const userOptions = useMemo(
    () => users.map((u) => ({
      id: u.userId, name: u.userName
    })),
    [users],
  );

  // Memoized symbol options for the SearchableSelect
  const symbolOptions = useMemo(
    () => symbols.map((s) => ({
      id: s.tradeSymbol || s,
      name: s.tradeSymbol || s
    })),
    [symbols],
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

  // Sorting hook
  const { sortColumn, sortDirection, handleSort, sortedData: sortedPositions, getSortIcon } = useSorting({ data: filteredPositions });

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
            nextTicks[Number(item?.insToken)] = item;
          });
          return nextTicks;
        });

        const now = Date.now();
        if (now - lastUpdateRef.current < 100) return;
        lastUpdateRef.current = now;

        const feedMap = new Map(
          incomingFeedArray
            .filter((item) => item != null && item.insToken != null)
            .map((item) => [Number(item.insToken), item]),
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
              priceChange * Math.abs(pos.netQuantity);
            const amount =
              pos.averagePrice * Math.abs(pos.netQuantity );
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

  // Fetch positions from old API for roleId === 4 (Clients)
  const fetchOldPositionsAPI = async () => {
    try {
      // Use existing service method for /oms/positions POST API
      // Now passing exchange and token to support filtering
      const exchangeToSend = selectedExchange && selectedExchange !== "All Exchanges" ? selectedExchange : undefined;
      const tokenToSend = selectedToken || 0;
      
      console.log("📌 fetchOldPositionsAPI - Params:", {
        selectedExchange,
        selectedToken,
        exchangeToSend,
        tokenToSend,
      });

      const result = await userManagementService.getUserPositions(
        loggedInUserId,
        exchangeToSend,
        tokenToSend
      );

      if (result?.responseCode === "0" && result?.data?.positionsData) {
        // Transform old API response to PositionData format
        let positions = (result.data.positionsData || []).map((p: any) => ({
          positionId: p.positionId || 0, // Use API's unique positionId directly
          positionIds: [p.positionId || 0],
          positionDate: null,
          positionDays: 0,
          username: userData?.username || "",
          parentUsername: "",
          exchange: p.exchange,
          tradeSymbol: p.tradeSymbol,
          position: p.positionSide === "BUY" ? "BUY" : "SELL",
          quantity: p.lots || 0, // Bind to lots instead of netQuantity
          averagePrice: p.averagePrice || 0,
          ltp: null,
          pnl: p.unrealisedPnl || 0,
          pnlPercentage: 0,
          totalPnl: p.realisedPnl || 0,
          token: p.token,
          userId: loggedInUserId,
          netQuantity: p.netQuantity,
          realisedPnl: p.realisedPnl || 0,
          marginUsed: p.marginUsed || 0,
        }));

        // Filter by token instead of symbol string (since API uses different symbol formats)
        if (selectedToken && selectedToken > 0)
          positions = positions.filter(
            (p: PositionData) => p.token === selectedToken,
          );

        setFilteredPositions(positions);
        if (positions.length > 0) setupLivePositionFeed(positions);
      } else {
        setFilteredPositions([]);
      }
    } catch (error) {
      console.error("❌ Error fetching old positions API:", error);
      setFilteredPositions([]);
    }
  };

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
      // 🔍 Check roleId to determine which API to use
      if (userData?.roleId === 4) {
        // For client (roleId 4): Use old /oms/positions API
        await fetchOldPositionsAPI();
      } else {
        // For admin/master: Use new /oms/positions/portal/cumulative API
        let uids: number[] = [];

        // PRIORITY: If explicit IDs were passed (like during loadInitialData), use them
        if (targetUserIds && targetUserIds.length > 0) {
          uids = targetUserIds;
        }
     
        const response =
          await userManagementService.fetchUserPositionsForExchange(
            exchange,
            selectedToken || 0,
            selectedUserId,
          );

        if (response?.responseCode === "0" && response.data) {
          console.log("📊 API Response Data:", response.data);
          setPositionData(response.data);
          let positions = (response.data || []).map((p: any) => {
            // ✅ Extract all positionIds from the users array
            const positionIdsArray = (p.users || []).flatMap((u: any) => u.positionId || []);
            const firstUser = p.users?.[0];
            
            const transformed = {
              positionId: positionIdsArray[0] || 0, // First positionId as primary
              positionIds: positionIdsArray, // ✅ All positionIds for closing
              positionDate: p.positionDate,
              positionDays: p.positionDays,
              username: firstUser?.username || p.username || "",
              parentUsername: p.parentUsername || "",
              exchange: p.exchange,
              tradeSymbol: p.tradeSymbol,
              position: p.position,
              quantity: p.quantity,
              averagePrice: p.averagePrice,
              ltp: p.ltp,
              pnl: p.pnl,
              pnlPercentage: p.pnlPercentage,
              totalPnl: p.totalPnl,
              token: p.token,
              userId: firstUser?.userId || p.userId || selectedUserId || undefined,
              netQuantity: p.netQuantity,
              realisedPnl: p.realisedPnl,
              marginUsed: p.marginUsed,
            } as PositionData;
            
            console.log("✅ Transformed position:", transformed);
            return transformed;
          });

          console.log("📈 Total positions after transform:", positions.length);
          
          // Filter by token instead of symbol string (since API uses different symbol formats)
          if (selectedToken && selectedToken > 0) {
            console.log("🔍 Filtering by token:", selectedToken);
            positions = positions.filter(
              (p: PositionData) => p.token === selectedToken,
            );
            console.log("📈 Positions after token filter:", positions.length);
          }
          
          console.log("🎯 Final filtered positions:", positions);
          setFilteredPositions(positions);
          if (positions.length > 0) setupLivePositionFeed(positions);
        } else {
          console.log("❌ API Response error:", { responseCode: response?.responseCode, hasData: !!response?.data });
          setFilteredPositions([]);
        }
      }
    } catch (error) {
      console.error("❌ Error in handleView:", error);
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
        const exchangesResponse = await userManagementService.fetchExchanges();

        let initialUserIds = [loggedInUserId];

        if (
          usersResponse?.responseCode === "0" &&
          Array.isArray(usersResponse.data)
        ) {
          setUsers(usersResponse.data);
          initialUserIds = usersResponse.data.map((u: any) => u.id);
        }

        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse);
          const defaultExchange = exchangesResponse[0].name;
          setSelectedExchange(defaultExchange);
          
          const symbolsResponse = await userManagementService.fetchSymbols(defaultExchange);
          if (symbolsResponse?.responseCode === "0" && Array.isArray(symbolsResponse.data)) {
            setSymbols(symbolsResponse.data);
          }
        }

        // Fetch clients if admin user
        if (isAdminUser) {
          try {
            const clientsResponse = await userManagementService.fetchClients();
            const clientsData = Array.isArray(clientsResponse) 
              ? clientsResponse 
              : clientsResponse?.data;
            
            if (clientsData && Array.isArray(clientsData)) {
              const formattedClients = clientsData.map((client: any) => ({
                userId: client.userId,
                username: client.username,
                name: client.name,
              }));
              setAvailableClients(formattedClients);
            }
          } catch (error) {
            console.error("❌ Error fetching clients on mount:", error);
          }
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

    setAlertConfig({
      title: "⚠️ Close Positions?",
      message: [
        `Are you sure you want to close the ${selectedPositions.size} selected position${selectedPositions.size > 1 ? "(s)" : ""}?`,
        "",
        "This action cannot be undone.",
      ],
      confirmText: "Yes, Close Positions",
      onConfirm: async () => {
        try {
          setLoading(true);
          // ✅ Extract all positionIds from selected positions
          const allPositionIds: number[] = [];
          filteredPositions.forEach((p) => {
            if (selectedPositions.has(p.positionId)) {
              // If we have multiple positionIds (from users array), add them all
              if (p.positionIds && p.positionIds.length > 0) {
                allPositionIds.push(...p.positionIds);
              } else {
                allPositionIds.push(p.positionId);
              }
            }
          });

          const payload = {
            userId: loggedInUserId,
            requestTimestamp: new Date().getTime().toString(),
            deviceId: "WEB",
            tradeOrderMethod: "WEB",
            data: allPositionIds, // ✅ Send all extracted positionIds
          };

          const response = await fetch(
            API_ENDPOINTS.OMS.CLOSE_MULTIPLE_POSITIONS,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );

          const result = await response.json();
          if (result?.responseCode === "0" || result?.status === "success") {
            toast.success("✅ Selected positions closed successfully");
            setSelectedPositions(new Set());
            handleView();
          } else {
            toast.error(result?.message || "Failed to close positions");
          }
        } catch (err) {
          toast.error("Error closing positions");
        } finally {
          setLoading(false);
          setAlertOpen(false);
        }
      },
    });
    setAlertOpen(true);
  };

  useEffect(() => {
    const unsubscribe = orderUpdateService.onOrderUpdate((order) => {
      if (order.status === "FILLED") handleView();
    });
    return () => unsubscribe();
  }, [handleView]);

  const fetchSymbolsForExchange = async (exchangeName: string) => {
    if (!exchangeName) {
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
    // ✅ Use pre-loaded clients from state
    if (isAdminUser && availableClients.length > 0) {
      orderModal.setAvailableClients(availableClients);
      orderModal.setSelectedClient(availableClients[0]);
      orderModal.setClientSearchTerm(availableClients[0].username);
    }

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
      orderModal.setBuyOrderType("MARKET");
      orderModal.openBuyModal({ token: p.token || 0, config: mergedConfig });
    } else {
      orderModal.setSellOrderQuantity(p.quantity.toString());
      orderModal.setSellOrderPrice(p.averagePrice.toString());
      orderModal.setSellOrderType("MARKET");
      orderModal.openSellModal({ token: p.token || 0, config: mergedConfig });
    }
  };

  const handleOpenOwnPositionModal = async (p: PositionData) => {
    try {
      setSelectedOwnPosition(p);
      setLoadingOwnPosition(true);

      // Fetch own user positions from new API
      const response = await userManagementService.fetchOwnUserPositions(
        loggedInUserId,
        p.token || 0,
      );

      if (response?.responseCode === "0" && response.data) {
        // Transform API response data to match modal structure
        const userPositions: any[] = response.data.map((pos: any) => ({
          username: pos.username,
          userId: pos.userId,
          name: pos.name,
          parentUsername: pos.parentUsername,
          parentUserId: pos.parentUserId,
          tradeSymbol: pos.tradeSymbol,
          price: pos.price, // Current market price (CMP)
          token: pos.token || p.token || 0, // Include token for live price lookup
          netPosition: pos.netPosition, // BUY/SELL
          netQuantity: pos.netQuantity,
          netAvgPrice: pos.netAvgPrice,
          pnl: pos.pnl,
          pnlPercentage: pos.pnlPercentage,
          netBuyQuantity: pos.netBuyQuantity,
          netBuyAveragePrice: pos.netBuyAveragePrice,
          netSellQuantity: pos.netSellQuantity,
          netSellAveragePrice: pos.netSellAveragePrice,
          exchange: pos.exchange || p.exchange,
          positionDays: pos.positionDays,
        }));
        
        // Set data for modal display
        setOwnDetailModalData(userPositions);
        setShowOwnPositionDetailModal(true);
        setOwnDetailModalExchange(p.exchange);
        setOwnDetailModalSymbol(p.tradeSymbol);
      } else {
        toast.error(response?.responseMessage || "Failed to fetch positions");
      }
    } catch (error) {
      console.error("❌ Error fetching own position:", error);
      toast.error("Failed to fetch position details");
    } finally {
      setLoadingOwnPosition(false);
    }
  };

  const handleOpenViewPositionModal = async (p: PositionData) => {
    try {
      setLoadingRowClickModal(true);
      setSelectedViewPosition(p);

      // 🆕 Fetch from /oms/positions/portal API
      const payload = {
        requestTimestamp: Date.now().toString(),
        userId: loggedInUserId,
        data: {
          userId: loggedInUserId,
          token: p.token || 0,
        }
      };

      const response = await fetch(
        API_ENDPOINTS.OMS.POSITIONS_PORTAL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (result?.responseCode === "0" && result?.data) {
        setRowClickModalData(result.data);
        setShowRowClickModal(true);
        setViewModalExchange(p.exchange);
        setViewModalSymbol(p.tradeSymbol);
      } else {
        toast.error(result?.responseMessage || "Failed to fetch position details");
      }
    } catch (error) {
      console.error("❌ Error fetching row click modal data:", error);
      toast.error("Failed to fetch position details");
    } finally {
      setLoadingRowClickModal(false);
    }
  };

  const handleOpenOwnPositionDetailModal = (positions: PositionData[]) => {
    setOwnDetailModalData(positions);
    setShowOwnPositionDetailModal(true);
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
          filterWidthClass="lg:w-[16%]"
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
                    const newExchange = e.target.value;
                    setSelectedExchange(newExchange);
                    // Fetch symbols for any exchange including "All Exchanges"
                    fetchSymbolsForExchange(newExchange);
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
                <SearchableSelect
                  label="Symbol :"
                  items={symbolOptions}
                  selectedId={selectedSymbol}
                  onSelect={(symbol) => {
                    setSelectedToken(null);
                    setSelectedSymbol(symbol as string);
                    const found = symbols.find(
                      (s) => (s.tradeSymbol || s) === symbol
                    );
                    setSelectedToken(found?.token || null);
                  }}
                  placeholder="Search symbol..."
                />
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
                    const allExchangesValue = 'All Exchanges';
                    setSelectedExchange(allExchangesValue);
                    setSelectedSymbol("");
                    setSelectedToken(null);
                    
                    // Fetch symbols for All Exchanges
                    fetchSymbolsForExchange(allExchangesValue);
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
                  <div className="text-center w-32">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats.total}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Total
                    </div>
                  </div>
                  <div className="text-center w-32">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.buy}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Buy
                    </div>
                  </div>
                  <div className="text-center w-32">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.sell}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Sell
                    </div>
                  </div>
                  <div className="text-center w-40">
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

            {selectedPositions.size > 0 && hasMarketTradeRights && (
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
                      {hasMarketTradeRights && (
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
                      )}
                      {userData?.roleId !== 4 && (
                        <>
                          <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">
                            View
                          </th>
                          <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">
                            Own
                          </th>
                        </>
                      )}
                      {hasMarketTradeRights && (
                        <>
                          <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">
                            Buy
                          </th>
                          <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-red-600">
                            Sell
                          </th>
                        </>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('exchange')}>
                        <div className="flex items-center gap-2">Exchange {getSortIcon('exchange')}</div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('position')}>
                        <div className="flex items-center gap-2">Position {getSortIcon('position')}</div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('tradeSymbol')}>
                        <div className="flex items-center gap-2">Symbol {getSortIcon('tradeSymbol')}</div>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center justify-center gap-2">Qty {getSortIcon('quantity')}</div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('averagePrice')}>
                        <div className="flex items-center justify-end gap-2">Avg Rate {getSortIcon('averagePrice')}</div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('ltp')}>
                        <div className="flex items-center justify-end gap-2">CMP {getSortIcon('ltp')}</div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('pnl')}>
                        <div className="flex items-center justify-end gap-2">P&L {getSortIcon('pnl')}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {sortedPositions.map((p) => (
                      <tr
                        key={p.positionId}
                        className={`hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors ${selectedPositions.has(p.positionId) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                      >
                        {hasMarketTradeRights && (
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
                        )}
                        {userData?.roleId !== 4 && (
                          <>
                            <td className="px-4 py-4 text-center">
                              <button 
                                onClick={() => handleOpenViewPositionModal(p)}
                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </button>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button 
                                onClick={() => handleOpenOwnPositionModal(p)}
                                disabled={loadingOwnPosition}
                                className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900 rounded-lg font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50"
                              >
                                {loadingOwnPosition ? "..." : "Own"}
                              </button>
                            </td>
                          </>
                        )}
                        {hasMarketTradeRights && (
                          <>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => handleOpenModifyModal(p, "BUY")}
                                disabled={!hasMarketTradeRights}
                                title={!hasMarketTradeRights ? BUY_SELL_DISABLED_MESSAGE : "Buy"}
                                className={`bg-green-600 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow ${
                                  hasMarketTradeRights
                                    ? 'hover:bg-green-700 hover:scale-105 cursor-pointer'
                                    : 'opacity-50 cursor-not-allowed'
                                }`}
                              >
                                B
                              </button>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => handleOpenModifyModal(p, "SELL")}
                                disabled={!hasMarketTradeRights}
                                title={!hasMarketTradeRights ? BUY_SELL_DISABLED_MESSAGE : "Sell"}
                                className={`bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow ${
                                  hasMarketTradeRights
                                    ? 'hover:bg-red-700 hover:scale-105 cursor-pointer'
                                    : 'opacity-50 cursor-not-allowed'
                                }`}
                              >
                                S
                              </button>
                            </td>
                          </>
                        )}
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
                          className={`px-6 py-4 text-left font-bold cursor-pointer hover:underline ${p.position === "BUY" ? "text-blue-600" : "text-red-600"}`}
                          onClick={() => {
                            setTradesModalSymbol(p.tradeSymbol);
                            setTradesModalToken(p.token || null);
                            setTradesModalExchange(p.exchange);
                            setShowTradesModal(true);
                          }}
                        >
                          {p.tradeSymbol}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-sm">
                          {p.quantity}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm">
                          {p.averagePrice.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
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

      {/* View Position Details Modal */}
      {selectedViewPosition && viewPositionData && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: childModalZIndex }}>
          <PositionDetailsModal
            positions={filteredPositions}
            exchanges={exchanges}
            symbols={symbols}
            selectedExchange={viewModalExchange}
            selectedSymbol={viewModalSymbol}
            onExchangeChange={setViewModalExchange}
            onSymbolChange={setViewModalSymbol}
            onClose={() => {
              setSelectedViewPosition(null);
              setViewPositionData(null);
            }}
            title="View Position Details"
            liveTicks={liveTicks}
          />
        </div>,
        document.body
      )}

      {/* Own User Position Details Modal */}
      {showOwnPositionDetailModal && ownDetailModalData.length > 0 && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: childModalZIndex }}>
          <OwnUserPositionModal
            positions={ownDetailModalData}
            selectedSymbol={ownDetailModalSymbol}
            onClose={() => {
              setShowOwnPositionDetailModal(false);
              setOwnDetailModalData([]);
              setSelectedOwnPosition(null);
              setLoadingOwnPosition(false);
            }}
            title="Own User Open Positions"
            liveTicks={liveTicks}
          />
        </div>,
        document.body
      )}

      {/* 🆕 Position Detail Modal - Row Click */}
      <PositionDetailModal
        isOpen={showRowClickModal}
        data={rowClickModalData}
        selectedPosition={selectedViewPosition}
        loading={loadingRowClickModal}
        liveTicks={liveTicks}
        onClose={() => {
          setShowRowClickModal(false);
          setRowClickModalData(null);
          setSelectedViewPosition(null);
        }}
      />

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
        availableClients={orderModal.availableClients}
        selectedClient={orderModal.selectedClient}
        onClientSelect={orderModal.setSelectedClient}
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
        availableClients={orderModal.availableClients}
        selectedClient={orderModal.selectedClient}
        onClientSelect={orderModal.setSelectedClient}
        isSubmitting={orderModal.isSellOrderSubmitting}
        onSubmit={handleSellSubmitAction}
        onCancel={() => orderModal.resetSellForm(isAdminUser)}
        modalPosition={orderModal.sellModalPosition}
        onDragStart={(e) => handleDragSetup(e, "SELL")}
        isDragging={orderModal.isDraggingSell}
      />

      {/* Trades Modal */}
      {showTradesModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: childModalZIndex }}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-[1500px] h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Trades - {tradesModalSymbol}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  View all trades for this symbol
                </p>
              </div>
              <button
                onClick={() => setShowTradesModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                title="Close modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <TradesPage symbol={tradesModalSymbol} token={tradesModalToken} exchange={tradesModalExchange} hideCheckboxes={true} />
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmAlert
        isOpen={alertOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        isLoading={loading}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertOpen(false)}
      />
    </div>
  );
};

export default Positions;
