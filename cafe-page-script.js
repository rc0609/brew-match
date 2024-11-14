document.addEventListener("DOMContentLoaded", function () {
  // Get place data from URL
  const urlParams = new URLSearchParams(window.location.search);
  const placeDataStr = urlParams.get("placeData");

  if (placeDataStr) {
    try {
      const place = JSON.parse(decodeURIComponent(placeDataStr));

      // Update page elements with place data
      document.querySelector("h1").textContent = place.name;

      // Update rating
      const ratingContainer = document.querySelector(".rating-container");
      if (ratingContainer) {
        ratingContainer.textContent = place.rating || "N/A";
      }

      // Update contact information
      const contactLeft = document.querySelector("#cafe-contact-left");
      if (contactLeft) {
        contactLeft.innerHTML = `
            ${place.phoneNumber || "Phone not available"}<br>
            ${place.address || "Address not available"}
          `;
      }

      // Update website link
      const contactRight = document.querySelector("#cafe-contact-right");
      if (contactRight && place.website) {
        contactRight.innerHTML = `
            <a href="${place.website}" target="_blank" rel="noopener noreferrer">
              Click here to<br>check the website
            </a>
          `;
      }

      // Update rating bars if the data is available
      if (place.totalRatings) {
        // You would need to implement the logic to calculate the distribution
        // of ratings, as the Places API doesn't provide this breakdown
        updateRatingBars(place.rating, place.totalRatings);
      }
    } catch (error) {
      console.error("Error parsing place data:", error);
      // Handle error appropriately
    }
  }
});

function updateRatingBars(rating, totalRatings) {
  // This is a simplified example - you might want to adjust the logic
  // based on your actual rating distribution data
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

  // Update review count
  const reviewCount = document.getElementById("review-count");
  if (reviewCount) {
    reviewCount.textContent = `${totalRatings} reviews`;
  }
}
