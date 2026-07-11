'use client';

import { useState, useEffect, useMemo, useRef, Dispatch, SetStateAction } from 'react';
import {
  Coffee, LayoutDashboard, Package, ArrowLeftRight, Tags, BarChart3, Users, Settings,
  Menu, Search, Sun, Moon, Bell, Plus, TriangleAlert, Wallet, Receipt, TrendingUp,
  Download, Eye, Trash2, X, ImagePlus, Upload, FileDown, UserPlus, Pencil,
  PackageSearch, ArrowDownToLine, ArrowUpFromLine, Check, LucideIcon,
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
  ChartData, ChartOptions,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

/* ---------------- TYPES ---------------- */
type CategoryName = 'Coffee Beans' | 'Milk & Dairy' | 'Syrups & Sauces' | 'Pastries' | 'Cups & Supplies';

interface Product {
  id: number;
  name: string;
  sku: string;
  category: CategoryName | string;
  stock: number;
  price: number;
  threshold: number;
}

type ProductStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

interface Transaction {
  product: string;
  type: 'IN' | 'OUT';
  qty: number;
  note: string;
  by: string;
  time: string;
}

interface Toast {
  id: number;
  title: string;
  desc: string;
}

type ModalType = 'cat' | 'sup' | 'invite' | 'view';

interface Modal {
  type: ModalType;
  data?: Product;
}

type View = 'dashboard' | 'products' | 'transactions' | 'categories' | 'reports' | 'team' | 'settings';

interface NewProductForm {
  name: string;
  sku: string;
  category: CategoryName | string;
  stock: number;
  price: number;
  threshold: number;
}

interface IoForm {
  inProduct: string;
  inQty: number | string;
  inSupplier: string;
  inNote: string;
  outProduct: string;
  outQty: number | string;
  outReason: string;
  outNote: string;
}

type SettingsTab = 'profile' | 'prefs';
type CsTab = 'cat' | 'sup';
type Range = 7 | 30;

interface ModalFormValues {
  name?: string;
  email?: string;
  [key: string]: string | undefined;
}

/* ---------------- MOCK DATA ---------------- */
const CATS: CategoryName[] = ['Coffee Beans', 'Milk & Dairy', 'Syrups & Sauces', 'Pastries', 'Cups & Supplies'];
const NAMES: Record<CategoryName, string[]> = {
  'Coffee Beans': ['Arabica Beans 1kg', 'Robusta Beans 1kg', 'Espresso Blend 1kg', 'Decaf Beans 500g', 'Single Origin Benguet', 'Colombian Supremo 1kg', 'French Roast 1kg', 'Cold Brew Grind 1kg'],
  'Milk & Dairy': ['Fresh Whole Milk 1L', 'Oat Milk 1L', 'Almond Milk 1L', 'Soy Milk 1L', 'Heavy Cream 500ml', 'Condensed Milk 300ml', 'Whipped Cream Can', 'Non-Dairy Creamer'],
  'Syrups & Sauces': ['Vanilla Syrup 750ml', 'Caramel Syrup 750ml', 'Hazelnut Syrup 750ml', 'Chocolate Sauce 750ml', 'Matcha Powder 500g', 'Salted Caramel Syrup', 'Cinnamon Syrup 750ml', 'Strawberry Puree 1L'],
  Pastries: ['Butter Croissant', 'Chocolate Muffin', 'Cinnamon Roll', 'Blueberry Scone', 'Banana Bread Slice', 'Ensaymada', 'Cheese Danish', 'Cookies Assorted Box'],
  'Cups & Supplies': ['12oz Paper Cups (50pc)', '16oz Paper Cups (50pc)', 'Cup Lids (100pc)', 'Paper Straws (100pc)', 'Coffee Sleeves (100pc)', 'Take-Out Bags (50pc)', 'Stirrers (200pc)', 'Napkins Pack'],
};
const NAV_TITLES: Record<View, string> = {
  dashboard: 'Dashboard', products: 'Products', transactions: 'Stock In / Out', categories: 'Categories & Suppliers', reports: 'Reports', team: 'Team', settings: 'Settings',
};

function makeInitialProducts(): { list: Product[]; nextId: number } {
  let idc = 1;
  const list: Product[] = [];
  CATS.forEach((cat) =>
    NAMES[cat].forEach((n) => {
      const stock = [0, 3, 8, 12, 22, 45, 60, 90][Math.floor(Math.random() * 8)];
      list.push({
        id: idc, name: n, sku: cat.slice(0, 3).toUpperCase() + '-' + String(1000 + idc + 1),
        category: cat, stock, price: Math.floor(Math.random() * 900) + 40, threshold: 15,
      });
      idc++;
    })
  );
  return { list, nextId: idc };
}
const statusOf = (p: Product): ProductStatus => (p.stock === 0 ? 'Out of Stock' : p.stock <= p.threshold ? 'Low Stock' : 'In Stock');
const statusStyle: Record<ProductStatus, string> = {
  'In Stock': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  'Low Stock': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  'Out of Stock': 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
};

export default function InventoryApp() {
  /* ---------------- CORE STATE ---------------- */
  const [booted, setBooted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<View>('dashboard');

  const [products, setProducts] = useState<Product[]>([]);
  const idRef = useRef(1);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { product: 'Fresh Whole Milk 1L', type: 'IN', qty: 100, note: 'Weekly dairy delivery', by: 'Grace M.', time: '9:14 AM' },
    { product: 'Arabica Beans 1kg', type: 'OUT', qty: 2, note: 'Sale', by: 'Miko T.', time: '9:02 AM' },
    { product: '16oz Paper Cups (50pc)', type: 'OUT', qty: 8, note: 'Sale', by: 'Angela R.', time: '8:47 AM' },
    { product: 'Butter Croissant', type: 'IN', qty: 24, note: 'Bakery delivery', by: 'Grace M.', time: '8:30 AM' },
    { product: 'Vanilla Syrup 750ml', type: 'OUT', qty: 1, note: 'Sale', by: 'Miko T.', time: '8:12 AM' },
  ]);
  const [flashRow, setFlashRow] = useState<number | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [csTab, setCsTab] = useState<CsTab>('cat');
  const [range, setRange] = useState<Range>(7);

  const [newProduct, setNewProduct] = useState<NewProductForm>({ name: '', sku: '', category: CATS[0], stock: 0, price: 0, threshold: 15 });
  const [ioForm, setIoForm] = useState<IoForm>({
    inProduct: '', inQty: 20, inSupplier: 'Batangas Coffee Roasters', inNote: '',
    outProduct: '', outQty: 5, outReason: 'Sale', outNote: '',
  });

  /* ---------------- INIT (client-only, mirrors DOMContentLoaded) ---------------- */
  useEffect(() => {
    const { list, nextId } = makeInitialProducts();
    setProducts(list);
    idRef.current = nextId;
    const t = setTimeout(() => setBooted(true), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (products.length && !ioForm.inProduct) {
      setIoForm((f) => ({ ...f, inProduct: products[0].name, outProduct: products[0].name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  /* ---------------- TOASTS ---------------- */
  function pushToast(title: string, desc: string) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, title, desc }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }

  /* ---------------- AUTH ---------------- */
  function login() {
    setLoggedIn(true);
    setView('dashboard');
    pushToast('Welcome back, User!', 'You have 5 low-stock items to review.');
  }
  function logout() {
    setLoggedIn(false);
  }

  /* ---------------- PRODUCTS ---------------- */
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchQ = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchC = !catFilter || p.category === catFilter;
      const matchS = !statusFilter || statusOf(p) === statusFilter;
      return matchQ && matchC && matchS;
    });
  }, [products, search, catFilter, statusFilter]);

  const lowStock = useMemo(
    () => [...products].filter((p) => p.stock <= p.threshold).sort((a, b) => a.stock - b.stock).slice(0, 5),
    [products]
  );

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(filteredProducts.map((p) => p.id)) : new Set());
  }
  function toggleOne(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function bulkDelete() {
    setProducts((ps) => ps.filter((p) => !selected.has(p.id)));
    pushToast('Products deleted', selected.size + ' item(s) removed from your catalog.');
    setSelected(new Set());
  }
  function deleteProduct(id: number) {
    setProducts((ps) => ps.filter((p) => p.id !== id));
    pushToast('Product deleted', 'The item was removed from your catalog.');
  }
  function clearProductFilters() {
    setSearch('');
    setCatFilter('');
    setStatusFilter('');
  }

  /* ---------------- ADD PRODUCT DRAWER ---------------- */
  function openDrawer() {
    setNewProduct({ name: '', sku: genSkuValue(CATS[0]), category: CATS[0], stock: 0, price: 0, threshold: 15 });
    setDrawerOpen(true);
  }
  function genSkuValue(cat: string) {
    return cat.slice(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
  }
  function saveProduct() {
    const name = newProduct.name.trim();
    if (!name) {
      pushToast('Product name required', 'Please enter a product name before saving.');
      return;
    }
    const p: Product = {
      id: idRef.current++,
      name,
      sku: newProduct.sku || 'SKU-' + idRef.current,
      category: newProduct.category,
      stock: +newProduct.stock || 0,
      price: +newProduct.price || 0,
      threshold: +newProduct.threshold || 15,
    };
    setProducts((ps) => [p, ...ps]);
    setDrawerOpen(false);
    pushToast('Product added', `${name} was added to your catalog.`);
  }

  /* ---------------- TRANSACTIONS ---------------- */
  function logTransaction(type: 'IN' | 'OUT') {
    const pname = type === 'IN' ? ioForm.inProduct : ioForm.outProduct;
    const qty = +(type === 'IN' ? ioForm.inQty : ioForm.outQty) || 1;
    const note = type === 'IN' ? (ioForm.inNote || 'Restock') : ioForm.outReason;
    setProducts((ps) =>
      ps.map((p) => (p.name === pname ? { ...p, stock: type === 'IN' ? p.stock + qty : Math.max(0, p.stock - qty) } : p))
    );
    setTransactions((tx) => [{ product: pname, type, qty, note, by: 'Grace M.', time: 'Just now' }, ...tx]);
    setFlashRow(Date.now());
    pushToast(type === 'IN' ? 'Stock added' : 'Stock removed', `${qty} units of ${pname} logged.`);
  }

  /* ---------------- MODAL ---------------- */
  function openModal(type: ModalType, data?: Product) {
    setModal({ type, data });
  }
  function closeModal() {
    setModal(null);
  }
  function confirmModal(formValues: ModalFormValues) {
    if (modal?.type === 'cat') pushToast('Category added', (formValues?.name || 'New category') + ' was created.');
    if (modal?.type === 'sup') pushToast('Supplier added', (formValues?.name || 'New supplier') + ' was added.');
    if (modal?.type === 'invite') pushToast('Invite sent', 'An invitation was emailed to ' + (formValues?.email || 'the teammate') + '.');
    closeModal();
  }

  /* ---------------- CHART DATA ---------------- */
  const trendData: ChartData<'line'> = useMemo(() => {
    if (range === 7) {
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          { label: 'Stock In', data: [40, 55, 32, 68, 50, 72, 60], borderColor: '#6f4e37', backgroundColor: 'rgba(111,78,55,.10)', tension: 0.4, fill: true, pointRadius: 3 },
          { label: 'Stock Out', data: [30, 42, 38, 45, 60, 48, 55], borderColor: '#c08552', backgroundColor: 'rgba(192,133,82,.08)', tension: 0.4, fill: true, pointRadius: 3 },
        ],
      };
    }
    return {
      labels: Array.from({ length: 30 }, (_, i) => 'D' + (i + 1)),
      datasets: [
        { label: 'Stock In', data: Array.from({ length: 30 }, () => Math.floor(20 + Math.random() * 60)), borderColor: '#6f4e37', backgroundColor: 'rgba(111,78,55,.10)', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'Stock Out', data: Array.from({ length: 30 }, () => Math.floor(15 + Math.random() * 55)), borderColor: '#c08552', backgroundColor: 'rgba(192,133,82,.08)', tension: 0.4, fill: true, pointRadius: 3 },
      ],
    };
  }, [range]);

  const chartTextColor = dark ? '#a1a1aa' : '#71717a';
  const chartGridColor = dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)';
  const trendOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: { legend: { position: 'top', labels: { boxWidth: 8, usePointStyle: true, color: chartTextColor, font: { size: 11 } } } },
    scales: { x: { grid: { display: false }, ticks: { color: chartTextColor } }, y: { grid: { color: chartGridColor }, ticks: { color: chartTextColor } } },
  };
  const bestsellersData: ChartData<'bar'> = {
    labels: ['Arabica Beans 1kg', 'Fresh Whole Milk 1L', '16oz Paper Cups', 'Vanilla Syrup 750ml', 'Butter Croissant'],
    datasets: [{ label: 'Units sold', data: [142, 118, 96, 84, 71], backgroundColor: '#6f4e37', borderRadius: 6 }],
  };
  const bestsellersOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { grid: { color: chartGridColor }, ticks: { color: chartTextColor } }, y: { grid: { display: false }, ticks: { color: chartTextColor } } },
  };
  const categoryData: ChartData<'doughnut'> = {
    labels: CATS,
    datasets: [{ data: [86, 54, 41, 37, 30], backgroundColor: ['#6f4e37', '#a9746e', '#c08552', '#e8b87b', '#deb887'], borderWidth: 0 }],
  };
  const categoryOptions: ChartOptions<'doughnut'> = { plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, usePointStyle: true, color: chartTextColor, font: { size: 11 } } } } };
  const stockValueData: ChartData<'line'> = {
    labels: ['Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5', 'Wk6'],
    datasets: [{ label: 'Inventory Value (₱)', data: [410000, 432000, 398000, 455000, 470000, 486200], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.08)', fill: true, tension: 0.4 }],
  };
  const stockValueOptions: ChartOptions<'line'> = {
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false }, ticks: { color: chartTextColor } }, y: { grid: { color: chartGridColor }, ticks: { color: chartTextColor } } },
  };

  /* ---------------- RENDER ---------------- */
  if (!booted) return <BootSkeleton />;

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="bg-background text-foreground antialiased min-h-screen">
        {!loggedIn ? (
          <AuthView authTab={authTab} setAuthTab={setAuthTab} onLogin={login} />
        ) : (
          <AppShell
            view={view} setView={setView} dark={dark} setDark={setDark}
            products={products} filteredProducts={filteredProducts} transactions={transactions}
            lowStock={lowStock} search={search} setSearch={setSearch}
            catFilter={catFilter} setCatFilter={setCatFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            selected={selected} toggleAll={toggleAll} toggleOne={toggleOne} bulkDelete={bulkDelete}
            deleteProduct={deleteProduct} clearProductFilters={clearProductFilters}
            openDrawer={openDrawer} openModal={openModal} onLogout={logout}
            settingsTab={settingsTab} setSettingsTab={setSettingsTab} csTab={csTab} setCsTab={setCsTab}
            range={range} setRange={setRange} trendData={trendData} trendOptions={trendOptions}
            bestsellersData={bestsellersData} bestsellersOptions={bestsellersOptions}
            categoryData={categoryData} categoryOptions={categoryOptions}
            stockValueData={stockValueData} stockValueOptions={stockValueOptions}
            ioForm={ioForm} setIoForm={setIoForm} logTransaction={logTransaction}
            flashRow={flashRow} pushToast={pushToast}
          />
        )}

        {drawerOpen && (
          <AddProductDrawer
            newProduct={newProduct} setNewProduct={setNewProduct}
            onClose={() => setDrawerOpen(false)} onSave={saveProduct}
            regenSku={() => setNewProduct((f) => ({ ...f, sku: genSkuValue(f.category) }))}
          />
        )}

        {modal && <GenericModal modal={modal} transactions={transactions} onClose={closeModal} onConfirm={confirmModal} />}

        <ToastStack toasts={toasts} />
      </div>
    </div>
  );
}

/* ================= SHARED PROP TYPES ================= */
interface AppShellProps {
  view: View;
  setView: Dispatch<SetStateAction<View>>;
  dark: boolean;
  setDark: Dispatch<SetStateAction<boolean>>;
  products: Product[];
  filteredProducts: Product[];
  transactions: Transaction[];
  lowStock: Product[];
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  catFilter: string;
  setCatFilter: Dispatch<SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  selected: Set<number>;
  toggleAll: (checked: boolean) => void;
  toggleOne: (id: number) => void;
  bulkDelete: () => void;
  deleteProduct: (id: number) => void;
  clearProductFilters: () => void;
  openDrawer: () => void;
  openModal: (type: ModalType, data?: Product) => void;
  onLogout: () => void;
  settingsTab: SettingsTab;
  setSettingsTab: Dispatch<SetStateAction<SettingsTab>>;
  csTab: CsTab;
  setCsTab: Dispatch<SetStateAction<CsTab>>;
  range: Range;
  setRange: Dispatch<SetStateAction<Range>>;
  trendData: ChartData<'line'>;
  trendOptions: ChartOptions<'line'>;
  bestsellersData: ChartData<'bar'>;
  bestsellersOptions: ChartOptions<'bar'>;
  categoryData: ChartData<'doughnut'>;
  categoryOptions: ChartOptions<'doughnut'>;
  stockValueData: ChartData<'line'>;
  stockValueOptions: ChartOptions<'line'>;
  ioForm: IoForm;
  setIoForm: Dispatch<SetStateAction<IoForm>>;
  logTransaction: (type: 'IN' | 'OUT') => void;
  flashRow: number | null;
  pushToast: (title: string, desc: string) => void;
}

/* ================= SKELETON ================= */
function BootSkeleton() {
  return (
    <div className="fixed inset-0 z-[100] bg-muted flex">
      <div className="w-60 border-r border-border p-4 space-y-3 hidden md:block">
        <div className="h-8 w-28 skeleton rounded-lg" />
        <div className="pt-6 space-y-2">
          <div className="h-9 w-full skeleton rounded-lg" />
          <div className="h-9 w-full skeleton rounded-lg" />
          <div className="h-9 w-full skeleton rounded-lg" />
          <div className="h-9 w-full skeleton rounded-lg" />
        </div>
      </div>
      <div className="flex-1 p-8 space-y-6">
        <div className="h-7 w-56 skeleton rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 skeleton rounded-xl" /><div className="h-24 skeleton rounded-xl" />
          <div className="h-24 skeleton rounded-xl" /><div className="h-24 skeleton rounded-xl" />
        </div>
        <div className="h-72 skeleton rounded-xl" />
      </div>
    </div>
  );
}

/* ================= AUTH ================= */
interface AuthViewProps {
  authTab: 'login' | 'register';
  setAuthTab: Dispatch<SetStateAction<'login' | 'register'>>;
  onLogin: () => void;
}
function AuthView({ authTab, setAuthTab, onLogin }: AuthViewProps) {
  const isLogin = authTab === 'login';
  return (
    <div className="min-h-screen w-full grid md:grid-cols-2">
      <div className="flex flex-col justify-center px-8 sm:px-16 py-12">
        <div className="max-w-sm w-full mx-auto">
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center"><Coffee className="h-4 w-4 text-primary-foreground" /></div>
            <span className="font-heading font-bold text-lg tracking-tight">BrewStock</span>
          </div>
          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-8 w-fit">
            <button onClick={() => setAuthTab('login')} className={`px-4 py-1.5 text-sm font-medium rounded-md ${isLogin ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Log in</button>
            <button onClick={() => setAuthTab('register')} className={`px-4 py-1.5 text-sm font-medium rounded-md ${!isLogin ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Create account</button>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight mb-1">{isLogin ? 'Welcome back' : 'Set up your café'}</h1>
          <p className="text-sm text-muted-foreground mb-8">{isLogin ? 'Log in to your workspace to keep brewing.' : 'Get your coffee shop running in under a minute.'}</p>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Café name</label>
                <input type="text" placeholder="e.g. Kape Kubo Coffee House" className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <input type="email" defaultValue="owner@kapekubo.ph" className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5"><label className="text-sm font-medium">Password</label><a href="#" className="text-xs text-primary font-medium hover:underline">Forgot password?</a></div>
              <input type="password" defaultValue="password123" className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button onClick={onLogin} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-2.5 rounded-lg transition shadow-sm">Continue</button>
          </div>
          <p className="text-xs text-muted-foreground mt-8 text-center">This is a UI prototype — click Continue to explore the dashboard.</p>
        </div>
      </div>
      <div className="hidden md:flex relative bg-zinc-950 overflow-hidden items-center justify-center p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/70 to-zinc-950 opacity-90" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative text-primary-foreground max-w-md">
          <h2 className="font-heading text-3xl font-bold tracking-tight leading-tight mb-4">Know exactly what&apos;s in your stockroom, down to the last bean.</h2>
          <p className="text-primary-foreground/80 text-sm leading-relaxed">Real-time stock counts, low-stock alerts, and reports that make sense — built for the way small cafés actually run.</p>
          <div className="mt-10 flex items-center gap-4 bg-primary-foreground/10 backdrop-blur rounded-xl p-4 border border-primary-foreground/10">
            <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center font-bold">GM</div>
            <div>
              <p className="text-sm font-medium">&quot;Nakita ko agad kung kulang na sa beans. Wala nang guessing game.&quot;</p>
              <p className="text-xs text-primary-foreground/70 mt-1">Grace M. — Kape Kubo Coffee House, Baguio</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= APP SHELL ================= */
function AppShell(props: AppShellProps) {
  const { view, setView, dark, setDark, onLogout } = props;
  const navItems: { section: string; items: { id: View; label: string; icon: LucideIcon }[] }[] = [
    { section: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
    { section: 'Inventory', items: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'transactions', label: 'Stock In / Out', icon: ArrowLeftRight },
      { id: 'categories', label: 'Categories & Suppliers', icon: Tags },
    ] },
    { section: 'Insights', items: [{ id: 'reports', label: 'Reports', icon: BarChart3 }] },
    { section: 'Workspace', items: [{ id: 'team', label: 'Team', icon: Users }, { id: 'settings', label: 'Settings', icon: Settings }] },
  ];

  return (
    <div className="min-h-screen">
      <div className="flex">
        <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-sidebar-border bg-sidebar">
          <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
            <div className="h-7 w-7 rounded-lg bg-sidebar-primary flex items-center justify-center"><Coffee className="h-4 w-4 text-sidebar-primary-foreground" /></div>
            <span className="font-heading font-bold tracking-tight text-sidebar-foreground">BrewStock</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navItems.map((group) => (
              <div key={group.section}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-1 mt-4 first:mt-0">{group.section}</p>
                {group.items.map(({ id, label, icon: Icon }) => (
                  <a key={id} href="#" data-nav onClick={(e) => { e.preventDefault(); setView(id); }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${view === id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                    <Icon className="h-4 w-4" />{label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer" onClick={() => setView('settings')}>
              <div className="h-8 w-8 rounded-full bg-sidebar-primary/15 text-sidebar-primary flex items-center justify-center text-xs font-bold">KK</div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">Kape Kubo Coffee House</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">Owner plan</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="h-16 sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-6 border-b border-border bg-card/80 backdrop-blur">
            <div className="flex items-center gap-3 min-w-0">
              <button className="md:hidden"><Menu className="h-5 w-5" /></button>
              <h1 className="font-heading font-semibold text-lg tracking-tight truncate">{NAV_TITLES[view] || 'Dashboard'}</h1>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative hidden sm:block">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input placeholder="Search products, SKUs…" className="pl-9 pr-3 py-2 w-56 lg:w-72 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition" />
              </div>
              <button onClick={() => setDark((d) => !d)} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition">
                {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              <button className="relative h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
              </button>
              <button onClick={onLogout} title="Log out" className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">KK</button>
            </div>
          </header>

          <main className="p-4 md:p-6 max-w-[1400px] mx-auto">
            {view === 'dashboard' && <DashboardView {...props} />}
            {view === 'products' && <ProductsView {...props} />}
            {view === 'transactions' && <TransactionsView {...props} />}
            {view === 'categories' && <CategoriesView {...props} />}
            {view === 'reports' && <ReportsView {...props} />}
            {view === 'team' && <TeamView {...props} />}
            {view === 'settings' && <SettingsView {...props} />}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ================= DASHBOARD ================= */
function DashboardView({ products, transactions, lowStock, openDrawer, setView, range, setRange, trendData, trendOptions }: AppShellProps) {
  const totalProducts = products.length;
  const lowCount = products.filter((p) => statusOf(p) === 'Low Stock').length;
  const invValue = products.reduce((s, p) => s + p.stock * p.price, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight">Good morning, User ☕</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s what&apos;s happening in your café today.</p>
        </div>
        <button onClick={openDrawer} className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3.5 py-2 rounded-lg transition shadow-sm"><Plus className="h-4 w-4" />Add Product</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={totalProducts} icon={Package} note="+12 this month" noteColor="text-emerald-600" noteIcon={TrendingUp} />
        <StatCard label="Low Stock Items" value={lowCount} icon={TriangleAlert} note="Needs reordering soon" noteColor="text-amber-600" />
        <StatCard label="Inventory Value" value={`₱${invValue.toLocaleString()}`} icon={Wallet} note="Across all categories" noteColor="text-muted-foreground" />
        <StatCard label="Sales Today" value="₱18,940" icon={Receipt} note="+8.4% vs yesterday" noteColor="text-emerald-600" noteIcon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-semibold text-sm">Stock Movement Trend</h3><p className="text-xs text-muted-foreground">Units moved in vs out</p></div>
            <div className="flex gap-1 bg-muted p-0.5 rounded-lg text-xs">
              <button onClick={() => setRange(7)} className={`px-2.5 py-1 rounded-md font-medium ${range === 7 ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>7D</button>
              <button onClick={() => setRange(30)} className={`px-2.5 py-1 rounded-md font-medium ${range === 30 ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>30D</button>
            </div>
          </div>
          <Line data={trendData} options={trendOptions} height={90} />
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Low Stock Alerts</h3>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">{lowStock.length} items</span>
          </div>
          <div className="space-y-1">
            {lowStock.map((p) => (
              <div key={p.id} onClick={() => setView('products')} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent cursor-pointer transition">
                <div className="flex items-center gap-2.5 min-w-0"><div className="h-7 w-7 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0"><TriangleAlert className="h-3.5 w-3.5 text-amber-600" /></div><span className="text-sm truncate">{p.name}</span></div>
                <span className={`text-xs font-medium ${p.stock === 0 ? 'text-rose-600' : 'text-amber-600'}`}>{p.stock} left</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Recent Transactions</h3>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('transactions'); }} className="text-xs font-medium text-primary hover:underline">View all</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <TxHead />
            <tbody className="divide-y divide-border">
              {transactions.slice(0, 5).map((t, i) => <TxRow key={i} t={t} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  note: string;
  noteColor: string;
  noteIcon?: LucideIcon;
}
function StatCard({ label, value, icon: Icon, note, noteColor, noteIcon: NoteIcon }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition">
      <div className="flex items-center justify-between mb-3"><span className="text-xs font-medium text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className={`text-xs mt-1 flex items-center gap-1 ${noteColor}`}>{NoteIcon && <NoteIcon className="h-3 w-3" />}{note}</p>
    </div>
  );
}

/* ================= PRODUCTS ================= */
function ProductsView({ products, filteredProducts, search, setSearch, catFilter, setCatFilter, statusFilter, setStatusFilter, selected, toggleAll, toggleOne, bulkDelete, deleteProduct, clearProductFilters, openDrawer, openModal, pushToast }: AppShellProps) {
  const allChecked = filteredProducts.length > 0 && filteredProducts.every((p) => selected.has(p.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-heading text-xl font-bold tracking-tight">Products</h2><p className="text-sm text-muted-foreground mt-0.5">Manage your catalog and stock levels.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => pushToast('CSV exported', 'Your product list was downloaded.')} className="flex items-center gap-1.5 border border-border text-sm font-medium px-3 py-2 rounded-lg hover:bg-accent transition"><Download className="h-4 w-4" />Export</button>
          <button onClick={openDrawer} className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3.5 py-2 rounded-lg transition shadow-sm"><Plus className="h-4 w-4" />Add Product</button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or SKU…" className="pl-9 pr-3 py-2 w-full rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-muted text-sm">
            <option value="">All categories</option>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-muted text-sm">
            <option value="">All status</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option>
          </select>
        </div>

        {selected.size > 0 && (
          <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between text-sm">
            <span>{selected.size} selected</span>
            <div className="flex gap-2">
              <button onClick={() => pushToast('Exported selected', 'CSV downloaded for selected rows.')} className="px-2.5 py-1 rounded-md hover:bg-card font-medium">Export</button>
              <button onClick={bulkDelete} className="px-2.5 py-1 rounded-md text-rose-600 hover:bg-card font-medium">Delete</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-4 py-2.5 w-8"><input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} /></th>
                <th className="font-medium px-2 py-2.5">Product</th><th className="font-medium px-2 py-2.5">SKU</th><th className="font-medium px-2 py-2.5">Category</th><th className="font-medium px-2 py-2.5">Stock</th><th className="font-medium px-2 py-2.5">Unit Price</th><th className="font-medium px-2 py-2.5">Status</th><th className="font-medium px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-accent/50 transition">
                  <td className="px-4 py-2.5"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} /></td>
                  <td className="px-2 py-2.5"><div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{p.name.slice(0, 2).toUpperCase()}</div><span className="font-medium">{p.name}</span></div></td>
                  <td className="px-2 py-2.5 text-muted-foreground font-mono text-xs">{p.sku}</td>
                  <td className="px-2 py-2.5 text-muted-foreground">{p.category}</td>
                  <td className="px-2 py-2.5">{p.stock} units</td>
                  <td className="px-2 py-2.5">₱{p.price.toLocaleString()}</td>
                  <td className="px-2 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[statusOf(p)]}`}>{statusOf(p)}</span></td>
                  <td className="px-4 py-2.5 text-right"><div className="flex justify-end gap-2">
                    <button onClick={() => openModal('view', p)} title="View"><Eye className="h-4 w-4 text-muted-foreground hover:text-primary" /></button>
                    <button onClick={() => deleteProduct(p.id)} title="Delete"><Trash2 className="h-4 w-4 text-muted-foreground hover:text-rose-600" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3"><PackageSearch className="h-5 w-5 text-muted-foreground" /></div>
              <p className="font-medium text-sm">No products match your filters</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Try adjusting your search or filters.</p>
              <button onClick={clearProductFilters} className="text-sm font-medium text-primary hover:underline">Clear filters</button>
            </div>
          )}
        </div>
        <div className="px-4 py-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
          <span>Showing {filteredProducts.length} of {products.length} products</span>
          <div className="flex gap-1">
            <button className="h-7 w-7 rounded-md border border-border flex items-center justify-center">‹</button>
            <button className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">1</button>
            <button className="h-7 w-7 rounded-md border border-border flex items-center justify-center">›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= TRANSACTIONS ================= */
function TxHead() {
  return (
    <thead><tr className="text-left text-xs text-muted-foreground border-y border-border">
      <th className="font-medium px-5 py-2.5">Product</th><th className="font-medium px-5 py-2.5">Type</th><th className="font-medium px-5 py-2.5">Qty</th><th className="font-medium px-5 py-2.5">Note</th><th className="font-medium px-5 py-2.5">By</th><th className="font-medium px-5 py-2.5">Time</th>
    </tr></thead>
  );
}
function TxRow({ t, flash }: { t: Transaction; flash?: boolean | null }) {
  return (
    <tr className={flash ? 'row-flash' : ''}>
      <td className="px-5 py-2.5 font-medium">{t.product}</td>
      <td className="px-5 py-2.5">
        {t.type === 'IN'
          ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 w-fit"><ArrowDownToLine className="h-3 w-3" />IN</span>
          : <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 flex items-center gap-1 w-fit"><ArrowUpFromLine className="h-3 w-3" />OUT</span>}
      </td>
      <td className="px-5 py-2.5">{t.qty}</td>
      <td className="px-5 py-2.5 text-muted-foreground">{t.note}</td>
      <td className="px-5 py-2.5 text-muted-foreground">{t.by}</td>
      <td className="px-5 py-2.5 text-muted-foreground">{t.time}</td>
    </tr>
  );
}

function TransactionsView({ products, transactions, ioForm, setIoForm, logTransaction, flashRow }: AppShellProps) {
  return (
    <div className="space-y-5">
      <div><h2 className="font-heading text-xl font-bold tracking-tight">Stock In / Out</h2><p className="text-sm text-muted-foreground mt-0.5">Log incoming and outgoing stock. Updates reflect instantly.</p></div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4"><div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><ArrowDownToLine className="h-4 w-4 text-emerald-600" /></div><h3 className="font-semibold text-sm">Stock In</h3></div>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Product</label>
              <select value={ioForm.inProduct} onChange={(e) => setIoForm((f) => ({ ...f, inProduct: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm">
                {products.map((p) => <option key={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label><input type="number" min="1" value={ioForm.inQty} onChange={(e) => setIoForm((f) => ({ ...f, inQty: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Supplier</label>
                <select value={ioForm.inSupplier} onChange={(e) => setIoForm((f) => ({ ...f, inSupplier: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm">
                  <option>Batangas Coffee Roasters</option><option>Cordillera Dairy Farms</option><option>Manila Bakery Supply Co.</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Note (optional)</label><input value={ioForm.inNote} onChange={(e) => setIoForm((f) => ({ ...f, inNote: e.target.value }))} placeholder="e.g. Weekly bean delivery" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
            <button onClick={() => logTransaction('IN')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-lg transition">Log Stock In</button>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4"><div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center"><ArrowUpFromLine className="h-4 w-4 text-rose-600" /></div><h3 className="font-semibold text-sm">Stock Out</h3></div>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Product</label>
              <select value={ioForm.outProduct} onChange={(e) => setIoForm((f) => ({ ...f, outProduct: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm">
                {products.map((p) => <option key={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label><input type="number" min="1" value={ioForm.outQty} onChange={(e) => setIoForm((f) => ({ ...f, outQty: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
                <select value={ioForm.outReason} onChange={(e) => setIoForm((f) => ({ ...f, outReason: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm">
                  <option>Sale</option><option>Spoiled/Expired</option><option>Return to supplier</option><option>Staff use</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Note (optional)</label><input value={ioForm.outNote} onChange={(e) => setIoForm((f) => ({ ...f, outNote: e.target.value }))} placeholder="e.g. Dine-in order" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
            <button onClick={() => logTransaction('OUT')} className="w-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2.5 rounded-lg transition">Log Stock Out</button>
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between"><h3 className="font-semibold text-sm">Transaction Log</h3><span className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <TxHead />
            <tbody className="divide-y divide-border">
              {transactions.map((t, i) => <TxRow key={i} t={t} flash={i === 0 && !!flashRow} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================= CATEGORIES & SUPPLIERS ================= */
const CATEGORY_ROWS = [
  { name: 'Coffee Beans', count: 86, desc: 'Arabica, robusta, blends, single origin' },
  { name: 'Milk & Dairy', count: 54, desc: 'Fresh milk, creamers, alt-milks' },
  { name: 'Syrups & Sauces', count: 41, desc: 'Flavor syrups, sauces, powders' },
  { name: 'Pastries', count: 37, desc: 'Baked goods and grab-and-go treats' },
  { name: 'Cups & Supplies', count: 30, desc: 'Cups, lids, sleeves, straws' },
];
const SUPPLIER_ROWS = [
  { name: 'Batangas Coffee Roasters', contact: 'Ramon Villar', phone: '0917 234 5678', email: 'ramon@batangasroasters.ph' },
  { name: 'Cordillera Dairy Farms', contact: 'Ella Bautista', phone: '0918 555 2211', email: 'ella@cordilleradairy.ph' },
  { name: 'Manila Bakery Supply Co.', contact: 'Noel Aquino', phone: '0920 887 4433', email: 'noel@manilabakerysupply.ph' },
];

function CategoriesView({ csTab, setCsTab, openModal }: AppShellProps) {
  return (
    <div className="space-y-4">
      <div><h2 className="font-heading text-xl font-bold tracking-tight">Categories &amp; Suppliers</h2><p className="text-sm text-muted-foreground mt-0.5">Organize your catalog and manage vendor contacts.</p></div>
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button onClick={() => setCsTab('cat')} className={`px-4 py-1.5 text-sm font-medium rounded-md ${csTab === 'cat' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Categories</button>
        <button onClick={() => setCsTab('sup')} className={`px-4 py-1.5 text-sm font-medium rounded-md ${csTab === 'sup' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Suppliers</button>
      </div>

      {csTab === 'cat' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border"><span className="text-sm text-muted-foreground">{CATEGORY_ROWS.length} categories</span><button onClick={() => openModal('cat')} className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3 py-1.5 rounded-lg"><Plus className="h-4 w-4" />Add Category</button></div>
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="font-medium px-5 py-2.5">Name</th><th className="font-medium px-5 py-2.5">Products</th><th className="font-medium px-5 py-2.5">Description</th><th className="px-5 py-2.5" /></tr></thead>
            <tbody className="divide-y divide-border">
              {CATEGORY_ROWS.map((c) => (
                <tr key={c.name}><td className="px-5 py-3 font-medium">{c.name}</td><td className="px-5 py-3 text-muted-foreground">{c.count}</td><td className="px-5 py-3 text-muted-foreground">{c.desc}</td><td className="px-5 py-3 text-right"><Pencil className="h-3.5 w-3.5 inline text-muted-foreground cursor-pointer" /></td></tr>
              ))}
            </tbody></table>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border"><span className="text-sm text-muted-foreground">{SUPPLIER_ROWS.length} suppliers</span><button onClick={() => openModal('sup')} className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3 py-1.5 rounded-lg"><Plus className="h-4 w-4" />Add Supplier</button></div>
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="font-medium px-5 py-2.5">Company</th><th className="font-medium px-5 py-2.5">Contact</th><th className="font-medium px-5 py-2.5">Phone</th><th className="font-medium px-5 py-2.5">Email</th><th className="px-5 py-2.5" /></tr></thead>
            <tbody className="divide-y divide-border">
              {SUPPLIER_ROWS.map((s) => (
                <tr key={s.name}><td className="px-5 py-3 font-medium">{s.name}</td><td className="px-5 py-3 text-muted-foreground">{s.contact}</td><td className="px-5 py-3 text-muted-foreground">{s.phone}</td><td className="px-5 py-3 text-muted-foreground">{s.email}</td><td className="px-5 py-3 text-right"><Pencil className="h-3.5 w-3.5 inline text-muted-foreground cursor-pointer" /></td></tr>
              ))}
            </tbody></table>
        </div>
      )}
    </div>
  );
}

/* ================= REPORTS ================= */
function ReportsView({ pushToast, bestsellersData, bestsellersOptions, categoryData, categoryOptions, stockValueData, stockValueOptions }: AppShellProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-heading text-xl font-bold tracking-tight">Reports &amp; Analytics</h2><p className="text-sm text-muted-foreground mt-0.5">Understand trends and make better restocking decisions.</p></div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-lg text-xs">
            <button className="px-2.5 py-1.5 rounded-md bg-card shadow-sm font-medium">7D</button>
            <button className="px-2.5 py-1.5 rounded-md text-muted-foreground font-medium">30D</button>
            <button className="px-2.5 py-1.5 rounded-md text-muted-foreground font-medium">90D</button>
          </div>
          <button onClick={() => pushToast('Report exported', 'CSV file downloaded.')} className="flex items-center gap-1.5 border border-border text-sm font-medium px-3 py-2 rounded-lg hover:bg-accent"><FileDown className="h-4 w-4" />CSV</button>
          <button onClick={() => pushToast('Report exported', 'PDF file downloaded.')} className="flex items-center gap-1.5 border border-border text-sm font-medium px-3 py-2 rounded-lg hover:bg-accent"><FileDown className="h-4 w-4" />PDF</button>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Best-Selling Products</h3>
          <Bar data={bestsellersData} options={bestsellersOptions} height={200} />
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Category Breakdown</h3>
          <Doughnut data={categoryData} options={categoryOptions} height={200} />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4">Stock Value Over Time</h3>
        <Line data={stockValueData} options={stockValueOptions} height={80} />
      </div>
    </div>
  );
}

/* ================= TEAM ================= */
const TEAM_ROWS = [
  { name: 'Grace Mendoza', email: 'owner@kapekubo.ph', role: 'Owner', status: 'Active', initials: 'GM', roleStyle: 'bg-primary/10 text-primary', avatarStyle: 'bg-primary/10 text-primary' },
  { name: 'Miko Torres', email: 'miko@kapekubo.ph', role: 'Barista Lead', status: 'Active', initials: 'MT', roleStyle: 'bg-muted', avatarStyle: 'bg-muted' },
  { name: 'Angela Reyes', email: 'angela@kapekubo.ph', role: 'Barista', status: 'Invited', initials: 'AR', roleStyle: 'bg-muted', avatarStyle: 'bg-muted' },
];
function TeamView({ openModal }: AppShellProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="font-heading text-xl font-bold tracking-tight">Team</h2><p className="text-sm text-muted-foreground mt-0.5">Manage who has access to this workspace.</p></div>
        <button onClick={() => openModal('invite')} className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm"><UserPlus className="h-4 w-4" />Invite Member</button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="font-medium px-5 py-2.5">Member</th><th className="font-medium px-5 py-2.5">Role</th><th className="font-medium px-5 py-2.5">Status</th><th className="px-5 py-2.5" /></tr></thead>
          <tbody className="divide-y divide-border">
            {TEAM_ROWS.map((m) => (
              <tr key={m.email}>
                <td className="px-5 py-3 flex items-center gap-2.5"><div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${m.avatarStyle}`}>{m.initials}</div><div><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div></td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.roleStyle}`}>{m.role}</span></td>
                <td className="px-5 py-3"><span className={`text-xs flex items-center gap-1 ${m.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${m.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{m.status}</span></td>
                <td />
              </tr>
            ))}
          </tbody></table>
      </div>
    </div>
  );
}

/* ================= SETTINGS ================= */
function SettingsView({ settingsTab, setSettingsTab, pushToast, dark, setDark }: AppShellProps) {
  return (
    <div className="space-y-4">
      <div><h2 className="font-heading text-xl font-bold tracking-tight">Settings</h2><p className="text-sm text-muted-foreground mt-0.5">Manage your café profile and preferences.</p></div>
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button onClick={() => setSettingsTab('profile')} className={`px-4 py-1.5 text-sm font-medium rounded-md ${settingsTab === 'profile' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Café Profile</button>
        <button onClick={() => setSettingsTab('prefs')} className={`px-4 py-1.5 text-sm font-medium rounded-md ${settingsTab === 'prefs' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Preferences</button>
      </div>

      {settingsTab === 'profile' ? (
        <div className="bg-card border border-border rounded-xl p-5 max-w-xl space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">Café name</label><input defaultValue="Kape Kubo Coffee House" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Currency</label><select className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm"><option>PHP (₱)</option><option>USD ($)</option></select></div>
            <div><label className="text-sm font-medium mb-1.5 block">Timezone</label><select className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm"><option>Asia/Manila (GMT+8)</option></select></div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Logo</label><div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground hover:border-primary transition cursor-pointer"><Upload className="h-5 w-5 mx-auto mb-2" />Click or drag to upload</div></div>
          <button onClick={() => pushToast('Settings saved', 'Your café profile was updated.')} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg">Save Changes</button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 max-w-xl space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">Low-stock threshold</label><input type="number" defaultValue={15} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /><p className="text-xs text-muted-foreground mt-1">Alert when stock falls below this number.</p></div>
          <div className="flex items-center justify-between py-2"><div><p className="text-sm font-medium">Dark mode</p><p className="text-xs text-muted-foreground">Switch the interface theme.</p></div>
            <button onClick={() => setDark((d) => !d)} className="h-6 w-11 rounded-full bg-primary relative"><span className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform" style={{ transform: dark ? 'translateX(20px)' : 'none' }} /></button>
          </div>
          <div className="flex items-center justify-between py-2"><div><p className="text-sm font-medium">Low-stock email alerts</p><p className="text-xs text-muted-foreground">Get notified when items run low.</p></div><input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" /></div>
          <div className="flex items-center justify-between py-2"><div><p className="text-sm font-medium">Daily sales summary</p><p className="text-xs text-muted-foreground">Email digest every evening.</p></div><input type="checkbox" className="h-4 w-4 accent-primary" /></div>
          <button onClick={() => pushToast('Preferences saved', 'Your settings were updated.')} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg">Save Preferences</button>
        </div>
      )}
    </div>
  );
}

/* ================= ADD PRODUCT DRAWER ================= */
interface AddProductDrawerProps {
  newProduct: NewProductForm;
  setNewProduct: Dispatch<SetStateAction<NewProductForm>>;
  onClose: () => void;
  onSave: () => void;
  regenSku: () => void;
}
function AddProductDrawer({ newProduct, setNewProduct, onClose, onSave, regenSku }: AddProductDrawerProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="drawer open fixed top-0 right-0 h-screen w-full max-w-md bg-card z-50 shadow-2xl border-l border-border flex flex-col">
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <h3 className="font-semibold">Add Product</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">Product image</label><div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground hover:border-primary transition cursor-pointer"><ImagePlus className="h-5 w-5 mx-auto mb-2" />Click or drag an image here</div></div>
          <div><label className="text-sm font-medium mb-1.5 block">Product name</label><input value={newProduct.name} onChange={(e) => setNewProduct((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Arabica Beans 1kg" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">SKU</label><div className="flex gap-2"><input value={newProduct.sku} onChange={(e) => setNewProduct((f) => ({ ...f, sku: e.target.value }))} placeholder="Auto-generated" className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted text-sm" /><button onClick={regenSku} className="px-3 rounded-lg border border-border text-xs font-medium hover:bg-accent">Generate</button></div></div>
          <div><label className="text-sm font-medium mb-1.5 block">Category</label>
            <select value={newProduct.category} onChange={(e) => setNewProduct((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm">
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">Opening stock</label><input type="number" value={newProduct.stock} onChange={(e) => setNewProduct((f) => ({ ...f, stock: +e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Unit price (₱)</label><input type="number" value={newProduct.price} onChange={(e) => setNewProduct((f) => ({ ...f, price: +e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Low-stock threshold</label><input type="number" value={newProduct.threshold} onChange={(e) => setNewProduct((f) => ({ ...f, threshold: +e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
        </div>
        <div className="p-5 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 border border-border text-sm font-medium py-2.5 rounded-lg hover:bg-accent">Cancel</button>
          <button onClick={onSave} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-2.5 rounded-lg">Save Product</button>
        </div>
      </div>
    </>
  );
}

/* ================= GENERIC MODAL ================= */
interface GenericModalProps {
  modal: Modal;
  transactions: Transaction[];
  onClose: () => void;
  onConfirm: (formValues: ModalFormValues) => void;
}
function GenericModal({ modal, transactions, onClose, onConfirm }: GenericModalProps) {
  const [form, setForm] = useState<ModalFormValues>({});
  const titles: Record<ModalType, string> = { cat: 'Add Category', sup: 'Add Supplier', invite: 'Invite Team Member', view: 'Product Details' };
  const { type, data } = modal;

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel bg-card border border-border rounded-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">{titles[type]}</h3><button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button></div>
        <div className="space-y-3">
          {type === 'cat' && (
            <>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Category name</label><input onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Cold Brew Concentrates" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label><input placeholder="Optional" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
            </>
          )}
          {type === 'sup' && (
            <>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Company name</label><input onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Sagada Highland Beans" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Contact person</label><input className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label><input className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
            </>
          )}
          {type === 'invite' && (
            <>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Email address</label><input onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="teammate@cafe.ph" className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label><select className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm"><option>Barista Lead</option><option>Barista</option></select></div>
            </>
          )}
          {type === 'view' && data && (
            <>
              <div className="flex items-center gap-3 mb-2"><div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">{data.name.slice(0, 2).toUpperCase()}</div><div><p className="font-semibold">{data.name}</p><p className="text-xs text-muted-foreground font-mono">{data.sku}</p></div></div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted rounded-lg p-2.5"><p className="text-xs text-muted-foreground">Stock</p><p className="font-medium">{data.stock} units</p></div>
                <div className="bg-muted rounded-lg p-2.5"><p className="text-xs text-muted-foreground">Unit Price</p><p className="font-medium">₱{data.price.toLocaleString()}</p></div>
                <div className="bg-muted rounded-lg p-2.5"><p className="text-xs text-muted-foreground">Category</p><p className="font-medium">{data.category}</p></div>
                <div className="bg-muted rounded-lg p-2.5"><p className="text-xs text-muted-foreground">Status</p><p className="font-medium">{statusOf(data)}</p></div>
              </div>
              <p className="text-xs font-medium text-muted-foreground mt-3 mb-1">Recent stock history</p>
              <div className="text-xs text-muted-foreground space-y-1 max-h-28 overflow-y-auto">
                {transactions.filter((t) => t.product === data.name).slice(0, 4).map((t, i) => (
                  <div key={i} className="flex justify-between border-b border-border py-1"><span>{t.type === 'IN' ? '+' : '-'}{t.qty} · {t.note}</span><span>{t.time}</span></div>
                ))}
                {transactions.filter((t) => t.product === data.name).length === 0 && <p>No recent history.</p>}
              </div>
            </>
          )}
        </div>
        {type !== 'view' && (
          <div className="flex gap-2 mt-5">
            <button onClick={onClose} className="flex-1 border border-border text-sm font-medium py-2 rounded-lg hover:bg-accent">Cancel</button>
            <button onClick={() => onConfirm(form)} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-2 rounded-lg">Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= TOASTS ================= */
function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] space-y-2 w-80">
      {toasts.map((t) => (
        <div key={t.id} className="toast-enter bg-card border border-border rounded-xl shadow-lg p-3.5 flex gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0"><Check className="h-4 w-4 text-emerald-600" /></div>
          <div className="min-w-0"><p className="text-sm font-semibold">{t.title}</p><p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p></div>
        </div>
      ))}
    </div>
  );
}