import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBV_kaqlAtLTBNEcIHpc0rWHTbWXdgsXME",
    authDomain: "store-b5352.firebaseapp.com",
    projectId: "store-b5352",
    storageBucket: "store-b5352.firebasestorage.app",
    messagingSenderId: "994825915869",
    appId: "1:994825915869:web:57e664699a45b3d2fa3a34",
    measurementId: "G-KGZHS02V07"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global State
let products = [];
let categories = [];
let coupons = {};
let orders = [];
const adminUIDs = ["S19VDQs7RqcQvN6jeUGgTBIMWb22"]; // استبدل بمعرف المستخدم الإداري

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

function initAdmin() {
    // Check admin status
    onAuthStateChanged(auth, (user) => {
        if (user && adminUIDs.includes(user.uid)) {
            document.getElementById('admin-container')?.classList.add('active');
            loadAdminData();
        } else {
            // Redirect to index.html with auth modal trigger if not admin
            window.location.href = "index.html?auth=login";
        }
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Form submissions
    const productForm = document.getElementById('product-form');
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);

    const categoryForm = document.getElementById('category-form');
    if (categoryForm) categoryForm.addEventListener('submit', handleCategorySubmit);

    const couponForm = document.getElementById('coupon-form');
    if (couponForm) couponForm.addEventListener('submit', handleCouponSubmit);

    // Global click handler for admin actions
    document.body.addEventListener('click', handleAdminClick);

    // Initialize page navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            showAdminPage(pageId);
        });
    });
}

// Load Data from Firestore
async function loadAdminData() {
    await loadProducts();
    await loadCategories();
    await loadCoupons();
    await loadOrders();
    renderAllAdminContent();
}

async function loadProducts() {
    products = [];
    const querySnapshot = await getDocs(collection(db, "products"));
    querySnapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
    });
}

async function loadCategories() {
    categories = [];
    const querySnapshot = await getDocs(collection(db, "categories"));
    querySnapshot.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() });
    });
}

async function loadCoupons() {
    coupons = {};
    const querySnapshot = await getDocs(collection(db, "coupons"));
    querySnapshot.forEach(doc => {
        coupons[doc.id] = { id: doc.id, ...doc.data() };
    });
}

async function loadOrders() {
    orders = [];
    const querySnapshot = await getDocs(collection(db, "orders"));
    querySnapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
    });
}

// Render Admin Content
function renderAllAdminContent() {
    renderProductsAdmin();
    renderCategoriesAdmin();
    renderCouponsAdmin();
    renderOrdersAdmin();
    updateCategorySelect();
}

function renderProductsAdmin() {
    const container = document.getElementById('products-list');
    if (!container) return;
    container.innerHTML = products.length === 0
        ? '<p class="empty-page-message">لا توجد منتجات حاليًا.</p>'
        : products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.price} جنيه</td>
                <td>${categories.find(c => c.id === product.category)?.name || 'غير مصنف'}</td>
                <td><img src="${product.img}" alt="${product.name}" style="width: 50px;"></td>
                <td>
                    <button class="action-btn edit-product-btn" data-product-id="${product.id}">تعديل</button>
                    <button class="action-btn delete-product-btn" data-product-id="${product.id}">حذف</button>
                </td>
            </tr>`).join('');
}

function renderCategoriesAdmin() {
    const container = document.getElementById('categories-list');
    if (!container) return;
    container.innerHTML = categories.length === 0
        ? '<p class="empty-page-message">لا توجد أقسام حاليًا.</p>'
        : categories.map(category => `
            <tr>
                <td>${category.name}</td>
                <td>
                    <button class="action-btn edit-category-btn" data-category-id="${category.id}">تعديل</button>
                    <button class="action-btn delete-category-btn" data-category-id="${category.id}">حذف</button>
                </td>
            </tr>`).join('');
}

function renderCouponsAdmin() {
    const container = document.getElementById('coupons-list');
    if (!container) return;
    container.innerHTML = Object.keys(coupons).length === 0
        ? '<p class="empty-page-message">لا توجد أكواد خصم حاليًا.</p>'
        : Object.values(coupons).map(coupon => `
            <tr>
                <td>${coupon.code}</td>
                <td>${coupon.type === 'percent' ? `${coupon.value}%` : `${coupon.value} جنيه`}</td>
                <td>
                    <button class="action-btn delete-coupon-btn" data-coupon-id="${coupon.id}">حذف</button>
                </td>
            </tr>`).join('');
}

function renderOrdersAdmin() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    container.innerHTML = orders.length === 0
        ? '<p class="empty-page-message">لا توجد طلبات حاليًا.</p>'
        : orders.map(order => {
            const statusInfo = {
                review: { text: "تحت المراجعة", class: "review" },
                shipping: { text: "قيد التوصيل", class: "shipping" },
                delivered: { text: "تم الاستلام", class: "delivered" },
                cancelled: { text: "ملغي", class: "cancelled" },
                returned: { text: "تم الإرجاع", class: "returned" }
            }[order.status] || { text: 'غير معروف', class: '' };
            const itemsSummary = order.items.map(item => `${item.name} (x${item.quantity})`).join('، ');
            return `
                <div class="order-card">
                    <div class="order-header">
                        <h3>طلب رقم #${order.id}</h3>
                        <span class="order-status ${statusInfo.class}">${statusInfo.text}</span>
                    </div>
                    <div class="order-items-summary">
                        <p><strong>المنتجات:</strong> ${itemsSummary}</p>
                        <p><strong>الإجمالي:</strong> ${order.total.toFixed(2)} جنيه</p>
                        <p><strong>تاريخ الطلب:</strong> ${order.date}</p>
                        <p><strong>معرف المستخدم:</strong> ${order.userId}</p>
                    </div>
                    <div class="order-footer">
                        <select class="order-status-select" data-order-id="${order.id}">
                            <option value="review" ${order.status === 'review' ? 'selected' : ''}>تحت المراجعة</option>
                            <option value="shipping" ${order.status === 'shipping' ? 'selected' : ''}>قيد التوصيل</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم الاستلام</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                            <option value="returned" ${order.status === 'returned' ? 'selected' : ''}>تم الإرجاع</option>
                        </select>
                    </div>
                </div>`;
        }).join('');
}

// Form Handlers
async function handleProductSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById('product-id')?.value;
    const productData = {
        name: document.getElementById('product-name')?.value,
        price: parseFloat(document.getElementById('product-price')?.value),
        category: document.getElementById('product-category')?.value,
        img: document.getElementById('product-image')?.value,
        desc: document.getElementById('product-description')?.value,
        featured: document.getElementById('product-featured')?.checked
    };

    try {
        if (productId) {
            await updateDoc(doc(db, "products", productId), productData);
            showToast('تم تعديل المنتج بنجاح!', 'success');
        } else {
            await addDoc(collection(db, "products"), productData);
            showToast('تم إضافة المنتج بنجاح!', 'success');
        }
        document.getElementById('product-form')?.reset();
        document.getElementById('product-id').value = '';
        await loadProducts();
        renderProductsAdmin();
    } catch (error) {
        showToast(`خطأ: ${error.message}`, 'error');
    }
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const categoryId = document.getElementById('category-id')?.value;
    const categoryData = { name: document.getElementById('category-name')?.value };

    try {
        if (categoryId) {
            await updateDoc(doc(db, "categories", categoryId), categoryData);
            showToast('تم تعديل القسم بنجاح!', 'success');
        } else {
            await addDoc(collection(db, "categories"), categoryData);
            showToast('تم إضافة القسم بنجاح!', 'success');
        }
        document.getElementById('category-form')?.reset();
        document.getElementById('category-id').value = '';
        await loadCategories();
        renderCategoriesAdmin();
        updateCategorySelect();
    } catch (error) {
        showToast(`خطأ: ${error.message}`, 'error');
    }
}

async function handleCouponSubmit(e) {
    e.preventDefault();
    const couponData = {
        code: document.getElementById('coupon-code')?.value.toUpperCase(),
        type: document.getElementById('coupon-type')?.value,
        value: parseFloat(document.getElementById('coupon-value')?.value)
    };

    try {
        await addDoc(collection(db, "coupons"), couponData);
        showToast('تم إضافة كود الخصم بنجاح!', 'success');
        document.getElementById('coupon-form')?.reset();
        await loadCoupons();
        renderCouponsAdmin();
    } catch (error) {
        showToast(`خطأ: ${error.message}`, 'error');
    }
}

// Admin Actions
async function handleAdminClick(e) {
    const target = e.target;

    // Edit product
    const editProductBtn = target.closest('.edit-product-btn');
    if (editProductBtn) {
        const productId = editProductBtn.dataset.productId;
        const product = products.find(p => p.id === productId);
        if (product) {
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-image').value = product.img;
            document.getElementById('product-description').value = product.desc;
            document.getElementById('product-featured').checked = product.featured;
        }
    }

    // Delete product
    const deleteProductBtn = target.closest('.delete-product-btn');
    if (deleteProductBtn) {
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            const productId = deleteProductBtn.dataset.productId;
            await deleteDoc(doc(db, "products", productId));
            showToast('تم حذف المنتج بنجاح!', 'success');
            await loadProducts();
            renderProductsAdmin();
        }
    }

    // Edit category
    const editCategoryBtn = target.closest('.edit-category-btn');
    if (editCategoryBtn) {
        const categoryId = editCategoryBtn.dataset.categoryId;
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            document.getElementById('category-id').value = category.id;
            document.getElementById('category-name').value = category.name;
        }
    }

    // Delete category
    const deleteCategoryBtn = target.closest('.delete-category-btn');
    if (deleteCategoryBtn) {
        if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
            const categoryId = deleteCategoryBtn.dataset.categoryId;
            await deleteDoc(doc(db, "categories", categoryId));
            showToast('تم حذف القسم بنجاح!', 'success');
            await loadCategories();
            renderCategoriesAdmin();
            updateCategorySelect();
        }
    }

    // Delete coupon
    const deleteCouponBtn = target.closest('.delete-coupon-btn');
    if (deleteCouponBtn) {
        if (confirm('هل أنت متأكد من حذف كود الخصم؟')) {
            const couponId = deleteCouponBtn.dataset.couponId;
            await deleteDoc(doc(db, "coupons", couponId));
            showToast('تم حذف كود الخصم بنجاح!', 'success');
            await loadCoupons();
            renderCouponsAdmin();
        }
    }

    // Update order status
    const statusSelect = target.closest('.order-status-select');
    if (statusSelect) {
        const orderId = statusSelect.dataset.orderId;
        const newStatus = statusSelect.value;
        await updateDoc(doc(db, "orders", orderId), { status: newStatus });
        showToast('تم تحديث حالة الطلب بنجاح!', 'success');
        await loadOrders();
        renderOrdersAdmin();
    }
}

// Update Category Select
function updateCategorySelect() {
    const select = document.getElementById('product-category');
    if (!select) return;
    select.innerHTML = '<option value="">اختر قسمًا</option>' + 
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// Page Navigation
function showAdminPage(pageId) {
    const validPages = ['products', 'categories', 'coupons', 'orders'];
    if (!validPages.includes(pageId)) {
        console.warn(`قيمة pageId غير صالحة: ${pageId}`);
        return;
    }
    const pageElement = document.getElementById(`${pageId}-page`);
    if (!pageElement) {
        console.warn(`الصفحة '${pageId}-page' غير موجودة في DOM.`);
        return;
    }
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    pageElement.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (navLink) navLink.classList.add('active');
}

// Logout Handler
function handleLogout() {
    signOut(auth)
        .then(() => {
            showToast('تم تسجيل الخروج بنجاح!', 'success');
            window.location.href = "index.html?auth=login";
        })
        .catch(error => {
            showToast(`خطأ في تسجيل الخروج: ${error.message}`, 'error');
        });
}

// Show Toast
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
