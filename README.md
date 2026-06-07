# তাবলিগ অ্যাপ (TabligApp)

যার্ন ওয়ার্কস্পেস মনোরেপো — মোবাইল (Expo Go) + সার্ভার (Node/Express + MongoDB)।

## স্ট্রাকচার

```
TabligApp/
  package.json          # রুট — একটাই package.json
  apps/
    mobile/             # Expo Go অ্যাপ (নিজস্ব node_modules)
    server/             # Express REST API (নিজস্ব node_modules)
```

## প্রয়োজনীয় সফটওয়্যার

- Node.js 18+
- Yarn
- Expo Go (ফোনে)

## ইনস্টল

```bash
cd TabligApp
yarn install
```

## সার্ভার চালানো

```bash
# apps/server/.env ফাইলে MONGODB_URI সেট করুন
yarn server
```

সার্ভার ডিফল্ট: `http://localhost:3004`

### MongoDB Atlas

- Atlas Network Access-এ `0.0.0.0/0` অনুমতি দিন (Render ডিপ্লয়ের জন্য)
- পাসওয়ার্ডে `@` বা `!` থাকলে URL-এ এনকোড করুন (`%40`, `%21`)

### Render.com ডিপ্লয়

1. GitHub রিপো কানেক্ট করুন
2. Root Directory: `apps/server`
3. Build: `yarn install`
4. Start: `yarn start`
5. Environment Variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `JWT_RESET_SECRET`
   - `SMS_API_KEY` (ঐচ্ছিক)
   - `SMS_PROVIDER` (`bulksmsbd` বা `sslwireless`)

## মোবাইল অ্যাপ চালানো

```bash
# apps/mobile/.env
# EXPO_PUBLIC_API_URL=http://YOUR_IP:3004/api

yarn mobile
```

ফিজিক্যাল ডিভাইসে টেস্ট করলে `localhost` এর বদলে কম্পিউটারের LAN IP ব্যবহার করুন।

## API এন্ডপয়েন্ট

| মেথড | পাথ | বিবরণ |
|------|-----|--------|
| POST | `/api/auth/signup` | সাইন আপ |
| POST | `/api/auth/login` | লগইন (মোবাইল + পিন) |
| POST | `/api/auth/forgot-pin` | ওটিপি পাঠান |
| POST | `/api/auth/verify-otp` | ওটিপি যাচাই |
| POST | `/api/auth/reset-pin` | পিন রিসেট |
| GET | `/api/masjids` | মসজিদ তালিকা |
| GET | `/api/constants` | ড্রপডাউন মান |
| POST/GET/PUT | `/api/persons` | সাথী/ছাত্র CRUD |
| GET/POST | `/api/persons/:id/karguzari` | কারগুজারি |

## এসএমএস (পিন রিকভারি)

বাংলাদেশে সম্পূর্ণ ফ্রি SMS API নেই। BulkSMSBD বা SSL Wireless ব্যবহার করুন।
`SMS_API_KEY` না থাকলে ডেভ মোডে OTP কনসোলে লগ হয়।

## মূল ফিচার

- মোবাইল + পিন দিয়ে লগইন/সাইন আপ
- জিম্মাদার সাথী ও ছাত্র যোগ/সম্পাদনা
- ফোন নম্বর মিললে অ্যাকাউন্ট দাবি → তথ্য লক
- সাথী খুঁজুন (নাম, ক্লাস, স্কুল, মোবাইল, মসজিদ)
- মেহনতের কারগুজারি যোগ ও দেখা
- সম্পূর্ণ বাংলা UI
