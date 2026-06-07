const axios = require('axios');
const { normalizeMobile } = require('../utils/mobile');

// bulksmsbd.net API — https://bulksmsbd.net/api/smsapi
// Parameters: api_key, type, number (8801XXXXXXXXX), senderid, message
// Response codes: 202 = success, anything else = failure
async function sendViaBulkSmsBD(mobile, message) {
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || '';

  if (!apiKey) {
    console.log(`[এসএমএস স্টাব] ${mobile}: ${message}`);
    return { stub: true };
  }

  const params = {
    api_key: apiKey,
    type: 'text',
    number: mobile,
    senderid: senderId,
    message,
  };

  console.log(`[SMS] অনুরোধ পাঠানো হচ্ছে → ${mobile}`);
  console.log(`[SMS] senderid="${senderId}" number="${mobile}" message="${message}"`);

  const response = await axios.get('http://bulksmsbd.net/api/smsapi', {
    params,
    timeout: 15000,
  });

  const data = response.data;
  console.log('[SMS] BulkSMSBD প্রতিক্রিয়া:', JSON.stringify(data));

  // BulkSMSBD returns { response_code: 202, ... } on success
  if (data && data.response_code && data.response_code !== 202) {
    throw new Error(
      `SMS পাঠাতে ব্যর্থ। BulkSMSBD কোড: ${data.response_code}` +
      (data.error_message ? ` — ${data.error_message}` : '')
    );
  }

  return data;
}

async function sendSMS(mobile, message) {
  const normalized = normalizeMobile(mobile);
  const provider = (process.env.SMS_PROVIDER || 'bulksmsbd').toLowerCase();
  console.log(`[SMS] প্রদানকারী: ${provider} → ${normalized}`);

  return sendViaBulkSmsBD(normalized, message);
}

async function sendOtp(mobile, code) {
  const message = `তাবলিগ অ্যাপ: আপনার পিন রিকভারি কোড ${code}। কেউ জানাবেন না।`;
  return sendSMS(mobile, message);
}

module.exports = { sendSMS, sendOtp };
