import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://juwusmklaavhshwkfjjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1d3VzbWtsYWF2aHNod2tmampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDU1ODAsImV4cCI6MjA3ODA4MTU4MH0.YkFJydeC6He50APrZtQkoqyaQ3HdlcAm-scPsYCPvEM';
const supabase = createClient(supabaseUrl, supabaseKey);

const SUPER_ADMIN_EMAIL = 'ordini-lampo@proton.me';
const SUPER_ADMIN_PASSWORD = 'OrdinLampo_2025!Sup3r@dmin';

export default function SuperAdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [referralConfig, setReferralConfig] = useState([]);
  const [editedReferralConfig, setEditedReferralConfig] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [statusLogs, setStatusLogs] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [showNewRestaurantForm, setShowNewRestaurantForm] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: '', city: '', whatsapp_number: '', email: '', plan_id: 'normal',
    phone_manager1: '', phone_manager1_label: 'Responsabile', show_phone_manager1: false,
    phone_manager2: '', phone_manager2_label: 'Vice Responsabile', show_phone_manager2: false,
    phone_landline: '', phone_landline_label: 'Fisso Locale', show_phone_landline: false,
    website: '', show_website: false, wechat_id: '', show_wechat: false
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm });
  };

  const hideConfirm = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === SUPER_ADMIN_EMAIL && loginPassword === SUPER_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError('');
      localStorage.setItem('superadmin_auth', 'true');
    } else {
      setLoginError('Credenziali non valide');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('superadmin_auth');
  };

  useEffect(() => {
    if (localStorage.getItem('superadmin_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const loadAllData = async () => {
    try {
      const { data: restaurantsData } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
      setRestaurants(restaurantsData || []);
      const { data: configData } = await supabase.from('referral_config').select('*');
      setReferralConfig(configData || []);
      const editedValues = {};
      (configData || []).forEach(c => { editedValues[c.key] = c.value; });
      setEditedReferralConfig(editedValues);
      const { data: notifData } = await supabase.from('notifications').select('*').eq('status', 'pending').order('scheduled_for', { ascending: true }).limit(50);
      setNotifications(notifData || []);
      const { data: logsData } = await supabase.from('account_status_log').select('*').order('created_at', { ascending: false }).limit(20);
      setStatusLogs(logsData || []);
    } catch (error) {
      console.error('Errore caricamento:', error);
    }
    setInitialLoading(false);
  };

  const stats = {
    totalRestaurants: restaurants.length,
    activeRestaurants: restaurants.filter(r => r.account_status === 'active' || !r.account_status).length,
    suspendedRestaurants: restaurants.filter(r => r.account_status === 'suspended').length,
    parkedRestaurants: restaurants.filter(r => r.account_status === 'parked').length,
    totalOrdersMonth: restaurants.reduce((sum, r) => sum + (r.orders_count_month || 0), 0),
    totalRevenueMonth: restaurants.reduce((sum, r) => sum + (r.revenue_month || 0), 0),
    totalFeeDueMonth: restaurants.reduce((sum, r) => sum + (r.fee_due_month || 0), 0),
    mrrEstimate: restaurants.filter(r => r.account_status === 'active' || !r.account_status).length * 39.90,
    normalPlanCount: restaurants.filter(r => !r.plan_id || r.plan_id === 'normal').length,
    referralPlanCount: restaurants.filter(r => r.plan_id === 'referral_service').length,
  };

  const createNewRestaurant = async () => {
    if (!newRestaurant.name || !newRestaurant.whatsapp_number) {
      showToast('Nome e WhatsApp obbligatori!', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase.from('restaurants').insert({
        name: newRestaurant.name, city: newRestaurant.city, whatsapp_number: newRestaurant.whatsapp_number,
        email: newRestaurant.email, plan_id: newRestaurant.plan_id, account_status: 'active',
        slug: newRestaurant.name.toLowerCase().replace(/\s+/g, '-'),
        phone_manager1: newRestaurant.phone_manager1 || null, phone_manager1_label: newRestaurant.phone_manager1_label,
        show_phone_manager1: newRestaurant.show_phone_manager1,
        phone_manager2: newRestaurant.phone_manager2 || null, phone_manager2_label: newRestaurant.phone_manager2_label,
        show_phone_manager2: newRestaurant.show_phone_manager2,
        phone_landline: newRestaurant.phone_landline || null, phone_landline_label: newRestaurant.phone_landline_label,
        show_phone_landline: newRestaurant.show_phone_landline,
        website: newRestaurant.website || null, show_website: newRestaurant.show_website,
        wechat_id: newRestaurant.wechat_id || null, show_wechat: newRestaurant.show_wechat
      }).select();
      if (error) { showToast('Errore: ' + error.message, 'error'); }
      else {
        showToast('Ristorante creato con successo!', 'success');
        setRestaurants([data[0], ...restaurants]);
        setShowNewRestaurantForm(false);
        setNewRestaurant({ name: '', city: '', whatsapp_number: '', email: '', plan_id: 'normal',
          phone_manager1: '', phone_manager1_label: 'Responsabile', show_phone_manager1: false,
          phone_manager2: '', phone_manager2_label: 'Vice Responsabile', show_phone_manager2: false,
          phone_landline: '', phone_landline_label: 'Fisso Locale', show_phone_landline: false,
          website: '', show_website: false, wechat_id: '', show_wechat: false });
      }
    } catch (error) { showToast('Errore nella creazione', 'error'); }
    setIsSaving(false);
  };

  const updateRestaurantStatus = async (restaurantId, newStatus, reason = '') => {
    setIsSaving(true);
    try {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      const oldStatus = restaurant?.account_status || 'active';
      const updates = { account_status: newStatus };
      if (newStatus === 'suspended') {
        updates.suspended_at = new Date().toISOString();
        updates.suspended_reason = reason;
      } else if (newStatus === 'parked') {
        updates.parked_at = new Date().toISOString();
        updates.parked_months = 3;
        updates.parked_until = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        updates.deletion_scheduled_at = updates.parked_until;
      } else if (newStatus === 'active') {
        updates.suspended_at = null; updates.suspended_reason = null;
        updates.parked_at = null; updates.parked_until = null;
        updates.parked_months = null; updates.deletion_scheduled_at = null;
      }
      const { error } = await supabase.from('restaurants').update(updates).eq('id', restaurantId);
      if (error) { showToast('Errore: ' + error.message, 'error'); setIsSaving(false); return; }
      await supabase.from('account_status_log').insert({
        restaurant_id: restaurantId, old_status: oldStatus, new_status: newStatus,
        changed_by_type: 'super_admin', changed_by_email: SUPER_ADMIN_EMAIL, reason: reason
      });
      setRestaurants(restaurants.map(r => r.id === restaurantId ? { ...r, ...updates } : r));
      setStatusLogs([{ created_at: new Date().toISOString(), old_status: oldStatus, new_status: newStatus, reason, changed_by_email: SUPER_ADMIN_EMAIL }, ...statusLogs]);
      showToast(`Stato cambiato in "${newStatus}"!`, 'success');
      setShowModal(false); setSelectedRestaurant(null); setModalReason('');
    } catch (error) { showToast('Errore aggiornamento', 'error'); }
    setIsSaving(false);
  };

  const updateRestaurantPlan = async (restaurantId, newPlanId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    const planLabel = newPlanId === 'referral_service' ? 'Referral (€0.90/ordine)' : 'Normal (€0.60/ordine)';
    showConfirm('⚠️ Conferma Cambio Piano', `Vuoi cambiare il piano di "${restaurant?.name}"?\n\nNuovo piano: ${planLabel}`,
      async () => {
        hideConfirm(); setIsSaving(true);
        try {
          const { error } = await supabase.from('restaurants').update({ plan_id: newPlanId, plan_override_by_admin: true }).eq('id', restaurantId);
          if (error) { showToast('Errore: ' + error.message, 'error'); }
          else {
            setRestaurants(restaurants.map(r => r.id === restaurantId ? { ...r, plan_id: newPlanId } : r));
            showToast(`Piano cambiato in "${planLabel}"!`, 'success');
          }
        } catch (error) { showToast('Errore cambio piano', 'error'); }
        setIsSaving(false);
      }
    );
  };

  const openEditModal = (restaurant) => { setEditingRestaurant({ ...restaurant }); setShowEditModal(true); };

  const saveRestaurantEdit = async () => {
    if (!editingRestaurant) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('restaurants').update({
        name: editingRestaurant.name, city: editingRestaurant.city,
        whatsapp_number: editingRestaurant.whatsapp_number, email: editingRestaurant.email,
        phone_manager1: editingRestaurant.phone_manager1 || null,
        phone_manager1_label: editingRestaurant.phone_manager1_label || 'Responsabile',
        show_phone_manager1: editingRestaurant.show_phone_manager1 || false,
        phone_manager2: editingRestaurant.phone_manager2 || null,
        phone_manager2_label: editingRestaurant.phone_manager2_label || 'Vice Responsabile',
        show_phone_manager2: editingRestaurant.show_phone_manager2 || false,
        phone_landline: editingRestaurant.phone_landline || null,
        phone_landline_label: editingRestaurant.phone_landline_label || 'Fisso Locale',
        show_phone_landline: editingRestaurant.show_phone_landline || false,
        website: editingRestaurant.website || null, show_website: editingRestaurant.show_website || false,
        wechat_id: editingRestaurant.wechat_id || null, show_wechat: editingRestaurant.show_wechat || false
      }).eq('id', editingRestaurant.id);
      if (error) { showToast('Errore: ' + error.message, 'error'); }
      else {
        setRestaurants(restaurants.map(r => r.id === editingRestaurant.id ? { ...r, ...editingRestaurant } : r));
        showToast('Ristorante aggiornato!', 'success');
        setShowEditModal(false); setEditingRestaurant(null);
      }
    } catch (error) { showToast('Errore salvataggio', 'error'); }
    setIsSaving(false);
  };

  const handleReferralConfigChange = (key, value) => { setEditedReferralConfig({ ...editedReferralConfig, [key]: value }); };

  const saveReferralConfig = async () => {
    const changes = [];
    referralConfig.forEach(config => {
      if (editedReferralConfig[config.key] !== config.value) {
        changes.push({ key: config.key, oldValue: config.value, newValue: editedReferralConfig[config.key] });
      }
    });
    if (changes.length === 0) { showToast('Nessuna modifica da salvare', 'error'); return; }
    const changesText = changes.map(c => `• ${c.key}: ${c.oldValue} → ${c.newValue}`).join('\n');
    showConfirm('⚠️ Conferma Salvataggio', `Vuoi salvare queste modifiche?\n\n${changesText}`,
      async () => {
        hideConfirm(); setIsSaving(true);
        try {
          for (const change of changes) {
            const { error } = await supabase.from('referral_config').update({ 
              value: change.newValue, updated_at: new Date().toISOString(), updated_by: SUPER_ADMIN_EMAIL 
            }).eq('key', change.key);
            if (error) { showToast('Errore: ' + error.message, 'error'); setIsSaving(false); return; }
          }
          setReferralConfig(referralConfig.map(c => ({ ...c, value: editedReferralConfig[c.key] })));
          showToast(`${changes.length} configurazione/i salvate!`, 'success');
        } catch (error) { showToast('Errore salvataggio', 'error'); }
        setIsSaving(false);
      }
    );
  };

  const hasUnsavedChanges = referralConfig.some(c => editedReferralConfig[c.key] !== c.value);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⚡</div>
            <h1 className="text-3xl font-bold text-white mb-2">Ordinlampo</h1>
            <p className="text-purple-200">Super Admin Panel</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm mb-2">Email</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="ordini-lampo@proton.me" />
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Password</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="••••••••••••" />
            </div>
            {loginError && <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-200 text-sm">{loginError}</div>}
            <button type="submit" className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-[1.02]">Accedi</button>
          </form>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚡</div>
          <p className="text-purple-200 text-lg">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {isSaving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-slate-800 rounded-2xl p-6 flex items-center gap-4 border border-purple-500/50">
            <div className="animate-spin text-4xl">⚡</div>
            <span className="text-lg font-semibold">Salvataggio...</span>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span className="text-2xl">{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-yellow-500/50">
            <h3 className="text-xl font-bold mb-4 text-yellow-400">{confirmDialog.title}</h3>
            <p className="text-slate-300 mb-6 whitespace-pre-line">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={hideConfirm} className="flex-1 px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition font-semibold">❌ Annulla</button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold">✅ Conferma</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h1 className="text-xl font-bold">Ordinlampo</h1>
              <p className="text-xs text-purple-300">Super Admin Panel v4</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{SUPER_ADMIN_EMAIL}</span>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition">Esci</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'restaurants', label: '🏪 Ristoranti' },
            { id: 'referral', label: '🎁 Referral' },
            { id: 'notifications', label: '🔔 Notifiche' },
            { id: 'logs', label: '📋 Log Azioni' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{tab.label}</button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-6 border border-green-500/30">
                <p className="text-green-300 text-sm mb-1">Ristoranti Attivi</p>
                <p className="text-4xl font-bold text-white">{stats.activeRestaurants}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-6 border border-blue-500/30">
                <p className="text-blue-300 text-sm mb-1">Ordini Questo Mese</p>
                <p className="text-4xl font-bold text-white">{stats.totalOrdersMonth}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-6 border border-purple-500/30">
                <p className="text-purple-300 text-sm mb-1">Incasso Mese</p>
                <p className="text-4xl font-bold text-white">€{stats.totalRevenueMonth.toFixed(0)}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-2xl p-6 border border-yellow-500/30">
                <p className="text-yellow-300 text-sm mb-1">Fee da Incassare</p>
                <p className="text-4xl font-bold text-white">€{stats.totalFeeDueMonth.toFixed(2)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">MRR Stimato</p>
                <p className="text-3xl font-bold text-white">€{stats.mrrEstimate.toFixed(0)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Piano Normal</p>
                <p className="text-3xl font-bold text-white">{stats.normalPlanCount} <span className="text-lg text-slate-500">× €0.60</span></p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Piano Referral</p>
                <p className="text-3xl font-bold text-white">{stats.referralPlanCount} <span className="text-lg text-slate-500">× €0.90</span></p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Sospesi / Parcheggiati</p>
                <p className="text-3xl font-bold text-white"><span className="text-orange-400">{stats.suspendedRestaurants}</span> / <span className="text-red-400">{stats.parkedRestaurants}</span></p>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold mb-4">⚡ Azioni Rapide</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => { setActiveTab('restaurants'); setShowNewRestaurantForm(true); }} className="px-4 py-3 bg-blue-600/20 text-blue-300 rounded-xl hover:bg-blue-600/30 transition font-semibold">+ Nuovo Ristorante</button>
                <button onClick={() => setActiveTab('referral')} className="px-4 py-3 bg-green-600/20 text-green-300 rounded-xl hover:bg-green-600/30 transition">⚙️ Config Referral</button>
                <button onClick={() => setActiveTab('notifications')} className="px-4 py-3 bg-yellow-600/20 text-yellow-300 rounded-xl hover:bg-yellow-600/30 transition">🔔 {notifications.length} Notifiche</button>
                <button onClick={loadAllData} className="px-4 py-3 bg-purple-600/20 text-purple-300 rounded-xl hover:bg-purple-600/30 transition">🔄 Ricarica Dati</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">🏪 Gestione Ristoranti</h2>
              <button onClick={() => setShowNewRestaurantForm(true)} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold">+ Nuovo Ristorante</button>
            </div>

            {showNewRestaurantForm && (
              <div className="bg-green-600/10 border border-green-500/50 rounded-2xl p-6 mb-4">
                <h3 className="text-lg font-bold mb-4 text-green-300">➕ Crea Nuovo Ristorante</h3>
                <p className="text-sm text-slate-400 mb-2 font-semibold">📋 Dati Base</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div><label className="block text-sm text-slate-400 mb-1">Nome Ristorante *</label><input type="text" value={newRestaurant.name} onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Es: Sushi Tokyo" /></div>
                  <div><label className="block text-sm text-slate-400 mb-1">Città</label><input type="text" value={newRestaurant.city} onChange={(e) => setNewRestaurant({ ...newRestaurant, city: e.target.value })} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Es: Milano" /></div>
                  <div><label className="block text-sm text-slate-400 mb-1">📱 WhatsApp *</label><input type="text" value={newRestaurant.whatsapp_number} onChange={(e) => setNewRestaurant({ ...newRestaurant, whatsapp_number: e.target.value })} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Es: 393401234567" /></div>
                  <div><label className="block text-sm text-slate-400 mb-1">✉️ Email</label><input type="email" value={newRestaurant.email} onChange={(e) => setNewRestaurant({ ...newRestaurant, email: e.target.value })} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Es: info@sushi.it" /></div>
                  <div><label className="block text-sm text-slate-400 mb-1">📋 Piano</label><select value={newRestaurant.plan_id} onChange={(e) => setNewRestaurant({ ...newRestaurant, plan_id: e.target.value })} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600"><option value="normal">📦 Normal €0.60/ordine</option><option value="referral_service">🎁 Referral €0.90/ordine</option></select></div>
                </div>
                <p className="text-sm text-slate-400 mb-2 font-semibold">📞 Contatti Aggiuntivi</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-700/30 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-300">📞 Telefono 1</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={newRestaurant.show_phone_manager1} onChange={(e) => setNewRestaurant({ ...newRestaurant, show_phone_manager1: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={newRestaurant.phone_manager1_label} onChange={(e) => setNewRestaurant({ ...newRestaurant, phone_manager1_label: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm mb-1 border border-slate-500" placeholder="Etichetta" /><input type="text" value={newRestaurant.phone_manager1} onChange={(e) => setNewRestaurant({ ...newRestaurant, phone_manager1: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-slate-500" placeholder="Numero" /></div>
                  <div className="bg-slate-700/30 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-300">📞 Telefono 2</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={newRestaurant.show_phone_manager2} onChange={(e) => setNewRestaurant({ ...newRestaurant, show_phone_manager2: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={newRestaurant.phone_manager2_label} onChange={(e) => setNewRestaurant({ ...newRestaurant, phone_manager2_label: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm mb-1 border border-slate-500" placeholder="Etichetta" /><input type="text" value={newRestaurant.phone_manager2} onChange={(e) => setNewRestaurant({ ...newRestaurant, phone_manager2: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-slate-500" placeholder="Numero" /></div>
                  <div className="bg-slate-700/30 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-300">☎️ Fisso</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={newRestaurant.show_phone_landline} onChange={(e) => setNewRestaurant({ ...newRestaurant, show_phone_landline: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={newRestaurant.phone_landline_label} onChange={(e) => setNewRestaurant({ ...newRestaurant, phone_landline_label: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm mb-1 border border-slate-500" placeholder="Etichetta" /><input type="text" value={newRestaurant.phone_landline} onChange={(e) => setNewRestaurant({ ...newRestaurant, phone_landline: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-slate-500" placeholder="Numero" /></div>
                  <div className="bg-slate-700/30 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-300">🌐 Sito Web</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={newRestaurant.show_website} onChange={(e) => setNewRestaurant({ ...newRestaurant, show_website: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={newRestaurant.website} onChange={(e) => setNewRestaurant({ ...newRestaurant, website: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-slate-500 mt-6" placeholder="www.sito.it" /></div>
                  <div className="bg-green-700/20 rounded-lg p-3 border border-green-500/30"><div className="flex items-center justify-between mb-2"><label className="text-sm text-green-300">💬 WeChat</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={newRestaurant.show_wechat} onChange={(e) => setNewRestaurant({ ...newRestaurant, show_wechat: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={newRestaurant.wechat_id} onChange={(e) => setNewRestaurant({ ...newRestaurant, wechat_id: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-green-500/50 mt-6" placeholder="ID WeChat" /></div>
                </div>
                <div className="flex gap-3"><button onClick={() => setShowNewRestaurantForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition">❌ Annulla</button><button onClick={createNewRestaurant} className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold">✅ Crea Ristorante</button></div>
              </div>
            )}

            {restaurants.map(restaurant => (
              <div key={restaurant.id} className={`bg-slate-800/50 rounded-2xl p-6 border transition-all hover:border-purple-500/50 ${restaurant.account_status === 'suspended' ? 'border-orange-500/50' : restaurant.account_status === 'parked' ? 'border-red-500/50' : 'border-slate-700'}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 onClick={() => openEditModal(restaurant)} className="text-xl font-bold cursor-pointer hover:text-purple-400 transition-colors" title="Clicca per modificare">{restaurant.name}</h3>
                    <button onClick={() => openEditModal(restaurant)} className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded-lg hover:bg-purple-600/50 transition text-xs font-semibold">✏️ Modifica</button>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${restaurant.account_status === 'suspended' ? 'bg-orange-600/30 text-orange-300' : restaurant.account_status === 'parked' ? 'bg-red-600/30 text-red-300' : 'bg-green-600/30 text-green-300'}`}>{restaurant.account_status === 'suspended' ? '⏸️ SOSPESO' : restaurant.account_status === 'parked' ? '🅿️ PARCHEGGIATO' : '✅ ATTIVO'}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                    <span>📍 {restaurant.city || 'N/A'}</span>
                    <span>📱 WA: {restaurant.whatsapp_number || 'N/A'}</span>
                    <span className="text-yellow-300">👤 {restaurant.phone_manager1_label || 'Responsabile'}: {restaurant.phone_manager1 || 'N/A'}</span>
                    {restaurant.show_phone_manager2 && restaurant.phone_manager2 && <span>📞 {restaurant.phone_manager2_label || 'Vice'}: {restaurant.phone_manager2}</span>}
                    {restaurant.show_phone_landline && restaurant.phone_landline && <span>☎️ {restaurant.phone_landline_label || 'Fisso'}: {restaurant.phone_landline}</span>}
                    {restaurant.show_website && restaurant.website && <a href={restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">🌐 Sito</a>}
                    {restaurant.show_wechat && restaurant.wechat_id && <span className="text-green-400">💬 WeChat: {restaurant.wechat_id}</span>}
                    {restaurant.email && <span>✉️ {restaurant.email}</span>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-blue-300">📦 {restaurant.orders_count_month || 0} ordini/mese</span>
                    <span className="text-green-300">💰 €{(restaurant.revenue_month || 0).toFixed(2)} incasso</span>
                    <span className="text-yellow-300">📋 €{(restaurant.fee_due_month || 0).toFixed(2)} fee</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400 font-semibold">📋 Piano:</span>
                      <select value={restaurant.plan_id || 'normal'} onChange={(e) => updateRestaurantPlan(restaurant.id, e.target.value)} className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 cursor-pointer"><option value="normal">📦 Normal €0.60</option><option value="referral_service">🎁 Referral €0.90</option></select>
                    </div>
                    <div className="flex gap-2 ml-auto">
                      {(restaurant.account_status === 'suspended' || restaurant.account_status === 'parked') && <button onClick={() => showConfirm('✅ Riattiva', `Vuoi riattivare "${restaurant.name}"?`, () => { hideConfirm(); updateRestaurantStatus(restaurant.id, 'active'); })} className="px-4 py-2 bg-green-600/30 text-green-300 rounded-lg hover:bg-green-600/50 transition text-sm font-semibold">✅ Riattiva</button>}
                      {restaurant.account_status !== 'suspended' && <button onClick={() => { setSelectedRestaurant(restaurant); setModalType('suspend'); setShowModal(true); }} className="px-4 py-2 bg-orange-600/30 text-orange-300 rounded-lg hover:bg-orange-600/50 transition text-sm font-semibold">⏸️ Sospendi</button>}
                      {restaurant.account_status !== 'parked' && <button onClick={() => { setSelectedRestaurant(restaurant); setModalType('park'); setShowModal(true); }} className="px-4 py-2 bg-red-600/30 text-red-300 rounded-lg hover:bg-red-600/50 transition text-sm font-semibold">🅿️ Parcheggia</button>}
                    </div>
                  </div>
                  {restaurant.suspended_reason && <div className="p-3 bg-orange-600/10 rounded-lg border border-orange-500/30"><p className="text-orange-300 text-sm"><strong>⚠️ Motivo:</strong> {restaurant.suspended_reason}</p></div>}
                  {restaurant.parked_until && <div className="p-3 bg-red-600/10 rounded-lg border border-red-500/30"><p className="text-red-300 text-sm"><strong>🗑️ Cancellazione:</strong> {new Date(restaurant.parked_until).toLocaleDateString('it-IT')}</p></div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'referral' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">🎁 Configurazione Referral</h2>{hasUnsavedChanges && <span className="text-yellow-400 text-sm animate-pulse">⚠️ Modifiche non salvate</span>}</div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">💰 Parametri</h3><button onClick={saveReferralConfig} disabled={!hasUnsavedChanges} className={`px-6 py-2 rounded-xl font-semibold transition ${hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>💾 Salva</button></div>
              {referralConfig.length === 0 ? <p className="text-slate-400">Nessuna configurazione</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {referralConfig.map(config => (
                    <div key={config.key} className="bg-slate-700/50 rounded-xl p-4">
                      <label className="block text-slate-300 text-sm mb-2 font-semibold">{config.description || config.key}</label>
                      <div className="flex items-center gap-2">
                        {config.data_type === 'number' && <span className="text-slate-400">€</span>}
                        <input type={config.data_type === 'number' ? 'number' : 'text'} step="0.10" value={editedReferralConfig[config.key] || ''} onChange={(e) => handleReferralConfigChange(config.key, e.target.value)} className={`flex-1 px-3 py-2 bg-slate-600 rounded-lg text-white border ${editedReferralConfig[config.key] !== config.value ? 'border-yellow-500' : 'border-slate-500'}`} />
                        {editedReferralConfig[config.key] !== config.value && <span className="text-yellow-400 text-xs">modificato</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-6 border border-purple-500/30">
              <h3 className="text-lg font-bold mb-4">📊 Strategia Attuale</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div><p className="text-purple-300 text-sm">Sconto Benvenuto</p><p className="text-3xl font-bold">€3.00</p></div>
                <div><p className="text-purple-300 text-sm">Commissione Referrer</p><p className="text-3xl font-bold">€0.50 <span className="text-lg">lifetime</span></p></div>
                <div><p className="text-purple-300 text-sm">Ordine Minimo</p><p className="text-3xl font-bold">€15.00</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">🔔 Notifiche Pendenti</h2>
            {notifications.length === 0 ? <div className="bg-slate-800/50 rounded-2xl p-12 border border-slate-700 text-center"><p className="text-6xl mb-4">✅</p><p className="text-slate-400">Nessuna notifica pendente</p></div> : notifications.map(notif => (
              <div key={notif.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <span className={`px-2 py-1 rounded text-xs font-bold ${notif.notification_type?.includes('warning') ? 'bg-yellow-600/30 text-yellow-300' : 'bg-blue-600/30 text-blue-300'}`}>{notif.notification_type}</span>
                <h4 className="font-bold mt-2">{notif.title}</h4>
                <p className="text-slate-400 text-sm">{notif.message}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">📋 Log Azioni</h2>
            {statusLogs.length === 0 ? <div className="bg-slate-800/50 rounded-2xl p-12 border border-slate-700 text-center"><p className="text-6xl mb-4">📝</p><p className="text-slate-400">Nessun log</p></div> : (
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50"><tr><th className="px-4 py-3 text-left text-sm">Data</th><th className="px-4 py-3 text-left text-sm">Cambio</th><th className="px-4 py-3 text-left text-sm">Motivo</th><th className="px-4 py-3 text-left text-sm">Da</th></tr></thead>
                  <tbody>{statusLogs.map((log, idx) => (<tr key={log.id || idx} className="border-t border-slate-700"><td className="px-4 py-3 text-sm">{new Date(log.created_at).toLocaleDateString('it-IT')}</td><td className="px-4 py-3 text-sm"><span className="text-slate-400">{log.old_status || 'active'}</span> → <span className={log.new_status === 'active' ? 'text-green-400' : log.new_status === 'suspended' ? 'text-orange-400' : 'text-red-400'}>{log.new_status}</span></td><td className="px-4 py-3 text-sm text-slate-400">{log.reason || '-'}</td><td className="px-4 py-3 text-sm text-slate-400">{log.changed_by_email || log.changed_by_type}</td></tr>))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && selectedRestaurant && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold mb-4">{modalType === 'suspend' ? '⏸️ Sospendi' : '🅿️ Parcheggia'} Ristorante</h3>
            <p className="text-slate-300 mb-4">Stai per {modalType === 'suspend' ? 'sospendere' : 'parcheggiare'} <strong className="text-white">{selectedRestaurant.name}</strong></p>
            <div className="mb-4"><label className="block text-slate-300 text-sm mb-2 font-semibold">📝 Motivo (obbligatorio):</label><textarea value={modalReason} onChange={(e) => setModalReason(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600" placeholder="Es: Mancato pagamento" /></div>
            {modalType === 'park' && <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-3 mb-4"><p className="text-red-300 text-sm">⚠️ Il parcheggio avvia countdown 3 mesi → cancellazione</p></div>}
            <div className="flex gap-3"><button onClick={() => { setShowModal(false); setModalReason(''); }} className="flex-1 px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition font-semibold">❌ Annulla</button><button onClick={() => { if (!modalReason.trim()) { showToast('Inserisci motivo!', 'error'); return; } updateRestaurantStatus(selectedRestaurant.id, modalType === 'suspend' ? 'suspended' : 'parked', modalReason); }} className={`flex-1 px-4 py-3 rounded-xl font-bold transition ${modalType === 'suspend' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}>✅ Conferma</button></div>
          </div>
        </div>
      )}

      {showEditModal && editingRestaurant && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full border border-purple-500/50 my-8">
            <h3 className="text-xl font-bold mb-4 text-purple-400">✏️ Modifica Ristorante</h3>
            <p className="text-sm text-slate-400 mb-2 font-semibold">📋 Dati Base</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div><label className="block text-sm text-slate-400 mb-1">Nome</label><input type="text" value={editingRestaurant.name || ''} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Città</label><input type="text" value={editingRestaurant.city || ''} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, city: e.target.value })} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">📱 WhatsApp</label><input type="text" value={editingRestaurant.whatsapp_number || ''} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, whatsapp_number: e.target.value })} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">✉️ Email</label><input type="email" value={editingRestaurant.email || ''} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, email: e.target.value })} className="w-full px-3 py-2 bg-slate-700 rounded-lg text-white border border-slate-600" /></div>
            </div>
            <p className="text-sm text-slate-400 mb-2 font-semibold">📞 Contatti</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/30 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-300">📞 Tel 1</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={editingRestaurant.show_phone_manager1 || false} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, show_phone_manager1: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={editingRestaurant.phone_manager1_label || 'Responsabile'} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phone_manager1_label: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm mb-1 border border-slate-500" /><input type="text" value={editingRestaurant.phone_manager1 || ''} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phone_manager1: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-slate-500" /></div>
              <div className="bg-slate-700/30 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-300">📞 Tel 2</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={editingRestaurant.show_phone_manager2 || false} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, show_phone_manager2: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={editingRestaurant.phone_manager2_label || 'Vice'} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phone_manager2_label: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm mb-1 border border-slate-500" /><input type="text" value={editingRestaurant.phone_manager2 || ''} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phone_manager2: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-slate-500" /></div>
              <div className="bg-slate-700/30 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-300">☎️ Fisso</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={editingRestaurant.show_phone_landline || false} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, show_phone_landline: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={editingRestaurant.phone_landline_label || 'Fisso'} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phone_landline_label: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm mb-1 border border-slate-500" /><input type="text" value={editingRestaurant.phone_landline || ''} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phone_landline: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-slate-500" /></div>
              <div className="bg-slate-700/30 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-300">🌐 Sito</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={editingRestaurant.show_website || false} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, show_website: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={editingRestaurant.website || ''} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, website: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-slate-500 mt-6" /></div>
              <div className="bg-green-700/20 rounded-lg p-3 border border-green-500/30"><div className="flex items-center justify-between mb-2"><label className="text-sm text-green-300">💬 WeChat</label><label className="flex items-center gap-2 text-xs"><span className="text-slate-500">Visibile</span><input type="checkbox" checked={editingRestaurant.show_wechat || false} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, show_wechat: e.target.checked })} className="w-5 h-5 rounded cursor-pointer" /></label></div><input type="text" value={editingRestaurant.wechat_id || ''} onChange={(e) => setEditingRestaurant({ ...editingRestaurant, wechat_id: e.target.value })} className="w-full px-2 py-1 bg-slate-600 rounded text-white text-sm border border-green-500/50 mt-6" /></div>
            </div>
            <div className="flex gap-3"><button onClick={() => { setShowEditModal(false); setEditingRestaurant(null); }} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition">❌ Annulla</button><button onClick={saveRestaurantEdit} className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-semibold">💾 Salva</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
