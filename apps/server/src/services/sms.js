const axios = require("axios");
const { normalizeMobile } = require("../utils/mobile");
const { isUnicodeMessage } = require("../utils/smsLimits");

// bulksmsbd.net API — https://bulksmsbd.com/bulksms-api-bangladesh.php
// Parameters: api_key, type (text|unicode), number (8801XXXXXXXXX), senderid, message
// Response codes: 202 = success, anything else = failure
async function sendViaBulkSmsBD(mobile, message) {
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || "";

  if (!apiKey) {
    console.log(`[এসএমএস স্টাব] ${mobile}: ${message}`);
    return { stub: true };
  }

  const smsType = isUnicodeMessage(message) ? "unicode" : "text";
  const params = {
    api_key: apiKey,
    type: smsType,
    number: mobile,
    senderid: senderId,
    message,
  };

  console.log(`[SMS] অনুরোধ পাঠানো হচ্ছে → ${mobile}`);
  console.log(
    `[SMS] type="${smsType}" senderid="${senderId}" number="${mobile}" message="${message}"`,
  );

  const response = await axios.get("http://bulksmsbd.net/api/smsapi", {
    params,
    timeout: 15000,
  });

  const data = response.data;
  console.log("[SMS] BulkSMSBD প্রতিক্রিয়া:", JSON.stringify(data));

  // BulkSMSBD returns { response_code: 202, ... } on success
  if (data && data.response_code && data.response_code !== 202) {
    throw new Error(
      `SMS পাঠাতে ব্যর্থ। BulkSMSBD কোড: ${data.response_code}` +
        (data.error_message ? ` — ${data.error_message}` : ""),
    );
  }

  return data;
}

async function sendSMS(mobile, message) {
  const normalized = normalizeMobile(mobile);
  const provider = (process.env.SMS_PROVIDER || "bulksmsbd").toLowerCase();
  console.log(`[SMS] প্রদানকারী: ${provider} → ${normalized}`);

  return sendViaBulkSmsBD(normalized, message);
}

/** Admin-composed SMS — sent exactly as composed in the client. */
async function sendCustomUserSms(mobile, message) {
  return sendSMS(mobile, message);
}

async function sendOtp(mobile, code) {
  const message = `তাবলিগ অ্যাপ: আপনার পিন রিকভারি কোড ${code}। কেউ জানাবেন না।`;
  return sendSMS(mobile, message);
}

function buildAdminGrantedMessage(pin) {
  return (
    `তাবলীগ হালকা 226 থেকে - আসসালামু আলাইকুম| ` +
    `তাবলিগ অ্যাপে আপনাকে এডমিন করা হয়েছে| ` +
    `অ্যাপে লগইন করুন| ` +
    `আপনার পিনটি হলো ${pin}`
  );
}

async function sendAdminGrantedSms(mobile, pin) {
  return sendSMS(mobile, buildAdminGrantedMessage(pin));
}

function buildSignupApprovalMessage({ name, houseAddress, masjid, mobile, code }) {
  const house = houseAddress?.trim() || "—";
  return (
    `তাবলিগ অ্যাপ — নতুন অ্যাকাউন্ট অনুরোধ:\n` +
    `নাম: ${name}\n` +
    `বাসা: ${house}\n` +
    `মসজিদ: ${masjid}\n` +
    `মোবাইল: ${mobile}\n` +
    `নিরাপত্তা কোড: ${code}`
  );
}

function buildSignupWelcomeMessage(pin) {
  return (
    `তাবলিগ অ্যাপ: আপনার অ্যাকাউন্ট তৈরি হয়েছে। স্বাগতম! ` +
    `আপনার পিন: ${pin}। এখনই লগইন করুন।`
  );
}

async function sendSignupApprovalSms(superAdminMobile, details) {
  return sendSMS(superAdminMobile, buildSignupApprovalMessage(details));
}

async function sendSignupWelcomeSms(mobile, pin) {
  return sendSMS(mobile, buildSignupWelcomeMessage(pin));
}

module.exports = {
  sendSMS,
  sendCustomUserSms,
  sendOtp,
  buildAdminGrantedMessage,
  sendAdminGrantedSms,
  buildSignupApprovalMessage,
  buildSignupWelcomeMessage,
  sendSignupApprovalSms,
  sendSignupWelcomeSms,
};
