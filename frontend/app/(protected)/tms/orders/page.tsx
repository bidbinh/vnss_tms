"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, apiUpload, API_BASE } from "@/lib/api";
import { getDriverColor } from "@/lib/utils";

// Default column widths
const DEFAULT_COLUMN_WIDTHS = {
  custDate: 70,
  orderCode: 80,
  driver: 100,
  route: 180,
  container: 60,
  containerCode: 100,
  km: 50,
  cargoNote: 200,
  etaPickup: 80,
  etaDelivery: 80,
  status: 90,
  actions: 140,
};

interface Customer {
  id: string;
  code: string;
  name: string;
  source?: "TMS" | "CRM";  // Source of customer data
  crm_account_id?: string;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicle_id?: string;
  short_name?: string;
  source?: string; // INTERNAL or EXTERNAL
  external_worker_id?: string;
}

interface Location {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Site {
  id: string;
  code: string;
  company_name: string;
  detailed_address: string;
  location_id: string;
  status: string;
  site_type?: string;
}

interface OrderDocument {
  id: string;
  doc_type: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
  note?: string;
}

// Document type labels
const DOC_TYPE_LABELS: Record<string, string> = {
  CONTAINER_RECEIPT: "Phiếu giao nhận container",
  DO: "DO (Delivery Order)",
  HANDOVER_REPORT: "Biên bản bàn giao hàng",
  SEAL_PHOTO: "Ảnh seal",
  OTHER: "Khác",
};

interface Order {
  id: string;
  order_code: string;
  customer_id: string;
  status: string;
  pickup_text?: string;
  delivery_text?: string;
  pickup_site_id?: string;
  delivery_site_id?: string;
  port_site_id?: string;
  pickup_location_id?: string;  // Legacy
  delivery_location_id?: string;  // Legacy
  equipment?: string;
  qty: number;
  cargo_note?: string;
  container_code?: string;
  driver_id?: string;
  eta_pickup_at?: string;
  eta_delivery_at?: string;
  customer_requested_date?: string;
  created_at: string;
  order_date: string;
  distance_km?: number;  // Số km hành trình
  // Document fields
  container_receipt?: string;
  delivery_order_no?: string;
  handover_report?: string;
  seal_no?: string;
}

type SortField = "order_code" | "driver_id" | "eta_pickup_at" | "eta_delivery_at" | "customer_requested_date" | "status";
type SortOrder = "asc" | "desc";

export default function OrdersPage() {
  const t = useTranslations("tms.ordersPage");
  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab filter - default to PROCESSING (Đang xử lý)
  const [activeTab, setActiveTab] = useState<string>("PROCESSING");

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting - default by customer_requested_date descending
  const [sortField, setSortField] = useState<SortField | null>("customer_requested_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Search and filters
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>("");

  // Group by date - collapsed state (store date strings that are collapsed)
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Edit mode
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Document upload state
  const [orderDocuments, setOrderDocuments] = useState<OrderDocument[]>([]);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setRole(userData.role);
    }
  }, []);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [quickCreateText, setQuickCreateText] = useState("");
  const [quickCreateStatus, setQuickCreateStatus] = useState<{creating: boolean; results: Array<{success: boolean; orderCode: string; error?: string}>}>({creating: false, results: []});

  // AI parsing states
  const [useAI, setUseAI] = useState(false); // AI OFF by default - use regex parser
  const [aiProvider, setAiProvider] = useState<"gemini" | "claude-haiku" | "claude">("gemini");
  const [isParsing, setIsParsing] = useState(false);

  // Site validation states
  const [missingSites, setMissingSites] = useState<Array<{
    search_text: string;
    type: "pickup" | "delivery";
    suggestions: Array<{id: string; code: string; company_name: string}>;
  }>>([]);
  const [showMissingSitesModal, setShowMissingSitesModal] = useState(false);
  const [siteCheckResults, setSiteCheckResults] = useState<Record<string, {found: boolean; site_id?: string}>>({});

  const [parsedOrders, setParsedOrders] = useState<Array<{
    line_number: number;
    driver_name: string;
    pickup_text: string;
    delivery_text: string;
    container_code: string;
    equipment: string;
    qty?: number; // Quantity of containers (e.g., 1x40 = qty: 1)
    cargo_note: string;
    pickup_date: string;
    delivery_date: string;
    delivery_shift: string;
    delivery_address: string;
    delivery_contact: string;
    customer_id: string;
    selected?: boolean; // For checkbox selection
    ambiguous?: boolean; // AI uncertain about customer
    customer_match_confidence?: number; // AI confidence score
  }>>([]);

  // Parse text to extract order details
  // NEW FORMAT: "1/ 1x40 HDPE-VN H5604F, 27T/cont, pallet, CHÙA VẼ - giao KCN Quất Động-Thường Tín -Hà Nội"
  // OLD FORMAT: "185) A Tuyến: CHÙA VẼ - An Tảo, Hưng Yên- GAOU6458814- Lấy 23/12, giao sáng 24/12- 01x40 HDPE-VN"
  const parseOrderText = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const orders: typeof parsedOrders = [];
    const currentYear = new Date().getFullYear();

    for (const line of lines) {
      if (/^[-]+\d{1,2}\/\d{1,2}[-]+$/.test(line.trim().replace(/\s/g, ''))) continue;
      if (!line.match(/^\d+[\)\/]/)) continue;

      try {
        const lineNumMatch = line.match(/^(\d+)[\)\/]/);
        const lineNumber = lineNumMatch ? parseInt(lineNumMatch[1]) : 0;

        // Determine format
        const isNewFormat = line.match(/^\d+\/\s+\d+x\d{2}/);

        if (isNewFormat) {
          // NEW FORMAT: "2/ 3x40 LLDPE-US 2018.XBU, 24.75T/cont, pallet, HATECO - nhập LIVABIN"
          const afterLineNum = line.substring(line.indexOf('/') + 1).trim();

          // Extract equipment and qty
          const eqMatch = afterLineNum.match(/(\d+)x(\d{2})/);
          const qty = eqMatch ? parseInt(eqMatch[1]) : 1;
          const equipment = eqMatch ? eqMatch[2] : '40';

          // Find last comma (separator between cargo and route)
          const lastCommaIndex = afterLineNum.lastIndexOf(',');
          if (lastCommaIndex === -1) continue;

          // Cargo note: from after equipment to last comma
          const cargoStart = afterLineNum.indexOf(' ') + 1;
          const cargoNote = afterLineNum.substring(cargoStart, lastCommaIndex).trim();

          // Route: after last comma
          const route = afterLineNum.substring(lastCommaIndex + 1).trim();

          // Split route by " - "
          const routeParts = route.split(/\s*-\s*/);
          const pickupText = routeParts[0]?.trim() || '';
          let deliveryText = '';

          if (routeParts.length > 1) {
            // Remove "giao", "nhập", "xuất" prefixes and extract main location
            deliveryText = routeParts[1]
              ?.replace(/^(giao|nhập|xuất)\s+/i, '')
              .split(/[-,]/)[0]  // Get first part before dash or comma
              .trim() || '';
          }

          // If qty > 1, create multiple separate orders (one per container)
          // Example: 3x40 → create 3 orders, each with 1x40
          // line_number is just for display - backend will auto-generate order_code
          for (let i = 0; i < qty; i++) {
            orders.push({
              line_number: orders.length + 1, // Sequential counter for display only
              driver_name: '',
              pickup_text: pickupText,
              delivery_text: deliveryText,
              container_code: '',
              equipment: equipment,
              qty: 1, // Each order has 1 container
              cargo_note: cargoNote,
              pickup_date: '',
              delivery_date: '',
              delivery_shift: 'morning',
              delivery_address: '',
              delivery_contact: '',
              customer_id: '',
              selected: true,
            });
          }

        } else {
          // OLD FORMAT: "185) A Tuyến: CHÙA VẼ - An Tảo, Hưng Yên- GAOU6458814..."
          const driverMatch = line.match(/\)\s*([^:]+):/);
          const driverName = driverMatch ? driverMatch[1].trim() : '';

          const colonIndex = line.indexOf(':');
          const afterDriver = colonIndex >= 0 ? line.substring(colonIndex + 1) : '';

          const parts = afterDriver.split(/[-–]/).map(p => p.trim()).filter(p => p);
          const pickupText = parts[0] || '';
          let deliveryText = parts[1] || '';

        // Third part is usually container code
        let containerCode = '';
        const containerMatch = afterDriver.match(/[A-Z]{4}\d{7}/);
        if (containerMatch) {
          containerCode = containerMatch[0];
        }

        // Extract dates: "Lấy 23/12, giao sáng 24/12"
        let pickupDate = '';
        let deliveryDate = '';
        let deliveryShift = 'morning';

        const pickupDateMatch = afterDriver.match(/[Ll]ấy\s*(\d{1,2})\/(\d{1,2})/);
        if (pickupDateMatch) {
          const day = pickupDateMatch[1].padStart(2, '0');
          const month = pickupDateMatch[2].padStart(2, '0');
          pickupDate = `${currentYear}-${month}-${day}`;
        }

        const deliveryMatch = afterDriver.match(/giao\s*(sáng|chiều|tối)?\s*(\d{1,2})\/(\d{1,2})/i);
        if (deliveryMatch) {
          if (deliveryMatch[1]) {
            const shiftText = deliveryMatch[1].toLowerCase();
            if (shiftText === 'sáng') deliveryShift = 'morning';
            else if (shiftText === 'chiều') deliveryShift = 'afternoon';
            else if (shiftText === 'tối') deliveryShift = 'evening';
          }
          const day = deliveryMatch[2].padStart(2, '0');
          const month = deliveryMatch[3].padStart(2, '0');
          deliveryDate = `${currentYear}-${month}-${day}`;
        }

        // Extract equipment: "01x40" or "01x20"
        let equipment = '40';
        const eqMatch = afterDriver.match(/(\d+)x(\d{2})/);
        if (eqMatch) {
          equipment = eqMatch[2];
        }

        // Extract cargo note: everything after container type until contact info
        let cargoNote = '';
        const cargoMatch = afterDriver.match(/\d+x\d{2}\s+([^(]+)/);
        if (cargoMatch) {
          cargoNote = cargoMatch[1].trim();
          // Clean up cargo note - remove trailing semicolons and common suffix patterns
          cargoNote = cargoNote.replace(/;\s*giao\s+.*$/i, '').replace(/;\s*$/, '').trim();
        }

        // Extract delivery address and contact
        let deliveryAddress = '';
        let deliveryContact = '';
        const addressMatch = afterDriver.match(/:\s*([^(]+)\s*\(([^)]+)\)\s*$/);
        if (addressMatch) {
          deliveryAddress = addressMatch[1].trim();
          deliveryContact = addressMatch[2].trim();
        }

        orders.push({
          line_number: lineNumber,
          driver_name: driverName,
          pickup_text: pickupText,
          delivery_text: deliveryText,
          container_code: containerCode,
          equipment,
          cargo_note: cargoNote,
          pickup_date: pickupDate,
          delivery_date: deliveryDate,
          delivery_shift: deliveryShift,
          delivery_address: deliveryAddress,
          delivery_contact: deliveryContact,
          customer_id: '', // Will be selected by user
        });
        }
      } catch (e) {
        console.error('Failed to parse line:', line, e);
      }
    }

    return orders;
  };

  // AI-powered parsing
  const parseOrderTextWithAI = async (text: string) => {
    setIsParsing(true);

    try {
      // Fetch customers and sites for AI context
      const [customersData, sitesData] = await Promise.all([
        apiFetch<Customer[]>("/customers/unified"),
        apiFetch<Site[]>("/sites")
      ]);

      // Call AI parsing endpoint
      const result = await apiFetch<{
        success: boolean;
        order_data: any[];
        provider_used: string;
        cost_estimate?: number;
        error?: string;
      }>("/ai-assistant/parse-message", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          context: {
            customers: customersData.map(c => ({
              id: c.id,
              code: c.code,
              name: c.name,
            })),
            sites: sitesData.map(s => ({
              id: s.id,
              code: s.code,
              company_name: s.company_name,
              detailed_address: s.detailed_address
            })),
            task: "order_extraction_with_customer_match"
          },
          feature: "order_extraction",
        })
      });

      if (!result.success) {
        throw new Error(result.error || "AI parsing failed");
      }

      // Parse response - AI returns array directly
      let aiOrders = result.order_data;
      if (!Array.isArray(aiOrders)) {
        // If AI returned single object, wrap in array
        aiOrders = [aiOrders];
      }

      // Format for UI
      const orders = aiOrders.map((order: any) => ({
        line_number: order.line_number || 0,
        driver_name: order.driver_name || "",
        pickup_text: order.pickup_text || "",
        delivery_text: order.delivery_text || "",
        container_code: order.container_code || "",
        equipment: order.equipment || "40",
        cargo_note: order.cargo_note || "",
        pickup_date: order.pickup_date || "",
        delivery_date: order.delivery_date || "",
        delivery_shift: order.delivery_shift || "morning",
        delivery_address: order.delivery_address || "",
        delivery_contact: order.delivery_contact || "",
        customer_id: order.customer_id || "", // AUTO-ASSIGNED by AI!
        selected: true,
        ambiguous: order.ambiguous || false,
        customer_match_confidence: order.customer_match_confidence || 0
      }));

      setParsedOrders(orders);

      // Show success toast with cost
      const cost = result.cost_estimate || 0;
      const provider = result.provider_used || "AI";
      alert(`✅ Parsed ${orders.length} orders using ${provider}. Cost: $${cost.toFixed(4)}`);

      // Check if sites exist after AI parsing
      await checkSitesExist(orders);

    } catch (err: any) {
      console.error("AI parsing failed:", err);
      alert(`❌ AI parsing failed: ${err.message}. Falling back to regex parser...`);

      // Fallback to old regex parser
      const fallbackOrders = parseOrderText(text);
      setParsedOrders(fallbackOrders);
      // Check sites for fallback orders too
      await checkSitesExist(fallbackOrders);
    } finally {
      setIsParsing(false);
    }
  };

  const handleParseText = async () => {
    if (!quickCreateText.trim()) {
      alert("Vui lòng nhập văn bản đơn hàng");
      return;
    }

    // Reset site check states
    setMissingSites([]);
    setSiteCheckResults({});

    if (useAI) {
      parseOrderTextWithAI(quickCreateText);
    } else {
      // Regex parser - hỗ trợ cả 2 format
      const orders = parseOrderText(quickCreateText);
      if (orders.length === 0) {
        alert("Không parse được đơn hàng nào. Vui lòng kiểm tra format.");
      } else {
        setParsedOrders(orders);
        // Check if sites exist after parsing
        await checkSitesExist(orders);
      }
    }
  };

  // Helper function to check if sites exist (without auto-creating)
  const checkSitesExist = async (orders: typeof parsedOrders) => {
    // Collect unique site texts to check
    const sitesToCheck: Array<{search_text: string; type: string}> = [];
    const seenTexts = new Set<string>();

    for (const order of orders) {
      if (order.pickup_text && !seenTexts.has(`pickup:${order.pickup_text}`)) {
        sitesToCheck.push({ search_text: order.pickup_text, type: "pickup" });
        seenTexts.add(`pickup:${order.pickup_text}`);
      }
      if (order.delivery_text && !seenTexts.has(`delivery:${order.delivery_text}`)) {
        sitesToCheck.push({ search_text: order.delivery_text, type: "delivery" });
        seenTexts.add(`delivery:${order.delivery_text}`);
      }
    }

    if (sitesToCheck.length === 0) return;

    try {
      const response = await apiFetch<{results: Array<{
        search_text: string;
        type: string;
        found: boolean;
        site: {id: string; code: string; company_name: string} | null;
        suggestions: Array<{id: string; code: string; company_name: string}>;
      }>}>("/sites/check", {
        method: "POST",
        body: JSON.stringify({ sites: sitesToCheck }),
      });

      // Build results map
      const resultsMap: Record<string, {found: boolean; site_id?: string}> = {};
      const missing: typeof missingSites = [];

      for (const result of response.results) {
        const key = `${result.type}:${result.search_text}`;
        resultsMap[key] = {
          found: result.found,
          site_id: result.site?.id
        };

        if (!result.found) {
          missing.push({
            search_text: result.search_text,
            type: result.type as "pickup" | "delivery",
            suggestions: result.suggestions
          });
        }
      }

      setSiteCheckResults(resultsMap);

      if (missing.length > 0) {
        setMissingSites(missing);
        setShowMissingSitesModal(true);
      }
    } catch (err) {
      console.error('Failed to check sites:', err);
    }
  };

  // Helper function to find or create site from text
  const findOrCreateSite = async (searchText: string, siteType: string): Promise<string | null> => {
    if (!searchText || searchText.trim() === '') return null;

    // Check if we already have the result from pre-check
    const key = `${siteType.toLowerCase()}:${searchText}`;
    if (siteCheckResults[key]?.found && siteCheckResults[key]?.site_id) {
      return siteCheckResults[key].site_id!;
    }

    try {
      const result = await apiFetch<{site: {id: string} | null; created: boolean}>("/sites/find-or-create", {
        method: "POST",
        body: JSON.stringify({ search_text: searchText, site_type: siteType }),
      });
      return result.site?.id || null;
    } catch (err) {
      console.error('Failed to find/create site:', err);
      return null;
    }
  };

  const handleQuickCreateOrders = async () => {
    if (parsedOrders.length === 0) return;

    setQuickCreateStatus({ creating: true, results: [] });
    const results: Array<{success: boolean; orderCode: string; error?: string}> = [];

    const shiftTimes: Record<string, string> = {
      morning: "08:00:00",
      afternoon: "13:00:00",
      evening: "18:00:00",
    };

    for (const order of parsedOrders) {
      try {
        // Find driver by name (partial match on last name or short name)
        const driver = drivers.find(d => {
          const orderDriverLower = order.driver_name.toLowerCase();
          const driverNameLower = d.name.toLowerCase();
          const driverLastName = d.name.split(' ').pop()?.toLowerCase() || '';

          return driverNameLower.includes(orderDriverLower) ||
                 orderDriverLower.includes(driverLastName) ||
                 orderDriverLower.includes(driverNameLower.split(' ').pop() || '');
        });

        // Step 1: Find or create Sites for pickup and delivery
        const pickupSiteId = await findOrCreateSite(order.pickup_text, "PICKUP");
        const deliverySiteId = await findOrCreateSite(order.delivery_text, "DELIVERY");

        // Step 2: Create the order
        // Backend will auto-generate order_code using sequence (e.g., ADG-1, ADG-2, ADG-3, ...)
        const createPayload: Record<string, unknown> = {
          customer_id: order.customer_id,
          // order_code is NOT sent - backend will auto-generate from sequence
          pickup_text: order.pickup_text,
          delivery_text: order.delivery_text,
          pickup_site_id: pickupSiteId,
          delivery_site_id: deliverySiteId,
          equipment: order.equipment,
          qty: 1,
          container_code: order.container_code || null,
          cargo_note: order.cargo_note || null,
          customer_requested_date: order.delivery_date || null,
        };

        const createdOrder = await apiFetch<{id: string; order_code: string}>("/orders", {
          method: "POST",
          body: JSON.stringify(createPayload),
        });

        // Step 3: If driver is found, assign driver via accept endpoint
        if (driver) {
          try {
            const acceptPayload = {
              driver_id: driver.id,
              eta_pickup_at: order.pickup_date
                ? `${order.pickup_date}T${shiftTimes.morning}`
                : null,
              eta_delivery_at: order.delivery_date
                ? `${order.delivery_date}T${shiftTimes[order.delivery_shift]}`
                : null,
            };

            await apiFetch(`/orders/${createdOrder.id}/accept`, {
              method: "POST",
              body: JSON.stringify(acceptPayload),
            });
          } catch (acceptErr: unknown) {
            console.error('Failed to assign driver:', acceptErr);
            // Order was created but driver assignment failed - still count as partial success
          }
        }

        results.push({ success: true, orderCode: createdOrder.order_code });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({
          success: false,
          orderCode: `Line ${order.line_number}`,
          error: errorMessage
        });
      }
    }

    setQuickCreateStatus({ creating: false, results });

    // If all successful, close modal and refresh
    if (results.every(r => r.success)) {
      setTimeout(() => {
        setShowQuickCreateModal(false);
        setQuickCreateText('');
        setParsedOrders([]);
        setQuickCreateStatus({ creating: false, results: [] });
        fetchOrders();
        fetchSites(); // Refresh sites list in case new ones were created
      }, 1500);
    }
  };
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [formData, setFormData] = useState({
    customer_id: "",
    order_code: "",
    pickup_site_id: "",
    delivery_site_id: "",
    pickup_text: "",  // Allow manual input
    delivery_text: "",  // Allow manual input
    port_site_id: "",
    equipment: "20",
    qty: 1,
    cargo_note: "",
    container_code: "",
    customer_requested_date: "",
    // Document fields
    container_receipt: "",
    delivery_order_no: "",
    handover_report: "",
    seal_no: "",
  });

  const [assignData, setAssignData] = useState({
    driver_id: "",
    eta_pickup_date: "",
    eta_pickup_shift: "morning",
    eta_delivery_date: "",
    eta_delivery_shift: "morning",
  });

  // Column resize state
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    resizingColumn.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey as keyof typeof columnWidths];
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(40, startWidth.current + diff);
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn.current!]: newWidth,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    // Auth is now cookie-based, fetch data on mount
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setRole(userData.role);
    }
    fetchOrders();
    fetchCustomers();
    fetchDrivers();
    fetchLocations();
    fetchSites();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await apiFetch<Order[]>("/orders?limit=500");
      setOrders(data);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      // Use unified endpoint that includes both TMS customers and CRM accounts
      console.log("[Customers] Fetching unified customers...");
      const data = await apiFetch<Customer[]>("/customers/unified");
      console.log("[Customers] Loaded", data.length, "customers");
      setCustomers(data);
    } catch (err: any) {
      console.error("[Customers] Failed to fetch unified:", err?.message || err);
      // Fallback to regular customers endpoint
      try {
        console.log("[Customers] Trying fallback /customers...");
        const fallback = await apiFetch<Customer[]>("/customers");
        console.log("[Customers] Fallback loaded", fallback.length, "customers");
        setCustomers(fallback);
      } catch (fallbackErr: any) {
        console.error("[Customers] Fallback also failed:", fallbackErr?.message || fallbackErr);
      }
    }
  };

  const fetchDrivers = async () => {
    try {
      const data = await apiFetch<Driver[]>("/drivers");
      setDrivers(data);
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await apiFetch<Location[]>("/locations");
      setLocations(data);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  const fetchSites = async () => {
    try {
      const data = await apiFetch<Site[]>("/sites");
      setSites(data);
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    }
  };

  const fetchOrderDocuments = async (orderId: string) => {
    try {
      const data = await apiFetch<OrderDocument[]>(`/orders/${orderId}/documents`);
      setOrderDocuments(data);
    } catch (err) {
      console.error("Failed to fetch order documents:", err);
      setOrderDocuments([]);
    }
  };

  const handleUploadDocument = async (orderId: string, docType: string, file: File) => {
    setUploadingDocType(docType);
    try {
      const formData = new FormData();
      formData.append("doc_type", docType);
      formData.append("file", file);

      await apiUpload(`/orders/${orderId}/documents`, formData);
      await fetchOrderDocuments(orderId);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Bạn có chắc muốn xóa tài liệu này?")) return;

    try {
      await apiFetch(`/orders/documents/${docId}`, { method: "DELETE" });
      if (editingOrder) {
        await fetchOrderDocuments(editingOrder.id);
      }
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleDownloadDocument = (docId: string, fileName: string) => {
    const url = `${API_BASE}/orders/documents/${docId}/download`;

    // Create a temporary link to download with auth (cookie-based)
    fetch(url, {
      credentials: "include",
    })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch((err) => alert("Download failed: " + err.message));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleCustomerChange = async (customerId: string) => {
    const selectedCustomer = customers.find(c => c.id === customerId);

    // If selected from CRM (not yet in TMS), sync first
    if (selectedCustomer?.source === "CRM") {
      try {
        // Sync CRM account to TMS customer
        console.log("[CRM Sync] Syncing CRM account:", customerId);
        const syncResult = await apiFetch<{ id: string; code: string; name: string }>(
          `/customers/by-crm/${customerId}`
        );
        console.log("[CRM Sync] Result:", syncResult);

        // Use the newly created/linked TMS customer ID
        const tmsCustomerId = syncResult.id;
        setFormData({ ...formData, customer_id: tmsCustomerId, order_code: "" });

        // Preview order code with TMS customer ID
        try {
          const result = await apiFetch<{ order_code: string }>(
            `/orders/preview-code/${tmsCustomerId}`
          );
          setFormData((prev) => ({ ...prev, order_code: result.order_code }));
        } catch (err) {
          console.error("Failed to preview order code:", err);
        }

        // Refresh customer list to show updated data
        fetchCustomers();
        return;
      } catch (err: any) {
        console.error("Failed to sync CRM account:", err);
        alert("Không thể đồng bộ khách hàng từ CRM: " + (err.message || "Unknown error"));
        return;
      }
    }

    // Regular TMS customer
    setFormData({ ...formData, customer_id: customerId, order_code: "" });

    if (customerId) {
      try {
        const result = await apiFetch<{ order_code: string }>(
          `/orders/preview-code/${customerId}`
        );
        setFormData((prev) => ({ ...prev, order_code: result.order_code }));
      } catch (err: any) {
        console.error("Failed to preview order code:", err);
      }
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert empty strings to null for optional fields
      const payload = {
        customer_id: formData.customer_id,
        order_code: formData.order_code,
        pickup_site_id: formData.pickup_site_id || null,
        delivery_site_id: formData.delivery_site_id || null,
        pickup_text: formData.pickup_text || null,
        delivery_text: formData.delivery_text || null,
        port_site_id: formData.port_site_id || null,
        equipment: formData.equipment,
        qty: formData.qty,
        customer_requested_date: formData.customer_requested_date || null,
        container_code: formData.container_code || null,
        cargo_note: formData.cargo_note || null,
      };

      await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowCreateModal(false);
      setFormData({
        customer_id: "",
        order_code: "",
        pickup_site_id: "",
        delivery_site_id: "",
        pickup_text: "",
        delivery_text: "",
        port_site_id: "",
        equipment: "20",
        qty: 1,
        cargo_note: "",
        container_code: "",
        customer_requested_date: "",
        container_receipt: "",
        delivery_order_no: "",
        handover_report: "",
        seal_no: "",
      });
      fetchOrders();
    } catch (err: any) {
      // Check for duplicate order code error
      if (err.message && err.message.includes("duplicate key") && err.message.includes("order_code")) {
        alert(`Lỗi: Mã đơn hàng "${formData.order_code}" đã tồn tại. Vui lòng sử dụng mã khác.`);
      } else {
        alert("Error: " + err.message);
      }
    }
  };

  // Helper to extract date string without timezone issues
  const extractDateString = (dateStr?: string) => {
    if (!dateStr) return "";
    // If already in YYYY-MM-DD format, use directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // If has time component, extract just the date part
    if (dateStr.includes("T")) return dateStr.split("T")[0];
    // Otherwise try to parse and format
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return "";
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    // Get site names for text display
    const pickupSite = order.pickup_site_id ? sites.find(s => s.id === order.pickup_site_id) : null;
    const deliverySite = order.delivery_site_id ? sites.find(s => s.id === order.delivery_site_id) : null;
    const pickupLoc = pickupSite ? locations.find(l => l.id === pickupSite.location_id) : null;
    const deliveryLoc = deliverySite ? locations.find(l => l.id === deliverySite.location_id) : null;

    setFormData({
      customer_id: order.customer_id,
      order_code: order.order_code,
      pickup_site_id: order.pickup_site_id || "",
      delivery_site_id: order.delivery_site_id || "",
      pickup_text: pickupSite
        ? `${pickupSite.company_name} (${pickupLoc?.code || ''})`
        : (order.pickup_text || ""),
      delivery_text: deliverySite
        ? `${deliverySite.company_name} (${deliveryLoc?.code || ''})`
        : (order.delivery_text || ""),
      port_site_id: order.port_site_id || "",
      equipment: order.equipment || "20",
      qty: order.qty,
      cargo_note: order.cargo_note || "",
      container_code: order.container_code || "",
      customer_requested_date: extractDateString(order.customer_requested_date),
      // Document fields (kept for backwards compatibility but not used in form)
      container_receipt: order.container_receipt || "",
      delivery_order_no: order.delivery_order_no || "",
      handover_report: order.handover_report || "",
      seal_no: order.seal_no || "",
    });

    // Populate driver assignment data for all orders
    // For ETA dates, we need to parse locally to get correct shift
    const getLocalHour = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getHours();
    };

    setAssignData({
      driver_id: order.driver_id || "",
      eta_pickup_date: extractDateString(order.eta_pickup_at),
      eta_pickup_shift: order.eta_pickup_at
        ? getShiftFromTime(getLocalHour(order.eta_pickup_at))
        : "morning",
      eta_delivery_date: extractDateString(order.eta_delivery_at),
      eta_delivery_shift: order.eta_delivery_at
        ? getShiftFromTime(getLocalHour(order.eta_delivery_at))
        : "morning",
    });

    // Fetch documents for this order
    fetchOrderDocuments(order.id);

    setShowEditModal(true);
  };

  const getShiftFromTime = (hour: number): string => {
    if (hour >= 13 && hour < 18) return "afternoon";
    if (hour >= 18) return "evening";
    return "morning";
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      const shiftTimes: Record<string, string> = {
        morning: "08:00:00",
        afternoon: "13:00:00",
        evening: "18:00:00",
      };

      // Convert empty strings to null for optional fields
      const payload: any = {
        customer_id: formData.customer_id,
        order_code: formData.order_code,
        pickup_site_id: formData.pickup_site_id || null,
        delivery_site_id: formData.delivery_site_id || null,
        pickup_text: formData.pickup_text || null,
        delivery_text: formData.delivery_text || null,
        port_site_id: formData.port_site_id || null,
        equipment: formData.equipment,
        qty: formData.qty,
        customer_requested_date: formData.customer_requested_date || null,
        container_code: formData.container_code || null,
        cargo_note: formData.cargo_note || null,
      };

      // Include driver assignment data for all orders
      payload.driver_id = assignData.driver_id || null;
      payload.eta_pickup_at = assignData.eta_pickup_date
        ? `${assignData.eta_pickup_date}T${shiftTimes[assignData.eta_pickup_shift]}`
        : null;
      payload.eta_delivery_at = assignData.eta_delivery_date
        ? `${assignData.eta_delivery_date}T${shiftTimes[assignData.eta_delivery_shift]}`
        : null;

      await apiFetch(`/orders/${editingOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setShowEditModal(false);
      setEditingOrder(null);
      setFormData({
        customer_id: "",
        order_code: "",
        pickup_site_id: "",
        delivery_site_id: "",
        pickup_text: "",
        delivery_text: "",
        port_site_id: "",
        equipment: "20",
        qty: 1,
        cargo_note: "",
        container_code: "",
        customer_requested_date: "",
        container_receipt: "",
        delivery_order_no: "",
        handover_report: "",
        seal_no: "",
      });
      setAssignData({
        driver_id: "",
        eta_pickup_date: "",
        eta_pickup_shift: "morning",
        eta_delivery_date: "",
        eta_delivery_shift: "morning",
      });
      fetchOrders();
    } catch (err: any) {
      // Check for duplicate order code error
      if (err.message && err.message.includes("duplicate key") && err.message.includes("order_code")) {
        alert(`Lỗi: Mã đơn hàng "${formData.order_code}" đã tồn tại. Vui lòng sử dụng mã khác.`);
      } else {
        alert("Error: " + err.message);
      }
    }
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const shiftTimes: Record<string, string> = {
      morning: "08:00:00",
      afternoon: "13:00:00",
      evening: "18:00:00",
    };

    const payload = {
      driver_id: assignData.driver_id,
      eta_pickup_at: assignData.eta_pickup_date
        ? `${assignData.eta_pickup_date}T${shiftTimes[assignData.eta_pickup_shift]}`
        : undefined,
      eta_delivery_at: assignData.eta_delivery_date
        ? `${assignData.eta_delivery_date}T${shiftTimes[assignData.eta_delivery_shift]}`
        : undefined,
    };

    try {
      await apiFetch(`/orders/${selectedOrder.id}/accept`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowAssignModal(false);
      setSelectedOrder(null);
      setAssignData({
        driver_id: "",
        eta_pickup_date: "",
        eta_pickup_shift: "morning",
        eta_delivery_date: "",
        eta_delivery_shift: "morning",
      });
      fetchOrders();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const openAssignModal = (order: Order) => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  };

  const handleCancelOrder = async (order: Order) => {
    const reason = prompt("Lý do huỷ đơn:");
    if (!reason) return;

    try {
      await apiFetch(`/orders/${order.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      fetchOrders();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleWorkflowAction = async (orderId: string, action: string) => {
    try {
      await apiFetch(`/orders/${orderId}/${action}`, {
        method: "POST",
      });
      fetchOrders();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return "—";
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.name || "—";
  };

  // Get driver initials (viết tắt)
  const getDriverInitials = (driverId?: string) => {
    if (!driverId) return "—";
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return "—";
    // Use short_name if available
    if (driver.short_name) return driver.short_name;
    // Otherwise generate initials from name
    const words = driver.name.trim().split(/\s+/);
    return words.map((w) => w.charAt(0).toUpperCase()).join("");
  };

  const getLocationCode = (locationId?: string) => {
    if (!locationId) return "—";
    const location = locations.find((l) => l.id === locationId);
    return location?.code || "—";
  };

  const getSiteCode = (siteId?: string) => {
    if (!siteId) return "—";
    const site = sites.find((s) => s.id === siteId);
    return site?.code || "—";
  };

  const formatETA = (eta?: string) => {
    if (!eta) return "—";
    const date = new Date(eta);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const hour = date.getHours();
    let shift = "S";
    if (hour >= 13 && hour < 18) shift = "C";
    else if (hour >= 18) shift = "T";
    return `${shift} ${day}/${month}`;
  };

  const formatCustomerDate = (date?: string) => {
    if (!date) return "—";
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  // Format status using translations
  const formatStatus = (status: string) => {
    const key = `status.${status}` as const;
    return t(key) || status;
  };


  // Filter by tab, search keyword, date range, and driver
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filter by tab/status
    if (activeTab === "PROCESSING") {
      result = result.filter((o) => ["NEW", "ASSIGNED", "IN_TRANSIT"].includes(o.status));
    } else if (activeTab !== "ALL") {
      result = result.filter((o) => o.status === activeTab);
    }

    // Filter by search keyword (order_code, container_code, cargo_note, pickup/delivery text, site codes)
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      result = result.filter((o) => {
        const driverName = getDriverName(o.driver_id)?.toLowerCase() || "";
        // Get site info for searching
        const pickupSite = o.pickup_site_id ? sites.find(s => s.id === o.pickup_site_id) : null;
        const deliverySite = o.delivery_site_id ? sites.find(s => s.id === o.delivery_site_id) : null;
        const pickupSiteCode = pickupSite?.code?.toLowerCase() || "";
        const pickupSiteName = pickupSite?.company_name?.toLowerCase() || "";
        const deliverySiteCode = deliverySite?.code?.toLowerCase() || "";
        const deliverySiteName = deliverySite?.company_name?.toLowerCase() || "";

        return (
          o.order_code?.toLowerCase().includes(keyword) ||
          o.container_code?.toLowerCase().includes(keyword) ||
          o.cargo_note?.toLowerCase().includes(keyword) ||
          o.pickup_text?.toLowerCase().includes(keyword) ||
          o.delivery_text?.toLowerCase().includes(keyword) ||
          driverName.includes(keyword) ||
          pickupSiteCode.includes(keyword) ||
          pickupSiteName.includes(keyword) ||
          deliverySiteCode.includes(keyword) ||
          deliverySiteName.includes(keyword)
        );
      });
    }

    // Filter by date range (using customer_requested_date)
    if (dateFrom) {
      result = result.filter((o) => {
        const orderDate = o.customer_requested_date || o.order_date;
        return orderDate && orderDate >= dateFrom;
      });
    }
    if (dateTo) {
      result = result.filter((o) => {
        const orderDate = o.customer_requested_date || o.order_date;
        return orderDate && orderDate <= dateTo;
      });
    }

    // Filter by driver
    if (selectedDriverFilter) {
      result = result.filter((o) => o.driver_id === selectedDriverFilter);
    }

    return result;
  }, [orders, activeTab, searchKeyword, dateFrom, dateTo, selectedDriverFilter, sites]);

  // Sort
  const sortedOrders = useMemo(() => {
    if (!sortField) return filteredOrders;

    return [...filteredOrders].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle driver sorting
      if (sortField === "driver_id") {
        aVal = getDriverName(a.driver_id);
        bVal = getDriverName(b.driver_id);
      }

      // Handle order_code sorting - extract numeric part
      if (sortField === "order_code") {
        const extractNumber = (code: string) => {
          const match = code.match(/-(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        };
        const aNum = extractNumber(aVal || "");
        const bNum = extractNumber(bVal || "");

        // Compare prefix first
        const aPrefix = (aVal || "").split("-")[0];
        const bPrefix = (bVal || "").split("-")[0];

        if (aPrefix !== bPrefix) {
          return sortOrder === "asc"
            ? aPrefix.localeCompare(bPrefix)
            : bPrefix.localeCompare(aPrefix);
        }

        // Same prefix, compare numbers
        return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300">⇅</span>;
    return sortOrder === "asc" ? "↑" : "↓";
  };

  // Check if we should show grouped view (only when sorting by customer_requested_date)
  const isGroupedByDate = sortField === "customer_requested_date";

  // Group orders by date for grouped view
  const groupedOrders = useMemo(() => {
    if (!isGroupedByDate) return null;

    const groups: { date: string; dateLabel: string; orders: Order[] }[] = [];
    const dateMap = new Map<string, Order[]>();

    sortedOrders.forEach((order) => {
      // Use extractDateString to avoid timezone issues
      const dateStr = order.customer_requested_date
        ? extractDateString(order.customer_requested_date)
        : "no-date";
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      dateMap.get(dateStr)!.push(order);
    });

    // Convert to array and sort by date
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
      if (a === "no-date") return 1;
      if (b === "no-date") return -1;
      return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b);
    });

    sortedDates.forEach((dateStr) => {
      const orders = dateMap.get(dateStr)!;
      let dateLabel = t("noDate");
      if (dateStr !== "no-date" && dateStr) {
        // Parse YYYY-MM-DD directly to avoid timezone issues
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const day = parseInt(parts[2], 10);
          const month = parseInt(parts[1], 10);
          dateLabel = `${day}/${month}`;
        }
      }
      groups.push({ date: dateStr, dateLabel, orders });
    });

    return groups;
  }, [sortedOrders, isGroupedByDate, sortOrder]);

  // Toggle collapse for a date group
  const toggleDateCollapse = (dateStr: string) => {
    setCollapsedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
      }
      return newSet;
    });
  };

  // Pagination
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedOrders.slice(startIndex, startIndex + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedOrders.length / pageSize);

  // Reset to page 1 when filters or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, pageSize, searchKeyword, dateFrom, dateTo, selectedDriverFilter]);

  const tabs = [
    { key: "ALL", label: t("tabs.all") },
    { key: "PROCESSING", label: t("tabs.processing") },
    { key: "NEW", label: t("tabs.new") },
    { key: "ASSIGNED", label: t("tabs.assigned") },
    { key: "IN_TRANSIT", label: t("tabs.inTransit") },
    { key: "DELIVERED", label: t("tabs.delivered") },
    { key: "COMPLETED", label: t("tabs.completed") },
    { key: "REJECTED", label: t("tabs.cancelled") },
  ];

  if (loading) return <div className="p-8 text-sm">Loading...</div>;

  return (
    <div className="h-[calc(100vh-64px)] overflow-auto">
      {/* Header */}
      <div className="p-6 pb-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">{t("title")}</h1>
            <p className="text-xs text-gray-500">{t("roleLabel")}: {role || "loading..."}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowQuickCreateModal(true);
                setIsParsing(false); // Reset parsing state
                setParsedOrders([]); // Clear previous results
              }}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              {t("createFromText")}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + {t("newOrder")}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Phần 2: Tabs + Table Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        {/* Tabs */}
        <div className="border-y border-gray-200 px-6">
          <div className="flex justify-between items-center">
            <nav className="flex gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 py-2">
              <span className="text-xs text-gray-600">{t("display")}:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-xs border rounded px-2 py-1"
              >
                <option value={20}>20 {t("rows")}</option>
                <option value={50}>50 {t("rows")}</option>
                <option value={100}>100 {t("rows")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={t("searchPlaceholder") || "Tìm kiếm mã đơn, container, hàng..."}
                className="text-xs border rounded px-2 py-1.5 w-56"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword("")}
                  className="text-gray-400 hover:text-gray-600 px-1"
                  title="Xóa"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">{t("dateFrom") || "Từ"}:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border rounded px-2 py-1.5"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">{t("dateTo") || "Đến"}:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border rounded px-2 py-1.5"
              />
            </div>

            {/* Driver Filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">{t("driver") || "Tài xế"}:</span>
              <select
                value={selectedDriverFilter}
                onChange={(e) => setSelectedDriverFilter(e.target.value)}
                className="text-xs border rounded px-2 py-1.5 min-w-[120px]"
              >
                <option value="">{t("allDrivers") || "Tất cả"}</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.short_name || d.name}</option>
                ))}
              </select>
            </div>

            {/* Clear All Filters */}
            {(searchKeyword || dateFrom || dateTo || selectedDriverFilter) && (
              <button
                onClick={() => {
                  setSearchKeyword("");
                  setDateFrom("");
                  setDateTo("");
                  setSelectedDriverFilter("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                {t("clearFilters") || "Xóa bộ lọc"}
              </button>
            )}

            {/* Results count */}
            <div className="ml-auto text-xs text-gray-500">
              {t("filteredCount", { count: filteredOrders.length, total: orders.length }) ||
               `${filteredOrders.length} / ${orders.length} đơn`}
            </div>
          </div>
        </div>

        <style jsx>{`
          .resizable-th {
            position: relative;
            user-select: none;
          }
          .resize-handle {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 5px;
            cursor: col-resize;
            background: transparent;
          }
          .resize-handle:hover {
            background: #3b82f6;
          }
          .wrap-cell {
            word-wrap: break-word;
            white-space: normal;
            line-height: 1.3;
          }
        `}</style>

        {/* Table Header */}
        <div className="px-6 pt-3 bg-white">
          <div className="border border-b-0 border-gray-200 rounded-t-xl overflow-hidden">
            <table className="text-xs" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
              <thead className="bg-gray-50">
              <tr>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700 cursor-pointer" style={{width: columnWidths.custDate}} onClick={() => handleSort("customer_requested_date")}>
                  <div className="flex items-center gap-1">
                    {t("columns.custDate")} <SortIcon field="customer_requested_date" />
                  </div>
                  <div className="resize-handle" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'custDate'); }} />
                </th>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700 cursor-pointer" style={{width: columnWidths.orderCode}} onClick={() => handleSort("order_code")}>
                  <div className="flex items-center gap-1">
                    {t("columns.orderCode")} <SortIcon field="order_code" />
                  </div>
                  <div className="resize-handle" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'orderCode'); }} />
                </th>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700 cursor-pointer" style={{width: columnWidths.driver}} onClick={() => handleSort("driver_id")}>
                  <div className="flex items-center gap-1">
                    {t("columns.driver")} <SortIcon field="driver_id" />
                  </div>
                  <div className="resize-handle" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'driver'); }} />
                </th>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700" style={{width: columnWidths.route}}>
                  {t("columns.route")}
                  <div className="resize-handle" onMouseDown={(e) => handleMouseDown(e, 'route')} />
                </th>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700" style={{width: columnWidths.container}}>
                  {t("columns.container")}
                  <div className="resize-handle" onMouseDown={(e) => handleMouseDown(e, 'container')} />
                </th>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700" style={{width: columnWidths.containerCode}}>
                  {t("columns.containerCode")}
                  <div className="resize-handle" onMouseDown={(e) => handleMouseDown(e, 'containerCode')} />
                </th>
                <th className="resizable-th px-2 py-2 text-right font-bold text-gray-700" style={{width: columnWidths.km}}>
                  {t("columns.km") || "Km"}
                  <div className="resize-handle" onMouseDown={(e) => handleMouseDown(e, 'km')} />
                </th>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700" style={{width: columnWidths.cargoNote}}>
                  {t("columns.cargoNote")}
                  <div className="resize-handle" onMouseDown={(e) => handleMouseDown(e, 'cargoNote')} />
                </th>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700 cursor-pointer" style={{width: columnWidths.etaPickup}} onClick={() => handleSort("eta_pickup_at")}>
                  <div className="flex items-center gap-1">
                    {t("columns.etaPickup")} <SortIcon field="eta_pickup_at" />
                  </div>
                  <div className="resize-handle" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'etaPickup'); }} />
                </th>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700 cursor-pointer" style={{width: columnWidths.etaDelivery}} onClick={() => handleSort("eta_delivery_at")}>
                  <div className="flex items-center gap-1">
                    {t("columns.etaDelivery")} <SortIcon field="eta_delivery_at" />
                  </div>
                  <div className="resize-handle" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'etaDelivery'); }} />
                </th>
                <th className="resizable-th px-2 py-2 text-left font-bold text-gray-700 cursor-pointer" style={{width: columnWidths.status}} onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    {t("columns.status")} <SortIcon field="status" />
                  </div>
                  <div className="resize-handle" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'status'); }} />
                </th>
                <th className="px-2 py-2 text-left font-bold text-gray-700" style={{width: columnWidths.actions}}>
                  {t("columns.actions")}
                </th>
              </tr>
            </thead>
            </table>
          </div>
        </div>
      </div>

      {/* Data Table Body */}
      <div className="px-6 pb-4">
        <div className="border border-t-0 border-gray-200 rounded-b-xl overflow-hidden bg-white">
          <table className="text-xs" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
            <tbody className="divide-y divide-gray-100">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-2 py-6 text-center text-gray-500">
                    {t("noOrders")}
                  </td>
                </tr>
              ) : isGroupedByDate && groupedOrders ? (
                /* Grouped by Date View */
                groupedOrders.map((group) => {
                  const isCollapsed = collapsedDates.has(group.date);
                  return (
                    <React.Fragment key={group.date}>
                      {/* Date Group Header */}
                      <tr
                        className="bg-blue-50 cursor-pointer hover:bg-blue-100"
                        onClick={() => toggleDateCollapse(group.date)}
                      >
                        <td colSpan={11} className="px-3 py-2">
                          <div className="flex items-center gap-2 font-medium text-blue-800">
                            <span className="text-sm">{isCollapsed ? "▶" : "▼"}</span>
                            <span className="text-sm">📅 {group.dateLabel}</span>
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                              {group.orders.length} {t("orders")}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {/* Order Rows (hidden if collapsed) */}
                      {!isCollapsed &&
                        group.orders.map((order) => (
                          <tr key={order.id} className={`${getDriverColor(order.driver_id).bg}`}>
                            <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.custDate}}>
                              {/* Empty - date shown in group header */}
                            </td>
                            <td className="px-2 py-2 font-medium wrap-cell" style={{width: columnWidths.orderCode}}>{order.order_code}</td>
                            <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.driver}} title={getDriverName(order.driver_id)}>
                              {getDriverInitials(order.driver_id)}
                            </td>
                            <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.route}}>
                              {order.pickup_site_id ? getSiteCode(order.pickup_site_id) : (order.pickup_text || "—")} → {order.delivery_site_id ? getSiteCode(order.delivery_site_id) : (order.delivery_text || "—")}
                            </td>
                            <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.container}}>
                              {order.qty}x{order.equipment || "—"}
                            </td>
                            <td className="px-2 py-2 wrap-cell font-mono text-gray-700" style={{width: columnWidths.containerCode}}>
                              {order.container_code || "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-gray-700" style={{width: columnWidths.km}}>
                              {order.distance_km || "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-600 wrap-cell" style={{width: columnWidths.cargoNote}}>
                              {order.cargo_note || "—"}
                            </td>
                            <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.etaPickup}}>
                              {formatETA(order.eta_pickup_at)}
                            </td>
                            <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.etaDelivery}}>
                              {formatETA(order.eta_delivery_at)}
                            </td>
                            <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.status}}>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  order.status === "NEW"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : order.status === "ASSIGNED"
                                    ? "bg-blue-100 text-blue-800"
                                    : order.status === "IN_TRANSIT"
                                    ? "bg-purple-100 text-purple-800"
                                    : order.status === "DELIVERED"
                                    ? "bg-cyan-100 text-cyan-800"
                                    : order.status === "EMPTY_RETURN"
                                    ? "bg-slate-100 text-slate-800"
                                    : order.status === "COMPLETED"
                                    ? "bg-green-100 text-green-800"
                                    : order.status === "REJECTED"
                                    ? "bg-red-100 text-red-800"
                                    : order.status === "CANCELLED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {formatStatus(order.status)}
                              </span>
                            </td>
                            <td className="px-2 py-2" style={{width: columnWidths.actions}}>
                              <div className="flex gap-1 flex-wrap">
                                <button
                                  onClick={() => openEditModal(order)}
                                  className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  {t("actions.edit")}
                                </button>
                                {order.status === "NEW" && (
                                  <button
                                    onClick={() => openAssignModal(order)}
                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    {t("actions.assign")}
                                  </button>
                                )}
                                {order.status === "ASSIGNED" && (
                                  <button
                                    onClick={() => handleWorkflowAction(order.id, "pickup")}
                                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    {t("status.PICKED_UP")}
                                  </button>
                                )}
                                {order.status === "IN_TRANSIT" && (
                                  <button
                                    onClick={() => handleWorkflowAction(order.id, "delivered")}
                                    className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                                  >
                                    {t("status.DELIVERED")}
                                  </button>
                                )}
                                {/* Cancel button - available before DELIVERED */}
                                {!["DELIVERED", "EMPTY_RETURN", "COMPLETED", "CANCELLED", "REJECTED"].includes(order.status) && (
                                  <button
                                    onClick={() => handleCancelOrder(order)}
                                    className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                  >
                                    {t("actions.cancel")}
                                  </button>
                                )}
                                {(order.status === "DELIVERED" || order.status === "EMPTY_RETURN") && (
                                  <button
                                    onClick={() => handleWorkflowAction(order.id, "complete")}
                                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    {t("actions.complete")}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              ) : (
                /* Normal Table View (when sorting by other columns) */
                paginatedOrders.map((order) => (
                  <tr key={order.id} className={`${getDriverColor(order.driver_id).bg}`}>
                    <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.custDate}}>
                      {formatCustomerDate(order.customer_requested_date)}
                    </td>
                    <td className="px-2 py-2 font-medium wrap-cell" style={{width: columnWidths.orderCode}}>{order.order_code}</td>
                    <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.driver}} title={getDriverName(order.driver_id)}>
                      {getDriverInitials(order.driver_id)}
                    </td>
                    <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.route}}>
                      {order.pickup_site_id ? getSiteCode(order.pickup_site_id) : (order.pickup_text || "—")} → {order.delivery_site_id ? getSiteCode(order.delivery_site_id) : (order.delivery_text || "—")}
                    </td>
                    <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.container}}>
                      {order.qty}x{order.equipment || "—"}
                    </td>
                    <td className="px-2 py-2 wrap-cell font-mono text-gray-700" style={{width: columnWidths.containerCode}}>
                      {order.container_code || "—"}
                    </td>
                    <td className="px-2 py-2 text-right text-gray-700" style={{width: columnWidths.km}}>
                      {order.distance_km || "—"}
                    </td>
                    <td className="px-2 py-2 text-gray-600 wrap-cell" style={{width: columnWidths.cargoNote}}>
                      {order.cargo_note || "—"}
                    </td>
                    <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.etaPickup}}>
                      {formatETA(order.eta_pickup_at)}
                    </td>
                    <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.etaDelivery}}>
                      {formatETA(order.eta_delivery_at)}
                    </td>
                    <td className="px-2 py-2 wrap-cell" style={{width: columnWidths.status}}>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          order.status === "NEW"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "ASSIGNED"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "IN_TRANSIT"
                            ? "bg-purple-100 text-purple-800"
                            : order.status === "DELIVERED"
                            ? "bg-cyan-100 text-cyan-800"
                            : order.status === "EMPTY_RETURN"
                            ? "bg-slate-100 text-slate-800"
                            : order.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : order.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-2 py-2" style={{width: columnWidths.actions}}>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => openEditModal(order)}
                          className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          {t("actions.edit")}
                        </button>
                        {order.status === "NEW" && (
                          <button
                            onClick={() => openAssignModal(order)}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            {t("actions.assign")}
                          </button>
                        )}
                        {order.status === "ASSIGNED" && (
                          <button
                            onClick={() => handleWorkflowAction(order.id, "pickup")}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            {t("status.PICKED_UP")}
                          </button>
                        )}
                        {order.status === "IN_TRANSIT" && (
                          <button
                            onClick={() => handleWorkflowAction(order.id, "delivered")}
                            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            {t("status.DELIVERED")}
                          </button>
                        )}
                        {/* Cancel button - available before DELIVERED */}
                        {!["DELIVERED", "EMPTY_RETURN", "COMPLETED", "CANCELLED", "REJECTED"].includes(order.status) && (
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            {t("actions.cancel")}
                          </button>
                        )}
                        {(order.status === "DELIVERED" || order.status === "EMPTY_RETURN") && (
                          <button
                            onClick={() => handleWorkflowAction(order.id, "complete")}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            {t("actions.complete")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 shadow-[0_-2px_4px_rgba(0,0,0,0.05)] flex items-center justify-between">
          <div className="text-xs text-gray-600">
            {t("showingOrders", { start: ((currentPage - 1) * pageSize) + 1, end: Math.min(currentPage * pageSize, sortedOrders.length), total: sortedOrders.length })}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ««
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              «
            </button>
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-xs border rounded ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return <span key={page} className="px-2 text-xs">...</span>;
              }
              return null;
            })}
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              »
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              »»
            </button>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">Create New Order</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Customer * <span className="text-gray-400 font-normal">(TMS + CRM)</span>
                  </label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full text-sm border rounded px-2 py-1.5"
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.source === "CRM" ? "🔗 " : ""}{c.code} - {c.name}{c.source === "CRM" ? " (CRM)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.order_code && (
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Order Code
                    </label>
                    <input
                      type="text"
                      value={formData.order_code}
                      onChange={(e) =>
                        setFormData({ ...formData, order_code: e.target.value })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Pickup Site *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Type or select..."
                      value={formData.pickup_text}
                      onChange={(e) => {
                        const value = e.target.value;
                        const matchedSite = sites.find(s =>
                          s.company_name === value ||
                          `${s.company_name} (${locations.find(l => l.id === s.location_id)?.code || ''})` === value
                        );
                        setFormData({
                          ...formData,
                          pickup_text: value,
                          pickup_site_id: matchedSite?.id || ""
                        });
                      }}
                      list="pickup-sites-list"
                      className="w-full text-sm border rounded px-2 py-1.5"
                    />
                    <datalist id="pickup-sites-list">
                      {sites.filter(s => s.status === 'ACTIVE').map((site) => (
                        <option key={site.id} value={`${site.company_name} (${locations.find(l => l.id === site.location_id)?.code || ''})`} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Delivery Site *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Type or select..."
                      value={formData.delivery_text}
                      onChange={(e) => {
                        const value = e.target.value;
                        const matchedSite = sites.find(s =>
                          s.company_name === value ||
                          `${s.company_name} (${locations.find(l => l.id === s.location_id)?.code || ''})` === value
                        );
                        setFormData({
                          ...formData,
                          delivery_text: value,
                          delivery_site_id: matchedSite?.id || ""
                        });
                      }}
                      list="delivery-sites-list"
                      className="w-full text-sm border rounded px-2 py-1.5"
                    />
                    <datalist id="delivery-sites-list">
                      {sites.filter(s => s.status === 'ACTIVE').map((site) => (
                        <option key={site.id} value={`${site.company_name} (${locations.find(l => l.id === site.location_id)?.code || ''})`} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Container Type *
                    </label>
                    <select
                      required
                      value={formData.equipment}
                      onChange={(e) =>
                        setFormData({ ...formData, equipment: e.target.value })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                    >
                      <option value="20">20ft</option>
                      <option value="40">40ft</option>
                      <option value="45">45ft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Quantity *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.qty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          qty: parseInt(e.target.value),
                        })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Customer Date
                    </label>
                    <input
                      type="date"
                      value={formData.customer_requested_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customer_requested_date: e.target.value,
                        })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Container Code
                    </label>
                    <input
                      type="text"
                      value={formData.container_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          container_code: e.target.value,
                        })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                      placeholder="e.g., TCLU1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Depot hạ rỗng
                    </label>
                    <select
                      value={formData.port_site_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          port_site_id: e.target.value,
                        })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                    >
                      <option value="">Chọn depot...</option>
                      {sites
                        .filter(s => s.site_type === 'PORT' && s.status === 'ACTIVE')
                        .map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.company_name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Cargo Note
                  </label>
                  <textarea
                    value={formData.cargo_note}
                    onChange={(e) =>
                      setFormData({ ...formData, cargo_note: e.target.value })
                    }
                    className="w-full text-sm border rounded px-2 py-1.5"
                    rows={2}
                    placeholder="e.g., Hàng dễ vỡ, xếp cẩn thận"
                  />
                </div>

                {/* Document Info */}
                <div className="border-t pt-3 mt-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    Chứng từ / tài liệu có thể được tải lên sau khi tạo đơn hàng. Nhấn "Edit" để upload tài liệu.
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-sm px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800"
                  >
                    Create Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">Assign Driver</h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                <p className="text-gray-600">
                  Order: <strong>{selectedOrder.order_code}</strong>
                </p>
                <p className="text-gray-600">
                  Route: {selectedOrder.pickup_text} → {selectedOrder.delivery_text}
                </p>
              </div>

              <form onSubmit={handleAssignDriver} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Driver *
                  </label>
                  <select
                    required
                    value={assignData.driver_id}
                    onChange={(e) =>
                      setAssignData({ ...assignData, driver_id: e.target.value })
                    }
                    className="w-full text-sm border rounded px-2 py-1.5"
                  >
                    <option value="">Select driver...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ""} {d.source === "EXTERNAL" ? "[Ngoài]" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Giờ lấy hàng dự kiến
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={assignData.eta_pickup_date}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_pickup_date: e.target.value,
                        })
                      }
                      className="text-sm border rounded px-2 py-1.5"
                    />
                    <select
                      value={assignData.eta_pickup_shift}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_pickup_shift: e.target.value,
                        })
                      }
                      className="text-sm border rounded px-2 py-1.5"
                    >
                      <option value="morning">Sáng (8h)</option>
                      <option value="afternoon">Chiều (13h)</option>
                      <option value="evening">Tối (18h)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Giờ giao hàng dự kiến
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={assignData.eta_delivery_date}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_delivery_date: e.target.value,
                        })
                      }
                      className="text-sm border rounded px-2 py-1.5"
                    />
                    <select
                      value={assignData.eta_delivery_shift}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_delivery_shift: e.target.value,
                        })
                      }
                      className="text-sm border rounded px-2 py-1.5"
                    >
                      <option value="morning">Sáng (8h)</option>
                      <option value="afternoon">Chiều (13h)</option>
                      <option value="evening">Tối (18h)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-sm px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800"
                  >
                    Assign Driver
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">Edit Order - {editingOrder.order_code}</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateOrder} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Order Code
                  </label>
                  <input
                    type="text"
                    value={formData.order_code}
                    onChange={(e) =>
                      setFormData({ ...formData, order_code: e.target.value })
                    }
                    className="w-full text-sm border rounded px-2 py-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Pickup Site *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Type or select..."
                      value={formData.pickup_text}
                      onChange={(e) => {
                        const value = e.target.value;
                        const matchedSite = sites.find(s =>
                          s.company_name === value ||
                          `${s.company_name} (${locations.find(l => l.id === s.location_id)?.code || ''})` === value
                        );
                        setFormData({
                          ...formData,
                          pickup_text: value,
                          pickup_site_id: matchedSite?.id || ""
                        });
                      }}
                      list="pickup-sites-list-edit"
                      className="w-full text-sm border rounded px-2 py-1.5"
                    />
                    <datalist id="pickup-sites-list-edit">
                      {sites.filter(s => s.status === 'ACTIVE').map((site) => (
                        <option key={site.id} value={`${site.company_name} (${locations.find(l => l.id === site.location_id)?.code || ''})`} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Delivery Site *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Type or select..."
                      value={formData.delivery_text}
                      onChange={(e) => {
                        const value = e.target.value;
                        const matchedSite = sites.find(s =>
                          s.company_name === value ||
                          `${s.company_name} (${locations.find(l => l.id === s.location_id)?.code || ''})` === value
                        );
                        setFormData({
                          ...formData,
                          delivery_text: value,
                          delivery_site_id: matchedSite?.id || ""
                        });
                      }}
                      list="delivery-sites-list-edit"
                      className="w-full text-sm border rounded px-2 py-1.5"
                    />
                    <datalist id="delivery-sites-list-edit">
                      {sites.filter(s => s.status === 'ACTIVE').map((site) => (
                        <option key={site.id} value={`${site.company_name} (${locations.find(l => l.id === site.location_id)?.code || ''})`} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Container Type *
                    </label>
                    <select
                      required
                      value={formData.equipment}
                      onChange={(e) =>
                        setFormData({ ...formData, equipment: e.target.value })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                    >
                      <option value="20">20ft</option>
                      <option value="40">40ft</option>
                      <option value="45">45ft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Quantity *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.qty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          qty: parseInt(e.target.value),
                        })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Customer Date
                    </label>
                    <input
                      type="date"
                      value={formData.customer_requested_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customer_requested_date: e.target.value,
                        })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Container Code
                    </label>
                    <input
                      type="text"
                      value={formData.container_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          container_code: e.target.value,
                        })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                      placeholder="e.g., TCLU1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Depot hạ rỗng
                    </label>
                    <select
                      value={formData.port_site_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          port_site_id: e.target.value,
                        })
                      }
                      className="w-full text-sm border rounded px-2 py-1.5"
                    >
                      <option value="">Chọn depot...</option>
                      {sites
                        .filter(s => s.site_type === 'PORT' && s.status === 'ACTIVE')
                        .map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.company_name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Cargo Note
                  </label>
                  <textarea
                    value={formData.cargo_note}
                    onChange={(e) =>
                      setFormData({ ...formData, cargo_note: e.target.value })
                    }
                    className="w-full text-sm border rounded px-2 py-1.5"
                    rows={2}
                    placeholder="e.g., Hàng dễ vỡ, xếp cẩn thận"
                  />
                </div>

                {/* Document Upload Section */}
                <div className="border-t pt-3 mt-3">
                  <h3 className="text-sm font-semibold mb-3">Chứng từ / Tài liệu</h3>

                  {/* Upload buttons for each doc type */}
                  <div className="space-y-3">
                    {Object.entries(DOC_TYPE_LABELS).map(([docType, label]) => {
                      const docsOfType = orderDocuments.filter((d) => d.doc_type === docType);
                      return (
                        <div key={docType} className="border rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">{label}</span>
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*,.pdf,.doc,.docx"
                                className="hidden"
                                ref={(el) => {
                                  fileInputRefs.current[docType] = el;
                                }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file && editingOrder) {
                                    handleUploadDocument(editingOrder.id, docType, file);
                                  }
                                  e.target.value = "";
                                }}
                              />
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  uploadingDocType === docType
                                    ? "bg-gray-300 text-gray-500"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                              >
                                {uploadingDocType === docType ? "Đang tải..." : "+ Tải lên"}
                              </span>
                            </label>
                          </div>

                          {/* List of uploaded docs */}
                          {docsOfType.length > 0 ? (
                            <div className="space-y-1">
                              {docsOfType.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between bg-white border rounded px-2 py-1.5 text-xs"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-gray-400">
                                      {doc.content_type.startsWith("image/") ? "🖼️" : "📄"}
                                    </span>
                                    <span className="truncate" title={doc.original_name}>
                                      {doc.original_name}
                                    </span>
                                    <span className="text-gray-400 whitespace-nowrap">
                                      ({formatFileSize(doc.size_bytes)})
                                    </span>
                                  </div>
                                  <div className="flex gap-1 ml-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadDocument(doc.id, doc.original_name)
                                      }
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Tải xuống"
                                    >
                                      ⬇
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      className="text-red-600 hover:text-red-800"
                                      title="Xóa"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic">Chưa có tài liệu</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Driver Assignment Section - Available for all orders */}
                <div className="border-t pt-3 mt-3">
                  <h3 className="text-sm font-semibold mb-3">Phân công tài xế</h3>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Tài xế
                  </label>
                  <select
                    value={assignData.driver_id}
                    onChange={(e) =>
                      setAssignData({ ...assignData, driver_id: e.target.value })
                    }
                    className="w-full text-sm border rounded px-2 py-1.5"
                  >
                    <option value="">Chọn tài xế...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ""} {d.source === "EXTERNAL" ? "[Ngoài]" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Giờ lấy hàng dự kiến
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={assignData.eta_pickup_date}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_pickup_date: e.target.value,
                        })
                      }
                      className="text-sm border rounded px-2 py-1.5"
                    />
                    <select
                      value={assignData.eta_pickup_shift}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_pickup_shift: e.target.value,
                        })
                      }
                      className="text-sm border rounded px-2 py-1.5"
                    >
                      <option value="morning">Sáng (8h)</option>
                      <option value="afternoon">Chiều (13h)</option>
                      <option value="evening">Tối (18h)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Giờ giao hàng dự kiến
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={assignData.eta_delivery_date}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_delivery_date: e.target.value,
                        })
                      }
                      className="text-sm border rounded px-2 py-1.5"
                    />
                    <select
                      value={assignData.eta_delivery_shift}
                      onChange={(e) =>
                        setAssignData({
                          ...assignData,
                          eta_delivery_shift: e.target.value,
                        })
                      }
                      className="text-sm border rounded px-2 py-1.5"
                    >
                      <option value="morning">Sáng (8h)</option>
                      <option value="afternoon">Chiều (13h)</option>
                      <option value="evening">Tối (18h)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="text-sm px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800"
                  >
                    Cập nhật đơn
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create from Text Modal */}
      {/* Missing Sites Warning Modal */}
      {showMissingSitesModal && missingSites.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-orange-600 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Site chưa tồn tại
                </h2>
                <button
                  onClick={() => setShowMissingSitesModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Các địa điểm sau chưa có trong hệ thống. Bạn có thể tạo mới hoặc bỏ qua (hệ thống sẽ tự động tạo khi tạo đơn).
              </p>

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {missingSites.map((site, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-orange-50 border-orange-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded ${site.type === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {site.type === 'pickup' ? 'Lấy hàng' : 'Giao hàng'}
                        </span>
                        <p className="font-medium mt-1">{site.search_text}</p>
                      </div>
                      <button
                        onClick={() => {
                          // Open site creation page in new tab with pre-filled data
                          const params = new URLSearchParams({
                            company_name: site.search_text,
                            site_type: site.type.toUpperCase()
                          });
                          window.open(`/tms/sites/new?${params.toString()}`, '_blank');
                        }}
                        className="text-xs px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                      >
                        Tạo Site
                      </button>
                    </div>
                    {site.suggestions.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span>Gợi ý: </span>
                        {site.suggestions.slice(0, 3).map((s, i) => (
                          <span key={s.id} className="text-blue-600">
                            {s.company_name}{i < Math.min(site.suggestions.length, 3) - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={() => setShowMissingSitesModal(false)}
                  className="text-sm px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Bỏ qua, tự động tạo
                </button>
                <button
                  onClick={() => {
                    setShowMissingSitesModal(false);
                    // Refresh sites list in case user created new ones
                    fetchSites();
                  }}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Đã tạo xong, tiếp tục
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuickCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">Tạo Đơn từ Text</h2>
                <button
                  onClick={() => {
                    setShowQuickCreateModal(false);
                    setQuickCreateText('');
                    setParsedOrders([]);
                    setQuickCreateStatus({ creating: false, results: [] });
                    setMissingSites([]);
                    setSiteCheckResults({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* AI Parsing Controls */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">🤖 Use AI Parsing</span>
                  </label>

                  {useAI && (
                    <select
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value as any)}
                      className="text-xs border rounded px-2 py-1.5 bg-white"
                    >
                      <option value="gemini">Gemini Flash (Cheapest, ~$0.0001/batch)</option>
                      <option value="claude-haiku">Claude Haiku (Fast, ~$0.001/batch)</option>
                      <option value="claude">Claude Sonnet (Best, ~$0.01/batch)</option>
                    </select>
                  )}

                  {useAI && (
                    <span className="text-xs text-gray-500">
                      ✅ Auto-assign customer & create sites
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium mb-1">
                  Dán nội dung điều xe vào đây:
                </label>
                <textarea
                  value={quickCreateText}
                  onChange={(e) => setQuickCreateText(e.target.value)}
                  className="w-full text-sm border rounded px-3 py-2 font-mono"
                  rows={6}
                  placeholder={`Ví dụ:
185) A Tuyến: CHÙA VẼ - An Tảo, Hưng Yên- GAOU6458814- Lấy 23/12, giao sáng 24/12- 01x40 HDPE-VN H5604F
186) A Vụ: CHÙA VẼ - An Tảo, Hưng Yên- GAOU6457839- Lấy 23/12, giao sáng 24/12- 01x40 HDPE-VN H5604F`}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleParseText}
                    disabled={isParsing}
                    className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isParsing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {useAI ? "AI Parsing..." : "Parsing..."}
                      </>
                    ) : (
                      "Phân tích Text"
                    )}
                  </button>
                </div>
              </div>

              {/* Parsed Orders Preview */}
              {parsedOrders.length > 0 && (
                <div className="border-t pt-4">
                  {/* Missing Sites Warning Banner */}
                  {missingSites.length > 0 && (
                    <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm text-orange-700">
                          <strong>{missingSites.length} địa điểm</strong> chưa tồn tại trong hệ thống (đánh dấu màu cam)
                        </span>
                      </div>
                      <button
                        onClick={() => setShowMissingSitesModal(true)}
                        className="text-xs px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold">
                      Đơn hàng được phân tích ({parsedOrders.length} đơn)
                    </h3>
                    <div className="flex gap-2">
                      <select
                        className="text-xs border rounded px-2 py-1"
                        onChange={(e) => {
                          // Apply customer to all parsed orders
                          setParsedOrders(prev =>
                            prev.map(o => ({ ...o, customer_id: e.target.value }))
                          );
                        }}
                      >
                        <option value="">Chọn KH cho tất cả...</option>
                        {customers.filter(c => c.source !== "CRM").map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-auto max-h-[300px]">
                    <table className="w-full text-xs border">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-bold border-b">#</th>
                          <th className="px-2 py-1.5 text-left font-bold border-b">Lái xe</th>
                          <th className="px-2 py-1.5 text-left font-bold border-b">Lấy hàng</th>
                          <th className="px-2 py-1.5 text-left font-bold border-b">Giao hàng</th>
                          <th className="px-2 py-1.5 text-left font-bold border-b">Container</th>
                          <th className="px-2 py-1.5 text-left font-bold border-b">Size</th>
                          <th className="px-2 py-1.5 text-left font-bold border-b">Ngày lấy</th>
                          <th className="px-2 py-1.5 text-left font-bold border-b">Ngày giao</th>
                          <th className="px-2 py-1.5 text-left font-bold border-b">Cargo</th>
                          <th className="px-2 py-1.5 text-left font-bold border-b">Khách hàng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedOrders.map((order, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 border-b">{order.line_number}</td>
                            <td className="px-2 py-1.5 border-b">{order.driver_name}</td>
                            <td className={`px-2 py-1.5 border-b max-w-[120px] truncate ${!siteCheckResults[`pickup:${order.pickup_text}`]?.found && order.pickup_text ? 'bg-orange-100' : ''}`} title={order.pickup_text}>
                              {order.pickup_text}
                              {!siteCheckResults[`pickup:${order.pickup_text}`]?.found && order.pickup_text && (
                                <span className="text-orange-500 ml-1" title="Site chưa tồn tại">⚠</span>
                              )}
                            </td>
                            <td className={`px-2 py-1.5 border-b max-w-[120px] truncate ${!siteCheckResults[`delivery:${order.delivery_text}`]?.found && order.delivery_text ? 'bg-orange-100' : ''}`} title={order.delivery_text}>
                              {order.delivery_text}
                              {!siteCheckResults[`delivery:${order.delivery_text}`]?.found && order.delivery_text && (
                                <span className="text-orange-500 ml-1" title="Site chưa tồn tại">⚠</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 border-b font-mono">{order.container_code}</td>
                            <td className="px-2 py-1.5 border-b">{order.equipment}ft</td>
                            <td className="px-2 py-1.5 border-b">
                              {order.pickup_date ? new Date(order.pickup_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—'}
                            </td>
                            <td className="px-2 py-1.5 border-b">
                              {order.delivery_date
                                ? `${order.delivery_shift === 'morning' ? 'S' : order.delivery_shift === 'afternoon' ? 'C' : 'T'} ${new Date(order.delivery_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
                                : '—'}
                            </td>
                            <td className="px-2 py-1.5 border-b max-w-[150px] truncate" title={order.cargo_note}>
                              {order.cargo_note || '—'}
                            </td>
                            <td className="px-2 py-1.5 border-b">
                              <select
                                value={order.customer_id}
                                onChange={(e) => {
                                  setParsedOrders(prev =>
                                    prev.map((o, i) =>
                                      i === idx ? { ...o, customer_id: e.target.value } : o
                                    )
                                  );
                                }}
                                className="text-xs border rounded px-1 py-0.5 w-full"
                              >
                                <option value="">Chọn...</option>
                                {customers.filter(c => c.source !== "CRM").map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.code}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Creation Status */}
                  {quickCreateStatus.results.length > 0 && (
                    <div className="mt-3 p-3 rounded border bg-gray-50">
                      <h4 className="text-xs font-semibold mb-2">Kết quả tạo đơn:</h4>
                      <div className="space-y-1">
                        {quickCreateStatus.results.map((r, i) => (
                          <div key={i} className={`text-xs ${r.success ? 'text-green-600' : 'text-red-600'}`}>
                            {r.success ? '✓' : '✗'} {r.orderCode} {r.error && `- ${r.error}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickCreateModal(false);
                        setQuickCreateText('');
                        setParsedOrders([]);
                        setQuickCreateStatus({ creating: false, results: [] });
                      }}
                      className="text-sm px-4 py-1.5 border rounded hover:bg-gray-50"
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickCreateOrders}
                      disabled={quickCreateStatus.creating || parsedOrders.every(o => !o.customer_id)}
                      className="text-sm px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {quickCreateStatus.creating ? 'Đang tạo...' : `Tạo ${parsedOrders.length} đơn`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
