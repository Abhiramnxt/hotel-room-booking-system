/**
 * Sai Nirvana Plaza - Enterprise WhatsApp Service Layer
 * Powered by Meta WhatsApp Cloud API
 */

import 'dotenv/config';

export interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  businessAccountId: string;
  isConfigured: boolean;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  statusCode?: number;
  apiResponse?: string;
  failureReason?: string;
  recipientPhone: string;
}

// Simple in-memory cache to prevent duplicate message delivery (expires in 10 seconds)
const duplicateCache = new Set<string>();

/**
 * Validates Meta WhatsApp Cloud API credentials at startup.
 */
export function validateEnvironment(): WhatsAppConfig {
  const token = (process.env.WHATSAPP_TOKEN || '').trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const businessAccountId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim();

  const isConfigured = !!(
    token && 
    token !== 'MY_WHATSAPP_TOKEN' && 
    phoneNumberId && 
    phoneNumberId !== 'MY_PHONE_NUMBER_ID'
  );

  console.log("=== META WHATSAPP CLOUD API CONFIGURATION ===");
  console.log(`* WHATSAPP_PHONE_NUMBER_ID: ${phoneNumberId ? 'PRESENT (' + phoneNumberId.substring(0, 8) + '...)' : 'MISSING'}`);
  console.log(`* WHATSAPP_TOKEN: ${token ? 'PRESENT' : 'MISSING'}`);
  console.log(`* WHATSAPP_BUSINESS_ACCOUNT_ID: ${businessAccountId ? 'PRESENT' : 'MISSING'}`);
  console.log(`* Service Status: ${isConfigured ? '🟢 READY (Production Mode)' : '🟡 SIMULATION (Offline Mock Mode)'}`);

  return { token, phoneNumberId, businessAccountId, isConfigured };
}

/**
 * Automatically formats all Indian mobile numbers for WhatsApp communication.
 * - If a number contains exactly 10 digits, automatically prepends +91.
 * - Removes spaces, dashes, brackets, and special characters.
 * - Prevents duplicate country codes (e.g. 91919876543210 -> +91 9876543210).
 * - Standardizes formatting to: +91 9876543210
 */
export function formatIndianPhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Clean from spaces, dashes, brackets, and special characters, keeping only digits
  let digits = phone.trim().replace(/\D/g, '');

  if (digits.length === 0) return null;

  // If it starts with leading zero (e.g., 09876543210), strip it
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Handle duplicate country codes (e.g., starts with 9191 and length is 14 digits)
  if (digits.startsWith('9191') && digits.length === 14) {
    digits = digits.substring(2);
  }

  if (digits.length === 10) {
    return `+91 ${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.substring(2)}`;
  } else if (digits.length > 10 && digits.length <= 15) {
    if (digits.startsWith('91')) {
      return `+91 ${digits.substring(2)}`;
    }
    return `+${digits}`;
  }

  return null;
}

/**
 * Parses and sanitizes a phone number to standard Meta WhatsApp digits-only format.
 */
export function sanitizePhoneNumber(phone: string): string | null {
  const formatted = formatIndianPhoneNumber(phone);
  if (!formatted) return null;
  return formatted.replace(/\D/g, '');
}

/**
 * Calculates string hash for duplicate prevention.
 */
function getHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * Helper to pause execution for throttling.
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sends a single text message through Meta WhatsApp Cloud API with automatic retry and backoff logic.
 */
export async function sendWhatsAppMessage(
  phone: string, 
  message: string, 
  config: WhatsAppConfig
): Promise<SendMessageResult> {
  
  // 1. Phone number formatting & validation
  const formattedPhone = formatIndianPhoneNumber(phone);
  if (!formattedPhone) {
    return {
      success: false,
      failureReason: "Invalid recipient phone number format. Must contain a valid country code and local digits.",
      recipientPhone: phone
    };
  }

  // Meta API expects digits only (E.164 number without '+' prefix and spaces)
  const metaRecipientPhone = formattedPhone.replace(/\D/g, '');

  // 2. Duplicate detection
  const msgHash = getHash(message);
  const cacheKey = `${metaRecipientPhone}:${msgHash}`;
  if (duplicateCache.has(cacheKey)) {
    console.warn(`[WhatsAppService] Duplicate message detected for ${formattedPhone}. Throttling dispatch.`);
    return {
      success: false,
      failureReason: "Duplicate message delivery prevented.",
      recipientPhone: formattedPhone
    };
  }

  // Register in cache for 10 seconds to prevent double triggers
  duplicateCache.add(cacheKey);
  setTimeout(() => duplicateCache.delete(cacheKey), 10000);

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: metaRecipientPhone,
    type: "text",
    text: {
      preview_url: false,
      body: message
    }
  };

  // 3. Fallback simulation mode
  if (!config.isConfigured) {
    console.log("* Meta WhatsApp API credentials not configured. Using simulated HTTP bin relay...");
    try {
      const proxyRes = await fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: "Meta WhatsApp Cloud API (Simulated)",
          endpoint: `https://graph.facebook.com/v20.0/MOCK_PHONE_NUMBER_ID/messages`,
          payload: payload
        })
      });

      if (!proxyRes.ok) {
        throw new Error("Meta WhatsApp Cloud API mock relay transmission failure.");
      }

      const responseText = await proxyRes.text();
      return {
        success: true,
        messageId: `sim-msg-${Math.floor(100000000 + Math.random() * 900000000)}`,
        statusCode: 200,
        apiResponse: responseText.substring(0, 1000),
        recipientPhone: formattedPhone
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        failureReason: err.message || "Simulated mock relay failure.",
        recipientPhone: formattedPhone
      };
    }
  }

  // 4. Production API calls with exponential backoff retries for transient errors
  const maxRetries = 3;
  let attempt = 0;
  let lastErrorMsg = "";
  let lastStatus = 500;
  let lastApiResponse = "";

  while (attempt <= maxRetries) {
    if (attempt > 0) {
      const waitTime = Math.pow(2, attempt) * 150; // 300ms, 600ms, 1200ms
      console.log(`[WhatsAppService] Retrying send to ${formattedPhone} (attempt ${attempt}/${maxRetries}) in ${waitTime}ms...`);
      await delay(waitTime);
    }

    try {
      const apiEndpoint = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;

      console.log("================================");
      console.log("Guest Number:", phone);
      console.log("Recipient Number:", metaRecipientPhone);
      console.log("================================");

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      lastStatus = response.status;
      lastApiResponse = await response.text();

      if (response.ok) {
        let messageId = "";
        try {
          const parsed = JSON.parse(lastApiResponse);
          messageId = parsed?.messages?.[0]?.id || "";
        } catch (e) {}

        if (!messageId) {
          return {
            success: false,
            failureReason: "Meta API response did not contain a valid message ID.",
            statusCode: lastStatus,
            apiResponse: lastApiResponse,
            recipientPhone: formattedPhone
          };
        }

        return {
          success: true,
          messageId: messageId,
          statusCode: lastStatus,
          apiResponse: lastApiResponse,
          recipientPhone: formattedPhone
        };
      }

      // Check if error is transient (e.g. rate limits or server issue)
      let isTransient = false;
      try {
        const parsed = JSON.parse(lastApiResponse);
        const errCode = parsed?.error?.code;
        const errType = parsed?.error?.type;
        
        // Meta Transient codes: 4 (request limit reached), 17 (API User Rate Limit reached), 
        // 80007 (Rate limit exceeded), 5xx status codes
        if (errCode === 4 || errCode === 17 || errCode === 80007 || lastStatus >= 500) {
          isTransient = true;
        }
        lastErrorMsg = parsed?.error?.message || "Meta API request failure.";
      } catch (e) {
        lastErrorMsg = `Meta API request failure (Status: ${lastStatus}).`;
      }

      if (!isTransient) {
        // Stop retries immediately for authentication, authorization, or invalid payload errors
        return {
          success: false,
          statusCode: lastStatus,
          apiResponse: lastApiResponse,
          failureReason: lastErrorMsg,
          recipientPhone: formattedPhone
        };
      }

    } catch (err: any) {
      lastErrorMsg = err.message || "Network connection failure.";
      // Network exceptions are treated as transient failures
    }

    attempt++;
  }

  return {
    success: false,
    statusCode: lastStatus,
    apiResponse: lastApiResponse,
    failureReason: `${lastErrorMsg} (All ${maxRetries} retry attempts exhausted.)`,
    recipientPhone: formattedPhone
  };
}
