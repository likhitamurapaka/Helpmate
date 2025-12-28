// ---------------- FIREBASE INIT ----------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "helpmates-f7f01.firebaseapp.com",
  projectId: "helpmates-f7f01",
  appId: "1:16775557514:web:xxxxxxxx"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// ---------------- LOAD REVIEW ----------------
function loadReview() {
  const image = localStorage.getItem("capturedImage");
  const location = JSON.parse(localStorage.getItem("userLocation"));

  if (!image || !location) {
    alert("Missing data");
    return;
  }

  document.getElementById("reviewPhoto").src = image;

  if (location.mapsLink) {
    document.getElementById("reviewLocation").innerHTML =
      `<a href="${location.mapsLink}" target="_blank" style="color: var(--primary); text-decoration: underline;">📍 View Location on Maps</a>`;
  } else {
    document.getElementById("reviewLocation").innerText =
      "📍 " + (location.address || `Lat: ${location.lat}, Lng: ${location.lng}`);
  }
}


// ---------------- SEND EMERGENCY REPORT ----------------
async function sendEmergencyReport() {
  try {
    const imageData = localStorage.getItem("capturedImage");
    const location = JSON.parse(localStorage.getItem("userLocation"));

    if (!imageData || !location) {
      alert("Missing photo or location");
      return;
    }

    // ✅ CLOUDINARY CONFIG
    const CLOUD_NAME = "djbdexqyo";
    const UPLOAD_PRESET = "emergency_reports";

    const formData = new FormData();
    formData.append("file", imageData);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "emergency_reports");

    // 🔥 UPLOAD IMAGE
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const data = await res.json();

    if (!data.secure_url) {
      throw new Error("Cloudinary upload failed");
    }

    // 🔥 SAVE TO FIRESTORE
    await db.collection("reports").add({
      photoUrl: data.secure_url,
      location: location,
      status: "NEW",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("✅ Emergency Sent Successfully");
    window.location.href = "status.html";

  } catch (err) {
    console.error(err);
    alert("❌ Failed to send report");
  }
}

window.sendEmergencyReport = sendEmergencyReport;
window.loadReview = loadReview;
