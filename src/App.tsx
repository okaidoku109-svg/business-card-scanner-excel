/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  Upload, 
  Plus, 
  Search, 
  Download, 
  Grid, 
  List, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  User, 
  Building2, 
  Briefcase, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clipboard, 
  X, 
  FileSpreadsheet, 
  Smartphone, 
  Save, 
  BookOpen, 
  ExternalLink,
  Trash2,
  Maximize2,
  Image
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";
import { BusinessCard } from "./types";
import CameraCapture from "./components/CameraCapture";
import CardItem from "./components/CardItem";

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Demo data if user wants to play instantly
const DEMO_CARDS: BusinessCard[] = [
  {
    id: "demo-1",
    name: "鈴木 健一",
    nameReading: "すずき けんいち",
    company: "フューチャーテック株式会社",
    title: "開発本部 取締役CTO",
    department: "AIシステム開発部",
    address: "東京都千代田区大手町1-2-3 大手町テクノビル18F",
    phone: "03-1234-5678",
    mobile: "090-9876-5432",
    email: "k.suzuki@future-tech.example.co.jp",
    website: "https://future-tech-sample.jp",
    notes: "AIカンファレンスにて交換。新規プロダクトのフロントエンドおよびLLM連携開発について後日面談予定あり。",
    scannedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-2",
    name: "高橋 美緒",
    nameReading: "たかはし みお",
    company: "フォレスト・クリエイティブ合同会社",
    title: "クリエイティブディレクター",
    department: "統合デザイン推進室",
    address: "京都府京都市中京区河原町通三条上ル2丁目サンプルビル3F",
    phone: "075-987-6543",
    mobile: "080-1122-3344",
    email: "mio.takahashi@forest-creative-mock.jp",
    website: "https://forest-creative-sample.com",
    notes: "ロゴなどのコーポレートブランディングを手がけるデザイナー。洗練された和風ベースのデザインセンスを持っている。",
    scannedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

interface SpreadsheetCellProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
}

function SpreadsheetCell({ value, onSave, placeholder = "" }: SpreadsheetCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue !== value) {
      onSave(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      if (tempValue !== value) {
        onSave(tempValue);
      }
    } else if (e.key === "Escape") {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder={placeholder}
        className="w-full h-full bg-emerald-950/40 text-xs px-2 py-1.5 outline-none border border-emerald-500/60 rounded-sm focus:ring-1 focus:ring-emerald-500 font-medium text-zinc-100"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="px-2 py-1.5 cursor-text hover:bg-zinc-800/80 min-h-[28px] flex items-center text-zinc-300 transition-colors w-full rounded-sm truncate text-xs"
      title="クリックして編集"
    >
      {value ? (
        <span className="truncate">{value}</span>
      ) : (
        <span className="text-zinc-600 italic text-[10px] select-none">(空)</span>
      )}
    </div>
  );
}

export default function App() {
  // State definitions
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [activeTab, setActiveTab] = useState<"camera" | "file" | "manual">("camera");
  
  // OCR & Loading states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Temporary editing state for freshly scanned card
  const [editingCard, setEditingCard] = useState<Partial<BusinessCard> | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Selected card for detail view modal
  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null);
  const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false);
  
  // Clipboard copy state mapping
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [mobileAccessUrl, setMobileAccessUrl] = useState<string | null>(null);
  const [mobileUrlCopied, setMobileUrlCopied] = useState(false);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const isMobile = isMobileDevice();

  // Update specific fields from spreadsheet inline editing
  const handleUpdateCardField = (cardId: string, field: keyof BusinessCard, newValue: string) => {
    const updated = cards.map((c) => {
      if (c.id === cardId) {
        return { ...c, [field]: newValue };
      }
      return c;
    });
    saveCardsList(updated);
  };

  // Load from localStorage on initialization
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ais_business_cards");
      if (stored) {
        setCards(JSON.parse(stored));
      } else {
        // Bootstrap first-time users with demo data so they have something nice to look at
        setCards(DEMO_CARDS);
        localStorage.setItem("ais_business_cards", JSON.stringify(DEMO_CARDS));
      }
    } catch (e) {
      console.error("Localstorage load error:", e);
    }
  }, []);

  // サーバー/API 接続確認（スマホの localhost 誤接続を検知）
  useEffect(() => {
    async function checkServer() {
      try {
        const healthRes = await fetch("/api/health");
        setServerOnline(healthRes.ok);
        if (healthRes.ok) {
          const infoRes = await fetch("/api/info");
          if (infoRes.ok) {
            const info = await infoRes.json();
            if (info.lanUrls?.length > 0) {
              setMobileAccessUrl(info.lanUrls[0]);
            }
          }
        }
      } catch {
        setServerOnline(false);
      }
    }
    checkServer();
  }, []);

  // Save to localStorage when list changes
  const saveCardsList = (updatedList: BusinessCard[]) => {
    setCards(updatedList);
    try {
      localStorage.setItem("ais_business_cards", JSON.stringify(updatedList));
    } catch (e) {
      console.error("Localstorage write error:", e);
    }
  };

  // Import mock demo data custom action
  const handleLoadDemoData = () => {
    const isConfirmed = window.confirm("テストデータを読み込みますか？ 現在のリストに追加されます。");
    if (!isConfirmed) return;
    const combined = [...DEMO_CARDS, ...cards].filter(
      (v, i, a) => a.findIndex((t) => t.phone === v.phone && t.name === v.name) === i
    );
    saveCardsList(combined);
  };

  // Convert File object to Base64 data url
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Launch AI scanner with captured card image
  const startCardAnalysis = async (base64Image: string, mimeType: string = "image/jpeg") => {
    setIsScanning(true);
    setScanError(null);
    setScannedImage(base64Image);
    setScanStatus("名刺画像をアップロード中...");

    try {
      setScanStatus("AIエンジンが高速OCR解析を実行中...");
      
      const response = await fetch("/api/scan-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image, mimeType }),
      });

      if (!response.ok) {
        let message = "自動解析サーバーでエラーが発生しました。";
        try {
          const errorData = await response.json();
          message = errorData.error || message;
        } catch {
          if (response.status === 404) {
            message =
              "APIが見つかりません（404）。スマホでは PC と同じ Wi-Fi 上で、PC の IP アドレス（例: http://192.168.0.10:3000）で開いてください。localhost は使えません。";
          } else {
            message = `サーバーエラー (${response.status})。npm run dev で起動しているか確認してください。`;
          }
        }
        throw new Error(message);
      }

      setScanStatus("名刺データの構造化および自動整形中...");
      const parsedData = await response.json();

      // Set scanning payload for user review form
      setEditingCard({
        name: parsedData.name || "",
        nameReading: parsedData.nameReading || "",
        company: parsedData.company || "",
        title: parsedData.title || "",
        department: parsedData.department || "",
        address: parsedData.address || "",
        phone: parsedData.phone || "",
        mobile: parsedData.mobile || "",
        email: parsedData.email || "",
        website: parsedData.website || "",
        notes: parsedData.notes || "",
      });

      setScanStatus("");
      setIsScanning(false);
    } catch (error: any) {
      console.error("Analysis failed:", error);
      const isNetworkError =
        error instanceof TypeError ||
        error?.message?.includes("Failed to fetch") ||
        error?.message?.includes("NetworkError");
      setScanError(
        isNetworkError
          ? "サーバーに接続できません。ターミナルで npm install の後、npm run dev を実行し、http://localhost:3000 を開いてください。"
          : error.message || "名刺の解析に失敗しました。画像のピントがあっているか、光が反射していないかお確かめください。"
      );
      setIsScanning(false);
    }
  };

  // Handle Drag & Drop photo imports
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const base64 = await fileToBase64(file);
      await startCardAnalysis(base64, file.type);
    }
  };

  // Handle standard File Input picker click
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const base64 = await fileToBase64(file);
      await startCardAnalysis(base64, file.type);
    }
  };

  // Save card from verified review form
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    const newCard: BusinessCard = {
      id: "card-" + Date.now(),
      name: editingCard.name || "",
      nameReading: editingCard.nameReading || "",
      company: editingCard.company || "",
      title: editingCard.title || "",
      department: editingCard.department || "",
      address: editingCard.address || "",
      phone: editingCard.phone || "",
      mobile: editingCard.mobile || "",
      email: editingCard.email || "",
      website: editingCard.website || "",
      notes: editingCard.notes || "",
      scannedAt: new Date().toISOString(),
      imageUrl: scannedImage || undefined
    };

    const isManual = activeTab === "manual";
    const actionLabel = isManual ? "追加登録" : "スキャン登録";

    const updated = [newCard, ...cards];
    saveCardsList(updated);

    // Reset workflow states
    setEditingCard(null);
    setScannedImage(null);
    setIsScanning(false);
    setShowCamera(false);
    
    // Smooth scroll down to grid list
    setTimeout(() => {
      document.getElementById("saved-cards-section")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  // Trigger Excel download of current list using custom sheetjs exporter
  const handleExportToExcel = () => {
    const listToExport = filteredCards;
    if (listToExport.length === 0) {
      alert("エクスポートするデータがありません。名刺を登録するかデモデータを追加してください。");
      return;
    }

    const rows = listToExport.map((c) => ({
      "氏名": c.name,
      "ふりがな": c.nameReading || "",
      "会社名": c.company,
      "役職": c.title,
      "部署名": c.department || "",
      "住所": c.address,
      "代表電話番号": c.phone,
      "携帯番号": c.mobile,
      "メールアドレス": c.email,
      "会社URL": c.website,
      "メモ・その他情報": c.notes || "",
      "スキャン日時": new Date(c.scannedAt).toLocaleString("ja-JP")
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Dynamic width settings for gorgeous auto-fitted view inside Excel
    worksheet["!cols"] = [
      { wch: 18 },  // 氏名
      { wch: 18 },  // ふりがな
      { wch: 28 },  // 会社名
      { wch: 16 },  // 役職
      { wch: 18 },  // 部署名
      { wch: 38 },  // 住所
      { wch: 16 },  // 電話番号
      { wch: 16 },  // 携帯番号
      { wch: 26 },  // メールアドレス
      { wch: 26 },  // 会社URL
      { wch: 30 },  // メモ
      { wch: 22 }   // スキャン日時
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "名刺データベース");

    XLSX.writeFile(
      workbook, 
      `名刺リスト_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx`
    );
  };

  // Copy rows as TSV for instant clipboard pasting into Google Sheets
  const handleCopyAsTSVForSpreadsheet = () => {
    const listToExport = filteredCards;
    if (listToExport.length === 0) {
      alert("コピーするデータがありません。デモデータを追加するか、スキャンを行ってください。");
      return;
    }

    const headers = ["会社名", "氏名", "ふりがな", "役職", "部署名", "代表電話番号", "携帯番号", "メールアドレス", "住所", "会社URL", "メモ", "登録日時"];
    const rows = listToExport.map((c) => [
      c.company || "",
      c.name || "",
      c.nameReading || "",
      c.title || "",
      c.department || "",
      c.phone || "",
      c.mobile || "",
      c.email || "",
      c.address || "",
      c.website || "",
      c.notes || "",
      new Date(c.scannedAt).toLocaleString("ja-JP")
    ]);

    const tsvContent = [
      headers.join("\t"),
      ...rows.map(row => row.map(cell => `${cell.replace(/\t/g, " ").replace(/\n/g, " ")}`).join("\t"))
    ].join("\n");

    navigator.clipboard.writeText(tsvContent);
    alert("🚀 スプレッドシート用データをコピーしました！\n\nGoogleスプレッドシートを開き、最初のセルをクリックして「Ctrl+V」(Macは「Cmd+V」) を押すと、綺麗にセルごとに自動分割されて貼り付けられます。");
  };

  // Export as high compatibility Tab-Separated TSV file for direct Google Sheets upload
  const handleExportToTSV = () => {
    const listToExport = filteredCards;
    if (listToExport.length === 0) {
      alert("エクスポートするデータがありません。");
      return;
    }

    const headers = ["会社名", "氏名", "ふりがな", "役職", "部署名", "代表電話番号", "携帯番号", "メールアドレス", "住所", "会社URL", "メモ", "登録日時"];
    const rows = listToExport.map((c) => [
      c.company || "",
      c.name || "",
      c.nameReading || "",
      c.title || "",
      c.department || "",
      c.phone || "",
      c.mobile || "",
      c.email || "",
      c.address || "",
      c.website || "",
      c.notes || "",
      new Date(c.scannedAt).toLocaleString("ja-JP")
    ]);

    // Add UTF-8 BOM so Excel & Google Sheets load multi-byte Japanese characters perfectly without issues
    const tsvContent = "\uFEFF" + [
      headers.join("\t"),
      ...rows.map(row => row.map(cell => `${cell.replace(/\t/g, " ").replace(/\n/g, " ")}`).join("\t"))
    ].join("\r\n");

    const blob = new Blob([tsvContent], { type: "text/tab-separated-values;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `名刺スプレッドシート_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.tsv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate standardized vCard string from a card object
  const generateVCardString = (card: BusinessCard): string => {
    const parts = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${card.name || ""};;;;`,
      `FN:${card.name || ""}`,
      card.nameReading ? `X-PHONETIC-FIRST-NAME:${card.nameReading}` : "",
      card.company ? `ORG:${card.company}` : "",
      card.title ? `TITLE:${card.title}` : "",
      card.email ? `EMAIL;TYPE=INTERNET,WORK:${card.email}` : "",
      card.mobile ? `TEL;TYPE=CELL,VOICE:${card.mobile}` : "",
      card.phone ? `TEL;TYPE=WORK,VOICE:${card.phone}` : "",
      card.address ? `ADR;TYPE=WORK:;;${card.address.replace(/,/g, "\\,")};;;;` : "",
      card.website ? `URL;TYPE=WORK:${card.website}` : "",
      card.notes ? `NOTE:${card.notes.replace(/\r?\n/g, "\\n").replace(/,/g, "\\,")}` : "",
      "END:VCARD"
    ].filter(Boolean);
    return parts.join("\r\n");
  };

  // Export single vCard for direct address book insertion
  const handleExportSingleVCard = (card: BusinessCard) => {
    try {
      const vcardText = generateVCardString(card);
      // Use UTF-8 with BOM so Japanese letters import perfectly on Windows, iOS and Android contact systems
      const blob = new Blob([vcardText], { type: "text/vcard;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${card.company ? card.company + "_" : ""}${card.name || "名刺"}.vcf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("連絡先ファイル(vCard)の出力に失敗しました。");
    }
  };

  // Batch Export all filtered cards as single consolidated vCard package
  const handleExportAllVCards = () => {
    const listToExport = filteredCards;
    if (listToExport.length === 0) {
      alert("外部出力するデータがありません。名刺を登録するか、テストデータを読み込んでください。");
      return;
    }

    try {
      const vcardsText = listToExport.map(generateVCardString).join("\r\n");
      const blob = new Blob([vcardsText], { type: "text/vcard;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `名刺一括登録_連絡帳_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.vcf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("一括連絡帳ファイルの出力に失敗しました。");
    }
  };

  // Export high compatibility Japanese UTF-8 CSV with BOM for universal imports (Excel, Contacts, Client CRM)
  const handleExportToCSV = () => {
    const listToExport = filteredCards;
    if (listToExport.length === 0) {
      alert("エクスポートするデータがありません。");
      return;
    }

    try {
      const headers = ["会社名", "氏名", "ふりがな", "役職", "部署名", "代表電話番号", "携帯番号", "メールアドレス", "住所", "会社URL", "メモ", "登録日時"];
      const rows = listToExport.map((c) => [
        c.company || "",
        c.name || "",
        c.nameReading || "",
        c.title || "",
        c.department || "",
        c.phone || "",
        c.mobile || "",
        c.email || "",
        c.address || "",
        c.website || "",
        c.notes || "",
        new Date(c.scannedAt).toLocaleString("ja-JP")
      ]);

      const csvContent = "\uFEFF" + [
        headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`).join(","))
      ].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `名刺データベース_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("CSVファイルの作成に失敗しました。");
    }
  };

  // Add a quick empty spreadsheet line for easy manual cataloging
  const handleAddBlankRow = () => {
    const blankCard: BusinessCard = {
      id: "card-" + Date.now(),
      name: "",
      nameReading: "",
      company: "",
      title: "",
      department: "",
      address: "",
      phone: "",
      mobile: "",
      email: "",
      website: "",
      notes: "※スプレッドシート上で作成された行",
      scannedAt: new Date().toISOString()
    };
    saveCardsList([blankCard, ...cards]);
  };

  // Remove card from list
  const handleDeleteCard = (id: string) => {
    const isConfirmed = window.confirm("名刺をリストから削除してよろしいですか？（この操作は元に戻せません）");
    if (!isConfirmed) return;
    const updated = cards.filter((c) => c.id !== id);
    saveCardsList(updated);
    if (selectedCard?.id === id) {
      setSelectedCard(null);
    }
  };

  // Copy helper for modal windows
  const handleCopyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Filter list cards reactive properties
  const filteredCards = cards.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.nameReading && item.nameReading.toLowerCase().includes(q)) ||
      item.company.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      (item.department && item.department.toLowerCase().includes(q)) ||
      item.address.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      item.mobile.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex flex-col antialiased">
      {/* Dynamic Header */}
      <header className="bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-30 shadow-lg shadow-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/50 ring-1 ring-emerald-500/30">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-zinc-50 tracking-tight flex items-center gap-2">
                名刺スキャナー ＆ スプレッドシート管理
              </h1>
              <p className="text-[10px] sm:text-xs text-zinc-500 hidden sm:block">
                AI powered card scanning & interactive Google Sheets spreadsheet workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="bg-emerald-950/60 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-800/50 flex items-center gap-1.5">
              <BookOpen size={13} />
              <span>データ数: <strong>{cards.length}</strong> 件</span>
            </span>
            <button
              onClick={handleLoadDemoData}
              className="text-xs text-zinc-400 hover:text-emerald-400 font-medium px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-700/50 transition-all flex items-center gap-1"
            >
              テストデータを追加
            </button>
          </div>
        </div>
      </header>

      {(serverOnline === false || (isMobile && window.location.hostname === "localhost")) && (
        <div className="bg-amber-950/80 border-b border-amber-800/50 px-4 py-3">
          <p className="max-w-7xl mx-auto text-xs text-amber-200 leading-relaxed flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong className="text-amber-100">スマホからアクセスする場合:</strong>{" "}
              PC で <code className="text-amber-300">npm run dev</code> を実行し、
              同じ Wi-Fi 上で{" "}
              {mobileAccessUrl ? (
                <a href={mobileAccessUrl} className="text-emerald-400 underline font-semibold">
                  {mobileAccessUrl}
                </a>
              ) : (
                <span>PC の IP アドレス（例: http://192.168.0.10:3000）</span>
              )}{" "}
              を開いてください。スマホのブラウザで <code className="text-amber-300">localhost</code> は使えません。
            </span>
          </p>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">

        {/* スマホアクセス用 QRコード（PC表示時） */}
        {mobileAccessUrl && !isMobile && (
          <section className="lg:col-span-12">
            <div className="bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-zinc-800 shadow-lg shadow-black/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="shrink-0 p-3 bg-white rounded-xl shadow-inner ring-1 ring-zinc-700">
                <QRCodeSVG
                  value={mobileAccessUrl}
                  size={112}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                  <Smartphone size={16} className="text-emerald-400 shrink-0" />
                  <h2 className="text-sm font-bold text-zinc-100">スマホからアクセス</h2>
                </div>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                  同じ Wi-Fi に接続したスマホで、下の QR コードを読み取るか URL を開いてください。
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <code className="flex-1 text-xs text-emerald-400 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 truncate font-mono">
                    {mobileAccessUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(mobileAccessUrl);
                      setMobileUrlCopied(true);
                      setTimeout(() => setMobileUrlCopied(false), 1500);
                    }}
                    className="shrink-0 px-3 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Clipboard size={13} />
                    {mobileUrlCopied ? "コピー済" : "URLをコピー"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Left column: Card OCR capture zone (columns 1 to 5) */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-zinc-900/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-black/30 border border-zinc-800 p-5 p-r-0">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/60">
              <h3 className="font-bold text-zinc-100 text-sm sm:text-base flex items-center gap-1.5">
                <Camera size={18} className="text-emerald-400" />
                名刺のデータ化登録
              </h3>
              <span className="text-[11px] text-zinc-600">AIが自動読み取り</span>
            </div>

            {/* Scanning methodology tab controls */}
            <div className="grid grid-cols-3 gap-2 bg-zinc-900 p-1.5 rounded-lg mb-5">
              <button
                onClick={() => {
                  setActiveTab("camera");
                  setEditingCard(null);
                  setScanError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "camera" 
                    ? "bg-zinc-800 text-emerald-400 shadow-xs ring-1 ring-emerald-500/20" 
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                カメラ撮影
              </button>
              <button
                onClick={() => {
                  setActiveTab("file");
                  setEditingCard(null);
                  setScanError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "file" 
                    ? "bg-zinc-800 text-emerald-400 shadow-xs ring-1 ring-emerald-500/20" 
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                画像アップ
              </button>
              <button
                onClick={() => {
                  setActiveTab("manual");
                  setScanError(null);
                  // Pre-populate empty card structure for manual typing
                  setEditingCard({
                    name: "",
                    nameReading: "",
                    company: "",
                    title: "",
                    department: "",
                    address: "",
                    phone: "",
                    mobile: "",
                    email: "",
                    website: "",
                    notes: "※マニュアル登録データ"
                  });
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "manual" 
                    ? "bg-zinc-800 text-emerald-400 shadow-xs ring-1 ring-emerald-500/20" 
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                手動入力
              </button>
            </div>

            {/* Workflow state display cards */}
            <div className="space-y-4">
              
              {/* Camera Tab flow */}
              {activeTab === "camera" && !editingCard && !isScanning && (
                <div className="text-center py-8 px-4 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/80">
                  <div className="h-14 w-14 bg-emerald-950/60 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner ring-1 ring-emerald-500/20">
                    <Camera size={26} />
                  </div>
                  <h4 className="font-bold text-zinc-100 text-sm mb-1">
                    {isMobile ? "スマホのカメラで撮影" : "カメラを起動して撮影"}
                  </h4>
                  <p className="text-xs text-zinc-500 mb-4 max-w-[280px] mx-auto leading-relaxed">
                    {isMobile
                      ? "スマホのカメラアプリで名刺を撮影し、AIが自動読み取りします。"
                      : "PCカメラ、またはスマートフォンの背面カメラで名刺をピントを合わせてキャプチャします。"}
                  </p>

                  {isMobile ? (
                    <>
                      <input
                        ref={mobileCameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                      <button
                        onClick={() => {
                          setScanError(null);
                          mobileCameraInputRef.current?.click();
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs tracking-wide shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center gap-2 mx-auto ring-1 ring-emerald-400/30"
                      >
                        <Smartphone size={14} />
                        スマホカメラで撮影する
                      </button>
                      <button
                        onClick={() => {
                          setShowCamera(true);
                          setScanError(null);
                        }}
                        className="mt-3 px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 underline"
                      >
                        ブラウザ内カメラを使う（環境によっては不可）
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowCamera(true);
                        setScanError(null);
                      }}
                      id="open-camera-sys"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs tracking-wide shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center gap-2 mx-auto ring-1 ring-emerald-400/30"
                    >
                      <Camera size={14} />
                      カメラスキャナーを起動する
                    </button>
                  )}
                </div>
              )}

              {/* Live Web Canvas Overlay */}
              {showCamera && activeTab === "camera" && !editingCard && !isScanning && (
                <CameraCapture 
                  onCapture={(data) => {
                    setShowCamera(false);
                    startCardAnalysis(data);
                  }}
                  onClose={() => setShowCamera(false)}
                />
              )}

              {/* Image File select flow */}
              {activeTab === "file" && !editingCard && !isScanning && (
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/80 p-8 text-center hover:bg-zinc-900/50 hover:border-emerald-400 transition-colors cursor-pointer group relative"
                >
                  <input
                    type="file"
                    accept="image/*"
                    id="business-card-file-picker"
                    onChange={handleFileInputChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="h-14 w-14 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <Upload size={24} />
                  </div>
                  <h4 className="font-bold text-zinc-100 text-sm mb-1">
                    ファイルをドラッグ＆ドロップ
                  </h4>
                  <p className="text-xs text-zinc-600 mb-3">またはパソコンから選択</p>
                  <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-400 rounded border border-zinc-700 text-[11px] font-semibold">
                    PNG, JPG, WebP 形式をサポート
                  </span>
                </div>
              )}

              {/* Status display when Parsing is running */}
              {isScanning && !editingCard && (
                <div className="p-8 text-center bg-emerald-950/20 border border-emerald-500/20 rounded-xl relative overflow-hidden">
                  {/* Subtle overlay radar lines */}
                  <div className="h-1 bg-emerald-400 absolute inset-x-0 w-full top-0 animate-[scan_2s_ease-in-out_infinite]" />
                  
                  <div className="h-14 w-14 bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-emerald-500/20">
                    <RefreshCw size={24} className="text-emerald-400 animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-100 mb-1">高精度AI読み取り中...</p>
                  <p className="text-xs text-emerald-400 font-medium px-4 py-1 bg-emerald-950/60 rounded-full inline-block mt-1 animate-pulse border border-emerald-800/50">
                    {scanStatus}
                  </p>
                  
                  {scannedImage && (
                    <div className="mt-6 border border-zinc-800 rounded-lg max-w-[200px] mx-auto overflow-hidden opacity-60">
                      <img src={scannedImage} alt="Scanning source preview" className="w-full object-contain max-h-32" />
                    </div>
                  )}
                </div>
              )}

              {/* OCR Scan Error display */}
              {scanError && (
                <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <h5 className="font-bold text-red-300 text-xs">読み取りに失敗しました</h5>
                    <p className="text-[11px] text-red-400/90 mt-1 leading-relaxed">{scanError}</p>
                    <button
                      onClick={() => {
                        setScanError(null);
                        setIsScanning(false);
                      }}
                      className="text-[10px] font-semibold text-red-300 underline mt-2 hover:text-red-200"
                    >
                      もう一度試す
                    </button>
                  </div>
                </div>
              )}

              {/* Unified Edit & Verification Form (Shown after OCR scan OR manual trigger) */}
              {editingCard && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg shadow-black/30"
                >
                  <div className="bg-zinc-900 p-3 flex justify-between items-center border-b border-zinc-800/60">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-emerald-500" />
                      {activeTab === "manual" ? "手動名刺情報の登録" : "解析データの確認・修正"}
                    </span>
                    <button
                      onClick={() => {
                        setEditingCard(null);
                        setScannedImage(null);
                        setIsScanning(false);
                      }}
                      className="text-zinc-600 hover:text-zinc-400 p-1"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveCard} className="p-4 space-y-4">
                    {/* Compact Image reference if present */}
                    {scannedImage && (
                      <div className="mb-4 bg-zinc-950/80 border border-zinc-800/60 p-2 rounded-lg flex items-center gap-3">
                        <div className="w-20 aspect-[1.6/1] bg-black rounded overflow-hidden shadow-xs flex-shrink-0">
                          <img src={scannedImage} className="w-full h-full object-cover" alt="Name card source mini" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-zinc-600 font-bold block leading-normal">スキャン元名刺画像</p>
                          <p className="text-xs text-zinc-400 truncate">登録時にこの名刺画像サムネイルも保存されます</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {/* Name input */}
                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">
                          氏名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingCard.name}
                          onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })}
                          placeholder="鈴木 太郎"
                          className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none placeholder:text-zinc-600"
                        />
                      </div>

                      {/* Name Reading (Hiragana phonetic pronunciation) */}
                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[11px] font-bold text-zinc-500 flex justify-between">
                          <span>氏名（ふりがな）</span>
                          <span className="text-[9px] text-zinc-600 font-normal">ひらがな</span>
                        </label>
                        <input
                          type="text"
                          value={editingCard.nameReading || ""}
                          onChange={(e) => setEditingCard({ ...editingCard, nameReading: e.target.value })}
                          placeholder="すずき たろう"
                          className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none placeholder:text-zinc-600"
                        />
                      </div>

                      {/* Company name */}
                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">
                          会社名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editingCard.company}
                          onChange={(e) => setEditingCard({ ...editingCard, company: e.target.value })}
                          placeholder="サンプル株式会社"
                          className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none placeholder:text-zinc-600"
                        />
                      </div>

                      {/* Title & Department inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid grid-cols-1 gap-1">
                          <label className="text-[11px] font-bold text-zinc-500">
                            役職
                          </label>
                          <input
                            type="text"
                            value={editingCard.title || ""}
                            onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                            placeholder="代表取締役"
                            className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          <label className="text-[11px] font-bold text-zinc-500">
                            部署・部門
                          </label>
                          <input
                            type="text"
                            value={editingCard.department || ""}
                            onChange={(e) => setEditingCard({ ...editingCard, department: e.target.value })}
                            placeholder="営業本部"
                            className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none placeholder:text-zinc-600"
                          />
                        </div>
                      </div>

                      {/* Phone & Mobile */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid grid-cols-1 gap-1">
                          <label className="text-[11px] font-bold text-zinc-500">
                            代表電話
                          </label>
                          <input
                            type="text"
                            value={editingCard.phone || ""}
                            onChange={(e) => setEditingCard({ ...editingCard, phone: e.target.value })}
                            placeholder="03-1234-5678"
                            className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          <label className="text-[11px] font-bold text-zinc-500">
                            携帯電話番号
                          </label>
                          <input
                            type="text"
                            value={editingCard.mobile || ""}
                            onChange={(e) => setEditingCard({ ...editingCard, mobile: e.target.value })}
                            placeholder="090-1234-5678"
                            className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none placeholder:text-zinc-600"
                          />
                        </div>
                      </div>

                      {/* Email address */}
                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">
                          メールアドレス
                        </label>
                        <input
                          type="email"
                          value={editingCard.email || ""}
                          onChange={(e) => setEditingCard({ ...editingCard, email: e.target.value })}
                          placeholder="taro@example.com"
                          className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none placeholder:text-zinc-600"
                        />
                      </div>

                      {/* Website/URL */}
                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">
                          ホームページURL
                        </label>
                        <input
                          type="text"
                          value={editingCard.website || ""}
                          onChange={(e) => setEditingCard({ ...editingCard, website: e.target.value })}
                          placeholder="https://example.com"
                          className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none placeholder:text-zinc-600"
                        />
                      </div>

                      {/* Physical Address */}
                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">
                          所在地住所
                        </label>
                        <textarea
                          rows={2}
                          value={editingCard.address || ""}
                          onChange={(e) => setEditingCard({ ...editingCard, address: e.target.value })}
                          placeholder="東京都港区芝公園4-2-8"
                          className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none resize-none placeholder:text-zinc-600"
                        />
                      </div>

                      {/* Notes / Memos */}
                      <div className="grid grid-cols-1 gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">
                          メモ・補足事項
                        </label>
                        <textarea
                          rows={2}
                          value={editingCard.notes || ""}
                          onChange={(e) => setEditingCard({ ...editingCard, notes: e.target.value })}
                          placeholder="名刺に書かれた手書きメモや案件情報をここに書き込めます"
                          className="w-full bg-zinc-950/80 text-zinc-100 text-xs border border-zinc-700 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:bg-zinc-800 focus:outline-none resize-none placeholder:text-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-zinc-800/60">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCard(null);
                          setScannedImage(null);
                          setIsScanning(false);
                        }}
                        className="flex-1 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-100 border border-zinc-800 rounded-lg hover:bg-zinc-950/80"
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-1.5 ring-1 ring-emerald-400/20"
                      >
                        <Save size={13} />
                        リストへ保存する
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

            </div>
          </div>
        </section>

        {/* Right column: Database Dashboard List (columns 6 to 12) */}
        <section id="saved-cards-section" className="lg:col-span-12 xl:col-span-7 flex flex-col gap-5">
          <div className="bg-zinc-900/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-black/30 border border-zinc-800 p-5 flex-1 flex flex-col overflow-hidden">
            
            {/* Top filters and actions bar */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 mb-5 pb-4 border-b border-zinc-800/60">
              <div>
                <h3 className="font-bold text-zinc-100 text-sm sm:text-base flex items-center gap-1.5">
                  <FileSpreadsheet size={18} className="text-emerald-400" />
                  デジタル名刺ホルダー ＆ スプレッドシート管理
                </h3>
                <p className="text-xs text-zinc-500">
                  {filteredCards.length} 件見つかりました / セルを直接クリックして即時編集・自動保存できます
                </p>
              </div>

              {/* View switch and spreadsheet interactive tools */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View toggles */}
                <div className="inline-flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "grid" 
                        ? "bg-zinc-800 text-emerald-400 shadow-xs ring-1 ring-emerald-500/20" 
                        : "text-zinc-500 hover:text-zinc-200"
                    }`}
                    title="カードビュー (画像プレビュー付き)"
                  >
                    <Grid size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "table" 
                        ? "bg-zinc-800 text-emerald-400 shadow-xs ring-1 ring-emerald-500/20" 
                        : "text-zinc-500 hover:text-zinc-200"
                    }`}
                    title="スプレッドシート（表）ビュー (インライン編集可能)"
                  >
                    <List size={15} />
                  </button>
                </div>
                
                {/* Hand-edited Line injector */}
                <button
                  onClick={handleAddBlankRow}
                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-emerald-950/50 text-zinc-300 hover:text-emerald-400 rounded-lg text-xs font-semibold border border-zinc-700 hover:border-emerald-700/50 transition-all flex items-center gap-1 cursor-pointer"
                  title="スプレッドシートに空白行を追加します"
                >
                  <Plus size={13} />
                  <span>行を追加</span>
                </button>

                {/* Spreadsheet Multi-Export choices */}
                <button
                  onClick={handleCopyAsTSVForSpreadsheet}
                  className="px-2.5 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-800/50 transition-all flex items-center gap-1 cursor-pointer"
                  title="Googleスプレッドシートにコピペ可能なデータをクリップボードに一括保存します"
                >
                  <Clipboard size={13} />
                  <span>極速コピペ用に一括コピー</span>
                </button>
              </div>
            </div>

            {/* Advanced Multi-Format External Exporter Panel */}
            <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-900/40 rounded-2xl p-4 mb-5 shadow-lg shadow-black/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3.5 pb-2 border-b border-emerald-900/30">
                <div className="flex items-center gap-1.5">
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm shrink-0 uppercase tracking-wider">OUTPUT</span>
                  <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                    💾 外部データ出力（一括エクスポートセンター）
                  </h4>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium">さまざまな外部ツール・アドレス帳アプリ・CRMへ高精度に連携</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={handleExportToExcel}
                  className="px-2.5 py-2.5 bg-zinc-800 hover:bg-emerald-950/60 text-zinc-300 hover:text-emerald-400 rounded-xl text-xs font-bold border border-zinc-700 hover:border-emerald-700/50 transition-all shadow-md shadow-black/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Microsoft Excel形式(.xlsx)でエクスポートします"
                >
                  <FileSpreadsheet size={13} className="text-emerald-400" />
                  <span>Excel保存 (.xlsx)</span>
                </button>

                <button
                  onClick={handleExportToCSV}
                  className="px-2.5 py-2.5 bg-zinc-800 hover:bg-teal-950/60 text-zinc-300 hover:text-teal-400 rounded-xl text-xs font-bold border border-zinc-700 hover:border-teal-700/50 transition-all shadow-md shadow-black/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="高互換性のCSV形式(.csv)でエクスポートします。BOM付きUTF-8のため市販の年賀状ソフトや他ソフト、Excelでの読み書きでも文字化けしません。"
                >
                  <Download size={13} className="text-teal-600" />
                  <span>CSV保存 (.csv)</span>
                </button>

                <button
                  onClick={handleExportAllVCards}
                  className="px-2.5 py-2.5 bg-zinc-800 hover:bg-indigo-950/60 text-zinc-300 hover:text-indigo-400 rounded-xl text-xs font-bold border border-zinc-700 hover:border-indigo-700/50 transition-all shadow-md shadow-black/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="すべての名刺データを一つの.vcfファイルにして出力します。iPhone/AndroidやMac/PCの連絡先アプリに一括インポート登録できます。"
                >
                  <Smartphone size={13} className="text-indigo-600" />
                  <span>スマホ一括登録 (.vcf)</span>
                </button>

                <button
                  onClick={handleExportToTSV}
                  className="px-2.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-bold border border-zinc-700 hover:border-zinc-600 transition-all shadow-md shadow-black/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="スプレッドシート等で読み込める高品質タブ区切りTSVファイルをダウンロードします"
                >
                  <Download size={13} className="text-zinc-500" />
                  <span>TSV保存 (.tsv)</span>
                </button>
              </div>
            </div>

            {/* Google Sheets Pasting help banner */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 mb-5 text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2.5">
              <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm shrink-0">TIPS</span>
              <div>
                <strong className="text-zinc-100">Googleスプレッドシート（Spreadsheet）への極速連携:</strong> 「極速コピペ用に一括コピー」から全件コピーし、ブラウザでGoogle Sheetsを開いてセルの上で <strong>[Ctrl+V] (Macは [Cmd+V])</strong> すると、文字化けゼロ＆セル完璧整列で一瞬で一括貼り付けできます。
              </div>
            </div>

            {/* Keyword Search field */}
            <div className="relative mb-5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input
                type="text"
                id="contact-search-bar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="会社、氏名、ふりがな、役職、部署、所在地、連絡先などスプレッドシート内を高速検索..."
                className="w-full bg-zinc-950/80 hover:bg-zinc-900 text-zinc-100 text-xs border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Render cards based on layout mode */}
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Empty state when no cards found */}
              {filteredCards.length === 0 ? (
                <div className="text-center py-16 px-4 bg-zinc-950/80/50 border border-zinc-800/60 rounded-2xl my-auto">
                  <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-zinc-600">
                    <Search size={22} />
                  </div>
                  <h4 className="font-bold text-zinc-200 text-sm mb-1">
                    該当データが見つかりません
                  </h4>
                  <p className="text-xs text-zinc-600 max-w-sm mx-auto leading-relaxed">
                    {searchQuery 
                      ? "検索フィルターの語句を変更するか、クリアしてください。" 
                      : "左パネルから名刺画像をスキャン、または「行を追加」ボタンを押して新規レコードをスプレッドシートへお書きください。"}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-3 px-3 py-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/50 hover:bg-emerald-900/60 rounded-lg transition-colors border border-emerald-800/50"
                    >
                      検索フィルターをリセット
                    </button>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                /* Card Visual Grid Layout */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredCards.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      onDelete={handleDeleteCard}
                      onSelect={(c) => setSelectedCard(c)}
                    />
                  ))}
                </div>
              ) : (
                /* Google Spreadsheet style Interactive List Table */
                <div className="overflow-auto border border-zinc-800 rounded-xl shadow-lg shadow-black/30 max-h-[550px] bg-zinc-950">
                  <table className="w-full text-left border-collapse table-fixed select-none" style={{ minWidth: "1200px" }}>
                    <thead>
                      {/* Grid header row like Google Sheets A, B, C */}
                      <tr className="bg-zinc-900 text-[10px] text-zinc-600 font-mono text-center divide-x divide-zinc-800 border-b border-zinc-800">
                        <th className="w-14 bg-zinc-900 p-1 font-normal"></th>
                        <th className="w-12 bg-zinc-900 p-1 font-normal">A</th>
                        <th className="w-36 bg-zinc-900 p-1 font-normal">B</th>
                        <th className="w-28 bg-zinc-900 p-1 font-normal">C</th>
                        <th className="w-32 bg-zinc-900 p-1 font-normal">D</th>
                        <th className="w-32 bg-zinc-900 p-1 font-normal">E</th>
                        <th className="w-32 bg-zinc-900 p-1 font-normal">F</th>
                        <th className="w-40 bg-zinc-900 p-1 font-normal">G</th>
                        <th className="w-44 bg-zinc-900 p-1 font-normal">H</th>
                        <th className="w-60 bg-zinc-900 p-1 font-normal">I</th>
                        <th className="w-48 bg-zinc-900 p-1 font-normal">J</th>
                        <th className="w-12 bg-zinc-900 p-1 font-normal"></th>
                      </tr>
                      {/* Main field headings */}
                      <tr className="bg-zinc-950 text-zinc-300 font-bold divide-x divide-zinc-800 border-b border-zinc-800 text-xs">
                        <th className="p-2 text-center bg-zinc-900 text-zinc-600 font-mono font-normal w-14">行</th>
                        <th className="p-2 text-center w-12 font-semibold">画像</th>
                        <th className="p-2 font-semibold w-36">会社名</th>
                        <th className="p-2 font-semibold w-28">氏名</th>
                        <th className="p-2 font-semibold w-32">役職</th>
                        <th className="p-2 font-semibold w-32">部署名</th>
                        <th className="p-2 font-semibold w-32">携帯番号 / 代表電話</th>
                        <th className="p-2 font-semibold w-40">メールアドレス</th>
                        <th className="p-2 font-semibold w-44">ホームページURL</th>
                        <th className="p-2 font-semibold w-60">所在地住所</th>
                        <th className="p-2 font-semibold w-48">メモ・補足情報</th>
                        <th className="p-2 text-center font-semibold w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-zinc-900/50 divide-y divide-zinc-800">
                      {filteredCards.map((card, idx) => (
                        <tr 
                          key={card.id}
                          className="hover:bg-zinc-800/40 group/row divide-x divide-zinc-800 text-xs align-middle"
                        >
                          {/* Row Index with quick view lookup */}
                          <td className="p-1 bg-zinc-950/80 text-zinc-600 font-mono text-center select-none font-medium flex items-center justify-between gap-1 w-14">
                            <span className="pl-1.5">{idx + 1}</span>
                            <button
                              onClick={() => setSelectedCard(card)}
                              className="p-1 text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 rounded transition-all cursor-pointer"
                              title="ビジュアル写真・詳細表示"
                            >
                              🔍
                            </button>
                          </td>

                          {/* Image Attachment (Mini Thumbnail) */}
                          <td className="p-1 text-center w-12" onClick={() => setSelectedCard(card)}>
                            <div className="flex items-center justify-center">
                              {card.imageUrl ? (
                                <div className="h-6 w-10 bg-slate-900 rounded overflow-hidden shadow-xs hover:scale-125 transition-transform cursor-pointer border border-zinc-800/60">
                                  <img 
                                    src={card.imageUrl} 
                                    alt="Tiny scan attachment" 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <span className="text-[9px] font-bold text-zinc-600 font-mono">None</span>
                              )}
                            </div>
                          </td>

                          {/* Company Name Cell */}
                          <td className="p-0.5 w-36">
                            <SpreadsheetCell 
                              value={card.company} 
                              onSave={(val) => handleUpdateCardField(card.id, "company", val)}
                              placeholder="会社名を入力"
                            />
                          </td>

                          {/* Name Cell */}
                          <td className="p-0.5 w-28">
                            <SpreadsheetCell 
                              value={card.name} 
                              onSave={(val) => handleUpdateCardField(card.id, "name", val)}
                              placeholder="氏名を入力"
                            />
                          </td>

                          {/* Title Cell */}
                          <td className="p-0.5 w-32">
                            <SpreadsheetCell 
                              value={card.title || ""} 
                              onSave={(val) => handleUpdateCardField(card.id, "title", val)}
                              placeholder="役職を入力"
                            />
                          </td>

                          {/* Department Cell */}
                          <td className="p-0.5 w-32">
                            <SpreadsheetCell 
                              value={card.department || ""} 
                              onSave={(val) => handleUpdateCardField(card.id, "department", val)}
                              placeholder="部署名を入力"
                            />
                          </td>

                          {/* Contact Phone (Prefers Mobile) Cell */}
                          <td className="p-0.5 w-32">
                            <SpreadsheetCell 
                              value={card.mobile || card.phone || ""} 
                              onSave={(val) => {
                                // Save strategically to mobile if it existed or phone
                                if (card.mobile || !card.phone) {
                                  handleUpdateCardField(card.id, "mobile", val);
                                } else {
                                  handleUpdateCardField(card.id, "phone", val);
                                }
                              }}
                              placeholder="電話番号を入力"
                            />
                          </td>

                          {/* Email Cell */}
                          <td className="p-0.5 w-40">
                            <SpreadsheetCell 
                              value={card.email || ""} 
                              onSave={(val) => handleUpdateCardField(card.id, "email", val)}
                              placeholder="メールを入力"
                            />
                          </td>

                          {/* Website Url Cell */}
                          <td className="p-0.5 w-44">
                            <SpreadsheetCell 
                              value={card.website || ""} 
                              onSave={(val) => handleUpdateCardField(card.id, "website", val)}
                              placeholder="URLを入力"
                            />
                          </td>

                          {/* Address Cell */}
                          <td className="p-0.5 w-60">
                            <SpreadsheetCell 
                              value={card.address || ""} 
                              onSave={(val) => handleUpdateCardField(card.id, "address", val)}
                              placeholder="所在地住所を入力"
                            />
                          </td>

                          {/* Notes Cell */}
                          <td className="p-0.5 w-48">
                            <SpreadsheetCell 
                              value={card.notes || ""} 
                              onSave={(val) => handleUpdateCardField(card.id, "notes", val)}
                              placeholder="メモを入力"
                            />
                          </td>

                          {/* Action Delete inline */}
                          <td className="p-0.5 text-center w-12" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteCard(card.id)}
                              className="p-1 text-zinc-600 hover:text-red-500 rounded transition-colors cursor-pointer"
                              title="行削除"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </section>

      </main>

      {/* High-Fidelity Details Inspector Modal Overlay */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            {/* Modal backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-zinc-800 max-w-lg w-full relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-zinc-900 p-4 flex justify-between items-center border-b border-zinc-800/60">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-500" />
                  名刺データ詳細
                </span>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-1 rounded-full text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable details panel */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Top card block representation */}
                <div className="p-5 border border-zinc-700 rounded-xl shadow-md shadow-black/20 bg-zinc-950 relative overflow-hidden flex flex-col justify-between aspect-[1.6/1]">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                  
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{selectedCard.company}</span>
                    <div className="mt-3">
                      {selectedCard.nameReading && (
                        <p className="text-[8px] text-zinc-600 font-mono tracking-wider">{selectedCard.nameReading}</p>
                      )}
                      <h4 className="text-base font-bold text-zinc-100">{selectedCard.name}</h4>
                      {selectedCard.title && (
                        <p className="text-[10px] text-zinc-500 mt-0.5">{selectedCard.title} {selectedCard.department && `• ${selectedCard.department}`}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-[9px] text-zinc-500 border-t border-zinc-800/50 pt-2 flex flex-col sm:flex-row justify-between gap-1 mt-4">
                    <span>{selectedCard.phone || selectedCard.mobile || "連絡先なし"}</span>
                    <span>{selectedCard.email || ""}</span>
                  </div>
                </div>

                 {/* Scanned Card image attachment preview */}
                {selectedCard.imageUrl && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Image size={13} className="text-zinc-600" />
                        名刺画像アタッチメント
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsFullscreenImageOpen(true)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-emerald-950/60 text-zinc-400 hover:text-emerald-400 rounded text-[10px] font-bold border border-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                          title="高解像度画像を表示"
                        >
                          <Maximize2 size={10} />
                          <span>全画面拡大</span>
                        </button>
                        <a
                          href={selectedCard.imageUrl}
                          download={`名刺画像_${selectedCard.company || "scan"}.png`}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="px-2 py-1 bg-zinc-800 hover:bg-emerald-950/60 text-zinc-400 hover:text-emerald-400 rounded text-[10px] font-bold border border-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                          title="画像をデバイスに保存"
                        >
                          <Download size={10} />
                          <span>画像を保存</span>
                        </a>
                      </div>
                    </div>
                    <div 
                      onClick={() => setIsFullscreenImageOpen(true)}
                      className="border border-zinc-800 rounded-xl overflow-hidden bg-slate-900 max-h-48 flex items-center justify-center shadow-xs cursor-zoom-in hover:opacity-95 transition-all relative group/image"
                    >
                      <img 
                        src={selectedCard.imageUrl} 
                        alt="Scanned Business card reference attachment" 
                        className="max-w-full max-h-48 object-contain"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/image:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1.5 transition-opacity">
                        <Maximize2 size={14} />
                        クリックしてフルスクリーン表示
                      </div>
                    </div>
                  </div>
                )}

                {/* Structured contact fields data list with action buttons */}
                <div className="space-y-3.5 pt-2">
                  <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider">連絡先・詳細情報</p>
                  
                  {/* Company Name */}
                  <div className="flex items-start gap-3 text-xs justify-between group">
                    <div className="flex gap-2 min-w-0">
                      <Building2 size={15} className="mt-0.5 text-zinc-600 flex-shrink-0" />
                      <div>
                        <p className="text-zinc-600 font-semibold text-[10px]">企業・会社名</p>
                        <p className="text-zinc-100 font-bold">{selectedCard.company || "-"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(selectedCard.company, "company")}
                      className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 rounded transition-colors text-[10px] shrink-0"
                    >
                      {copiedField === "company" ? "コピー済" : "コピー"}
                    </button>
                  </div>

                  {/* Representative name */}
                  <div className="flex items-start gap-3 text-xs justify-between group">
                    <div className="flex gap-2 min-w-0">
                      <User size={15} className="mt-0.5 text-zinc-600 flex-shrink-0" />
                      <div>
                        <p className="text-zinc-600 font-semibold text-[10px]">氏名 / ふりがな</p>
                        <p className="text-zinc-100 font-bold">
                          {selectedCard.name} 
                          {selectedCard.nameReading && <span className="text-[10px] text-zinc-600 font-normal ml-2">({selectedCard.nameReading})</span>}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(selectedCard.name, "name")}
                      className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 rounded transition-colors text-[10px] shrink-0"
                    >
                      {copiedField === "name" ? "コピー済" : "コピー"}
                    </button>
                  </div>

                  {/* Title & Department */}
                  {(selectedCard.title || selectedCard.department) && (
                    <div className="flex items-start gap-3 text-xs justify-between group">
                      <div className="flex gap-2 min-w-0">
                        <Briefcase size={15} className="mt-0.5 text-zinc-600 flex-shrink-0" />
                        <div>
                          <p className="text-zinc-600 font-semibold text-[10px]">役職・所属部署</p>
                          <p className="text-zinc-100 font-medium">
                            {selectedCard.title || "---"} 
                            {selectedCard.department && <span className="text-zinc-500 ml-2">({selectedCard.department})</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile phone direct dial */}
                  {selectedCard.mobile && (
                    <div className="flex items-start gap-3 text-xs justify-between group">
                      <div className="flex gap-2 min-w-0">
                        <Smartphone size={15} className="mt-0.5 text-zinc-600 flex-shrink-0" />
                        <div>
                          <p className="text-zinc-600 font-semibold text-[10px]">携帯電話番号</p>
                          <a 
                            href={`tel:${selectedCard.mobile}`} 
                            className="text-zinc-100 font-bold hover:text-emerald-600 transition-colors flex items-center gap-1 group/link"
                          >
                            <span>{selectedCard.mobile}</span>
                            <ExternalLink size={10} className="text-zinc-600 opacity-60 group-hover/link:opacity-100" />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${selectedCard.mobile}`}
                          className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 rounded transition-colors text-[10px]"
                        >
                          発信
                        </a>
                        <button
                          onClick={() => handleCopyToClipboard(selectedCard.mobile, "mobile")}
                          className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 rounded transition-colors text-[10px]"
                        >
                          {copiedField === "mobile" ? "コピー済" : "コピー"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Office Telephone dial */}
                  {selectedCard.phone && (
                    <div className="flex items-start gap-3 text-xs justify-between group">
                      <div className="flex gap-2 min-w-0">
                        <Phone size={15} className="mt-0.5 text-zinc-600 flex-shrink-0" />
                        <div>
                          <p className="text-zinc-600 font-semibold text-[10px]">代表・会社電話番号</p>
                          <a 
                            href={`tel:${selectedCard.phone}`} 
                            className="text-zinc-100 font-bold hover:text-emerald-600 transition-colors flex items-center gap-1 group/link"
                          >
                            <span>{selectedCard.phone}</span>
                            <ExternalLink size={10} className="text-zinc-600 opacity-60 group-hover/link:opacity-100" />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${selectedCard.phone}`}
                          className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 rounded transition-colors text-[10px]"
                        >
                          発信
                        </a>
                        <button
                          onClick={() => handleCopyToClipboard(selectedCard.phone, "phone")}
                          className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 rounded transition-colors text-[10px]"
                        >
                          {copiedField === "phone" ? "コピー済" : "コピー"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Email click-to-compose */}
                  {selectedCard.email && (
                    <div className="flex items-start gap-3 text-xs justify-between group">
                      <div className="flex gap-2 min-w-0">
                        <Mail size={15} className="mt-0.5 text-zinc-600 flex-shrink-0" />
                        <div>
                          <p className="text-zinc-600 font-semibold text-[10px]">メールアドレス</p>
                          <a 
                            href={`mailto:${selectedCard.email}`} 
                            className="text-zinc-100 font-medium hover:text-emerald-400 transition-colors flex items-center gap-1 underline text-emerald-400"
                          >
                            <span>{selectedCard.email}</span>
                            <ExternalLink size={10} className="text-emerald-500" />
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyToClipboard(selectedCard.email, "email")}
                        className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 rounded transition-colors text-[10px] shrink-0"
                      >
                        {copiedField === "email" ? "コピー済" : "コピー"}
                      </button>
                    </div>
                  )}

                  {/* Web URL mapping */}
                  {selectedCard.website && (
                    <div className="flex items-start gap-3 text-xs justify-between group">
                      <div className="flex gap-2 min-w-0">
                        <Globe size={15} className="mt-0.5 text-zinc-600 flex-shrink-0" />
                        <div>
                          <p className="text-zinc-600 font-semibold text-[10px]">ホームページURL</p>
                          <a 
                            href={selectedCard.website.startsWith("http") ? selectedCard.website : `https://${selectedCard.website}`} 
                            target="_blank" 
                            referrerPolicy="no-referrer"
                            className="text-zinc-100 font-medium hover:text-emerald-400 transition-colors flex items-center gap-1 underline text-emerald-400 truncate max-w-[280px]"
                          >
                            <span>{selectedCard.website}</span>
                            <ExternalLink size={10} className="text-emerald-500 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyToClipboard(selectedCard.website, "website")}
                        className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 rounded transition-colors text-[10px] shrink-0"
                      >
                        {copiedField === "website" ? "コピー済" : "コピー"}
                      </button>
                    </div>
                  )}

                  {/* Map location with direct Google Maps integration */}
                  {selectedCard.address && (
                    <div className="flex items-start gap-3 text-xs justify-between group">
                      <div className="flex gap-2 min-w-0">
                        <MapPin size={15} className="mt-0.5 text-zinc-600 flex-shrink-0" />
                        <div>
                          <p className="text-zinc-600 font-semibold text-[10px]">会社所在地住所</p>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCard.address)}`} 
                            target="_blank" 
                            referrerPolicy="no-referrer"
                            className="text-zinc-100 font-medium hover:text-emerald-600 transition-colors flex items-center gap-1 underline text-zinc-200"
                          >
                            <span>{selectedCard.address}</span>
                            <MapPin size={10} className="text-emerald-600 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyToClipboard(selectedCard.address, "address")}
                        className="px-1.5 py-1 hover:bg-zinc-800 text-zinc-600 hover:text-emerald-400 rounded transition-colors text-[10px] shrink-0"
                      >
                        {copiedField === "address" ? "コピー済" : "コピー"}
                      </button>
                    </div>
                  )}

                  {/* Notes & context information */}
                  {selectedCard.notes && (
                    <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-xs">
                      <p className="text-zinc-600 font-semibold text-[10px] mb-1">メモ・特記事項</p>
                      <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{selectedCard.notes}</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Footer action buttons */}
              <div className="bg-zinc-950 p-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteCard(selectedCard.id)}
                    className="px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/50 rounded-lg border border-transparent hover:border-red-900/50 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    <Trash2 size={13} />
                    <span>削除</span>
                  </button>
                  
                  <button
                    onClick={() => handleExportSingleVCard(selectedCard)}
                    className="px-3 py-2 text-xs font-bold text-indigo-400 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="この名刺データをスマートフォンやPCの連絡先アプリに取り込めるvCardファイルとして保存します"
                  >
                    <Smartphone size={13} />
                    <span>携帯連絡先用出力 (.vcf)</span>
                  </button>
                </div>
                
                <button
                  onClick={() => setSelectedCard(null)}
                  className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors text-center cursor-pointer"
                >
                  詳細を閉じる
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Immersive Lightbox Fullscreen Image View */}
      <AnimatePresence>
        {isFullscreenImageOpen && selectedCard && selectedCard.imageUrl && (
          <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-55 p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 cursor-zoom-out"
              onClick={() => setIsFullscreenImageOpen(false)}
            />
            
            {/* Header controls inside lightbox */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between text-white z-10">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
                <Image size={14} className="text-emerald-400" />
                <span className="font-bold">{selectedCard.company || "株式会社"}</span>
                <span>•</span>
                <span>{selectedCard.name || "氏名"}</span>
              </div>

              <div className="flex gap-2">
                <a
                  href={selectedCard.imageUrl}
                  download={`名刺画像_${selectedCard.company || "scan"}.png`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="p-2 bg-black/40 hover:bg-emerald-600 backdrop-blur-md rounded-full border border-white/10 hover:border-emerald-500 text-white transition-all cursor-pointer flex items-center justify-center"
                  title="画像を保存"
                >
                  <Download size={18} />
                </a>
                <button
                  onClick={() => setIsFullscreenImageOpen(false)}
                  className="p-2 bg-black/40 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 text-white transition-all cursor-pointer flex items-center justify-center"
                  title="フルスクリーンを閉じる"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Lightbox full dimension picture container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 max-w-5xl w-full max-h-[85vh] flex items-center justify-center p-2"
            >
              <img
                src={selectedCard.imageUrl}
                alt="Fullscreen Premium scan item"
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10 bg-slate-900"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>

            <div className="absolute bottom-6 text-white/50 text-[11px] bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5 pointer-events-none">
              背景の黒いエリア、または X ボタン を押すと詳細画面へ戻ります。
            </div>
          </div>
        )}
      </AnimatePresence>

      <footer className="bg-zinc-950/80 backdrop-blur-sm border-t border-zinc-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-600 space-y-1">
          <p>© 2026 名刺スキャナー ＆ スプレッドシート管理 App.</p>
          <p>Powered by Google Gemini 3.5 Flash Model & Secure Server-side API Proxy</p>
        </div>
      </footer>
    </div>
  );
}
