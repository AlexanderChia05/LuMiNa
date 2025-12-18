
# Lumina Salon System 💅✨

Link: https://alexanderchia05.github.io/LuMiNa/

**Lumina** is a production-grade, full-stack Salon Appointment System built with **React**, **TypeScript**, and **Supabase**. It features a modern, "glass-morphic" UI/UX and consists of three distinct integrated applications:

1.  **Client App:** Mobile-first booking experience with loyalty rewards and payment simulation.
2.  **Admin Portal:** Comprehensive dashboard for analytics, staff management, and financial auditing.
3.  **Staff App:** Dedicated tool for stylists to view schedules and check-in clients via QR code.

---

## 🚀 Key Features

### 📱 Client App
*   **Smart Booking Engine:** Select services, specific stylists (with rank-based pricing), and availability checking.
*   **Loyalty System:** Earn points per Ringgit spent. Redeem points for vouchers or discounts.
*   **Tier Status:** Gamified progression (Silver, Gold, Platinum, Centurion) based on lifetime spend.
*   **Payment Simulator:** Integrated simulator for Credit Cards and Touch 'n Go eWallet (with PIN verification).
*   **Appointment Management:** Reschedule, cancel (with refund logic), and review past appointments.

### 🖥️ Admin Portal
*   **Dashboard Analytics:** Real-time revenue charts, staff performance breakdown, and daily appointment summaries.
*   **CRUD Operations:** Manage Staff, Services, and Client data.
*   **Transaction Audit:** View detailed receipts, refund transactions, and export reports (CSV/PDF).
*   **Content Management:** Create promotional posts and special offers that appear in the Client App.
*   **Review Management:** Reply to client reviews and issue compensation vouchers directly.

### 🆔 Staff App
*   **QR Scanner:** Built-in camera integration to scan client booking codes for instant check-in.
*   **Schedule View:** Personal daily timeline for stylists.
*   **Profile:** Performance rating and personal details.

---

## 🛠️ Tech Stack

*   **Frontend:** React (Vite), TypeScript, Tailwind CSS
*   **Backend / DB:** Supabase (PostgreSQL, Auth, Realtime)
*   **State Management:** React Hooks
*   **Visualization:** Recharts
*   **Icons:** Lucide React
*   **Utilities:** jsQR (Scanning), html2canvas/jspdf (implied for reports)

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/lumina-salon.git
cd lumina-salon
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Supabase Setup
This project requires a Supabase backend.
1.  Create a new project at [supabase.com](https://supabase.com).
2.  Go to the **SQL Editor** in your Supabase dashboard.
3.  Open the file `SUPABASE_SETUP.md` located in this project's root.
4.  Copy the SQL script provided in that file and run it to set up the Tables, RLS policies, Functions, and Seed Data.

### 4. Environment Configuration
Update the `services/supabase.ts` file with your specific Supabase credentials:

```typescript
// src/services/supabase.ts
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

### 5. Run the Application
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔐 Login Credentials (Demo)

The system is pre-seeded with the following accounts for testing:

### 👤 Admin Portal
*   **Email:** `admin@gmail.com`
*   **Password:** `admin1234`

### ✂️ Staff App
*   **Email:** `s0001@lumina.com` (Sarah Jenkins)
*   **Password:** `s0001Lumina`

### 📱 Client App
*   **Sign Up:** You can register a new account on the login screen.
*   **Demo User:** If created via script, `demo@gmail.com` / `password123` (check seed data).

> **Context Switcher:** In the bottom-right corner of the application, there is a hidden development menu (hover to reveal) that allows you to quickly switch between Client, Staff, and Admin views for testing purposes.

---

## 💳 Payment Simulation

When booking an appointment in the Client App:
1.  Select **Credit Card** or **Touch 'n Go**.
2.  **Card:** Use any number starting with `4242` (Visa) or `5555` (Mastercard). Expiry must be in the future.
3.  **Touch 'n Go:** Default PIN is usually set in profile, or use `123456` if prompted for Simulator PIN.
4.  **OTP:** Enter `123456` to bypass verification.

---

## 🎨 Customization

*   **Theme:** The app supports Light/Dark mode. Toggle it in the Client Profile or Admin header.
*   **Colors:** The primary color scheme is "Rose Gold" (`text-rose-500`), configured in `index.html` CSS variables and `tailwind.config.js`.

---

## 📄 License

This project is open-source and available under the MIT License.
