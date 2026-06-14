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

প্রথমে `apps/mobile/.env` সেট করুন (`.env.example` দেখুন):

```bash
EXPO_PUBLIC_API_URL=http://YOUR_IP:3004/api
RCT_METRO_PORT=8082
```

ফিজিক্যাল ডিভাইসে টেস্ট করলে `localhost` এর বদলে কম্পিউটারের LAN IP ব্যবহার করুন।

এই অ্যাপ **Expo Go**-তে চলে না — **dev client** (নেটিভ বিল্ড) দরকার (`expo-dev-client`)।

### ১) নেটিভ অ্যাপ লোকাল ডেভেলপমেন্টে চালানো

রুট থেকে (প্রথম বিল্ড বা ক্লিন রিবিল্ড):

```bash
yarn mobile:android:clean
```

সাধারণ রিবিল্ড ও ইনস্টল (ক্লিন ছাড়া):

```bash
yarn mobile:android
```

`apps/mobile` থেকে সরাসরি:

```bash
cd apps/mobile
yarn android:clean   # ক্লিন + বিল্ড + ইনস্টল + Metro
# অথবা
yarn android         # ক্লিন ছাড়া
```

এই কমান্ডগুলো `expo run:android` চালায় — নেটিভ APK বিল্ড করে ডিভাইস/এমুলেটরে ইনস্টল করে, তারপর Metro (পোর্ট `8082`) চালু রাখে।

### ২) শুধু Metro সার্ভার চালানো

অ্যাপ ইতিমধ্যে ডিভাইসে ইনস্টল থাকলে JS বান্ডল সার্ভ করতে শুধু Metro দরকার:

```bash
yarn mobile
```

(`expo start --dev-client --port 8082` — নেটিভ অ্যাপ রিবিল্ড/ইনস্টল **না** করে)

### ৩) রিলিজ APK বিল্ড

**প্রয়োজনীয় সফটওয়্যার:**

- Node.js 18+, Yarn (`yarn install` রুটে)
- Android SDK + JDK (Android Studio ইনস্টল করলে সাধারণত আসে)
- `ANDROID_HOME` সেট (SDK path)
- `apps/mobile/.env` — `EXPO_PUBLIC_API_URL` প্রোডাকশন/টেস্ট API URL
- প্রোডাকশন রিলিজের জন্য: সাইনিং keystore (বর্তমানে `build.gradle` ডিবাগ কী দিয়ে রিলিজ সাইন করে — স্টোরে আপলোডের আগে প্রোডাকশন keystore সেট করুন)

**বিল্ড কমান্ড:**

```bash
cd apps/mobile/android
./gradlew clean assembleRelease
```

**APK যেখানে পড়ে:**

```
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

ডিভাইসে সরাসরি ইনস্টল:

```bash
adb install apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

## API এন্ডপয়েন্ট


| মেথড         | পাথ                          | বিবরণ               |
| ------------ | ---------------------------- | ------------------- |
| POST         | `/api/auth/signup`           | সাইন আপ             |
| POST         | `/api/auth/login`            | লগইন (মোবাইল + পিন) |
| POST         | `/api/auth/forgot-pin`       | ওটিপি পাঠান         |
| POST         | `/api/auth/verify-otp`       | ওটিপি যাচাই         |
| POST         | `/api/auth/reset-pin`        | পিন রিসেট           |
| GET          | `/api/masjids`               | মসজিদ তালিকা        |
| GET          | `/api/constants`             | ড্রপডাউন মান        |
| POST/GET/PUT | `/api/persons`               | সাথী/ছাত্র CRUD     |
| GET/POST     | `/api/persons/:id/karguzari` | কারগুজারি           |


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

