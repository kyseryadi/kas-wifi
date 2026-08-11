# Kas WiFi API

Backend Node.js untuk pengelolaan kas WiFi, tagihan pelanggan, pendapatan, pengeluaran, dan laporan keuangan.

## Teknologi

- Node.js + Express + TypeScript
- MySQL + Prisma ORM
- Joi untuk validasi environment dan request
- Winston untuk logging
- JWT untuk access token
- Google Auth Library untuk verifikasi Google ID token

## Aturan user

- Owner memiliki `role = OWNER` dan `parent_id = 0`.
- User bawahan memiliki `parent_id = id owner`.
- Role bawahan yang dapat ditambahkan saat ini: `ADMIN` atau `CS`.
- Password tidak pernah disimpan langsung; hanya hash bcrypt.

## Hak akses role

| Menu/API | Owner | Admin | CS |
| --- | --- | --- | --- |
| Pelanggan dan pembayaran | Ya | Ya | Ya |
| Pendapatan | Ya | Ya | Tidak |
| Pengeluaran | Ya | Ya | Ya |
| Laporan | Ya | Ya | Tidak |
| Manajemen user | Ya | Tidak | Tidak |

User yang dibuat owner mempunyai `parent_id = id owner`. Query pelanggan dan keuangan menggunakan ID owner tersebut, sehingga admin dan CS melihat data tenant yang sama dengan owner.

## Menjalankan

1. Salin dan sesuaikan `.env.example` menjadi `.env`.
2. Pastikan database MySQL `kas_wifi` dan user database khusus aplikasi tersedia.
3. Jalankan migrasi dan server:

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

API berjalan di `http://localhost:3000`.

Seed awal membuat atau memperbarui akun owner berikut:

```text
Email    : admin@gmail.com
Password : 4dm!n
Role     : OWNER
Parent ID: 0
```

Password disimpan sebagai hash bcrypt dengan cost factor 12, bukan sebagai teks asli.

## Endpoint awal

| Method | Endpoint | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/health` | Publik | Status server |
| POST | `/api/v1/auth/register-owner` | Publik | Daftar owner dengan email/password |
| POST | `/api/v1/auth/login` | Publik | Login email/password |
| POST | `/api/v1/auth/google` | Publik | Login memakai Google ID token (`credential`) |
| GET | `/api/v1/auth/me` | Bearer token | Profil user login |
| GET | `/api/v1/users` | Owner | Daftar user milik owner |
| POST | `/api/v1/users` | Owner | Tambah user bawahan |
| PATCH | `/api/v1/users/:id` | Owner | Ubah role, nama, password, atau status user bawahan |
| GET | `/api/v1/customers` | Bearer token | Daftar dan pencarian pelanggan |
| POST | `/api/v1/customers` | Bearer token | Tambah pelanggan |
| PATCH | `/api/v1/customers/:id` | Bearer token | Perbarui pelanggan |
| GET | `/api/v1/customers/:id/payments` | Bearer token | Riwayat pembayaran pelanggan |
| POST | `/api/v1/customers/:id/payments` | Bearer token | Bayar tagihan dan catat pendapatan otomatis |
| GET | `/api/v1/incomes` | Bearer token | Daftar pendapatan |
| POST | `/api/v1/incomes` | Bearer token | Tambah pendapatan manual |
| GET | `/api/v1/expenses` | Bearer token | Daftar pengeluaran |
| POST | `/api/v1/expenses` | Bearer token | Tambah pengeluaran |
| GET | `/api/v1/reports/summary` | Bearer token | Rekap pendapatan, pengeluaran, dan saldo |

### Daftar owner

```json
{
  "name": "Pemilik WiFi",
  "email": "owner@example.com",
  "password": "password-kuat"
}
```

### Login email

```json
{
  "email": "owner@example.com",
  "password": "password-kuat"
}
```

### Login Google

Frontend mengirim ID token yang diterima dari Google Identity Services:

```json
{
  "credential": "eyJhbGciOiJSUzI1NiIs..."
}
```

Server memverifikasi signature, audience, issuer, dan masa berlaku token melalui `google-auth-library`. Isi `GOOGLE_CLIENT_ID` pada backend dengan Web Client ID yang sama dengan frontend.

## Contoh persiapan MySQL

Jalankan sebagai administrator MySQL, lalu gunakan password yang kuat:

```sql
CREATE DATABASE kas_wifi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kas_wifi_user'@'localhost' IDENTIFIED BY 'password-yang-kuat';
GRANT ALL PRIVILEGES ON kas_wifi.* TO 'kas_wifi_user'@'localhost';
FLUSH PRIVILEGES;
```

Sesuaikan koneksinya di `.env`:

```env
DATABASE_URL="mysql://kas_wifi_user:password-yang-kuat@localhost:3306/kas_wifi"
```

## Pembayaran pelanggan

Contoh request pembayaran tagihan bulan Agustus 2026:

```json
{
  "paymentMonth": "2026-08",
  "amount": 150000,
  "notes": "Pembayaran tunai"
}
```

Pembuatan pembayaran dan pendapatan dijalankan dalam satu transaksi database. Kombinasi pelanggan dan bulan pembayaran bersifat unik sehingga bulan yang sama tidak dapat dibayar dua kali.

## Filter laporan

```text
GET /api/v1/reports/summary?startDate=2026-08-01&endDate=2026-08-31
```

### Tambah user bawahan

Kirim header `Authorization: Bearer <access-token-owner>`.

```json
{
  "name": "Customer Service",
  "email": "cs@example.com",
  "password": "password-kuat",
  "role": "CS"
}
```
