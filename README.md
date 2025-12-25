# SweetBakery Management System

This is a project using [Convex](https://convex.dev) as its backend.

This project is connected to the Convex deployment named [`content-nightingale-567`](https://dashboard.convex.dev/d/content-nightingale-567).

## Project structure

The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).

The backend code is in the `convex` directory.

`npm run dev` will start the frontend and backend servers.

## App authentication

Apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.

# 🍰 SweetBakery – Hướng dẫn chạy dự án

Repository: [https://github.com/ihPnaVeL/SweetBakery](https://github.com/ihPnaVeL/SweetBakery)

---

## 1. Giới thiệu

SweetBakery là một dự án web sử dụng:

- **Frontend**: Vite + React (JavaScript/TypeScript)
- **Backend**: Convex (Backend-as-a-Service)

Tài liệu này hướng dẫn **chi tiết từng bước** để clone và chạy dự án trên **VS Code** dành cho người mới.

---

## 2. Yêu cầu hệ thống

Trước khi bắt đầu, đảm bảo máy bạn đã cài:

- **Node.js** (khuyến nghị bản LTS, >= 16)
- **Git**
- **Visual Studio Code**
- Kết nối Internet

Kiểm tra nhanh:

```bash
node -v
git --version
```

---

## 3. Clone dự án

Mở VS Code → mở Terminal (`Ctrl + ~`) và chạy:

```bash
git clone https://github.com/ihPnaVeL/SweetBakery.git
cd SweetBakery
```

Sau khi vào đúng thư mục, bạn sẽ thấy file `package.json`.

---

## 4. Cài đặt thư viện

Chạy lệnh sau để cài toàn bộ dependencies:

```bash
npm install
```

⏳ Quá trình này có thể mất vài phút.

---

## 5. Cài đặt & cấu hình Convex (Backend)

### 5.1. Cài Convex CLI (chỉ 1 lần)

```bash
npm install -g convex
```

Kiểm tra:

```bash
convex --version
```

---

### 5.2. Đăng nhập Convex

```bash
convex login
```

➡️ Trình duyệt sẽ mở để bạn đăng nhập (Google / GitHub).

---

## 6. Chạy Backend (Convex)

Mở **terminal thứ nhất** trong VS Code và chạy:

```bash
convex dev
```

Khi thấy thông báo backend sẵn sàng, **không tắt terminal này**.

---

## 7. Chạy Frontend

Mở **terminal thứ hai** và chạy:

```bash
npm run dev
```

Nếu thành công, terminal sẽ hiển thị:

```
Local: http://localhost:5173
```

---

## 8. Truy cập website

Mở trình duyệt và truy cập:

```
http://localhost:5173
```

🎉 Dự án SweetBakery đã chạy thành công!

---

## 9. Sơ đồ chạy dự án

```
VS Code
├─ Terminal 1: convex dev   (Backend)
├─ Terminal 2: npm run dev  (Frontend)
└─ Browser: localhost:5173
```

---

✨ Happy coding with SweetBakery ✨
