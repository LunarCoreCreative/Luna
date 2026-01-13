import { useState, useRef, useEffect, useMemo } from "react";
import {
    X,
    Plus,
    Trash2,
    Edit3,
    Check,
    Tag,
    Calendar,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Filter,
    Search,
    MoreHorizontal,
    ChevronDown,
    Palette,
    Loader2,
    Circle,
    BarChart3,
    Table,
    LineChart,
    Wallet,
    AlertCircle,
    Clock,
    Target,
    Download,
    Shield,
    CreditCard
} from "lucide-react";
import { API_CONFIG } from "../../config/api";
import { useModalContext } from "../../contexts/ModalContext";
import { AnalyticsTab } from "./AnalyticsTab";
import { ProjectionsTab } from "./ProjectionsTab";
import { InvestmentsTab } from "./InvestmentsTab";
import { BusinessChat } from "./BusinessChat";
import RecurringModal from "./RecurringModal";
import OverdueBills from "./OverdueBills";
import BackupModal from "./BackupModal";
import NotificationsPanel from "./NotificationsPanel";
import GoalsTab from "./GoalsTab";
import BudgetTab from "./BudgetTab";
import ExportModal from "./ExportModal";
import IntegrityModal from "./IntegrityModal";
import CreditCardsTab from "./CreditCardsTab";

// ============================================================================
// DEFAULT TAGS (usuário pode adicionar mais)
// ============================================================================

const DEFAULT_TAGS = [
    { id: "mensalidade", label: "Mensalidade", color: "#22c55e" },
    { id: "despesa", label: "Despesa", color: "#ef4444" },
    { id: "material", label: "Material", color: "#3b82f6" },
    { id: "salario", label: "Salário", color: "#f59e0b" },
    { id: "servico", label: "Serviço", color: "#a855f7" },
    { id: "outro", label: "Outro", color: "#6b7280" },
];

const TAG_COLORS = [
    "#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7",
    "#ec4899", "#14b8a6", "#8b5cf6", "#f97316", "#06b6d4"
];

// ============================================================================
// BUSINESS MODE - Luna Gestão (Planilha)
// ============================================================================

export const BusinessMode = ({ isOpen, onClose, userId = "local" }) => {
    const { showAlert, showConfirm } = useModalContext();
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddRow, setShowAddRow] = useState(false);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState("transactions"); // "transactions" | "analytics"
    
    // Advanced filters
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [minValue, setMinValue] = useState("");
    const [maxValue, setMaxValue] = useState("");
    const [useRegex, setUseRegex] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Tags from backend
    const [tags, setTags] = useState([]);
    const [showTagModal, setShowTagModal] = useState(false);
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [showOverdueModal, setShowOverdueModal] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showIntegrityModal, setShowIntegrityModal] = useState(false);
    const [newTag, setNewTag] = useState({ label: "", color: TAG_COLORS[0] });

    // Form state for new/edit entry
    const [formData, setFormData] = useState({
        description: "",
        value: "",
        type: "income",
        category: "outro",
        date: new Date().toISOString().split('T')[0], // formato YYYY-MM-DD
        credit_card_id: "",
        interest_rate: "",
        investment_type: "investment"
    });

    // Credit cards for selection
    const [creditCards, setCreditCards] = useState([]);

    // Edit form state
    const [editData, setEditData] = useState({});

    // Summary stats
    const [summary, setSummary] = useState({ balance: 0, income: 0, expenses: 0, invested: 0, net_worth: 0 });

    // Period management
    const [selectedPeriod, setSelectedPeriod] = useState(null); // YYYY-MM format
    const [periods, setPeriods] = useState([]);
    const [currentPeriod, setCurrentPeriod] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadPeriods();
            loadTags();
            loadCreditCards();
        }
    }, [isOpen]);

    const loadCreditCards = async () => {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/credit-cards?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setCreditCards(data.credit_cards || []);
                console.log("[BUSINESS] Cartões de crédito carregados:", data.credit_cards?.length || 0);
            }
        } catch (e) {
            console.error("Error loading credit cards:", e);
        }
    };

    useEffect(() => {
        if (isOpen && (selectedPeriod || currentPeriod)) {
            loadData();
        }
    }, [isOpen, selectedPeriod]);

    const loadPeriods = async () => {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/periods?user_id=${userId}`);
            const data = await res.json();
            setPeriods(data.periods || []);
            setCurrentPeriod(data.current_period || null);
            
            // Set selected period to current if not set
            if (!selectedPeriod && data.current_period) {
                setSelectedPeriod(data.current_period);
            }
        } catch (e) {
            console.error("[BUSINESS] Error loading periods:", e);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            // 1. Process recurring items automatically (check if anything is due)
            await fetch(`${API_CONFIG.BASE_URL}/business/recurring-items/process`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId })
            });

            // 2. Load fresh data for selected period (or current if none selected)
            const period = selectedPeriod || currentPeriod;
            const periodParam = period ? `&period=${period}` : '';
            
            const [summaryRes, txRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}/business/summary?user_id=${userId}${periodParam}`),
                fetch(`${API_CONFIG.BASE_URL}/business/transactions?user_id=${userId}&limit=500${periodParam}`)
            ]);

            const summaryData = await summaryRes.json();
            const txData = await txRes.json();

            setSummary({
                balance: summaryData.balance || 0,
                income: summaryData.income || 0,
                expenses: summaryData.expenses || 0,
                invested: summaryData.invested || 0,
                net_worth: summaryData.net_worth || 0
            });
            setTransactions(txData.transactions || []);
        } catch (e) {
            console.error("[BUSINESS] Erro:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTags = async () => {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/tags?user_id=${userId}`);
            const data = await res.json();
            if (data.tags && data.tags.length > 0) {
                setTags(data.tags);
            } else {
                setTags(DEFAULT_TAGS);
            }
        } catch (e) {
            console.error("[BUSINESS] Error loading tags:", e);
            setTags(DEFAULT_TAGS);
        }
    };

    const handleAdd = async () => {
        if (!formData.description.trim() || !formData.value) {
            console.warn("[BUSINESS] Campos obrigatórios não preenchidos");
            return;
        }

        // Valida e converte valor com limites
        const rawValue = formData.value.toString().replace(/[R$\s]/g, "").replace(",", ".");
        const value = parseFloat(rawValue);
        
        if (isNaN(value) || !isFinite(value)) {
            console.error("[BUSINESS] Valor inválido:", formData.value);
            showAlert("Por favor, insira um valor numérico válido.", "Erro");
            return;
        }
        
        if (value < 0.01) {
            showAlert("O valor mínimo é R$ 0,01.", "Erro");
            return;
        }
        
        if (value > 1000000000) {
            showAlert("O valor máximo é R$ 1.000.000.000,00.", "Erro");
            return;
        }
        
        // Arredonda para 2 casas decimais
        const roundedValue = Math.round(value * 100) / 100;

        try {
            const payload = {
                description: formData.description.trim(),
                value: roundedValue,
                type: formData.type,
                category: formData.category || "outro",
                date: formData.date || new Date().toISOString().split('T')[0],
                user_id: userId,
                credit_card_id: formData.credit_card_id || null,
                interest_rate: formData.type === "investment" && formData.interest_rate ? parseFloat(formData.interest_rate) : null,
                investment_type: formData.type === "investment" ? (formData.investment_type || "investment") : null
            };

            console.log("[BUSINESS] Enviando transação:", payload);

            const res = await fetch(`${API_CONFIG.BASE_URL}/business/transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                console.log("[BUSINESS] ✅ Transação criada com sucesso:", data.transaction);
                setFormData({ description: "", value: "", type: "income", category: "outro", date: new Date().toISOString().split('T')[0] });
                setShowAddRow(false);
                // Recarrega dados após um pequeno delay para garantir sincronização
                setTimeout(() => {
                    loadData();
                }, 300);
            } else {
                console.error("[BUSINESS] ❌ Erro na resposta:", data);
                showAlert(data.message || "Erro ao criar transação", "Erro");
            }
        } catch (e) {
            console.error("[BUSINESS] ❌ Erro ao adicionar:", e);
            showAlert("Erro ao comunicar com o servidor. Tente novamente.", "Erro");
        }
    };

    const handleDelete = async (txId) => {
        const confirmed = await showConfirm("Tem certeza que deseja excluir esta transação?", "Confirmar Exclusão");
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/transactions/${txId}?user_id=${userId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                loadData();
            }
        } catch (e) {
            console.error("[BUSINESS] Erro ao deletar:", e);
        }
    };

    const handleStartEdit = (tx) => {
        setEditingId(tx.id);
        setEditData({
            description: tx.description,
            value: tx.value.toString(),
            type: tx.type,
            category: tx.category,
            date: tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0],
            credit_card_id: tx.credit_card_id || "",
            interest_rate: tx.interest_rate || "",
            investment_type: tx.investment_type || "investment"
        });
    };

    const handleSaveEdit = async (txId) => {
        if (!editData.description?.trim() || !editData.value) {
            console.warn("[BUSINESS] Campos obrigatórios não preenchidos");
            return;
        }

        // Valida e converte valor com limites
        const rawValue = editData.value.toString().replace(/[R$\s]/g, "").replace(",", ".");
        const value = parseFloat(rawValue);
        
        if (isNaN(value) || !isFinite(value)) {
            console.error("[BUSINESS] Valor inválido:", editData.value);
            showAlert("Por favor, insira um valor numérico válido.", "Erro");
            return;
        }
        
        if (value < 0.01) {
            showAlert("O valor mínimo é R$ 0,01.", "Erro");
            return;
        }
        
        if (value > 1000000000) {
            showAlert("O valor máximo é R$ 1.000.000.000,00.", "Erro");
            return;
        }
        
        // Arredonda para 2 casas decimais
        const roundedValue = Math.round(value * 100) / 100;

        try {
            const payload = {
                description: editData.description.trim(),
                value: roundedValue,
                type: editData.type,
                category: editData.category || "outro",
                date: editData.date || new Date().toISOString().split('T')[0],
                user_id: userId,
                credit_card_id: editData.credit_card_id || null,
                interest_rate: editData.type === "investment" && editData.interest_rate ? parseFloat(editData.interest_rate) : null,
                investment_type: editData.type === "investment" ? (editData.investment_type || "investment") : null
            };

            console.log("[BUSINESS] Atualizando transação:", txId, payload);

            const res = await fetch(`${API_CONFIG.BASE_URL}/business/transactions/${txId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                console.log("[BUSINESS] ✅ Transação atualizada com sucesso:", data.transaction);
                setEditingId(null);
                setEditData({});
                // Recarrega dados após um pequeno delay para garantir sincronização
                setTimeout(() => {
                    loadData();
                }, 300);
            } else {
                console.error("[BUSINESS] ❌ Erro na resposta:", data);
                showAlert(data.message || "Erro ao atualizar transação", "Erro");
            }
        } catch (e) {
            console.error("[BUSINESS] ❌ Erro ao editar:", e);
            showAlert("Erro ao comunicar com o servidor. Tente novamente.", "Erro");
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    // ...

    const handleAddTag = async () => {
        if (!newTag.label.trim()) return;

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    label: newTag.label,
                    color: newTag.color
                })
            });

            if (res.ok) {
                const data = await res.json();
                setTags([...tags, data.tag]);
                setNewTag({ label: "", color: TAG_COLORS[0] });
                setShowTagModal(false);
            }
        } catch (e) {
            console.error("[BUSINESS] Error creating tag:", e);
        }
    };

    const handleDeleteTag = async (tagId) => {
        // Prevent deleting defaults if desired, or let backend handle it
        // Check if it is default
        if (DEFAULT_TAGS.find(t => t.id === tagId)) {
            await showAlert("Não é possível remover tags padrão.", "Aviso");
            return;
        }

        const confirmed = await showConfirm("Remover esta categoria?", "Confirmar Exclusão");
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/tags/${tagId}?user_id=${userId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setTags(tags.filter(t => t.id !== tagId));
            }
        } catch (e) {
            console.error("[BUSINESS] Error deleting tag:", e);
        }
    };

    const getTagStyle = (tagId) => {
        // First try to find the tag in user's tags
        const found = tags.find(t => t.id === tagId);
        if (found) return found;

        // Check DEFAULT_TAGS
        const defaultTag = DEFAULT_TAGS.find(t => t.id === tagId);
        if (defaultTag) return defaultTag;

        // Fallback: create a dynamic tag with the category name capitalized
        const label = tagId ? tagId.charAt(0).toUpperCase() + tagId.slice(1) : "Outro";
        return { id: tagId || "outro", label, color: "#6b7280" };
    };

    const formatDate = (isoDate) => {
        if (!isoDate) return "-";
        // Fix timezone issue: if YYYY-MM-DD, parse manually to avoid UTC conversion shift
        if (typeof isoDate === 'string' && isoDate.length === 10 && isoDate.includes('-')) {
            const [y, m, d] = isoDate.split('-');
            return `${d}/${m}/${y.slice(2)}`;
        }
        return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatPeriod = (period) => {
        if (!period) return "";
        try {
            const [year, month] = period.split("-");
            const monthNames = [
                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
            ];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        } catch {
            return period;
        }
    };

    // Get unique categories from transactions
    const availableCategories = useMemo(() => {
        if (!transactions || !Array.isArray(transactions)) return [];
        const cats = new Set();
        transactions.forEach(tx => {
            if (tx && tx.category) cats.add(tx.category);
        });
        return Array.from(cats).sort();
    }, [transactions]);

    // Filtered transactions with advanced filters
    const filteredTx = useMemo(() => {
        return transactions.filter(tx => {
            // Filter by type
        if (filter !== "all" && tx.type !== filter) return false;
            
            // Filter by search query (with optional regex)
            if (searchQuery) {
                try {
                    if (useRegex) {
                        const regex = new RegExp(searchQuery, 'i');
                        if (!regex.test(tx.description || '')) return false;
                    } else {
                        if (!tx.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                    }
                } catch (e) {
                    // Invalid regex, fallback to simple search
                    if (!tx.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                }
            }
            
            // Filter by categories (multiple selection)
            if (selectedCategories.length > 0 && !selectedCategories.includes(tx.category)) return false;
            
            // Filter by value range
            const txValue = parseFloat(tx.value) || 0;
            if (minValue) {
                const min = parseFloat(minValue);
                if (isNaN(min) || txValue < min) return false;
            }
            if (maxValue) {
                const max = parseFloat(maxValue);
                if (isNaN(max) || txValue > max) return false;
            }
            
        return true;
    });
    }, [transactions, filter, searchQuery, selectedCategories, minValue, maxValue, useRegex]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col animate-in fade-in duration-300"
            style={{ background: 'var(--bg-primary)', width: '100vw', height: '100vh' }}
        >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-violet-500/3 to-transparent pointer-events-none" />
            
            {/* Header */}
            <header
                className="relative flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border-color)]/50 z-10 flex-wrap gap-3"
            >
                <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 transform transition-transform hover:scale-105">
                            <DollarSign size={28} className="text-white drop-shadow-sm" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full animate-pulse border-2 border-[var(--bg-primary)]" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 bg-clip-text text-transparent truncate">
                            Gestão Financeira
                        </h1>
                        <p className="text-xs sm:text-sm font-medium mt-0.5 hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
                            Controle completo das suas finanças
                        </p>
                    </div>

                    {/* Period Selector */}
                    <div className="relative">
                        <select
                            value={selectedPeriod || currentPeriod || ""}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer appearance-none pr-8 outline-none transition-colors hover:bg-white/5"
                            style={{
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            {periods.map(period => (
                                <option key={period} value={period} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                    {formatPeriod(period)}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="hidden md:flex items-center gap-3 ml-6">
                        <div
                            className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 overflow-hidden"
                            style={{ 
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
                                border: '1px solid rgba(34, 197, 94, 0.2)'
                            }}
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                            <TrendingUp size={16} className="text-green-400 relative z-10" />
                            <span className="text-sm text-green-400 font-bold relative z-10">{formatCurrency(summary.income)}</span>
                        </div>
                        <div
                            className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 overflow-hidden"
                            style={{ 
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                            <TrendingDown size={16} className="text-red-400 relative z-10" />
                            <span className="text-sm text-red-400 font-bold relative z-10">{formatCurrency(summary.expenses)}</span>
                        </div>
                        <div
                            className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 overflow-hidden"
                            style={{ 
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                border: '1px solid rgba(139, 92, 246, 0.3)'
                            }}
                            title="Total em Caixa"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                            <DollarSign size={16} className="text-purple-400 relative z-10" />
                            <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent relative z-10">
                                {formatCurrency(summary.balance)}
                            </span>
                        </div>
                        {summary.invested > 0 && (
                            <div
                                className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 overflow-hidden"
                                style={{ 
                                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%)',
                                    border: '1px solid rgba(234, 179, 8, 0.3)'
                                }}
                                title="Total Investido"
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                <span className="text-yellow-500 text-xs font-bold uppercase relative z-10">Investido</span>
                                <span className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent relative z-10">
                                    {formatCurrency(summary.invested)}
                                </span>
                            </div>
                        )}
                        {(summary.invested > 0) && (
                            <div
                                className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 overflow-hidden bg-white/5 border border-white/10"
                                title="Patrimônio Líquido (Caixa + Investimentos)"
                            >
                                <span className="text-gray-400 text-xs font-bold uppercase">Patrimônio</span>
                                <span className="text-sm font-bold text-white">
                                    {formatCurrency(summary.net_worth || summary.balance)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Notifications Panel */}
                    <NotificationsPanel userId={userId} />
                    
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X size={22} className="group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 relative">
                    {/* Tabs */}
                    <div
                        className="relative flex items-center gap-1 px-3 sm:px-4 lg:px-6 py-2 border-b border-[var(--border-color)]/50 bg-[var(--bg-primary)]/50 backdrop-blur-sm z-10 overflow-x-auto"
                    >
                        <button
                            onClick={() => setActiveTab("transactions")}
                            className="px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 font-semibold transition-all duration-300 relative group flex-shrink-0"
                            style={{
                                color: activeTab === "transactions" ? '#a855f7' : 'var(--text-secondary)'
                            }}
                        >
                            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                                <Table size={16} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="text-xs sm:text-sm lg:text-base">Transações</span>
                            </span>
                            {activeTab === "transactions" && (
                                <>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 rounded-t-full shadow-lg shadow-purple-500/30" />
                                    <div className="absolute inset-0 bg-purple-500/5 rounded-t-xl" />
                                </>
                            )}
                            {activeTab !== "transactions" && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("analytics")}
                            className="px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 font-semibold transition-all duration-300 relative group flex-shrink-0"
                            style={{
                                color: activeTab === "analytics" ? '#a855f7' : 'var(--text-secondary)'
                            }}
                        >
                            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                                <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="text-xs sm:text-sm lg:text-base">Analytics</span>
                            </span>
                            {activeTab === "analytics" && (
                                <>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 rounded-t-full shadow-lg shadow-purple-500/30" />
                                    <div className="absolute inset-0 bg-purple-500/5 rounded-t-xl" />
                                </>
                            )}
                            {activeTab !== "analytics" && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("projections")}
                            className="px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 font-semibold transition-all duration-300 relative group flex-shrink-0"
                            style={{
                                color: activeTab === "projections" ? '#a855f7' : 'var(--text-secondary)'
                            }}
                        >
                            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                                <LineChart size={16} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="text-xs sm:text-sm lg:text-base">Projeções</span>
                            </span>
                            {activeTab === "projections" && (
                                <>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 rounded-t-full shadow-lg shadow-purple-500/30" />
                                    <div className="absolute inset-0 bg-purple-500/5 rounded-t-xl" />
                                </>
                            )}
                            {activeTab !== "projections" && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("investments")}
                            className="px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 font-semibold transition-all duration-300 relative group flex-shrink-0"
                            style={{
                                color: activeTab === "investments" ? '#a855f7' : 'var(--text-secondary)'
                            }}
                        >
                            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                                <Wallet size={16} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="text-xs sm:text-sm lg:text-base">Investimentos</span>
                            </span>
                            {activeTab === "investments" && (
                                <>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 rounded-t-full shadow-lg shadow-purple-500/30" />
                                    <div className="absolute inset-0 bg-purple-500/5 rounded-t-xl" />
                                </>
                            )}
                            {activeTab !== "investments" && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("goals")}
                            className="px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 font-semibold transition-all duration-300 relative group flex-shrink-0"
                            style={{
                                color: activeTab === "goals" ? '#a855f7' : 'var(--text-secondary)'
                            }}
                        >
                            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                                <Target size={16} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="text-xs sm:text-sm lg:text-base">Metas</span>
                            </span>
                            {activeTab === "goals" && (
                                <>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 rounded-t-full shadow-lg shadow-purple-500/30" />
                                    <div className="absolute inset-0 bg-purple-500/5 rounded-t-xl" />
                                </>
                            )}
                            {activeTab !== "goals" && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("budget")}
                            className="px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 font-semibold transition-all duration-300 relative group flex-shrink-0"
                            style={{
                                color: activeTab === "budget" ? '#a855f7' : 'var(--text-secondary)'
                            }}
                        >
                            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                                <DollarSign size={16} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="text-xs sm:text-sm lg:text-base">Orçamento</span>
                            </span>
                            {activeTab === "budget" && (
                                <>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 rounded-t-full shadow-lg shadow-purple-500/30" />
                                    <div className="absolute inset-0 bg-purple-500/5 rounded-t-xl" />
                                </>
                            )}
                            {activeTab !== "budget" && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("credit-cards")}
                            className="px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-3.5 font-semibold transition-all duration-300 relative group flex-shrink-0"
                            style={{
                                color: activeTab === "credit-cards" ? '#a855f7' : 'var(--text-secondary)'
                            }}
                        >
                            <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                                <CreditCard size={16} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="text-xs sm:text-sm lg:text-base">Cartões</span>
                            </span>
                            {activeTab === "credit-cards" && (
                                <>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 rounded-t-full shadow-lg shadow-purple-500/30" />
                                    <div className="absolute inset-0 bg-purple-500/5 rounded-t-xl" />
                                </>
                            )}
                            {activeTab !== "credit-cards" && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                            )}
                        </button>
                    </div>

                    {/* Content based on active tab */}
                    {activeTab === "analytics" ? (
                        <AnalyticsTab transactions={transactions} tags={tags} summary={summary} />
                    ) : activeTab === "projections" ? (
                        <ProjectionsTab transactions={transactions} summary={summary} userId={userId} />
                    ) : activeTab === "investments" ? (
                        <InvestmentsTab transactions={transactions} summary={summary} userId={userId} />
                    ) : activeTab === "goals" ? (
                        <GoalsTab userId={userId} onLoadData={loadData} />
                    ) : activeTab === "budget" ? (
                        <BudgetTab userId={userId} selectedPeriod={selectedPeriod || currentPeriod} onLoadData={loadData} />
                    ) : activeTab === "credit-cards" ? (
                        <CreditCardsTab userId={userId} onLoadData={loadData} />
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div
                                className="flex flex-col px-6 py-3"
                                style={{
                                    borderBottom: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)'
                                }}
                            >
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                                    {/* Search */}
                                    <div className="relative group flex-1 max-w-md min-w-[150px]">
                                        <Search size={16} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 transition-colors duration-200" style={{ color: 'var(--text-secondary)' }} />
                                        <input
                                            type="text"
                                            placeholder="Buscar..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3 text-sm rounded-xl border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:shadow-lg focus:shadow-purple-500/10"
                                            style={{
                                                background: 'var(--bg-tertiary)',
                                                borderColor: 'var(--border-color)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Advanced Filters Toggle */}
                                    <button
                                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                        className="px-2.5 sm:px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white/5 flex items-center gap-1.5 sm:gap-2"
                                        style={{
                                            background: showAdvancedFilters ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                        title="Filtros Avançados"
                                    >
                                        <Filter size={14} className="sm:w-4 sm:h-4" />
                                        <span className="text-xs sm:text-sm font-medium hidden sm:inline">Filtros</span>
                                        {showAdvancedFilters && <span className="text-xs text-purple-400">({filteredTx.length})</span>}
                                    </button>

                                    {/* Filter */}
                                    <div
                                        className="flex items-center gap-1 p-1 rounded-lg"
                                        style={{ background: 'var(--bg-tertiary)' }}
                                    >
                                        {[
                                            { id: "all", label: "Todos" },
                                            { id: "income", label: "Entradas" },
                                            { id: "expense", label: "Saídas" },
                                            { id: "investment", label: "Investimentos" }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setFilter(f.id)}
                                                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                                style={{
                                                    background: filter === f.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                                    color: filter === f.id ? 'var(--accent-primary)' : 'var(--text-secondary)'
                                                }}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                    {/* Manage Tags Button */}
                                    <button
                                        onClick={() => setShowTagModal(true)}
                                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                                        style={{
                                            color: 'var(--text-secondary)',
                                            background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <Tag size={14} className="sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Tags</span>
                                    </button>

                                    {/* Recurring Button */}
                                    <button
                                        onClick={() => setShowRecurringModal(true)}
                                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                                        style={{
                                            color: 'var(--text-secondary)',
                                            background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <Calendar size={14} className="sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Fixos</span>
                                    </button>

                                    {/* Overdue Bills Button */}
                                    <button
                                        onClick={() => setShowOverdueModal(true)}
                                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                                        style={{
                                            color: 'var(--text-secondary)',
                                            background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <AlertCircle size={14} className="sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Contas em Atraso</span>
                                    </button>

                                        {/* Backup Button */}
                                        <button
                                            onClick={() => setShowBackupModal(true)}
                                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-color)'
                                            }}
                                            title="Backup e Restauração"
                                        >
                                            <Download size={14} className="sm:w-4 sm:h-4" />
                                            <span className="hidden sm:inline">Backup</span>
                                        </button>

                                        {/* Export Button */}
                                        <button
                                            onClick={() => setShowExportModal(true)}
                                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-color)'
                                            }}
                                            title="Exportar Dados"
                                        >
                                            <Download size={14} className="sm:w-4 sm:h-4" />
                                            <span className="hidden sm:inline">Exportar</span>
                                        </button>

                                        {/* Integrity Button */}
                                        <button
                                            onClick={() => setShowIntegrityModal(true)}
                                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-color)'
                                            }}
                                            title="Verificar Integridade dos Dados"
                                        >
                                            <Shield size={14} className="sm:w-4 sm:h-4" />
                                            <span className="hidden sm:inline">Integridade</span>
                                        </button>

                                {/* Add Button */}
                                <button
                                    onClick={() => setShowAddRow(!showAddRow)}
                                    className="flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-600 hover:from-purple-400 hover:via-violet-400 hover:to-indigo-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95 text-xs sm:text-sm font-semibold"
                                >
                                    <Plus size={16} className="sm:w-5 sm:h-5 drop-shadow-sm" />
                                    <span className="hidden sm:inline">Nova Entrada</span>
                                    <span className="sm:hidden">Nova</span>
                                </button>
                                    </div>
                                </div>
                                </div>
                            </div>

                            {/* Advanced Filters Panel - Outside toolbar */}
                            {showAdvancedFilters && (
                                <div 
                                    className="w-full px-6 py-3 border-t transition-all duration-200"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        borderColor: 'var(--border-color)'
                                    }}
                                >
                                    <div className="p-4 rounded-xl border-2" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Category Filter */}
                                            <div>
                                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                                    Categorias
                                                </label>
                                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                                    {availableCategories && availableCategories.length > 0 ? (
                                                        availableCategories.map(cat => (
                                                            <button
                                                                key={cat}
                                                                onClick={() => {
                                                                    if (selectedCategories.includes(cat)) {
                                                                        setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                                                    } else {
                                                                        setSelectedCategories([...selectedCategories, cat]);
                                                                    }
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                                    selectedCategories.includes(cat)
                                                                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                                                                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/5'
                                                                }`}
                                                            >
                                                                {cat}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-[var(--text-secondary)] py-2">
                                                            Nenhuma categoria disponível
                                                        </p>
                                                    )}
                                                </div>
                                                {selectedCategories.length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedCategories([])}
                                                        className="mt-2 text-xs text-purple-400 hover:text-purple-300"
                                                    >
                                                        Limpar seleção
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Value Range Filter */}
                                            <div>
                                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                                    Faixa de Valores
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Mínimo"
                                                        value={minValue}
                                                        onChange={(e) => setMinValue(e.target.value)}
                                                        className="flex-1 px-3 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                                        style={{
                                                            background: 'var(--bg-secondary)',
                                                            borderColor: 'var(--border-color)',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Máximo"
                                                        value={maxValue}
                                                        onChange={(e) => setMaxValue(e.target.value)}
                                                        className="flex-1 px-3 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                                        style={{
                                                            background: 'var(--bg-secondary)',
                                                            borderColor: 'var(--border-color)',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                    />
                                                </div>
                                                {(minValue || maxValue) && (
                                                    <button
                                                        onClick={() => { setMinValue(""); setMaxValue(""); }}
                                                        className="mt-2 text-xs text-purple-400 hover:text-purple-300"
                                                    >
                                                        Limpar
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Regex Toggle */}
                                            <div>
                                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                                    Busca Avançada
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={useRegex}
                                                            onChange={(e) => setUseRegex(e.target.checked)}
                                                            className="w-4 h-4 rounded border-2 transition-all duration-200"
                                                            style={{
                                                                accentColor: '#a855f7',
                                                                borderColor: useRegex ? '#a855f7' : 'var(--border-color)'
                                                            }}
                                                        />
                                                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                            Usar Regex
                                                        </span>
                                                    </label>
                                                </div>
                                                {useRegex && (
                                                    <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        Ex: ^Receita|Despesa$
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Clear All Filters */}
                                        {(selectedCategories.length > 0 || minValue || maxValue || useRegex) && (
                                            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedCategories([]);
                                                        setMinValue("");
                                                        setMaxValue("");
                                                        setUseRegex(false);
                                                    }}
                                                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5"
                                                    style={{
                                                        background: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)',
                                                        border: '1px solid var(--border-color)'
                                                    }}
                                                >
                                                    Limpar Todos os Filtros
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            <main className="flex-1 overflow-auto min-h-0">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto h-full">
                                        <div className="pb-12">
                                        <table className="w-full min-w-[600px] md:min-w-[800px]">
                                        <thead
                                            className="sticky top-0 z-10"
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                borderBottom: '1px solid var(--border-color)'
                                            }}
                                        >
                                            <tr>
                                                <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Descrição</th>
                                                <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Tipo</th>
                                                <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Categoria</th>
                                                <th className="text-right px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Valor</th>
                                                <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Extra</th>
                                                <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Data</th>
                                                <th className="text-right px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium uppercase tracking-wider w-16 sm:w-20 md:w-24" style={{ color: 'var(--text-secondary)' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Add Row */}
                                            {showAddRow && (
                                                <tr style={{ background: 'rgba(139, 92, 246, 0.05)', borderLeft: '2px solid var(--accent-primary)' }}>
                                                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                        <input
                                                            type="text"
                                                            placeholder="Descrição..."
                                                            value={formData.description}
                                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                                            style={{
                                                                background: 'var(--bg-tertiary)',
                                                                border: '1px solid var(--border-color)',
                                                                color: 'var(--text-primary)'
                                                            }}
                                                            autoFocus
                                                        />
                                                    </td>
                                                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setFormData({ ...formData, type: "income" })}
                                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${formData.type === "income"
                                                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                                    : "bg-white/5 text-gray-400 border border-white/10"
                                                                    }`}
                                                            >
                                                                Entrada
                                                            </button>
                                                            <button
                                                                onClick={() => setFormData({ ...formData, type: "expense" })}
                                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${formData.type === "expense"
                                                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                                    : "bg-white/5 text-gray-400 border border-white/10"
                                                                    }`}
                                                            >
                                                                Saída
                                                            </button>
                                                            <button
                                                                onClick={() => setFormData({ ...formData, type: "investment" })}
                                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${formData.type === "investment"
                                                                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                                                    : "bg-white/5 text-gray-400 border border-white/10"
                                                                    }`}
                                                            >
                                                                Investimento
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                        <div className="relative">
                                                            <select
                                                                value={formData.category}
                                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                                className="w-full rounded-lg px-3 py-2 text-sm outline-none appearance-none cursor-pointer"
                                                                style={{
                                                                    background: 'var(--bg-tertiary)',
                                                                    border: '1px solid var(--border-color)',
                                                                    color: 'var(--text-primary)',
                                                                    paddingRight: '2.5rem'
                                                                }}
                                                            >
                                                                {tags.map(tag => (
                                                                    <option key={tag.id} value={tag.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                                                        {tag.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                                                                <div
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ background: getTagStyle(formData.category).color }}
                                                                />
                                                                <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                        <input
                                                            type="number"
                                                            placeholder="0,00"
                                                            value={formData.value}
                                                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                                            className="w-full rounded-lg px-3 py-2 text-sm outline-none text-right"
                                                            style={{
                                                                background: 'var(--bg-tertiary)',
                                                                border: '1px solid var(--border-color)',
                                                                color: 'var(--text-primary)'
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                        {/* Credit Card Selection (only for expenses) */}
                                                        {formData.type === "expense" ? (
                                                            creditCards.length > 0 ? (
                                                                <select
                                                                    value={formData.credit_card_id}
                                                                    onChange={(e) => setFormData({ ...formData, credit_card_id: e.target.value })}
                                                                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                                                    style={{
                                                                        background: 'var(--bg-tertiary)',
                                                                        border: '1px solid var(--border-color)',
                                                                        color: 'var(--text-primary)'
                                                                    }}
                                                                >
                                                                    <option value="">Sem cartão</option>
                                                                    {creditCards.map(card => (
                                                                        <option key={card.id} value={card.id}>
                                                                            {card.name} (Final: {card.last_four_digits})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">Cadastre cartões na aba "Cartões"</span>
                                                            )
                                                        ) : formData.type === "investment" ? (
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={formData.investment_type}
                                                                    onChange={(e) => setFormData({ ...formData, investment_type: e.target.value })}
                                                                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                                                                    style={{
                                                                        background: 'var(--bg-tertiary)',
                                                                        border: '1px solid var(--border-color)',
                                                                        color: 'var(--text-primary)'
                                                                    }}
                                                                >
                                                                    <option value="investment">Investimento (com juros)</option>
                                                                    <option value="savings">Caixinha/Poupança</option>
                                                                </select>
                                                                {formData.investment_type === "investment" && (
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        placeholder="Juros % a.a."
                                                                        value={formData.interest_rate}
                                                                        onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                                                                        className="w-32 rounded-lg px-3 py-2 text-sm outline-none text-right"
                                                                        style={{
                                                                            background: 'var(--bg-tertiary)',
                                                                            border: '1px solid var(--border-color)',
                                                                            color: 'var(--text-primary)'
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                        <input
                                                            type="date"
                                                            value={formData.date}
                                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                            className="rounded-lg px-3 py-2 text-sm outline-none"
                                                            style={{
                                                                background: 'var(--bg-tertiary)',
                                                                border: '1px solid var(--border-color)',
                                                                color: 'var(--text-primary)',
                                                                colorScheme: 'dark'
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={handleAdd}
                                                                className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => { 
                                                                    setShowAddRow(false); 
                                                                    setFormData({ 
                                                                        description: "", 
                                                                        value: "", 
                                                                        type: "income", 
                                                                        category: "outro",
                                                                        date: new Date().toISOString().split('T')[0],
                                                                        credit_card_id: "",
                                                                        interest_rate: "",
                                                                        investment_type: "investment"
                                                                    }); 
                                                                }}
                                                                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}

                                            {/* Data Rows */}
                                            {filteredTx.map((tx) => {
                                                const tag = getTagStyle(tx.category);
                                                const isEditing = editingId === tx.id;

                                                if (isEditing) {
                                                    // Editing Row
                                                    return (
                                                        <tr
                                                            key={tx.id}
                                                            style={{ background: 'rgba(139, 92, 246, 0.05)', borderLeft: '2px solid var(--accent-primary)', borderBottom: '1px solid var(--border-color)' }}
                                                        >
                                                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                                <input
                                                                    type="text"
                                                                    value={editData.description || ""}
                                                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                                                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                                                    style={{
                                                                        background: 'var(--bg-tertiary)',
                                                                        border: '1px solid var(--border-color)',
                                                                        color: 'var(--text-primary)'
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => setEditData({ ...editData, type: "income" })}
                                                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${editData.type === "income"
                                                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                                            : "bg-white/5 text-gray-400 border border-white/10"
                                                                            }`}
                                                                    >
                                                                        Entrada
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditData({ ...editData, type: "expense" })}
                                                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${editData.type === "expense"
                                                                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                                            : "bg-white/5 text-gray-400 border border-white/10"
                                                                            }`}
                                                                    >
                                                                        Saída
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditData({ ...editData, type: "investment" })}
                                                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${editData.type === "investment"
                                                                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                                                            : "bg-white/5 text-gray-400 border border-white/10"
                                                                            }`}
                                                                    >
                                                                        Investimento
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 hidden md:table-cell">
                                                                <div className="relative">
                                                                    <select
                                                                        value={editData.category || "outro"}
                                                                        onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                                                        className="w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm outline-none appearance-none cursor-pointer"
                                                                        style={{
                                                                            background: 'var(--bg-tertiary)',
                                                                            border: '1px solid var(--border-color)',
                                                                            color: 'var(--text-primary)',
                                                                            paddingRight: '2.5rem'
                                                                        }}
                                                                    >
                                                                        {tags.map(tag => (
                                                                            <option key={tag.id} value={tag.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                                                                {tag.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                                                                        <div
                                                                            className="w-3 h-3 rounded-full"
                                                                            style={{ background: getTagStyle(editData.category || "outro").color }}
                                                                        />
                                                                        <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                                <input
                                                                    type="number"
                                                                    value={editData.value || ""}
                                                                    onChange={(e) => setEditData({ ...editData, value: e.target.value })}
                                                                    className="w-full rounded-lg px-3 py-2 text-sm outline-none text-right"
                                                                    style={{
                                                                        background: 'var(--bg-tertiary)',
                                                                        border: '1px solid var(--border-color)',
                                                                        color: 'var(--text-primary)'
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                                                                {/* Credit Card Selection (only for expenses) */}
                                                                {editData.type === "expense" && creditCards.length > 0 ? (
                                                                    <select
                                                                        value={editData.credit_card_id || ""}
                                                                        onChange={(e) => setEditData({ ...editData, credit_card_id: e.target.value })}
                                                                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                                                        style={{
                                                                            background: 'var(--bg-tertiary)',
                                                                            border: '1px solid var(--border-color)',
                                                                            color: 'var(--text-primary)'
                                                                        }}
                                                                    >
                                                                        <option value="">Sem cartão</option>
                                                                        {creditCards.map(card => (
                                                                            <option key={card.id} value={card.id}>
                                                                                {card.name} (Final: {card.last_four_digits})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                ) : editData.type === "investment" ? (
                                                                    <div className="flex gap-2">
                                                                        <select
                                                                            value={editData.investment_type || "investment"}
                                                                            onChange={(e) => setEditData({ ...editData, investment_type: e.target.value })}
                                                                            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                                                                            style={{
                                                                                background: 'var(--bg-tertiary)',
                                                                                border: '1px solid var(--border-color)',
                                                                                color: 'var(--text-primary)'
                                                                            }}
                                                                        >
                                                                            <option value="investment">Investimento (com juros)</option>
                                                                            <option value="savings">Caixinha/Poupança</option>
                                                                        </select>
                                                                        {editData.investment_type === "investment" && (
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                placeholder="Juros % a.a."
                                                                                value={editData.interest_rate || ""}
                                                                                onChange={(e) => setEditData({ ...editData, interest_rate: e.target.value })}
                                                                                className="w-32 rounded-lg px-3 py-2 text-sm outline-none text-right"
                                                                                style={{
                                                                                    background: 'var(--bg-tertiary)',
                                                                                    border: '1px solid var(--border-color)',
                                                                                    color: 'var(--text-primary)'
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-gray-500">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 hidden lg:table-cell">
                                                                <input
                                                                    type="date"
                                                                    value={editData.date || ""}
                                                                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                                                                    className="rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm outline-none"
                                                                    style={{
                                                                        background: 'var(--bg-tertiary)',
                                                                        border: '1px solid var(--border-color)',
                                                                        color: 'var(--text-primary)',
                                                                        colorScheme: 'dark'
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        onClick={() => handleSaveEdit(tx.id)}
                                                                        className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                                                    >
                                                                        <Check size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                // Normal Row
                                                return (
                                                    <tr
                                                        key={tx.id}
                                                        className="transition-colors group hover:bg-white/[0.02]"
                                                        style={{ borderBottom: '1px solid var(--border-color)' }}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tx.description}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${tx.type === "income"
                                                                ? "bg-green-500/20 text-green-400"
                                                                : "bg-red-500/20 text-red-400"
                                                                }`}>
                                                                {tx.type === "income" ? "Entrada" : "Saída"}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                                                style={{
                                                                    background: `${tag.color}22`,
                                                                    color: tag.color,
                                                                    border: `1px solid ${tag.color}44`
                                                                }}
                                                            >
                                                                <Tag size={10} />
                                                                {tag.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`text-sm font-semibold ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}>
                                                                {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.value)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {tx.type === "expense" && tx.credit_card_id ? (
                                                                <span className="text-xs text-purple-400 flex items-center gap-1">
                                                                    <CreditCard size={12} />
                                                                    {(() => {
                                                                        const card = creditCards.find(c => c.id === tx.credit_card_id);
                                                                        return card ? `${card.name} (${card.last_four_digits})` : "Cartão";
                                                                    })()}
                                                                </span>
                                                            ) : tx.type === "investment" ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                                        {tx.investment_type === "savings" ? "Caixinha" : "Investimento"}
                                                                    </span>
                                                                    {tx.interest_rate && (
                                                                        <span className="text-xs text-yellow-400">
                                                                            {tx.interest_rate}% a.a.
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                                                            <span className="text-[10px] sm:text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(tx.date)}</span>
                                                        </td>
                                                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleStartEdit(tx)}
                                                                    className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                                                                    style={{ color: 'var(--text-secondary)' }}
                                                                    title="Editar"
                                                                >
                                                                    <Edit3 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(tx.id)}
                                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {/* Empty State */}
                                            {filteredTx.length === 0 && !isLoading && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div
                                                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                                                style={{ background: 'rgba(139, 92, 246, 0.1)' }}
                                                            >
                                                                <DollarSign size={24} style={{ color: 'var(--accent-primary)' }} />
                                                            </div>
                                                            <p style={{ color: 'var(--text-secondary)' }}>Nenhuma movimentação encontrada</p>
                                                            <button
                                                                onClick={() => setShowAddRow(true)}
                                                                className="text-sm transition-colors"
                                                                style={{ color: 'var(--accent-primary)' }}
                                                            >
                                                                Adicionar primeira entrada
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                        </div>
                                    </div>
                                )}
                            </main>
                        </>
                    )}
                </div>
                {/* Chat Sidebar */}
                <div className="hidden lg:flex w-[400px] xl:w-[500px] border-l border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col z-20 shadow-xl h-full flex-shrink-0">
                    <BusinessChat isOpen={true} onClose={() => { }} userId={userId} onUpdate={loadData} />
                </div>
            </div>

            {/* Tag Management Modal */}
            {
                showTagModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div
                            className="w-full max-w-md rounded-2xl p-6 animate-in zoom-in-95 duration-200"
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                    Gerenciar Tags
                                </h2>
                                <button
                                    onClick={() => setShowTagModal(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Existing Tags */}
                            <div className="space-y-2 mb-6">
                                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Tags existentes</p>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <div
                                            key={tag.id}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                                            style={{
                                                background: `${tag.color}22`,
                                                color: tag.color,
                                                border: `1px solid ${tag.color}44`
                                            }}
                                        >
                                            <span>{tag.label}</span>
                                            {!DEFAULT_TAGS.find(t => t.id === tag.id) && (
                                                <button
                                                    onClick={() => handleDeleteTag(tag.id)}
                                                    className="hover:opacity-70"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Add New Tag */}
                            <div className="space-y-3">
                                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Nova tag</p>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nome da tag..."
                                        value={newTag.label}
                                        onChange={(e) => setNewTag({ ...newTag, label: e.target.value })}
                                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Palette size={14} style={{ color: 'var(--text-secondary)' }} />
                                    <div className="flex gap-2">
                                        {TAG_COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setNewTag({ ...newTag, color })}
                                                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                                                style={{
                                                    background: color,
                                                    border: newTag.color === color ? '2px solid white' : 'none',
                                                    boxShadow: newTag.color === color ? '0 0 0 2px var(--bg-primary)' : 'none'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddTag}
                                    disabled={!newTag.label.trim()}
                                    className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                    style={{
                                        background: 'var(--accent-primary)',
                                        color: 'white'
                                    }}
                                >
                                    Adicionar Tag
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modals */}
            <RecurringModal
                isOpen={showRecurringModal}
                onClose={() => setShowRecurringModal(false)}
                userId={userId}
                onLoadData={loadData}
                tags={tags}
            />
            <OverdueBills
                isOpen={showOverdueModal}
                onClose={() => setShowOverdueModal(false)}
                userId={userId}
                onLoadData={loadData}
                tags={tags}
            />
            <BackupModal
                isOpen={showBackupModal}
                onClose={() => setShowBackupModal(false)}
                userId={userId}
            />
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                userId={userId}
                selectedPeriod={selectedPeriod || currentPeriod}
            />
            <IntegrityModal
                isOpen={showIntegrityModal}
                onClose={() => setShowIntegrityModal(false)}
                userId={userId}
            />
        </div >
    );
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
if (!document.head.querySelector('style[data-business-animations]')) {
    style.setAttribute('data-business-animations', 'true');
    document.head.appendChild(style);
}

export default BusinessMode;
