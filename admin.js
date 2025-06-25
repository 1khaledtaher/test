import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, setDoc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
// تم حذف استدعاءات Firebase Storage

const firebaseConfig = {
    apiKey: "AIzaSyBV_kaqlAtLTBNEcIHpc0rWHTbWXdgsXME",
    authDomain: "store-b5352.firebaseapp.com",
    projectId: "store-b5352",
    // تم حذف storageBucket لأنه لم يعد مستخدماً هنا
    storageBucket: "store-b5352.appspot.com",
    messagingSenderId: "994825915869",
    appId: "1:994825915869:web:57e664699a45b3d2fa3a34",
    measurementId: "G-KGZHS02V07"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// تم حذف تهيئة Firebase Storage

// --- ✨ إضافة جديدة: إعدادات Cloudinary ---
// Cloudinary Configuration (مهم جداً: استبدل ببياناتك)
const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME"; //  ضع هنا اسم السحابة الخاص بك
const CLOUDINARY_UPLOAD_PRESET = "YOUR_UPLOAD_PRESET"; // ضع هنا اسم الـ Upload Preset


const ADMIN_PASSWORD = "1234";

let products = [];
let categories = [];
let coupons = [];
let orders = [];
let usersMap = {}; // userId => displayName/email

let editProductId = null;

// كلمة سر الأدمن
const passwordModal = document.getElementById("admin-password-modal");
document.getElementById("admin-password-btn").onclick = checkAdminPassword;
document.getElementById("admin-password-input").onkeydown = e => { if (e.key === "Enter") checkAdminPassword() };
function checkAdminPassword() {
    const val = document.getElementById("admin-password-input").value;
    if (val === ADMIN_PASSWORD) {
        passwordModal.style.display = "none";
        reloadAll();
    } else {
        document.getElementById("admin-password-error").style.display = "";
    }
}

// القائمة الجانبية
const sidebar = document.getElementById('sidebar');
document.getElementById('sidebar-toggle').onclick = () => {
    sidebar.classList.toggle('open');
};
document.body.addEventListener('click', e => {
    if (window.innerWidth < 900 && !e.target.closest('.sidebar') && !e.target.closest('.sidebar-toggle')) sidebar.classList.remove('open');
});

function showAdminSection(section) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(`${section}-section`).style.display = '';
    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
    let active = document.querySelector(`.sidebar-link[data-section="${section}"]`);
    if (active) active.classList.add('active');
    sidebar.classList.remove('open');
}
window.addEventListener('hashchange', () => {
    let hash = location.hash.replace('#', '');
    if (!['products', 'categories', 'coupons', 'orders'].includes(hash)) hash = 'products';
    showAdminSection(hash);
});
showAdminSection(location.hash.replace('#', '') || 'products');

async function reloadAll() {
    await loadCategories();
    await loadProducts();
    await loadCoupons();
    await loadOrders();
    await loadUsers();
    renderCategories();
    renderProducts();
    renderCoupons();
    renderOrders();
    fillCategorySelect();
}

// المنتجات
async function loadProducts() {
    products = [];
    const snap = await getDocs(collection(db, "products"));
    snap.forEach(docu => products.push({ id: docu.id, ...docu.data() }));
}
function renderProducts() {
    let tbody = document.getElementById('products-tbody');
    tbody.innerHTML = products.map(prod => `
    <tr>
      <td><img src="${prod.img}" style="width:48px;height:48px;border-radius:7px;" /></td>
      <td>${prod.name}</td>
      <td>${prod.desc || ''}</td>
      <td>${prod.price}</td>
      <td>${categories.find(c => c.id === prod.category)?.name || ''}</td>
      <td>
        <input type="checkbox" data-id="${prod.id}" class="featured-chk" ${prod.featured ? "checked" : ""}>
      </td>
      <td>
        <button class="small-btn" onclick="editProduct('${prod.id}')">تعديل</button>
        <button class="danger-btn small-btn" onclick="deleteProduct('${prod.id}')">حذف</button>
      </td>
    </tr>
  `).join('');
    // زر مميز
    tbody.querySelectorAll('.featured-chk').forEach(chk => {
        chk.onchange = async e => {
            await updateDoc(doc(db, "products", chk.dataset.id), { featured: chk.checked });
            products.find(p => p.id === chk.dataset.id).featured = chk.checked;
            showToast('تم تحديث حالة التمييز', 'success');
        }
    });
}
window.editProduct = function (id) {
    editProductId = id;
    let prod = products.find(p => p.id === id);
    document.getElementById('product-modal-title').textContent = "تعديل منتج";
    document.getElementById('product-name').value = prod.name;
    document.getElementById('product-desc').value = prod.desc || '';
    document.getElementById('product-price').value = prod.price;
    document.getElementById('product-img-file').value = '';
    document.getElementById('product-img-preview').src = prod.img;
    document.getElementById('product-img-preview').style.display = "block";
    document.getElementById('product-category').value = prod.category;
    document.getElementById('product-featured').checked = !!prod.featured;
    document.getElementById('product-modal-bg').style.display = "flex";
}
window.deleteProduct = async function (id) {
    if (!confirm("تأكيد حذف المنتج؟")) return;
    await deleteDoc(doc(db, "products", id));
    products = products.filter(p => p.id !== id);
    renderProducts();
    showToast('تم حذف المنتج', 'success');
}

// إضافة/تعديل منتج
document.getElementById('add-product-btn').onclick = () => {
    editProductId = null;
    document.getElementById('product-modal-title').textContent = "منتج جديد";
    document.getElementById('product-form').reset();
    document.getElementById('product-img-preview').style.display = "none";
    document.getElementById('product-modal-bg').style.display = "flex";
};
document.getElementById('close-product-modal').onclick = () => {
    document.getElementById('product-modal-bg').style.display = "none";
};

// معاينة الصورة قبل الرفع
document.getElementById('product-img-file').onchange = function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('product-img-preview').src = e.target.result;
            document.getElementById('product-img-preview').style.display = "block";
        };
        reader.readAsDataURL(file);
    }
};

document.getElementById('product-form').onsubmit = async e => {
    e.preventDefault();
    let name = document.getElementById('product-name').value.trim();
    let desc = document.getElementById('product-desc').value.trim();
    let price = Number(document.getElementById('product-price').value);
    let category = document.getElementById('product-category').value;
    let featured = document.getElementById('product-featured').checked;
    let file = document.getElementById('product-img-file').files[0];

    let imgUrl = "";

    // --- ✨ بداية التعديل: استبدال منطق الرفع ---
    if (file) {
        showToast('جارِ رفع الصورة ...', 'info');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.secure_url) {
                imgUrl = data.secure_url; // الحصول على الرابط الآمن من Cloudinary
            } else {
                // في حالة وجود خطأ من Cloudinary
                throw new Error(data.error.message || 'فشل رفع الصورة إلى Cloudinary');
            }
        } catch (error) {
            showToast(`خطأ في رفع الصورة: ${error.message}`, 'error');
            document.getElementById('product-modal-bg').style.display = "none"; // إغلاق النافذة عند الفشل
            return; // إيقاف التنفيذ
        }
    } else if (editProductId) {
        // في حالة التعديل بدون تغيير الصورة، استخدم الرابط القديم
        imgUrl = products.find(p => p.id === editProductId).img;
    } else {
        showToast("يجب رفع صورة للمنتج", "error");
        return;
    }
    // --- نهاية التعديل ---

    let data = { name, desc, price, img: imgUrl, category, featured };
    
    try {
        if (editProductId) {
            await updateDoc(doc(db, "products", editProductId), data);
            showToast('تم تعديل المنتج بنجاح', 'success');
        } else {
            await addDoc(collection(db, "products"), data);
            showToast('تم إضافة المنتج بنجاح', 'success');
        }
        await loadProducts();
        renderProducts();
        document.getElementById('product-modal-bg').style.display = "none";
    } catch (error) {
        showToast(`حدث خطأ أثناء حفظ البيانات: ${error.message}`, 'error');
    }
};


// التصنيفات
async function loadCategories() {
    categories = [];
    const snap = await getDocs(collection(db, "categories"));
    snap.forEach(docu => categories.push({ id: docu.id, ...docu.data() }));
}
function renderCategories() {
    let tbody = document.getElementById('categories-tbody');
    tbody.innerHTML = categories.map(cat => `
    <tr>
      <td>${cat.name}</td>
      <td><button class="danger-btn small-btn" onclick="deleteCategory('${cat.id}')">حذف</button></td>
    </tr>
  `).join('');
}
window.deleteCategory = async function (id) {
    if (!confirm("تأكيد حذف التصنيف؟")) return;
    await deleteDoc(doc(db, "categories", id));
    categories = categories.filter(c => c.id !== id);
    renderCategories();
    fillCategorySelect();
    showToast('تم حذف التصنيف', 'success');
}
document.getElementById('add-category-form').onsubmit = async e => {
    e.preventDefault();
    let name = document.getElementById('category-name').value.trim();
    if (!name) return;
    await addDoc(collection(db, "categories"), { name });
    showToast('تم إضافة التصنيف', 'success');
    await loadCategories();
    renderCategories();
    fillCategorySelect();
    document.getElementById('add-category-form').reset();
};
function fillCategorySelect() {
    let sel = document.getElementById('product-category');
    if (!sel) return;
    sel.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// الكوبونات
async function loadCoupons() {
    coupons = [];
    const snap = await getDocs(collection(db, "coupons"));
    snap.forEach(docu => coupons.push({ id: docu.id, ...docu.data() }));
}
function renderCoupons() {
    let tbody = document.getElementById('coupons-tbody');
    tbody.innerHTML = coupons.map(coup => `
    <tr>
      <td>${coup.code}</td>
      <td>${coup.type === 'percent' ? 'نسبة %' : 'قيمة ثابتة'}</td>
      <td>${coup.value}</td>
      <td><button class="danger-btn small-btn" onclick="deleteCoupon('${coup.id}')">حذف</button></td>
    </tr>
  `).join('');
}
window.deleteCoupon = async function (id) {
    if (!confirm("تأكيد حذف الكوبون؟")) return;
    await deleteDoc(doc(db, "coupons", id));
    coupons = coupons.filter(c => c.id !== id);
    renderCoupons();
    showToast('تم حذف الكوبون', 'success');
}
document.getElementById('add-coupon-form').onsubmit = async e => {
    e.preventDefault();
    let code = document.getElementById('coupon-code').value.trim().toUpperCase();
    let type = document.getElementById('coupon-type').value;
    let value = Number(document.getElementById('coupon-value').value);
    if (!code || !type || !value) return;
    await addDoc(collection(db, "coupons"), { code, type, value });
    showToast('تم إضافة الكوبون', 'success');
    await loadCoupons();
    renderCoupons();
    document.getElementById('add-coupon-form').reset();
};

// الطلبات + أسماء العملاء
async function loadOrders() {
    orders = [];
    const snap = await getDocs(collection(db, "orders"));
    snap.forEach(docu => orders.push({ id: docu.id, ...docu.data() }));
}
async function loadUsers() {
    usersMap = {};
    const snap = await getDocs(collection(db, "users"));
    snap.forEach(docu => {
        let d = docu.data();
        usersMap[docu.id] = d.displayName || d.name || d.email || docu.id;
    });
}
function renderOrders() {
    let tbody = document.getElementById('orders-tbody');
    // ترتيب الطلبات: غير ملغي (الأحدث للأقدم)، ثم الملغي (الأقدم للأحدث)
    const activeStatuses = ["review", "shipping", "delivered", "returned"];
    const activeOrders = orders.filter(o => !o.status || activeStatuses.includes(o.status));
    const cancelledOrders = orders.filter(o => o.status === "cancelled");
    activeOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    cancelledOrders.sort((a, b) => new Date(a.date) - new Date(b.date));
    const allSorted = [...activeOrders, ...cancelledOrders];
    tbody.innerHTML = allSorted.map(order => `
    <tr>
      <td>#${order.order_number || order.id}</td>
      <td>
        <span class="order-status ${order.status || ''}">${getStatusText(order.status)}</span>
      </td>
      <td>${order.items.map(i => `${i.name}(x${i.quantity})`).join('<br>')}</td>
      <td>${usersMap[order.userId] || order.userId || '-'}</td>
      <td>${order.total} ج</td>
      <td>${formatOrderDate(order.date)}</td>
      <td>
        <select data-id="${order.id}" class="order-status-select">
          <option value="review" ${order.status === 'review' ? 'selected' : ''}>تحت المراجعة</option>
          <option value="shipping" ${order.status === 'shipping' ? 'selected' : ''}>قيد الشحن</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
          <option value="returned" ${order.status === 'returned' ? 'selected' : ''}>مرتجع</option>
          <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
        </select>
      </td>
    </tr>
  `).join('');
    tbody.querySelectorAll('.order-status-select').forEach(sel => {
        sel.onchange = async e => {
            await updateDoc(doc(db, "orders", sel.dataset.id), { status: sel.value });
            orders.find(o => o.id === sel.dataset.id).status = sel.value;
            showToast('تم تحديث حالة الطلب', 'success');
            renderOrders();
        }
    });
}
function getStatusText(status) {
    return {
        review: "تحت المراجعة",
        shipping: "قيد الشحن",
        delivered: "تم التوصيل",
        returned: "مرتجع",
        cancelled: "ملغي"
    }[status] || "غير معرف";
}
function formatOrderDate(dateISO) {
    const d = new Date(dateISO);
    let hours = d.getHours();
    let mins = d.getMinutes();
    let ampm = hours >= 12 ? "مساءً" : "صباحًا";
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    mins = mins < 10 ? "0" + mins : mins;
    const dateStr = d.toLocaleDateString('ar-EG');
    return `${dateStr} - ${hours}:${mins} ${ampm}`;
}

// Toast
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2700);
}
