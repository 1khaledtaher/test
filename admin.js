import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dxisaw6cu";
const CLOUDINARY_UPLOAD_PRESET = "anaqa-products";

// Check Admin Authentication
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html"; // Redirect to login if not authenticated
    }
});

// Logout Handler
document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    }).catch((error) => {
        showToast(`خطأ أثناء تسجيل الخروج: ${error.message}`, "error");
    });
});

// Navigation Handler
document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
        document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
        link.classList.add("active");
        document.getElementById(`${link.dataset.section}-section`).classList.add("active");
    });
});

// Load Categories for Product Form
async function loadCategories() {
    const categorySelect = document.getElementById("product-category");
    categorySelect.innerHTML = '<option value="">اختر القسم</option>';
    const querySnapshot = await getDocs(collection(db, "categories"));
    querySnapshot.forEach(doc => {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = doc.data().name;
        categorySelect.appendChild(option);
    });
}

// Add Product Handler
document.getElementById("add-product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("product-upload-status");
    const name = document.getElementById("product-name").value;
    const price = parseFloat(document.getElementById("product-price").value);
    const desc = document.getElementById("product-desc").value;
    const category = document.getElementById("product-category").value;
    const imageFile = document.getElementById("product-image").files[0];

    if (!imageFile || !name || !price || !category) {
        status.textContent = "الرجاء ملء كل الحقول.";
        return;
    }

    status.textContent = "جاري رفع الصورة...";
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        if (data.secure_url) {
            status.textContent = "جاري حفظ المنتج...";
            await addDoc(collection(db, "products"), {
                name, price, desc, img: data.secure_url, category, featured: false
            });
            status.textContent = "🎉 تم إضافة المنتج بنجاح!";
            document.getElementById("add-product-form").reset();
            loadProducts();
        } else {
            throw new Error("فشل رفع الصورة.");
        }
    } catch (error) {
        status.textContent = `خطأ: ${error.message}`;
    }
});

// Load Products
async function loadProducts() {
    const container = document.getElementById("products-list");
    container.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "products"));
    querySnapshot.forEach(doc => {
        const product = doc.data();
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <img src="${product.img}" alt="${product.name}">
            <div class="item-details">
                <h4>${product.name}</h4>
                <p>${product.price} جنيه</p>
                <p>${product.desc}</p>
                <button class="delete-btn" data-id="${doc.id}">حذف</button>
            </div>`;
        container.appendChild(div);
    });

    // Delete Product Handler
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await deleteDoc(doc(db, "products", btn.dataset.id));
            showToast("تم حذف المنتج بنجاح!", "success");
            loadProducts();
        });
    });
}

// Add Category Handler
document.getElementById("add-category-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("category-status");
    const name = document.getElementById("category-name").value;

    try {
        await addDoc(collection(db, "categories"), { name });
        status.textContent = "🎉 تم إضافة القسم بنجاح!";
        document.getElementById("add-category-form").reset();
        loadCategories();
        renderCategories();
    } catch (error) {
        status.textContent = `خطأ: ${error.message}`;
    }
});

// Load Categories
async function renderCategories() {
    const container = document.getElementById("categories-list");
    container.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "categories"));
    querySnapshot.forEach(doc => {
        const category = doc.data();
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-details">
                <h4>${category.name}</h4>
                <button class="delete-btn" data-id="${doc.id}">حذف</button>
            </div>`;
        container.appendChild(div);
    });

    // Delete Category Handler
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await deleteDoc(doc(db, "categories", btn.dataset.id));
            showToast("تم حذف القسم بنجاح!", "success");
            loadCategories();
            renderCategories();
        });
    });
}

// Add Coupon Handler
document.getElementById("add-coupon-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("coupon-status");
    const code = document.getElementById("coupon-code").value.toUpperCase();
    const type = document.getElementById("coupon-type").value;
    const value = parseFloat(document.getElementById("coupon-value").value);

    try {
        await addDoc(collection(db, "coupons"), { code, type, value });
        status.textContent = "🎉 تم إضافة الكود بنجاح!";
        document.getElementById("add-coupon-form").reset();
        loadCoupons();
    } catch (error) {
        status.textContent = `خطأ: ${error.message}`;
    }
});

// Load Coupons
async function loadCoupons() {
    const container = document.getElementById("coupons-list");
    container.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "coupons"));
    querySnapshot.forEach(doc => {
        const coupon = doc.data();
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-details">
                <h4>${coupon.code}</h4>
                <p>${coupon.type === "percent" ? `${coupon.value}%` : `${coupon.value} جنيه`}</p>
                <button class="delete-btn" data-id="${doc.id}">حذف</button>
            </div>`;
        container.appendChild(div);
    });

    // Delete Coupon Handler
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await deleteDoc(doc(db, "coupons", btn.dataset.id));
            showToast("تم حذف الكود بنجاح!", "success");
            loadCoupons();
        });
    });
}

// Load Orders
async function loadOrders() {
    const container = document.getElementById("orders-list");
    container.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "orders"));
    querySnapshot.forEach(doc => {
        const order = doc.data();
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-details">
                <h4>طلب #${doc.id}</h4>
                <p>الإجمالي: ${order.total} جنيه</p>
                <p>الحالة: ${order.status}</p>
                <select class="status-select" data-id="${doc.id}">
                    <option value="review" ${order.status === "review" ? "selected" : ""}>تحت المراجعة</option>
                    <option value="shipping" ${order.status === "shipping" ? "selected" : ""}>قيد التوصيل</option>
                    <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>تم الاستلام</option>
                    <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>ملغي</option>
                    <option value="returned" ${order.status === "returned" ? "selected" : ""}>تم الإرجاع</option>
                </select>
            </div>`;
        container.appendChild(div);
    });

    // Update Order Status Handler
    document.querySelectorAll(".status-select").forEach(select => {
        select.addEventListener("change", async () => {
            await updateDoc(doc(db, "orders", select.dataset.id), {
                status: select.value
            });
            showToast("تم تحديث حالة الطلب بنجاح!", "success");
        });
    });
}

// Load Users
async function loadUsers() {
    const container = document.getElementById("users-list");
    container.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach(doc => {
        const user = doc.data();
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-details">
                <h4>${user.displayName || "غير معروف"}</h4>
                <p>${user.email}</p>
            </div>`;
        container.appendChild(div);
    });
}

// Show Toast
function showToast(message, type) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize
async function init() {
    await loadCategories();
    await loadProducts();
    await renderCategories();
    await loadCoupons();
    await loadOrders();
    await loadUsers();
}
init();
