function getLocation() {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            localStorage.setItem("lat", lat);
            localStorage.setItem("lng", lng);

            document.getElementById("coords").innerText =
                `Latitude: ${lat}\nLongitude: ${lng}`;

            document.getElementById("mapFrame").src =
                `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
        },
        () => {
            document.getElementById("coords").innerText =
                "Location permission denied";
        }
    );
}

function goToSubmit() {
    window.location.href = "submit.html";
    localStorage.getItem("userLocation")

}