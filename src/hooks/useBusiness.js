import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';

const API_BASE = 'http://localhost:3001/api/business';

export const useBusiness = () => {
    const [summary, setSummary] = useState({ balance: 0, income: 0, expenses: 0, count: 0 });
    const [transactions, setTransactions] = useState([]);
    const [tags, setTags] = useState([]);
    const [recurring, setRecurring] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [goals, setGoals] = useState([]);
    const [cards, setCards] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [piggyBanks, setPiggyBanks] = useState([]);
    const [piggyBanksSummary, setPiggyBanksSummary] = useState({ total_piggy_banks: 0, total_saved: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [bills, setBills] = useState([]);
    const [billsSummary, setBillsSummary] = useState({ pending_count: 0, total_pending_value: 0, overdue_count: 0, overdue_value: 0 });
    const [analytics, setAnalytics] = useState({
        cashflow: [],
        categories: [],
        projections: { current_balance: 0, projected_income: 0, projected_expense: 0, pending_bills: 0, projected_balance: 0, trend: 'up' },
        metrics: { avg_daily_spending: 0, savings_rate: 0, top_category: 'N/A', top_category_value: 0, transaction_count: 0, days_tracked: 0 }
    });
    const [currentPeriod, setCurrentPeriod] = useState(new Date().toISOString().slice(0, 7));
    const [availablePeriods, setAvailablePeriods] = useState([]);
    const [syncStatus, setSyncStatus] = useState({ firebase_available: false, last_sync: null });

    // Get current user UID from Firebase auth
    const getUserUid = useCallback(() => {
        return auth.currentUser?.uid || 'local';
    }, []);

    // Build URL with UID parameter
    const buildUrl = useCallback((endpoint, params = {}) => {
        const uid = getUserUid();
        const allParams = { ...params, uid };
        const queryString = new URLSearchParams(allParams).toString();
        return `${API_BASE}${endpoint}?${queryString}`;
    }, [getUserUid]);

    const fetchSummary = useCallback(async (period = null) => {
        try {
            const params = period ? { period } : {};
            const url = buildUrl('/summary', params);
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch summary');
            const data = await res.json();
            setSummary(data);
            if (data.period) {
                setCurrentPeriod(data.period);
            }
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchPeriods = useCallback(async () => {
        try {
            const url = buildUrl('/periods');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch periods');
            const data = await res.json();
            setAvailablePeriods(data.available_periods || []);
            setCurrentPeriod(data.current_period);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchSyncStatus = useCallback(async () => {
        try {
            const url = buildUrl('/sync/status');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch sync status');
            const data = await res.json();
            setSyncStatus(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const syncToCloud = useCallback(async () => {
        try {
            const url = buildUrl('/sync/push');
            const res = await fetch(url, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to sync');
            const data = await res.json();
            console.log('[Sync] Pushed to cloud:', data);
            return data;
        } catch (err) {
            console.error('[Sync] Error:', err);
            return { success: false, error: err.message };
        }
    }, [buildUrl]);

    const syncFromCloud = useCallback(async () => {
        try {
            const url = buildUrl('/sync/pull');
            const res = await fetch(url, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to sync');
            const data = await res.json();
            console.log('[Sync] Pulled from cloud:', data);
            return data;
        } catch (err) {
            console.error('[Sync] Error:', err);
            return { success: false, error: err.message };
        }
    }, [buildUrl]);



    const fetchTransactions = useCallback(async (filters = {}) => {
        setLoading(true);
        try {
            const url = buildUrl('/transactions', filters);
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch transactions');
            const data = await res.json();
            setTransactions(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [buildUrl]);

    const fetchTags = useCallback(async () => {
        try {
            const url = buildUrl('/tags');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch tags');
            const data = await res.json();
            setTags(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchRecurring = useCallback(async () => {
        try {
            const url = buildUrl('/recurring');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch recurring items');
            const data = await res.json();
            setRecurring(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchBudgets = useCallback(async (period = null) => {
        try {
            const params = period ? { period } : {};
            const url = buildUrl('/budget', params);
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch budgets');
            const data = await res.json();
            setBudgets(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchGoals = useCallback(async () => {
        try {
            const url = buildUrl('/goals');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch goals');
            const data = await res.json();
            setGoals(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchCards = useCallback(async () => {
        try {
            const url = buildUrl('/cards');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch cards');
            const data = await res.json();
            setCards(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchNotifications = useCallback(async () => {
        try {
            const url = buildUrl('/notifications');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data = await res.json();
            setNotifications(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchPiggyBanks = useCallback(async () => {
        try {
            const url = buildUrl('/piggy-banks');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch piggy banks');
            const data = await res.json();
            setPiggyBanks(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchPiggyBanksSummary = useCallback(async () => {
        try {
            const url = buildUrl('/piggy-banks/summary');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch piggy banks summary');
            const data = await res.json();
            setPiggyBanksSummary(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchBills = useCallback(async () => {
        try {
            const url = buildUrl('/bills');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch bills');
            const data = await res.json();
            setBills(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchBillsSummary = useCallback(async () => {
        try {
            const url = buildUrl('/bills/summary');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch bills summary');
            const data = await res.json();
            setBillsSummary(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const fetchAnalytics = useCallback(async () => {
        try {
            const url = buildUrl('/analytics');
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            const data = await res.json();
            setAnalytics(data);
        } catch (err) {
            console.error(err);
        }
    }, [buildUrl]);

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchSummary(),
                fetchTransactions(),
                fetchTags(),
                fetchRecurring(),
                fetchBudgets(),
                fetchGoals(),
                fetchCards(),
                fetchNotifications(),
                fetchBills(),
                fetchBillsSummary(),
                fetchPiggyBanks(),
                fetchPiggyBanksSummary()
            ]);
        } finally {
            setLoading(false);
        }
    }, [
        fetchSummary, fetchTransactions, fetchTags, fetchRecurring,
        fetchBudgets, fetchGoals, fetchCards, fetchNotifications,
        fetchBills, fetchBillsSummary, fetchPiggyBanks, fetchPiggyBanksSummary
    ]);

    const syncTags = async () => {
        console.log('[useBusiness] Starting syncTags');
        try {
            const url = buildUrl('/tags/sync');
            const res = await fetch(url);
            console.log('[useBusiness] syncTags response:', res.status);
            await fetchTags();
            console.log('[useBusiness] Tags refreshed');
            return true;
        } catch (err) {
            console.error('[useBusiness] syncTags error:', err);
            setError(err.message);
            return false;
        }
    };

    const addTransaction = async (transaction) => {
        try {
            const url = buildUrl('/transactions');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transaction)
            });
            if (!res.ok) throw new Error('Failed to add transaction');
            await fetchSummary(); // Refresh summary
            await fetchTransactions(); // Refresh list
            await fetchTags(); // Refresh tags as they might be auto-created
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const deleteTransaction = async (id) => {
        try {
            const url = buildUrl(`/transactions/${id}`);
            const res = await fetch(url, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete transaction');
            await fetchSummary();
            await fetchTransactions();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const updateTransaction = async (id, transaction) => {
        try {
            const url = buildUrl(`/transactions/${id}`);
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transaction)
            });
            if (!res.ok) throw new Error('Failed to update transaction');
            await fetchSummary();
            await fetchTransactions();
            await fetchTags();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const addTag = async (tag) => {
        try {
            const url = buildUrl('/tags');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tag)
            });
            if (!res.ok) throw new Error('Failed to add tag');
            await fetchTags();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const deleteTag = async (id) => {
        try {
            const url = buildUrl(`/tags/${id}`);
            const res = await fetch(url, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete tag');
            await fetchTags();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const addRecurring = async (item) => {
        try {
            const url = buildUrl('/recurring');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (!res.ok) throw new Error('Failed to add recurring item');
            await fetchRecurring();
            // Auto-sync tags when category changes
            await fetchTags();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const updateRecurring = async (id, item) => {
        try {
            const url = buildUrl(`/recurring/${id}`);
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (!res.ok) throw new Error('Failed to update recurring item');
            await fetchRecurring();
            // Auto-sync tags when category changes
            await fetchTags();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const deleteRecurring = async (id) => {
        try {
            const url = buildUrl(`/recurring/${id}`);
            const res = await fetch(url, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete recurring item');
            await fetchRecurring();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const processRecurring = async (month = null) => {
        try {
            const params = month ? { month } : {};
            const url = buildUrl('/recurring/process', params);
            const res = await fetch(url, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to process recurring items');
            await fetchSummary();
            await fetchTransactions();
            await fetchRecurring();
            return await res.json();
        } catch (err) {
            setError(err.message);
            return null;
        }
    };

    const addBudget = async (budget) => {
        try {
            const url = buildUrl('/budget');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(budget)
            });
            if (!res.ok) throw new Error('Failed to add budget');
            await fetchBudgets(budget.period);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const updateBudget = async (id, budget) => {
        try {
            const url = buildUrl(`/budget/${id}`);
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(budget)
            });
            if (!res.ok) throw new Error('Failed to update budget');
            await fetchBudgets(budget.period);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const deleteBudget = async (id) => {
        try {
            const url = buildUrl(`/budget/${id}`);
            const res = await fetch(url, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete budget');
            await fetchBudgets();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const addGoal = async (goal) => {
        try {
            const url = buildUrl('/goals');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            });
            if (!res.ok) throw new Error('Failed to add goal');
            await fetchGoals();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const updateGoal = async (id, goal) => {
        try {
            const url = buildUrl(`/goals/${id}`);
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            });
            if (!res.ok) throw new Error('Failed to update goal');
            await fetchGoals();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const deleteGoal = async (id) => {
        try {
            const url = buildUrl(`/goals/${id}`);
            const res = await fetch(url, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete goal');
            await fetchGoals();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const addPiggyBank = async (piggyBank) => {
        try {
            const url = buildUrl('/piggy-banks');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(piggyBank)
            });
            if (!res.ok) throw new Error('Failed to add piggy bank');
            await fetchPiggyBanks();
            await fetchPiggyBanksSummary();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const updatePiggyBank = async (id, piggyBank) => {
        try {
            const url = buildUrl(`/piggy-banks/${id}`);
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(piggyBank)
            });
            if (!res.ok) throw new Error('Failed to update piggy bank');
            await fetchPiggyBanks();
            await fetchPiggyBanksSummary();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const deletePiggyBank = async (id) => {
        try {
            const url = buildUrl(`/piggy-banks/${id}`);
            const res = await fetch(url, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete piggy bank');
            await fetchPiggyBanks();
            await fetchPiggyBanksSummary();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const depositToPiggyBank = async (id, amount, description = null) => {
        try {
            const url = buildUrl(`/piggy-banks/${id}/deposit`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, description })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Failed to deposit');
            }
            await fetchPiggyBanks();
            await fetchPiggyBanksSummary();
            await fetchGoals(); // Update goals if linked
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const withdrawFromPiggyBank = async (id, amount, description = null) => {
        try {
            const url = buildUrl(`/piggy-banks/${id}/withdraw`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, description })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Failed to withdraw');
            }
            await fetchPiggyBanks();
            await fetchPiggyBanksSummary();
            await fetchGoals(); // Update goals if linked
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const fetchPiggyBankTransactions = async (piggyBankId) => {
        try {
            const url = buildUrl(`/piggy-banks/${piggyBankId}/transactions`);
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch transactions');
            return await res.json();
        } catch (err) {
            setError(err.message);
            return [];
        }
    };

    const addCard = async (card) => {
        try {
            const url = buildUrl('/cards');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card)
            });
            if (!res.ok) throw new Error('Failed to add card');
            await fetchCards();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const updateCard = async (id, card) => {
        try {
            const url = buildUrl(`/cards/${id}`);
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card)
            });
            if (!res.ok) throw new Error('Failed to update card');
            await fetchCards();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const deleteCard = async (id) => {
        try {
            const url = buildUrl(`/cards/${id}`);
            const res = await fetch(url, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete card');
            await fetchCards();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const markNotificationRead = async (id) => {
        try {
            const url = buildUrl(`/notifications/${id}/read`);
            const res = await fetch(url, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to mark notification as read');
            await fetchNotifications();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const clearNotifications = async () => {
        try {
            const url = buildUrl('/notifications/clear');
            const res = await fetch(url, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to clear notifications');
            setNotifications([]);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const categorizeTransaction = async (description, type = 'expense') => {
        try {
            const url = buildUrl('/ai/categorize');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, type })
            });
            if (!res.ok) throw new Error('Failed to categorize');
            return await res.json();
        } catch (err) {
            setError(err.message);
            return null;
        }
    };

    const addBill = async (billData) => {
        try {
            const url = buildUrl('/bills');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billData)
            });
            if (!res.ok) throw new Error('Failed to add bill');
            await fetchBills();
            await fetchBillsSummary();
            // Auto-sync tags when category changes
            await fetchTags();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const updateBill = async (id, billData) => {
        try {
            const url = buildUrl(`/bills/${id}`);
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billData)
            });
            if (!res.ok) throw new Error('Failed to update bill');
            await fetchBills();
            await fetchBillsSummary();
            // Auto-sync tags when category changes
            await fetchTags();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const deleteBill = async (id) => {
        try {
            const url = buildUrl(`/bills/${id}`);
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete bill');
            await refreshData();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const payBill = async (id, credit_card_id = null) => {
        try {
            const url = buildUrl(`/bills/${id}/pay`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credit_card_id })
            });
            if (!res.ok) throw new Error('Failed to pay bill');
            await refreshData();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    return {
        summary,
        transactions,
        tags,
        recurring,
        budgets,
        goals,
        cards,
        notifications,
        piggyBanks,
        piggyBanksSummary,
        loading,
        error,
        fetchSummary,
        fetchTransactions,
        fetchTags,
        fetchRecurring,
        fetchBudgets,
        fetchGoals,
        fetchCards,
        fetchNotifications,
        fetchPiggyBanks,
        fetchPiggyBanksSummary,
        fetchBills,
        fetchBillsSummary,
        refreshData,
        syncTags,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        addTag,
        deleteTag,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        processRecurring,
        addBudget,
        updateBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        deleteGoal,
        addPiggyBank,
        updatePiggyBank,
        deletePiggyBank,
        depositToPiggyBank,
        withdrawFromPiggyBank,
        fetchPiggyBankTransactions,
        addCard,
        updateCard,
        deleteCard,
        markNotificationRead,
        clearNotifications,
        exportToCSV: () => window.open(buildUrl('/export/csv')),
        exportToJSON: () => window.open(buildUrl('/export/json')),
        categorizeTransaction,
        bills,
        billsSummary,
        addBill,
        updateBill,
        deleteBill,
        payBill,
        analytics,
        fetchAnalytics,
        currentPeriod,
        setCurrentPeriod,
        availablePeriods,
        fetchPeriods,
        // Sync functions
        syncStatus,
        fetchSyncStatus,
        syncToCloud,
        syncFromCloud,
        getUserUid
    };
};
