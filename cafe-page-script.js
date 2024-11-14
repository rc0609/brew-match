document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const placeDataStr = urlParams.get("placeData");

  if (placeDataStr) {
    try {
      const place = JSON.parse(decodeURIComponent(placeDataStr));

      document.querySelector("h1").textContent = place.name;

      const ratingContainer = document.querySelector(".rating-container");
      if (ratingContainer) {
        ratingContainer.textContent = place.rating || "N/A";
      }

      const contactLeft = document.querySelector("#cafe-contact-left");
      if (contactLeft) {
        contactLeft.innerHTML = `
            ${place.phoneNumber || "Phone not available"}<br>
            ${place.address || "Address not available"}
          `;
      }

      const contactRight = document.querySelector("#cafe-contact-right");
      if (contactRight && place.website) {
        contactRight.innerHTML = `
            <a href="${place.website}" target="_blank" rel="noopener noreferrer">
              Click here to<br>check the website
            </a>
          `;
      }

      if (place.totalRatings) {
        updateRatingBars(place.rating, place.totalRatings);
      }
    } catch (error) {
      console.error("Error parsing place data:", error);
    }
  }
});

function updateRatingBars(rating, totalRatings) {
  const bars = {
    "bar-5": 0.4,
    "bar-4": 0.3,
    "bar-3": 0.2,
    "bar-2": 0.07,
    "bar-1": 0.03,
  };

  Object.entries(bars).forEach(([barId, percentage]) => {
    const bar = document.getElementById(barId);
    if (bar) {
      bar.style.width = `${percentage * 100}%`;
    }
  });

  const reviewCount = document.getElementById("review-count");
  if (reviewCount) {
    reviewCount.textContent = `${totalRatings} reviews`;
  }
}
