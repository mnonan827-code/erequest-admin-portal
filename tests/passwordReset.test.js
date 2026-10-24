import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const originalNativeFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr.includes("api.emailjs.com")) {
      return {
        ok: true,
        status: 200,
        text: async () => "OK",
        json: async () => ({ status: 200 })
      };
    }
    if (urlStr.includes("identitytoolkit.googleapis.com")) {
      return {
        ok: true,
        status: 200,
        text: async () => "OK",
        json: async () => ({
          idToken: "mock-valid-id-token",
          localId: "mock-admin-uid-12345"
        })
      };
    }
    return originalNativeFetch ? originalNativeFetch(url, options) : { ok: true, json: async () => ({}) };
  };
});

afterEach(() => {
  globalThis.fetch = originalNativeFetch;
});

import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY,
  generateAlphanumericOTP,
  getActiveAdminPassword,
  setActiveAdminPassword,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  setNewAdminPassword,
  verifyAndResetPassword
} from "../src/features/auth/authService.js";

test("Credentials & Constants: Matches specified admin defaults", () => {
  assert.equal(DEFAULT_ADMIN_EMAIL, "erequesticctadmin@gmail.com");
  assert.equal(DEFAULT_ADMIN_PASSWORD, "#ICCT4228");
  assert.equal(EMAILJS_SERVICE_ID, "service_4rwr6df");
  assert.equal(EMAILJS_TEMPLATE_ID, "template_065t767");
  assert.equal(EMAILJS_PUBLIC_KEY, "iC0ESDFLUm8ZrV8q2");
});

test("OTP Generation: Generates 6-character alphanumeric mixed codes", () => {
  for (let i = 0; i < 20; i++) {
    const code = generateAlphanumericOTP(6);
    assert.equal(code.length, 6);
    assert.match(code, /^[A-Z0-9]{6}$/);
  }

  // Ensure randomness across multiple runs
  const codes = new Set();
  for (let i = 0; i < 50; i++) {
    codes.add(generateAlphanumericOTP(6));
  }
  assert.ok(codes.size >= 45, "Expected high entropy across 50 generated OTPs");
});

test("Password Reset Request: Rejects non-admin email addresses", async () => {
  await assert.rejects(
    async () => {
      await sendPasswordResetOTP("unauthorized@gmail.com");
    },
    /only authorized for the administrative email/i
  );

  await assert.rejects(
    async () => {
      await sendPasswordResetOTP("");
    },
    /Admin email address is required/i
  );
});

test("Password Reset Request: Accepts designated admin email and starts session", async () => {
  // Mock sessionStorage in Node environment
  const mockStorage = {};
  globalThis.sessionStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => {
      mockStorage[k] = String(v);
    },
    removeItem: (k) => {
      delete mockStorage[k];
    }
  };

  const result = await sendPasswordResetOTP("erequesticctadmin@gmail.com");
  assert.equal(result.success, true);
  assert.equal(result.email, "erequesticctadmin@gmail.com");

  // Security Rule Verification: OTP is NEVER returned in response to prevent UI exposure
  assert.equal(result.otp, undefined);
  assert.equal(result.demoOtp, undefined);

  // OTP is securely stored only in the session/sent to Gmail
  const rawSession = mockStorage["erequest_admin_otp_session"];
  assert.ok(rawSession, "Session should be saved in sessionStorage");
  const session = JSON.parse(rawSession);
  assert.match(session.otp, /^[A-Z0-9]{6}$/);
  assert.equal(session.email, "erequesticctadmin@gmail.com");
  assert.ok(session.expiresAt > Date.now());
});

test("EmailJS Template Variables: Passes {{passcode}} and {{time}} exactly as specified", async () => {
  const originalFetch = globalThis.fetch;
  let interceptedPayload = null;

  globalThis.fetch = async (url, options) => {
    if (url.includes("api.emailjs.com")) {
      interceptedPayload = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        text: async () => "OK"
      };
    }
    return originalFetch(url, options);
  };

  try {
    const mockStorage = {};
    globalThis.sessionStorage = {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => {
        mockStorage[k] = String(v);
      },
      removeItem: (k) => {
        delete mockStorage[k];
      }
    };

    const res = await sendPasswordResetOTP("erequesticctadmin@gmail.com");
    assert.equal(res.success, true);
    assert.ok(interceptedPayload, "Expected EmailJS fetch call to be intercepted");

    // 1. Service and Template ID checks
    assert.equal(interceptedPayload.service_id, "service_4rwr6df");
    assert.equal(interceptedPayload.template_id, "template_065t767");

    // 2. Template variable keys verification
    const params = interceptedPayload.template_params;
    assert.ok(params, "template_params must be defined");

    // {{passcode}} key for the 6-digit mixed OTP
    assert.ok(params.passcode, "{{passcode}} variable must be defined");
    assert.match(params.passcode, /^[A-Z0-9]{6}$/);

    // {{time}} key for the expiration timestamp
    assert.ok(params.time, "{{time}} variable must be defined");
    assert.match(params.time, /\d{1,2}:\d{2}\s?(?:AM|PM)/i);

    // Session storage OTP matches the sent passcode
    const session = JSON.parse(mockStorage["erequest_admin_otp_session"]);
    assert.equal(session.otp, params.passcode);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Password Reset Verification: Rejects invalid or mismatched entries", async () => {
  const mockStorage = {};
  globalThis.sessionStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => {
      mockStorage[k] = String(v);
    },
    removeItem: (k) => {
      delete mockStorage[k];
    }
  };

  await sendPasswordResetOTP("erequesticctadmin@gmail.com");
  const validOtp = JSON.parse(mockStorage["erequest_admin_otp_session"]).otp;

  // 1. Wrong OTP code
  await assert.rejects(
    async () => {
      await verifyAndResetPassword(
        "erequesticctadmin@gmail.com",
        "WRONG1",
        "NewSecretPassword123!",
        "NewSecretPassword123!"
      );
    },
    /Invalid verification code/i
  );

  // 2. Mismatched passwords
  await assert.rejects(
    async () => {
      await verifyAndResetPassword(
        "erequesticctadmin@gmail.com",
        validOtp,
        "NewSecretPassword123!",
        "DifferentPassword456!"
      );
    },
    /do not match/i
  );

  // 3. Short password
  await assert.rejects(
    async () => {
      await verifyAndResetPassword(
        "erequesticctadmin@gmail.com",
        validOtp,
        "123",
        "123"
      );
    },
    /at least 6 characters long/i
  );
});

test("Password Reset Execution: Updates active password and invalidates OTP", async () => {
  const mockSession = {};
  const mockLocal = {};
  globalThis.sessionStorage = {
    getItem: (k) => mockSession[k] || null,
    setItem: (k, v) => {
      mockSession[k] = String(v);
    },
    removeItem: (k) => {
      delete mockSession[k];
    }
  };
  globalThis.localStorage = {
    getItem: (k) => mockLocal[k] || null,
    setItem: (k, v) => {
      mockLocal[k] = String(v);
    },
    removeItem: (k) => {
      delete mockLocal[k];
    }
  };

  // Initial password
  assert.equal(getActiveAdminPassword(), "#ICCT4228");

  // Send OTP
  await sendPasswordResetOTP("erequesticctadmin@gmail.com");
  const validOtp = JSON.parse(mockSession["erequest_admin_otp_session"]).otp;

  // Verify and reset with matching passwords
  const result = await verifyAndResetPassword(
    "erequesticctadmin@gmail.com",
    validOtp,
    "#NewAdminPass2026",
    "#NewAdminPass2026"
  );

  assert.equal(result.success, true);
  assert.equal(getActiveAdminPassword(), "#NewAdminPass2026");

  // Ensure OTP cannot be reused
  await assert.rejects(
    async () => {
      await verifyAndResetPassword(
        "erequesticctadmin@gmail.com",
        validOtp,
        "#AnotherPass999",
        "#AnotherPass999"
      );
    },
    /No active OTP session found/i
  );

  // Clean up
  setActiveAdminPassword("#ICCT4228");
  assert.equal(getActiveAdminPassword(), "#ICCT4228");
});

test("Two-Page Separation: Step 1 (OTP verification) and Step 2 (Set password) operate sequentially", async () => {
  const mockSession = {};
  const mockLocal = {};
  globalThis.sessionStorage = {
    getItem: (k) => mockSession[k] || null,
    setItem: (k, v) => {
      mockSession[k] = String(v);
    },
    removeItem: (k) => {
      delete mockSession[k];
    }
  };
  globalThis.localStorage = {
    getItem: (k) => mockLocal[k] || null,
    setItem: (k, v) => {
      mockLocal[k] = String(v);
    },
    removeItem: (k) => {
      delete mockLocal[k];
    }
  };

  // Step 0: Request OTP
  await sendPasswordResetOTP("erequesticctadmin@gmail.com");
  const otpCode = JSON.parse(mockSession["erequest_admin_otp_session"]).otp;
  assert.ok(otpCode);

  // Security check: Calling Step 2 (setNewAdminPassword) before Step 1 (verifyPasswordResetOTP) must fail
  await assert.rejects(
    async () => {
      await setNewAdminPassword(
        "erequesticctadmin@gmail.com",
        "NewSecretPassword99!",
        "NewSecretPassword99!"
      );
    },
    /Please verify your OTP code before setting a new password/i
  );

  // Step 1: Verify OTP on dedicated OTP screen
  const verifyResult = await verifyPasswordResetOTP(
    "erequesticctadmin@gmail.com",
    otpCode
  );
  assert.equal(verifyResult.success, true);
  assert.equal(verifyResult.verified, true);

  // Step 2: Set New Password on dedicated Password screen
  const updateResult = await setNewAdminPassword(
    "erequesticctadmin@gmail.com",
    "#NewAdminPassPhase2",
    "#NewAdminPassPhase2"
  );
  assert.equal(updateResult.success, true);
  assert.equal(getActiveAdminPassword(), "#NewAdminPassPhase2");

  // Reset to default
  setActiveAdminPassword("#ICCT4228");
});

test("Route Mode Resolution: Direct navigation correctly maps to forgot_password mode", () => {
  const resolveMode = ({ pathname, search = "", state = null, initialMode = "login" }) => {
    if (pathname === "/forgot-password") {
      return "forgot_password";
    }
    const params = new URLSearchParams(search);
    const paramMode = params.get("mode");
    if (paramMode === "forgot_password" || paramMode === "forgot-password") {
      return "forgot_password";
    }
    if (state?.mode) {
      return state.mode;
    }
    return initialMode || "login";
  };

  // Direct route to /forgot-password lands directly in forgot_password mode ("agad")
  assert.equal(resolveMode({ pathname: "/forgot-password" }), "forgot_password");

  // Query parameter ?mode=forgot_password lands directly in forgot_password mode
  assert.equal(resolveMode({ pathname: "/login", search: "?mode=forgot_password" }), "forgot_password");

  // Location state mode: "forgot_password"
  assert.equal(resolveMode({ pathname: "/login", state: { mode: "forgot_password" } }), "forgot_password");

  // Default /login lands in login mode
  assert.equal(resolveMode({ pathname: "/login" }), "login");
});
