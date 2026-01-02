let video;
let canvas;
let stream;

// ---------------- START CAMERA ----------------
function startCamera() {
  video = document.getElementById("video");
  canvas = document.getElementById("canvas");

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  })
    .then(s => {
      stream = s;
      video.srcObject = stream;

      // 🔥 Ensure video is ready
      video.onloadedmetadata = () => {
        video.play();
        console.log("📷 Camera ready");
      };
    })
    .catch(() => {
      alert("Camera permission denied");
    });
}


// ---------------- CAPTURE PHOTO ----------------
function capturePhoto() {
  if (!video || video.videoWidth === 0) {
    alert("Camera not ready yet");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const imageBase64 = canvas.toDataURL("image/png");

  console.log("📸 Photo captured");

  // 🔥 SAVE PHOTO
  localStorage.setItem("capturedImage", imageBase64);

  // Stop camera
  stream.getTracks().forEach(track => track.stop());

  // 🔥 Get location next
  captureLocation();
}


// ---------------- CAPTURE LOCATION ----------------
function captureLocation() {
  console.log("📍 Fetching location...");

  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      let address = "Unknown location";

      // Create a Google Maps link as fallback/primary accurate source
      const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

      try {
        // Try local reverse geocoding if available, but don't crash if not
        const res = await fetch(`http://127.0.0.1:8000/reverse-geocode?lat=${lat}&lon=${lng}`);
        if (res.ok) {
          const data = await res.json();
          address = data.display_name || address;
        }
      } catch (err) {
        console.warn("Local geocoding failed, using coordinates", err);
        address = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
      }

      localStorage.setItem(
        "userLocation",
        JSON.stringify({
          lat,
          lng,
          address,
          mapsLink // Save the link for the backend/dashboard
        })
      );

      console.log("📍 Location saved");

      // ➡️ MOVE FORWARD TO PREVIEW
      window.location.href = "preview.html";
    },
    err => {
      console.error(err);
      alert("Location permission denied. Please enable location services.");
      // Even if denied, might want to let them proceed without location or retry
    }
  );
}


// ---------------- LOAD PREVIEW ----------------
function loadCapturedPhoto() {
  // Setup for preview.html which uses 'capturedImage'
  const imgPreview = document.getElementById("capturedImage");
  // Setup for submit.html (if we used this file there) which uses 'reviewPhoto'
  const imgReview = document.getElementById("reviewPhoto");

  const photo = localStorage.getItem("capturedImage");

  if (photo) {
    if (imgPreview) imgPreview.src = photo;
    if (imgReview) imgReview.src = photo;
  }
}

// ---------------- CONFIRM ----------------
function confirmPhoto() {
  window.location.href = "submit.html";
}


// ---------------- RETAKE ----------------
function retakePhoto() {
  localStorage.removeItem("capturedImage");
  localStorage.removeItem("userLocation");
  window.location.href = "camera.html";
}
