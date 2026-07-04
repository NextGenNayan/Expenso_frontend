/* =========================================================
   Expenso — Expense Tracker
   auth.js — front-end demo authentication for login.html

   Stores a small user table in localStorage so sign-up +
   login feels real across a refresh. This is a front-end
   demo only: passwords are NOT hashed/salted and nothing is
   sent to a server. Do not reuse this pattern for production.
   ========================================================= */
   const API_URL = "http://localhost:4000/api";
   

const Auth = (function () {

  const USERS_KEY = "expenso_users_v1";
  const SESSION_KEY = "expenso_session_v1";

  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
    catch (e) { /* localStorage unavailable — demo state won't persist */ }
  }

  function findUser(email) {
    return loadUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  function signUp(name, email, password) {
    const users = loadUsers();
    if (findUser(email)) {
      return { ok: false, error: "An account with that email already exists." };
    }
    const user = { name, email, password };
    users.push(user);
    saveUsers(users);
    setSession(email, true);
    return { ok: true, user };
  }

  function logIn(email, password, remember) {
    const user = findUser(email);
    if (!user || user.password !== password) {
      return { ok: false, error: "That email and password don't match." };
    }
    setSession(email, remember);
    return { ok: true, user };
  }

  function setSession(email, remember) {
    const store = remember ? localStorage : sessionStorage;
    try { store.setItem(SESSION_KEY, JSON.stringify({ email, remember })); }
    catch (e) { /* ignore */ }
  }

  function currentSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function logOut() {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignore */ }
  }

  return { signUp, logIn, currentSession, logOut, findUser };
})();


document.addEventListener("DOMContentLoaded", () => {

  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const authHeadTitle = document.getElementById("authHeadTitle");
  const authHeadSub = document.getElementById("authHeadSub");
  const authAlert = document.getElementById("authAlert");
  const footerLinkText = document.getElementById("footerLinkText");

  function showAlert(message, type) {
    authAlert.textContent = message;
    authAlert.classList.remove("success");
    if (type === "success") authAlert.classList.add("success");
    authAlert.classList.add("show");
  }
  function hideAlert() {
    authAlert.classList.remove("show");
  }

  function switchTab(mode) {
    hideAlert();
    if (mode === "signup") {
      tabSignup.classList.add("active");
      tabLogin.classList.remove("active");
      loginForm.style.display = "none";
      signupForm.style.display = "block";
      authHeadTitle.textContent = "Create your account";
      authHeadSub.textContent = "Start tracking your money in under a minute.";
      footerLinkText.innerHTML = 'Already have an account? <a href="#" id="toLogin">Log in</a>';
    } else {
      tabLogin.classList.add("active");
      tabSignup.classList.remove("active");
      signupForm.style.display = "none";
      loginForm.style.display = "block";
      authHeadTitle.textContent = "Welcome back";
      authHeadSub.textContent = "Log in to see where your money went this month.";
      footerLinkText.innerHTML = 'New to Expenso? <a href="#" id="toSignup">Create an account</a>';
    }
    bindFooterLink();
  }

  function bindFooterLink() {
    const toSignup = document.getElementById("toSignup");
    const toLogin = document.getElementById("toLogin");
    if (toSignup) toSignup.addEventListener("click", (e) => { e.preventDefault(); switchTab("signup"); });
    if (toLogin) toLogin.addEventListener("click", (e) => { e.preventDefault(); switchTab("login"); });
  }

  if (tabLogin && tabSignup) {
    tabLogin.addEventListener("click", () => switchTab("login"));
    tabSignup.addEventListener("click", () => switchTab("signup"));
    bindFooterLink();
  }

  // Password show/hide toggles
  document.querySelectorAll(".field-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.innerHTML = isPassword
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';
    });
  });

  // Live password-strength meter on the sign-up form
  const signupPassword = document.getElementById("signupPassword");
  const strengthBars = document.querySelectorAll(".password-strength i");
  const strengthLabel = document.getElementById("strengthLabel");
  if (signupPassword) {
    signupPassword.addEventListener("input", () => {
      const val = signupPassword.value;
      let score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 10) score++;
      if (/[0-9]/.test(val) && /[a-zA-Z]/.test(val)) score++;
      if (/[^a-zA-Z0-9]/.test(val)) score++;
      strengthBars.forEach((bar, i) => bar.classList.toggle("on", i < score));
      const labels = ["Too short", "Weak", "Okay", "Good", "Strong"];
      strengthLabel.textContent = val ? labels[score] : "";
    });
  }

  function setFieldError(fieldEl, errorEl, message) {
    fieldEl.classList.toggle("has-error", !!message);
    if (errorEl) {
      errorEl.textContent = message || "";
      errorEl.classList.toggle("show", !!message);
    }
  }

  // ----- Login form -----
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const emailInput = document.getElementById("loginEmail");
      const passwordInput = document.getElementById("loginPassword");
      const remember = document.getElementById("rememberMe").checked;

      let valid = true;
      if (!/^\S+@\S+\.\S+$/.test(emailInput.value.trim())) {
        setFieldError(emailInput.closest(".field"), document.getElementById("loginEmailError"), "Enter a valid email address.");
        valid = false;
      } else {
        setFieldError(emailInput.closest(".field"), document.getElementById("loginEmailError"), "");
      }
      if (!passwordInput.value) {
        setFieldError(passwordInput.closest(".field"), document.getElementById("loginPasswordError"), "Password is required.");
        valid = false;
      } else {
        setFieldError(passwordInput.closest(".field"), document.getElementById("loginPasswordError"), "");
      }
      if (!valid) return;

      try {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: emailInput.value.trim(),
      password: passwordInput.value
    })
  });

  const result = await response.json();

  if (!response.ok) {
    showAlert(result.error, "error");
    return;
  }

  localStorage.setItem("token", result.token);

  showAlert("Login successful — redirecting to your dashboard…", "success");

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 700);

} catch (err) {
  showAlert("Cannot connect to the server.", "error");
}
    });
  }

  // ----- Sign-up form -----
  if (signupForm) {
   signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const nameInput = document.getElementById("signupName");
      const emailInput = document.getElementById("signupEmail");
      const passwordInput = document.getElementById("signupPassword");
      const confirmInput = document.getElementById("signupConfirm");
      const termsInput = document.getElementById("agreeTerms");

      let valid = true;

      if (nameInput.value.trim().length < 2) {
        setFieldError(nameInput.closest(".field"), document.getElementById("signupNameError"), "Enter your full name.");
        valid = false;
      } else {
        setFieldError(nameInput.closest(".field"), document.getElementById("signupNameError"), "");
      }

      if (!/^\S+@\S+\.\S+$/.test(emailInput.value.trim())) {
        setFieldError(emailInput.closest(".field"), document.getElementById("signupEmailError"), "Enter a valid email address.");
        valid = false;
      } else {
        setFieldError(emailInput.closest(".field"), document.getElementById("signupEmailError"), "");
      }

      if (passwordInput.value.length < 6) {
        setFieldError(passwordInput.closest(".field"), document.getElementById("signupPasswordError"), "Password must be at least 6 characters.");
        valid = false;
      } else {
        setFieldError(passwordInput.closest(".field"), document.getElementById("signupPasswordError"), "");
      }

      if (confirmInput.value !== passwordInput.value || !confirmInput.value) {
        setFieldError(confirmInput.closest(".field"), document.getElementById("signupConfirmError"), "Passwords don't match.");
        valid = false;
      } else {
        setFieldError(confirmInput.closest(".field"), document.getElementById("signupConfirmError"), "");
      }

      if (!termsInput.checked) {
        showAlert("Please agree to the Terms to create an account.", "error");
        valid = false;
      }

      if (!valid) return;

      try {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      password: passwordInput.value
    })
  });

  const result = await response.json();

  if (!response.ok) {
    showAlert(result.error, "error");
    return;
  }

  localStorage.setItem("token", result.token);

  showAlert("Account created successfully!", "success");

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 700);

} catch (err) {
  console.error(err);
  showAlert(err.message, "error");
}
    });
  }

  // If already logged in, offer a quick way to dashboard instead of forcing re-login
  const session = Auth.currentSession();
  if (session && session.email) {
    const banner = document.getElementById("sessionBanner");
    if (banner) {
      banner.style.display = "flex";
      banner.querySelector("span").textContent = `You're already logged in as ${session.email}.`;
    }
  }

  const yearEl = document.getElementById("footerYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
