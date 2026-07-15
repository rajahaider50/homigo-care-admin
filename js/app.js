var firebaseConfig = {
  apiKey: "AIzaSyCP3dUminDU_wI1BzfXnwAW20Vk_COkUbc",
  authDomain: "homigo-care-76e21.firebaseapp.com",
  databaseURL: "https://homigo-care-76e21-default-rtdb.firebaseio.com",
  projectId: "homigo-care-76e21",
  storageBucket: "homigo-care-76e21.firebasestorage.app",
  messagingSenderId: "682545900180",
  appId: "1:682545900180:web:556b2ca1226f8ccfcfa281",
  measurementId: "G-JJ1Q1HDRV8"
};

var ADMIN_EMAIL = "zarghamabbas859@gmail.com";
var DRIVE_FOLDER_ID = "1LnDE01yLQh_XemGR4-PgyZZM0loQxVA6";

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.database();
var currentAdmin = null;
var selectedType = "video";
var gapiLoaded = false;
var gisLoaded = false;
var tokenClient = null;
var accessToken = null;

function adminLogin() {
  var email = document.getElementById("loginEmail").value.trim();
  var password = document.getElementById("loginPassword").value;
  var errorEl = document.getElementById("loginError");
  var btn = document.getElementById("loginBtn");
  if (!email || !password) {
    errorEl.textContent = "Email aur password dono darj karein";
    errorEl.style.display = "block";
    return;
  }
  if (email !== ADMIN_EMAIL) {
    errorEl.textContent = "Sirf zarghamabbas859@gmail.com se login karein";
    errorEl.style.display = "block";
    return;
  }
  btn.disabled = true;
  btn.textContent = "Signing in...";
  errorEl.style.display = "none";
  auth.signInWithEmailAndPassword(email, password).then(function(result) {
    db.ref("admin/" + result.user.uid).once("value").then(function(snap) {
      if (!snap.exists()) {
        db.ref("admin/" + result.user.uid).set({
          name: result.user.displayName || "Admin",
          email: email,
          role: "superadmin",
          createdAt: Date.now()
        });
      }
    });
    currentAdmin = result.user;
    showAdminPanel();
    loadCurrentSplash();
    loadSplashHistory();
    initGoogleDrive();
  }).catch(function(error) {
    var messages = {
      "auth/user-not-found": "Yeh email registered nahi hai",
      "auth/wrong-password": "Galat password hai",
      "auth/invalid-email": "Galat email address",
      "auth/too-many-requests": "Bohat saari koshish",
      "auth/invalid-credential": "Galat credentials"
    };
    errorEl.textContent = messages[error.code] || "Login fail ho gaya";
    errorEl.style.display = "block";
  }).finally(function() {
    btn.disabled = false;
    btn.textContent = "Sign In";
  });
}

function adminLogout() {
  auth.signOut();
  currentAdmin = null;
  accessToken = null;
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("adminLayout").style.display = "none";
}

function showAdminPanel() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("adminLayout").style.display = "block";
  var name = currentAdmin.displayName || currentAdmin.email.charAt(0).toUpperCase();
  document.getElementById("adminAvatar").textContent = name.charAt(0).toUpperCase();
}

function selectType(type) {
  selectedType = type;
  var buttons = document.querySelectorAll(".type-btn");
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].getAttribute("data-type") === type) {
      buttons[i].classList.add("active");
    } else {
      buttons[i].classList.remove("active");
    }
  }
  var uploadArea = document.getElementById("uploadArea");
  var urlInput = document.getElementById("urlInput");
  var htmlInput = document.getElementById("htmlInput");
  var textInput = document.getElementById("textInput");
  var uploadHint = document.getElementById("uploadHint");
  var fileInput = document.getElementById("fileInput");
  uploadArea.style.display = "none";
  urlInput.style.display = "none";
  htmlInput.style.display = "none";
  textInput.style.display = "none";
  if (type === "video") {
    uploadArea.style.display = "block";
    uploadHint.textContent = "Select video file (MP4, WebM)";
    fileInput.accept = "video/*";
  } else if (type === "image") {
    uploadArea.style.display = "block";
    uploadHint.textContent = "Select image file (JPG, PNG, WebP)";
    fileInput.accept = "image/*";
  } else if (type === "html") {
    htmlInput.style.display = "block";
  } else if (type === "text") {
    textInput.style.display = "block";
  }
  clearPreview();
  document.getElementById("uploadStatus").style.display = "none";
}

function handleFileSelect(event) {
  var file = event.target.files[0];
  if (!file) return;
  var fileName = document.getElementById("fileName");
  var fileSize = document.getElementById("fileSize");
  var uploadStatus = document.getElementById("uploadStatus");
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  uploadStatus.style.display = "block";
  uploadStatus.innerHTML = '<span class="info">File selected. Click "Upload & Publish" to upload to Google Drive.</span>';
  showLocalPreview(file);
}

function showLocalPreview(file) {
  var box = document.getElementById("previewBox");
  box.innerHTML = "";
  var url = URL.createObjectURL(file);
  if (selectedType === "video") {
    box.innerHTML = '<video autoplay muted loop style="width:100%;height:100%;object-fit:cover;"><source src="' + url + '"></video>';
  } else if (selectedType === "image") {
    box.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">';
  }
}

function initGoogleDrive() {
  var statusEl = document.getElementById("driveStatus");
  statusEl.textContent = "Loading Google API...";
  statusEl.style.display = "block";

  var gapiScript = document.createElement("script");
  gapiScript.src = "https://apis.google.com/js/api.js";
  gapiScript.onload = function() {
    gapiLoaded = true;
    gapi.load("client:picker", function() {
      gapi.client.init({
        apiKey: "AIzaSyAxlPizRI-1tbJzGaUxdC9pMZ-NtJDthcI",
        clientId: "539092780914-il60guaujm7dhkahcd7b4jg2de6ufgnc.apps.googleusercontent.com",
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        scope: "https://www.googleapis.com/auth/drive.file"
      }).then(function() {
        checkDriveConnection();
      });
    });
  };
  document.head.appendChild(gapiScript);

  var gisScript = document.createElement("script");
  gisScript.src = "https://accounts.google.com/gsi/client";
  gisScript.onload = function() {
    gisLoaded = true;
  };
  document.head.appendChild(gisScript);
}

function checkDriveConnection() {
  var savedToken = localStorage.getItem("gdrive_token");
  if (savedToken) {
    accessToken = savedToken;
    verifyDriveAccess();
  } else {
    document.getElementById("driveStatus").innerHTML = '<span class="warn">Google Drive not connected. </span><button class="btn-sm" onclick="connectDrive()">Connect Drive</button>';
  }
}

function connectDrive() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: "539092780914-il60guaujm7dhkahcd7b4jg2de6ufgnc.apps.googleusercontent.com",
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: function(tokenResponse) {
      accessToken = tokenResponse.access_token;
      localStorage.setItem("gdrive_token", accessToken);
      verifyDriveAccess();
    }
  });
  tokenClient.requestAccessToken();
}

function verifyDriveAccess() {
  var statusEl = document.getElementById("driveStatus");
  fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
    headers: { "Authorization": "Bearer " + accessToken }
  }).then(function(res) { return res.json(); }).then(function(data) {
    if (data.user) {
      statusEl.innerHTML = '<span class="success">Connected: ' + data.user.displayName + '</span>';
    } else {
      throw new Error("Invalid");
    }
  }).catch(function() {
    localStorage.removeItem("gdrive_token");
    accessToken = null;
    statusEl.innerHTML = '<span class="warn">Drive token expired. </span><button class="btn-sm" onclick="connectDrive()">Reconnect</button>';
  });
}

function disconnectDrive() {
  localStorage.removeItem("gdrive_token");
  accessToken = null;
  document.getElementById("driveStatus").innerHTML = '<span class="warn">Drive disconnected. </span><button class="btn-sm" onclick="connectDrive()">Connect Drive</button>';
}

function previewSplash() {
  if (selectedType === "video" || selectedType === "image") {
    var fileInput = document.getElementById("fileInput");
    if (fileInput.files && fileInput.files[0]) {
      showLocalPreview(fileInput.files[0]);
    } else {
      showToast("Pehle file select karein", "warning");
    }
  } else if (selectedType === "html") {
    var code = document.getElementById("htmlInput").value;
    if (!code) { showToast("HTML code dalein", "warning"); return; }
    showPreview(code, "html");
  } else if (selectedType === "text") {
    var text = document.getElementById("textInput").value;
    if (!text) { showToast("Text dalein", "warning"); return; }
    showPreview(text, "text");
  }
}

function showPreview(content, type) {
  var box = document.getElementById("previewBox");
  box.innerHTML = "";
  if (type === "video") {
    box.innerHTML = '<video autoplay muted loop style="width:100%;height:100%;object-fit:cover;"><source src="' + escapeHtml(content) + '" type="video/mp4"></video>';
  } else if (type === "image") {
    box.innerHTML = '<img src="' + escapeHtml(content) + '" style="width:100%;height:100%;object-fit:cover;">';
  } else if (type === "html") {
    box.innerHTML = '<iframe sandbox="allow-scripts" style="width:100%;height:100%;border:none;"></iframe>';
    var iframe = box.querySelector("iframe");
    var doc = iframe.contentDocument;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;width:100%;height:100%;background:linear-gradient(160deg,#20c0b0,#108080);color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px}</style></head><body>' + content + "</body></html>");
    doc.close();
  } else if (type === "text") {
    box.innerHTML = '<div style="width:100%;height:100%;background:linear-gradient(160deg,#20c0b0,#108080);display:flex;align-items:center;justify-content:center;padding:20px;"><div style="color:#fff;font-size:22px;font-weight:800;text-align:center;">' + escapeHtml(content) + "</div></div>";
  }
}

function clearPreview() {
  document.getElementById("previewBox").innerHTML = '<div class="preview-placeholder"><ion-icon name="play-circle-outline" style="font-size:40px;display:block;margin-bottom:8px;"></ion-icon>Select content to preview</div>';
}

function publishSplash() {
  if (!currentAdmin) { showToast("Pehle login karein", "warning"); return; }

  if (selectedType === "video" || selectedType === "image") {
    var fileInput = document.getElementById("fileInput");
    if (!fileInput.files || !fileInput.files[0]) {
      showToast("Pehle file select karein", "warning");
      return;
    }
    if (!accessToken) {
      showToast("Google Drive connected nahi hai", "warning");
      return;
    }
    uploadAndPublish(fileInput.files[0]);
  } else if (selectedType === "html") {
    var content = document.getElementById("htmlInput").value;
    if (!content) { showToast("HTML code dalein", "warning"); return; }
    saveSplashToFirebase("html", content);
  } else if (selectedType === "text") {
    var content = document.getElementById("textInput").value.trim();
    if (!content) { showToast("Text dalein", "warning"); return; }
    saveSplashToFirebase("text", content);
  }
}

function uploadAndPublish(file) {
  var statusEl = document.getElementById("uploadStatus");
  var progressBar = document.getElementById("uploadProgress");
  var progressFill = document.getElementById("uploadProgressFill");
  statusEl.style.display = "block";
  statusEl.innerHTML = '<span class="info">Uploading to Google Drive...</span>';
  progressBar.style.display = "block";
  progressFill.style.width = "0%";

  var metadata = {
    name: "splash_" + Date.now() + "_" + file.name,
    mimeType: file.type,
    parents: [DRIVE_FOLDER_ID]
  };

  var formData = new FormData();
  formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  formData.append("file", file);

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart");

  xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
      var percent = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = percent + "%";
    }
  };

  xhr.onload = function() {
    progressBar.style.display = "none";
    if (xhr.status === 200) {
      var result = JSON.parse(xhr.responseText);
      var directUrl = "https://drive.google.com/uc?export=download&id=" + result.id;
      statusEl.innerHTML = '<span class="success">Uploaded! Saving to database...</span>';
      saveSplashToFirebase(selectedType, directUrl);
    } else {
      statusEl.innerHTML = '<span class="error">Upload failed. Try again.</span>';
      showToast("Upload failed", "error");
    }
  };

  xhr.onerror = function() {
    progressBar.style.display = "none";
    statusEl.innerHTML = '<span class="error">Network error. Check connection.</span>';
    showToast("Network error", "error");
  };

  xhr.send(formData);
}

function saveSplashToFirebase(type, content) {
  var duration = parseInt(document.getElementById("durationSlider").value) * 1000;
  var splashData = {
    type: type,
    content: content,
    duration: duration,
    isActive: true,
    updatedAt: Date.now(),
    updatedBy: currentAdmin.uid
  };

  db.ref("splash/current").set(splashData).then(function() {
    db.ref("splash/history").push({
      type: type,
      content: content,
      duration: duration,
      isActive: true,
      createdAt: Date.now(),
      createdBy: currentAdmin.uid
    });
    showToast("Splash published!", "success");
    document.getElementById("uploadStatus").innerHTML = '<span class="success">Published successfully!</span>';
    loadCurrentSplash();
    loadSplashHistory();
  }).catch(function(error) {
    showToast("Save failed: " + error.message, "error");
  });
}

function deleteSplash() {
  if (!currentAdmin) return;
  if (!confirm("Kya aap yeh splash remove karna chahte hain?")) return;
  db.ref("splash/current").set({
    type: "text",
    content: "Homigo Care",
    duration: 5000,
    isActive: false,
    updatedAt: Date.now(),
    updatedBy: currentAdmin.uid
  }).then(function() {
    showToast("Splash removed", "success");
    loadCurrentSplash();
    clearPreview();
  }).catch(function(error) {
    showToast("Delete fail: " + error.message, "error");
  });
}

function loadCurrentSplash() {
  db.ref("splash/current").once("value").then(function(snapshot) {
    var data = snapshot.val();
    var infoEl = document.getElementById("currentSplashInfo");
    if (!data || !data.isActive) {
      infoEl.innerHTML = '<span class="type-badge off">No Active Splash</span> - Default splash will show';
      return;
    }
    var typeLabel = data.type ? data.type.toUpperCase() : "TEXT";
    var dur = data.duration ? (data.duration / 1000) + "s" : "5s";
    var contentPreview = data.content ? (data.content.substring(0, 50) + (data.content.length > 50 ? "..." : "")) : "-";
    infoEl.innerHTML = '<span class="type-badge ' + data.type + '">' + typeLabel + "</span> &nbsp; Duration: " + dur + " &nbsp;|&nbsp; <span style='font-size:12px;color:var(--ink-500);'>" + contentPreview + "</span>";
  }).catch(function(err) {
    console.error("Load splash error:", err);
  });
}

function loadSplashHistory() {
  db.ref("splash/history").orderByChild("createdAt").limitToLast(10).once("value").then(function(snapshot) {
    var container = document.getElementById("splashHistory");
    var html = "";
    snapshot.forEach(function(child) {
      var data = child.val();
      var date = new Date(data.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      var tc = {
        video: "background:var(--ruby-soft);color:var(--ruby)",
        image: "background:var(--teal-soft);color:var(--teal)",
        html: "background:var(--peach-soft);color:#8a5a00",
        text: "background:var(--teal-soft);color:var(--teal)"
      };
      var ti = { video: "videocam", image: "image", html: "code", text: "text" };
      html += '<div class="history-item"><div class="h-icon" style="' + (tc[data.type] || tc.text) + '"><ion-icon name="' + (ti[data.type] || "document") + '"></ion-icon></div><div class="h-info"><div class="h-type">' + (data.type || "text").toUpperCase() + "</div><div class='h-date'>" + date + "</div></div></div>";
    });
    container.innerHTML = html || '<div class="preview-placeholder" style="padding:20px;text-align:center;">No history yet</div>';
  }).catch(function(err) {
    console.error("Load history error:", err);
  });
}

function updateDuration(val) {
  document.getElementById("durationValue").textContent = val + "s";
}

function showToast(msg, type) {
  type = type || "success";
  var toast = document.getElementById("toast");
  var icon = toast.querySelector("ion-icon");
  document.getElementById("toastMsg").textContent = msg;
  var icons = { success: "checkmark-circle", error: "alert-circle", warning: "warning", info: "information-circle" };
  icon.setAttribute("name", icons[type] || "checkmark-circle");
  toast.style.background = type === "error" ? "var(--ruby)" : type === "warning" ? "var(--peach)" : type === "info" ? "var(--teal)" : "var(--ink-900)";
  toast.classList.add("show");
  setTimeout(function() { toast.classList.remove("show"); }, 3000);
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  var k = 1024;
  var sizes = ["B", "KB", "MB", "GB"];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("loginPassword").addEventListener("keypress", function(e) {
    if (e.key === "Enter") adminLogin();
  });

  var uploadArea = document.getElementById("uploadArea");
  if (uploadArea) {
    uploadArea.addEventListener("dragover", function(e) {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });
    uploadArea.addEventListener("dragleave", function() {
      uploadArea.classList.remove("dragover");
    });
    uploadArea.addEventListener("drop", function(e) {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
      var file = e.dataTransfer.files[0];
      if (file) {
        document.getElementById("fileInput").files = e.dataTransfer.files;
        handleFileSelect({ target: { files: [file] } });
      }
    });
  }

  window.addEventListener("error", function(e) {
    showErrorToast(e.message + " (Line: " + e.lineno + ")");
  });

  window.addEventListener("unhandledrejection", function(e) {
    showErrorToast("Promise rejection: " + (e.reason ? e.reason.message : "Unknown error"));
  });
});

function showErrorToast(message) {
  var toast = document.getElementById("errorToast");
  var msgEl = document.getElementById("errorMessage");
  var copyBtn = document.getElementById("copyErrorBtn");
  msgEl.textContent = message;
  toast.classList.add("show");
  copyBtn.classList.remove("copied");
  copyBtn.querySelector("span").textContent = "Copy Error";
}

function hideErrorToast() {
  document.getElementById("errorToast").classList.remove("show");
}

function copyError() {
  var message = document.getElementById("errorMessage").textContent;
  var copyBtn = document.getElementById("copyErrorBtn");
  navigator.clipboard.writeText(message).then(function() {
    copyBtn.classList.add("copied");
    copyBtn.querySelector("span").textContent = "Copied!";
    setTimeout(function() {
      copyBtn.classList.remove("copied");
      copyBtn.querySelector("span").textContent = "Copy Error";
    }, 2000);
  }).catch(function() {
    var textarea = document.createElement("textarea");
    textarea.value = message;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    copyBtn.classList.add("copied");
    copyBtn.querySelector("span").textContent = "Copied!";
    setTimeout(function() {
      copyBtn.classList.remove("copied");
      copyBtn.querySelector("span").textContent = "Copy Error";
    }, 2000);
  });
}
